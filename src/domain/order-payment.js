import { getStore } from "../runtime/state.js";
import {
  readElectronicOrders,
  updateElectronicReceipt,
  cameraPaymentResult,
} from "./camera.js";
import { COLLECTION_PROJECTS, collectionProjectState } from "./collection.js";

const activePayments = new Set();
const account = () => getStore("account")?.session?.phone;

// Transaction-only adapter. Production must replace the local payment response with
// server pay/query APIs keyed by the original order ID, never by a new order.
export async function transactOrder(
  order,
  { method = "wechat", outcome = "success", query = false } = {},
) {
  const owner = account();
  if (!owner || !order || order.type === "print") throw Error("订单不可付款。");
  if (activePayments.has(order.key))
    throw Error("付款正在确认，请勿重复操作。");
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    throw Error("网络不可用，请恢复连接后重试。");
  activePayments.add(order.key);
  try {
    const expected = query ? "verifying" : "pending";
    const check = (r) => {
      if (
        account() !== owner ||
        !r ||
        r.owner !== owner ||
        r.fixture ||
        r.status !== expected
      )
        throw Error("订单状态已变化，请刷新后重试。");
      if (
        !Number.isInteger(r.amount) ||
        r.amount <= 0 ||
        r.amount !== order.amount
      )
        throw Error("订单金额无法确认，请重新读取订单。");
      return r;
    };
    let current, update;
    if (order.type === "electronic") {
      current = check(
        (await readElectronicOrders()).find((r) => r.id === order.sourceId),
      );
      if (!query && !current.photo?.blob)
        throw Error("订单内容暂时不可用，无法继续付款。");
      update = (status, patch) =>
        updateElectronicReceipt(current.id, owner, status, patch);
    } else if (["repair", "outfit"].includes(order.type)) {
      const store = getStore("toolOrders");
      current = check(
        store.items.find(
          (r) => r.id === order.sourceId && r.action === order.type,
        ),
      );
      if (!query && !current.photo?.blob)
        throw Error("订单内容暂时不可用，无法继续付款。");
      update = (status, patch) =>
        store.commit((items) => {
          const item = items.find(
            (r) => r.id === current.id && r.owner === owner,
          );
          if (!item || item.status !== status)
            throw Error("订单状态已变化，请刷新后重试。");
          Object.assign(item, patch);
        });
    } else if (order.type === "collection") {
      const store = getStore("collectionRecords");
      const record = store.items.find(
        (r) =>
          r.payment?.id === order.sourceId && r.owner === owner && !r.fixture,
      );
      current = check(record && { ...record.payment, owner: record.owner });
      const project = COLLECTION_PROJECTS.find(
        (p) => p.id === record.projectId,
      );
      if (
        !query &&
        (!project || collectionProjectState(project.id) !== "ongoing")
      )
        throw Error("项目当前不支持付款。");
      update = (status, patch) => {
        const latest = store.items.find(
          (r) => r.id === record.id && r.owner === owner,
        );
        if (latest?.payment?.status !== status)
          throw Error("订单状态已变化，请刷新后重试。");
        return store.commit(
          store.items.map((r) =>
            r === latest ? { ...r, payment: { ...r.payment, ...patch } } : r,
          ),
        );
      };
    } else throw Error("订单类型不支持付款。");
    if (account() !== owner) throw Error("登录状态已变化，请重新查看订单。");
    await update(expected, {
      status: "verifying",
      method: query ? current.method : method,
    });
    let status;
    try {
      status = await cameraPaymentResult(current, outcome);
    } catch {
      // An unknown response remains verifying. It must never become a fresh payment.
      throw Error("付款结果未能确认，请稍后查询，勿重复付款。");
    }
    if (account() !== owner) throw Error("登录状态已变化，请重新查看订单。");
    if (!["pending", "verifying", "paid"].includes(status))
      status = "verifying";
    await update("verifying", {
      status,
      ...(status === "paid" ? { paidAt: Date.now() } : {}),
    });
    return status;
  } finally {
    activePayments.delete(order.key);
  }
}
