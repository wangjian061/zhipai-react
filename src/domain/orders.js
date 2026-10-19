import {
  registerStore,
  registerController,
  getStore,
} from "../runtime/state.js";
import { readElectronicOrders } from "./camera.js";
import { COLLECTION_PROJECTS } from "./collection.js";
import {
  COLLECTION_STATUSES,
  collectionStatusKey,
  isCollectionFinished,
} from "./collection-status.js";
import { accountRoute } from "./account.js";
import { orderNavigate, safeOrderPath } from "./order-routing.js";

export const ORDER_TYPES = [
  { id: "all", label: "全部类型" },
  { id: "electronic", label: "电子照片" },
  { id: "print", label: "照片冲印" },
  { id: "repair", label: "照片精修" },
  { id: "outfit", label: "照片换装" },
  { id: "collection", label: "专项采集" },
];
export const ORDER_STATES = [
  { id: "all", label: "全部" },
  { id: "pending", label: "待付款" },
  { id: "processing", label: "处理中" },
  { id: "complete", label: "已完成" },
  { id: "closed", label: "已关闭" },
];
const printProgress = {
  pending: "待付款",
  verifying: "付款确认中",
  producing: "待制作",
  printing: "制作中",
  shipped: "已发货",
  completed: "已签收",
  cancelled: "已取消",
};
const outfitName = (id) => {
  const [category, style] = (id || "").split("-");
  return (
    [
      { men: "男装", women: "女装", children: "童装" }[category],
      { suit: "西装", shirt: "衬衫", casual: "休闲装" }[style],
    ]
      .filter(Boolean)
      .join(" · ") || "未记录"
  );
};
const paymentText = (status) =>
  status === "paid"
    ? "已支付"
    : status === "verifying"
      ? "付款确认中"
      : status === "cancelled"
        ? "已关闭"
        : "待付款";
export function normalizeOrders({
  owner,
  print = [],
  tools = [],
  electronic = [],
  collection = [],
  projects = COLLECTION_PROJECTS,
}) {
  if (!owner) return [];
  const own = (r) => r.owner === owner && !r.fixture;
  const entries = [];
  const add = (type, r, fields) =>
    entries.push({
      key: type + ":" + r.id,
      type,
      sourceId: r.id,
      number: r.number || r.id,
      createdAt: r.createdAt,
      paidAt: r.paidAt,
      method: r.method,
      ...fields,
    });
  for (const r of print.filter(own))
    add("print", r, {
      title: "证件照排版冲印",
      amount: r.total,
      state:
        r.status === "pending"
          ? "pending"
          : r.status === "cancelled"
            ? "closed"
            : r.status === "completed"
              ? "complete"
              : "processing",
      payment: paymentText(
        ["producing", "printing", "shipped", "completed"].includes(r.status)
          ? "paid"
          : r.status,
      ),
      progress: printProgress[r.status] || "处理中",
      description: `${r.layoutSnapshot?.name || "排版照"} · ${r.quantity || 1}版`,
      photo: r.photo?.blob,
      address: r.address,
      tracking: r.tracking,
      events: r.events || [],
      details: [
        ["版式", r.layoutSnapshot?.name || r.layout],
        ["冲印数量", `${r.quantity || 1}版`],
        ["冲印费", money((r.base || 0) * (r.quantity || 1))],
        ["配送费", money(r.shipping || 0)],
      ],
      action:
        r.status === "pending"
          ? "继续付款"
          : r.status === "verifying"
            ? "查询付款结果"
            : r.status === "shipped"
              ? "查看物流"
              : "查看冲印详情",
    });
  for (const r of tools
    .filter(own)
    .filter((r) => ["repair", "outfit"].includes(r.action)))
    add(r.action, r, {
      title: r.action === "repair" ? "照片精修" : "照片换装",
      amount: r.amount,
      state:
        r.status === "paid"
          ? r.output
            ? "complete"
            : "processing"
          : r.status === "cancelled"
            ? "closed"
            : r.status === "verifying"
              ? "processing"
              : "pending",
      payment: paymentText(r.status),
      progress:
        r.status === "paid"
          ? r.savedId
            ? "已保存到知拍相册"
            : r.output
              ? "处理完成"
              : "待处理"
          : paymentText(r.status),
      description: r.photo?.spec || "证件照服务",
      photo: r.output || r.photo?.blob,
      result: r.output,
      original: r.photo?.blob,
      savedId: r.savedId,
      details: [
        ["照片规格", r.photo?.spec || "未记录"],
        ...(r.action === "outfit" ? [["所选服装", outfitName(r.outfit)]] : []),
      ],
      action:
        r.status === "paid" ? (r.output ? "查看照片" : "继续处理") : "继续付款",
    });
  for (const r of electronic.filter(own))
    add("electronic", r, {
      title: "电子证件照解锁",
      amount: r.amount,
      state:
        r.status === "paid"
          ? "complete"
          : r.status === "cancelled"
            ? "closed"
            : r.status === "verifying"
              ? "processing"
              : "pending",
      payment: paymentText(r.status),
      progress:
        r.status === "paid"
          ? r.savedId
            ? "已保存到知拍相册"
            : "电子照片已解锁"
          : paymentText(r.status),
      description: r.specification || "无水印电子照片",
      photo: r.photo?.blob,
      savedId: r.savedId,
      sessionId: r.sessionId,
      sessionAvailable: r.sessionAvailable !== false,
      details: [["照片规格", r.specification || "未记录"]],
      action:
        r.status === "paid"
          ? "查看照片"
          : r.status === "verifying"
            ? "查询付款结果"
            : "继续付款",
    });
  for (const r of collection
    .filter(own)
    .filter((r) => r.payment && !r.payment.legacyPrototype)) {
    const p = projects.find((p) => p.id === r.projectId),
      payment = r.payment;
    add(
      "collection",
      {
        ...r,
        id: payment.id,
        number: payment.id,
        createdAt: payment.createdAt || r.createdAt,
        paidAt: payment.paidAt,
        method: payment.method,
      },
      {
        recordId: r.id,
        projectId: r.projectId,
        title: p?.name || "专项采集",
        amount: payment.amount,
        state:
          payment.status === "paid"
            ? isCollectionFinished(r.status) &&
              collectionStatusKey(r.status) !== "upload_failed"
              ? "complete"
              : "processing"
            : payment.status === "verifying"
              ? "processing"
              : "pending",
        payment: paymentText(payment.status),
        tone: COLLECTION_STATUSES[collectionStatusKey(r.status)]?.tone,
        progress:
          COLLECTION_STATUSES[collectionStatusKey(r.status)]?.label || "待拍摄",
        description: `${r.name || "采集任务"} · ${p?.organization || ""}`,
        photo: r.photo?.blob,
        details: [
          ["采集人", r.name],
          ["采集机构", p?.organization],
          ["客服号", r.customer],
        ],
        action:
          payment.status === "paid"
            ? "查看采集任务"
            : payment.status === "verifying"
              ? "查询付款结果"
              : "继续付款",
      },
    );
  }
  return [...new Map(entries.map((e) => [e.key, e])).values()].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
}
export function money(cents) {
  return Number.isFinite(cents) ? "¥" + (cents / 100).toFixed(2) : "金额待确认";
}
export function orderTime(value) {
  const d = new Date(value);
  return value && !Number.isNaN(+d)
    ? d.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "未记录";
}
registerStore("orderCenter", {
  electronic: [],
  electronicReady: false,
  error: "",
  loading: false,
  refreshAgain: false,
  init() {
    this.refresh();
    this.onUpdate = () => this.refresh();
    window.addEventListener("zhipai-orders-updated", this.onUpdate);
  },
  async refresh() {
    if (this.loading) {
      this.refreshAgain = true;
      return;
    }
    this.loading = true;
    this.error = "";
    try {
      this.electronic = await readElectronicOrders();
      this.electronicReady = true;
    } catch {
      this.error = "电子照片订单读取失败";
    } finally {
      this.loading = false;
      if (this.refreshAgain) {
        this.refreshAgain = false;
        this.refresh();
      }
    }
  },
  get all() {
    return normalizeOrders({
      owner: getStore("account")?.session?.phone,
      print: getStore("printLibrary")?.orders,
      tools: getStore("toolOrders")?.items,
      collection: getStore("collectionRecords")?.items,
      electronic: this.electronic,
    });
  },
  get count() {
    return this.all.length;
  },
  get pendingCount() {
    return this.all.filter((o) => o.state === "pending").length;
  },
  get errors() {
    return [
      this.error,
      getStore("printLibrary")?.error,
      getStore("toolOrders")?.error,
      getStore("collectionRecords")?.error,
    ].filter(Boolean);
  },
  get ready() {
    return (
      this.electronicReady &&
      getStore("printLibrary")?.ready &&
      getStore("toolOrders")?.ready &&
      getStore("collectionRecords")?.ready
    );
  },
  async retry() {
    await Promise.allSettled([
      this.refresh(),
      getStore("printLibrary").load(),
      getStore("toolOrders").load(),
      getStore("collectionRecords").load(),
    ]);
  },
});
registerController("ordersFlow", () => ({
  type: "all",
  status: "all",
  query: "",
  searchOpen: false,
  selected: "",
  backTo: "/?page=my",
  notice: "",
  get hub() {
    return this.$store.orderCenter;
  },
  get owner() {
    return this.$store.account.session?.phone;
  },
  get types() {
    return ORDER_TYPES;
  },
  get statuses() {
    return ORDER_STATES;
  },
  get typed() {
    return this.hub.all.filter(
      (o) => this.type === "all" || o.type === this.type,
    );
  },
  count(status) {
    return this.typed.filter((o) => status === "all" || o.state === status)
      .length;
  },
  get list() {
    const q = this.query.trim().toLocaleLowerCase();
    return this.typed.filter(
      (o) =>
        (this.status === "all" || o.state === this.status) &&
        (!q ||
          [o.number, o.title, o.description]
            .join(" ")
            .toLocaleLowerCase()
            .includes(q)),
    );
  },
  get current() {
    return this.hub.all.find((o) => o.key === this.selected) || null;
  },
  typeName(type) {
    return ORDER_TYPES.find((t) => t.id === type)?.label || "订单";
  },
  stateName(state) {
    return ORDER_STATES.find((t) => t.id === state)?.label || "处理中";
  },
  money,
  orderTime,
  init() {
    this.onRoute = () => this.sync();
    window.addEventListener("zhipai-route", this.onRoute);
    window.addEventListener("popstate", this.onRoute);
    this.sync();
  },
  destroy() {
    window.removeEventListener("zhipai-route", this.onRoute);
    window.removeEventListener("popstate", this.onRoute);
  },
  sync() {
    const q = new URLSearchParams(location.search);
    if (q.get("page") !== "orders") return;
    this.type = ORDER_TYPES.some((t) => t.id === q.get("type"))
      ? q.get("type")
      : "all";
    this.status = ORDER_STATES.some((t) => t.id === q.get("status"))
      ? q.get("status")
      : "all";
    this.query = q.get("q") || "";
    this.searchOpen = !!this.query;
    this.selected = q.get("id") || "";
    this.backTo = safeOrderPath(q.get("back"), "/?page=my");
    if (
      new URL(this.backTo, location.origin).searchParams.get("page") ===
      "orders"
    )
      this.backTo = "/?page=my";
    this.notice = "";
    this.hub.refresh();
  },
  url(id = this.selected) {
    const q = new URLSearchParams({
      page: "orders",
      type: this.type,
      status: this.status,
      back: this.backTo,
    });
    if (this.query.trim()) q.set("q", this.query.trim());
    if (id) q.set("id", id);
    return "/?" + q;
  },
  filter(type, status) {
    this.type = type;
    this.status = status;
    orderNavigate(this.url(""), true);
  },
  search() {
    orderNavigate(this.url(""), true);
  },
  open(order) {
    orderNavigate(this.url(order.key));
  },
  back() {
    orderNavigate(this.selected ? this.url("") : this.backTo);
  },
  login() {
    accountRoute("welcome", this.url());
  },
  async copy() {
    if (!this.current) return;
    try {
      await navigator.clipboard.writeText(this.current.number);
      this.notice = "订单编号已复制";
    } catch {
      this.notice = "请长按订单编号复制";
    }
  },
  continue(order = this.current) {
    if (!order || !this.hub.all.some((o) => o.key === order.key)) return;
    let q;
    if (order.type === "print")
      q = new URLSearchParams({
        page: "print",
        print: "order",
        order: order.sourceId,
      });
    else if (order.type === "collection")
      q = new URLSearchParams({
        page: "collection",
        view: "detail",
        record: order.recordId,
        project: order.projectId,
      });
    else if (order.type === "electronic") {
      if (
        order.savedId &&
        this.$store.photoLibrary.finished.some((p) => p.id === order.savedId)
      )
        q = new URLSearchParams({
          page: "album",
          album: "finished",
          photo: order.savedId,
          from: "library",
        });
      else if (order.sessionAvailable)
        q = new URLSearchParams({
          page: "camera",
          camera: "editor",
          session: order.sessionId,
        });
      else {
        this.open(order);
        return;
      }
    } else
      q = new URLSearchParams({
        page: "tool",
        tool: order.type,
        view: "work",
        resume: order.sourceId,
      });
    q.set("orderBack", this.url(order.key));
    orderNavigate("/?" + q);
  },
}));
