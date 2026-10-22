// Source-render and domain contracts only. No browser automation or real payment.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  getStore,
  createController,
  storageValue,
} from "../src/runtime/state.js";
let locationValue = new URL("http://127.0.0.1:4180/?page=orders");
Object.defineProperty(globalThis, "location", {
  configurable: true,
  get: () => locationValue,
});
globalThis.window = new EventTarget();
globalThis.document = { activeElement: null };
globalThis.history = {
  pushState(a, b, url) {
    locationValue = new URL(url, locationValue);
  },
  replaceState(a, b, url) {
    locationValue = new URL(url, locationValue);
  },
};
await import("../src/domain/index.js");
const {
  normalizeOrders,
  ORDER_STATES,
  money,
  shortenedOrderNumber,
  orderTime,
} = await import("../src/domain/orders.js");
const { paymentResult, transactionState, printFulfillment } =
  await import("../src/domain/order-status.js");
const { confirmPrintReceipt, plainPrintState } =
  await import("../src/domain/print.js");
const { transactOrder } = await import("../src/domain/order-payment.js");
const { openOrderCenter, printOrderPath, safeOrderPath } =
  await import("../src/domain/order-routing.js");
const owner = "13800008000",
  other = "13900008000",
  blob = new Blob(["photo"], { type: "image/jpeg" });
const base = {
  owner,
  createdAt: 1000,
  photo: { blob, spec: "一寸" },
  amount: 200,
};
function data() {
  return {
    owner,
    print: [
      {
        ...base,
        id: "same",
        status: "shipped",
        total: 2980,
        base: 1980,
        shipping: 1000,
        quantity: 1,
        addon: 0,
        layout: "adhesive-mixed-4-8",
        events: [],
      },
    ],
    tools: [
      { ...base, id: "same", action: "repair", status: "paid" },
      {
        ...base,
        id: "outfit",
        action: "outfit",
        status: "paid",
        output: blob,
        savedId: "saved",
        outfit: "women-shirt",
      },
    ],
    electronic: [
      {
        ...base,
        id: "electronic",
        status: "paid",
        amount: 980,
        sessionId: "s",
        sessionAvailable: false,
      },
    ],
    collection: [
      {
        ...base,
        id: "record",
        number: "student-id",
        name: "测试",
        projectId: "graduate",
        status: 40,
        payment: {
          id: "receipt",
          status: "paid",
          amount: 1800,
          createdAt: 2000,
        },
      },
    ],
  };
}
function scope() {
  const d = data();
  getStore("account").session = { phone: owner };
  for (const [key, listKey, items] of [
    ["printLibrary", "orders", d.print],
    ["toolOrders", "items", d.tools],
    ["collectionRecords", "items", d.collection],
  ]) {
    const st = getStore(key);
    st[listKey] = items;
    st.ready = true;
    st.busy = false;
    st.error = "";
  }
  const hub = getStore("orderCenter");
  hub.electronic = d.electronic;
  hub.electronicReady = true;
  hub.error = "";
  hub.refresh = () => {};
  locationValue = new URL("http://127.0.0.1:4180/?page=orders");
  const s = createController("ordersFlow", [], {}).scope;
  s.sync();
  return s;
}
function printScope(status = "delivered") {
  const s = scope(),
    store = getStore("printLibrary"),
    commit = store.commit;
  store.orders = [
    {
      ...data().print[0],
      id: "checkout",
      status,
      paymentResult: paymentResult("paid"),
      paidAt: 1001,
      method: "wechat",
      address: {
        name: "测试",
        phone: "13800000000",
        region: "测试地区",
        street: "测试地址",
      },
      tracking: { number: "REAL-NUMBER", carrier: "本单承运方" },
      fulfillment: {
        status: status === "completed" ? "received" : status,
        deliveredAt: "2026-10-22T02:00:00Z",
      },
    },
  ];
  store.commit = async (mutate) => {
    const next = plainPrintState(store);
    mutate(next);
    Object.assign(store, plainPrintState(next));
  };
  s.filter("print", "paid");
  s.open(s.list[0]);
  s.sync();
  return {
    s,
    store,
    restore() {
      store.commit = commit;
      getStore("orderUi").opened = false;
    },
  };
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => server.close());
const { OrdersContent } = await server.ssrLoadModule(
  "/src/pages/OrdersPage.jsx",
);
const render = (s) =>
  renderToStaticMarkup(React.createElement(OrdersContent, { s }));

test("order center has exactly four transaction states plus the all filter", () => {
  assert.deepEqual(
    ORDER_STATES.map((s) => s.label),
    ["全部", "支付成功", "支付失败", "退款中", "已退款"],
  );
  const s = scope(),
    html = render(s);
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="radiogroup"/);
  assert.equal((html.match(/aria-checked="true"/g) || []).length, 1);
  assert.doesNotMatch(
    html,
    /待付款|付款确认中|已关闭|搜索订单|共\d+笔|已加载\d+笔/,
  );
});
test("five sources retain their own identifiers, amounts and readonly thumbnails", () => {
  const list = normalizeOrders(data());
  assert.equal(list.length, 5);
  assert.equal(new Set(list.map((o) => o.key)).size, 5);
  assert.ok(
    list.every(
      (o) =>
        o.state === "paid" &&
        o.payment === "支付成功" &&
        o.thumbnailBlob === blob &&
        !o.action &&
        !o.result &&
        !o.savedId,
    ),
  );
  const c = list.find((o) => o.type === "collection");
  assert.equal(c.number, "receipt");
  assert.equal(c.amount, 1800);
  assert.equal(
    list
      .find((o) => o.type === "outfit")
      .details.find(([k]) => k === "所选服装")[1],
    "女装 · 衬衫",
  );
  assert.equal(money(980), "¥9.80");
  assert.equal(money(undefined), "金额待确认");
});
test("hidden records remain unchanged; cancellation, timeouts and processing failures are not payment failures", () => {
  const records = [
    "pending",
    "verifying",
    "cancelled",
    "closed",
    "failed",
    "processing",
    "unknown",
  ].map((status, i) => ({ ...base, id: String(i), status }));
  records.push(
    {
      ...base,
      id: "cancel",
      status: "pending",
      paymentResult: paymentResult("pending", "cancel"),
    },
    {
      ...base,
      id: "unknown",
      status: "verifying",
      paymentResult: paymentResult("pending", "failure"),
    },
  );
  const before = structuredClone(records);
  assert.deepEqual(normalizeOrders({ owner, electronic: records }), []);
  assert.deepEqual(records, before);
  const failure = {
    ...base,
    id: "definite",
    status: "pending",
    paymentResult: {
      ...paymentResult("pending", "failure"),
      reason: "本次付款被拒绝",
    },
  };
  assert.equal(
    normalizeOrders({ owner, electronic: [failure] })[0].state,
    "failed",
  );
  failure.status = "paid";
  assert.equal(
    transactionState(failure),
    "paid",
    "a stale failed attempt cannot override confirmed payment",
  );
});
test("foreign, anonymous, fixture and compatibility-only records never become current account transactions", () => {
  const d = data();
  d.tools.push(
    { ...base, id: "same", action: "repair", status: "paid" },
    { ...base, id: "foreign", owner: other, action: "repair", status: "paid" },
    { ...base, id: "anon", owner: null, action: "repair", status: "paid" },
  );
  d.collection.push(
    { ...d.collection[0], fixture: true },
    {
      ...d.collection[0],
      id: "legacy",
      payment: { id: "legacy", status: "paid", legacyPrototype: true },
    },
  );
  assert.equal(normalizeOrders(d).length, 5);
  assert.equal(normalizeOrders({ ...d, owner: null }).length, 0);
  assert.equal(normalizeOrders({ ...d, owner: other }).length, 1);
});
test("refund facts have their own state and never rewrite actual print progress or other source data", () => {
  const d = data();
  for (const state of ["refunding", "refunded"]) {
    d.print[0].refund = {
      status: state,
      amount: 1000,
      requestedAt: 1002,
      ...(state === "refunded" ? { refundedAt: 1003, method: "original" } : {}),
    };
    const before = structuredClone(d.print[0]);
    const p = normalizeOrders(d).find((o) => o.type === "print");
    assert.equal(p.state, state);
    assert.equal(p.amount, 2980);
    assert.equal(p.refund.amount, 1000);
    assert.equal(p.fulfillment.id, "shipped");
    assert.deepEqual(d.print[0], before);
  }
  assert.equal(
    transactionState({
      status: "pending",
      refund: { status: "refunded", amount: 200 },
    }),
    null,
    "invalid refund on an unpaid draft is not fabricated as a refund",
  );
});
test("all five payment sources expose refund and definite failure consistently", () => {
  for (const state of ["failed", "refunding", "refunded"]) {
    const d = data();
    const patch =
      state === "failed"
        ? {
            status: "pending",
            paymentResult: paymentResult("pending", "failure"),
          }
        : { status: "paid", refund: { status: state, amount: 100 } };
    Object.assign(d.print[0], patch);
    d.tools.forEach((r) => Object.assign(r, patch));
    Object.assign(d.electronic[0], patch);
    Object.assign(d.collection[0].payment, patch);
    assert.ok(normalizeOrders(d).every((r) => r.state === state));
  }
});
test("legacy print producing and printing share one stage; delivery and user receipt are distinct", () => {
  for (const [status, id] of [
    ["producing", "producing"],
    ["printing", "producing"],
    ["shipped", "shipped"],
    ["delivered", "delivered"],
    ["completed", "received"],
  ]) {
    const r = { status };
    assert.equal(transactionState(r, "print"), "paid");
    assert.equal(printFulfillment(r).id, id);
    assert.equal(r.fulfillment, undefined);
  }
  assert.equal(printFulfillment({ status: "pending" }), null);
  assert.equal(
    printFulfillment({ status: "shipped", fulfillment: { status: "unknown" } }),
    null,
  );
  assert.equal(
    transactionState({ status: "pending", attempt: "failure" }, "print"),
    "failed",
  );
  assert.equal(
    transactionState({ status: "pending", attempt: "timeout" }, "print"),
    null,
  );
});
test("type and transaction filters are single-choice, intersect, and return retains filters", () => {
  const s = scope();
  getStore("toolOrders").items.push(
    {
      ...base,
      id: "fail",
      action: "repair",
      status: "pending",
      paymentResult: paymentResult("pending", "failure"),
    },
    {
      ...base,
      id: "refund",
      action: "repair",
      status: "paid",
      refund: { status: "refunding", amount: 200 },
    },
  );
  s.filter("repair", "failed");
  assert.deepEqual(
    s.list.map((o) => o.sourceId),
    ["fail"],
  );
  s.filter(s.type, "refunding");
  assert.deepEqual(
    s.list.map((o) => o.sourceId),
    ["refund"],
  );
  const revision = s.scrollRevision;
  s.open(s.list[0]);
  s.sync();
  s.back();
  s.sync();
  assert.equal(s.type, "repair");
  assert.equal(s.status, "refunding");
  assert.equal(s.scrollRevision, revision);
  s.filter("all", "pending");
  assert.equal(s.status, "all");
  assert.equal(s.list.length, 7);
  s.filter("repair", "paid,failed");
  assert.equal(s.status, "all");
  assert.equal(s.list.length, 3);
});
test("hidden-state deep links never expose a pending detail or recreate payment actions", () => {
  const s = scope();
  getStore("toolOrders").items.push({
    ...base,
    id: "hidden",
    action: "repair",
    status: "verifying",
  });
  locationValue = new URL(
    "http://127.0.0.1:4180/?page=orders&type=repair&status=verifying&id=repair:hidden",
  );
  s.sync();
  assert.equal(s.status, "all");
  assert.equal(s.current, null);
  const html = render(s);
  assert.match(html, /未找到该订单/);
  assert.doesNotMatch(html, /继续付款|查询付款结果|确认付款|取消订单/);
  assert.equal(getStore("toolOrders").items.at(-1).status, "verifying");
});
test("order center rejects obsolete payment/cancel/type dialogs and remains transaction-only", () => {
  const s = scope();
  s.open(s.list[0]);
  s.sync();
  for (const kind of ["payment", "cancel", "types", "receipt"]) {
    s.openSheet(kind);
    assert.equal(s.sheet, "");
  }
  for (const o of s.hub.all) {
    s.open(o);
    s.sync();
    const html = render(s);
    assert.match(html, /交易状态/);
    assert.match(html, /order-thumbnail/);
    assert.doesNotMatch(
      html,
      /查看照片|下载照片|查看排版|继续处理|查看采集任务|客服|服务进度|orders-footer|确认付款/,
    );
  }
});
test("print detail renders a readonly four-step progress and only delivered paid orders can confirm", () => {
  const { s, store, restore } = printScope();
  try {
    for (const id of ["producing", "shipped", "delivered", "received"]) {
      store.orders[0].fulfillment.status = id;
      const html = render(s);
      assert.match(html, /冲印进度/);
      assert.match(html, /制作中/);
      assert.match(html, /邮寄中/);
      assert.match(html, /待签收/);
      assert.match(html, /已签收/);
      assert.equal(html.includes("orders-footer"), id === "delivered");
      assert.doesNotMatch(html, /查看排版|客服|原型演示/);
    }
    store.orders[0].fulfillment.status = "delivered";
    store.orders[0].refund = { status: "refunding", amount: 2980 };
    assert.equal(s.canConfirmReceipt, false);
    assert.doesNotMatch(render(s), /orders-footer/);
  } finally {
    restore();
  }
});
test("confirmation cancel changes nothing; save is idempotent, preserves price/photo and persists received", async () => {
  const { s, store, restore } = printScope();
  try {
    const before = structuredClone(storageValue(store.orders[0]));
    s.openSheet("receipt");
    assert.equal(s.sheet, "receipt");
    s.back();
    assert.equal(s.sheet, "");
    assert.deepEqual(store.orders[0], before);
    s.openSheet("receipt");
    await Promise.all([s.confirmReceipt(), s.confirmReceipt()]);
    const r = store.orders[0];
    assert.equal(r.fulfillment.status, "received");
    assert.ok(r.fulfillment.confirmedAt);
    assert.equal(r.status, "completed");
    assert.equal(s.current.state, "paid");
    assert.equal(s.sheet, "");
    assert.equal(s.notice, "已确认收货");
    assert.equal(r.total, 2980);
    assert.equal(await r.photo.blob.text(), "photo");
    assert.equal(r.events.length, 1);
    await confirmPrintReceipt(r.id, owner);
    assert.equal(store.orders[0].events.length, 1);
    assert.equal(s.canConfirmReceipt, false);
    assert.doesNotMatch(render(s), /orders-footer/);
    const snapshot = plainPrintState(store);
    assert.deepEqual(
      snapshot.orders[0].fulfillment,
      store.orders[0].fulfillment,
    );
    assert.deepEqual(
      snapshot.orders[0].paymentResult,
      store.orders[0].paymentResult,
    );
  } finally {
    restore();
  }
});
test("confirmation guards identity, transit, refund, offline and failed storage", async () => {
  const { s, store, restore } = printScope();
  const commit = store.commit;
  try {
    await assert.rejects(confirmPrintReceipt("checkout", other), /登录/);
    store.orders[0].fulfillment.status = "shipped";
    await assert.rejects(confirmPrintReceipt("checkout", owner), /尚未送达/);
    store.orders[0].fulfillment.status = "delivered";
    store.orders[0].refund = { status: "refunded", amount: 2980 };
    await assert.rejects(confirmPrintReceipt("checkout", owner), /状态已变化/);
    delete store.orders[0].refund;
    const originalNavigator = Object.getOwnPropertyDescriptor(
      globalThis,
      "navigator",
    );
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: false },
    });
    await assert.rejects(confirmPrintReceipt("checkout", owner), /网络/);
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
    store.commit = async () => {
      throw Error("storage failure");
    };
    s.openSheet("receipt");
    await s.confirmReceipt();
    assert.match(s.paymentError, /storage failure/);
    assert.equal(s.sheet, "receipt");
    assert.equal(s.paymentBusy, false);
    assert.equal(store.orders[0].fulfillment.status, "delivered");
    store.commit = commit;
    await s.confirmReceipt();
    assert.equal(store.orders[0].fulfillment.status, "received");
  } finally {
    restore();
  }
});
test("browser back dismisses receipt confirmation before leaving its detail", () => {
  const { s, restore } = printScope();
  try {
    const detail = location.pathname + location.search;
    s.openSheet("receipt");
    locationValue = new URL(s.url(""), location.origin);
    s.sync();
    assert.equal(s.sheet, "");
    assert.equal(location.pathname + location.search, detail);
    assert.ok(s.selected);
  } finally {
    restore();
  }
});
test("refund detail displays only recorded facts, distinguishes refund amount from paid amount", () => {
  const s = scope();
  const r = getStore("toolOrders").items[0];
  r.paidAt = 1001;
  r.refund = {
    status: "refunded",
    amount: 100,
    refundedAt: 2000,
    method: "original",
  };
  s.open(s.hub.all.find((o) => o.sourceId === r.id && o.type === "repair"));
  s.sync();
  let html = render(s);
  assert.match(html, /实付金额/);
  assert.match(html, /已退金额/);
  assert.match(html, /¥1.00/);
  assert.match(html, /¥2.00/);
  assert.match(html, /原路退回/);
  assert.doesNotMatch(html, /申请退款|确认收货|orders-footer/);
  r.refund = { status: "refunding" };
  html = render(s);
  assert.match(html, /申请退款金额/);
  assert.match(html, /金额待确认/);
  assert.doesNotMatch(html, /退款时间|原路退回|¥0.00/);
});
test("failed payments show order amount, not paid amount or invented failure reasons", () => {
  const s = scope(),
    r = getStore("toolOrders").items[0];
  r.status = "pending";
  r.paymentResult = paymentResult("pending", "failure");
  s.open(s.hub.all.find((o) => o.type === "repair"));
  s.sync();
  const html = render(s);
  assert.match(html, /支付失败/);
  assert.match(html, /订单金额/);
  assert.doesNotMatch(html, /实付金额|付款被拒|orders-footer/);
});
test("signed-out and account changes do not leak current order details", () => {
  const s = scope();
  s.open(s.list[0]);
  s.sync();
  getStore("account").session = { phone: other };
  assert.equal(s.current, null);
  assert.equal(s.hub.count, 0);
  getStore("account").session = null;
  assert.match(render(s), /登录后查看订单/);
  assert.doesNotMatch(render(s), /receipt|¥18.00/);
});
test("original payment adapter still queries unknown results, reuses ids and does not process photos", async () => {
  const s = scope(),
    store = getStore("toolOrders"),
    commit = store.commit;
  store.items = [
    { ...base, id: "pay-tool", action: "repair", status: "pending" },
  ];
  store.commit = async (mutate) => {
    const next = store.items.map((r) => ({ ...r }));
    mutate(next);
    store.items = next;
  };
  const descriptor = {
    key: "repair:pay-tool",
    type: "repair",
    sourceId: "pay-tool",
    amount: 200,
  };
  try {
    await transactOrder(descriptor, { outcome: "failure" });
    assert.equal(
      s.hub.all.find((o) => o.key === descriptor.key).state,
      "failed",
    );
    await transactOrder(descriptor, { outcome: "unknown" });
    assert.equal(store.items[0].status, "verifying");
    assert.equal(
      s.hub.all.find((o) => o.key === descriptor.key),
      undefined,
    );
    await assert.rejects(transactOrder(descriptor), /状态已变化/);
    await transactOrder(descriptor, { query: true });
    assert.equal(store.items[0].status, "paid");
    assert.equal(store.items.length, 1);
    assert.equal(store.items[0].output, undefined);
    assert.equal(store.items[0].photo.blob, blob);
    assert.equal(s.hub.all.find((o) => o.key === descriptor.key).state, "paid");
  } finally {
    store.commit = commit;
  }
});
test("tool unknown payment is recovered in the original tool rather than hidden order-center UI", async () => {
  scope();
  const store = getStore("toolOrders"),
    commit = store.commit;
  store.items = [
    { ...base, id: "query", action: "repair", status: "verifying" },
  ];
  store.commit = async (mutate) => {
    const next = store.items.map((r) => ({ ...r }));
    mutate(next);
    store.items = next;
  };
  const s = createController("toolStudio", [], {}).scope;
  s.action = "repair";
  s.orderId = "query";
  let resumed = 0;
  s.resumeOrder = async (r) => {
    assert.equal(r.status, "paid");
    resumed++;
  };
  try {
    await s.restoreExistingPayment();
    assert.equal(resumed, 1);
    assert.equal(store.items.length, 1);
    assert.equal(s.paying, false);
    assert.doesNotMatch(s.error, /我的订单/);
  } finally {
    store.commit = commit;
  }
});
test("electronic original payment preserves the captured version, output, and idempotent paid recovery", async () => {
  const { database } = await import("./helpers/memory-indexeddb.mjs");
  globalThis.indexedDB = database();
  scope();
  const { writeCameraSession, readCameraSession, readElectronicOrders } =
    await import("../src/domain/camera.js");
  const record = {
    id: "recovery",
    draft: {
      id: "recovery",
      outputWidth: 295,
      outputHeight: 413,
      order: {
        id: "electronic-recovery",
        owner,
        status: "pending",
        amount: 198,
        versionId: "ordinary",
        versionName: "普通证件照",
        createdAt: 1,
      },
    },
    photo: { blob },
    output: new Blob(["ordinary-output"], { type: "image/jpeg" }),
  };
  await writeCameraSession(record);
  const order = {
    key: "electronic:electronic-recovery",
    type: "electronic",
    sourceId: "electronic-recovery",
    amount: 198,
  };
  await transactOrder(order, { outcome: "failure" });
  assert.equal(
    normalizeOrders({ owner, electronic: await readElectronicOrders() })[0]
      .state,
    "failed",
  );
  await transactOrder(order, { outcome: "unknown" });
  assert.equal(
    normalizeOrders({ owner, electronic: await readElectronicOrders() }).length,
    0,
  );
  assert.equal(
    (await readCameraSession(record.id)).draft.order.status,
    "verifying",
  );
  await transactOrder(order, { query: true });
  const receipt = (await readElectronicOrders())[0];
  assert.equal(receipt.status, "paid");
  assert.equal(receipt.versionId, "ordinary");
  assert.equal(receipt.amount, 198);
  assert.equal(await receipt.photo.blob.text(), "ordinary-output");
  assert.equal((await readElectronicOrders()).length, 1);
});
test("collection failure/query only changes payment facts; review states never drive transaction state", async () => {
  const s = scope(),
    store = getStore("collectionRecords"),
    commit = store.commit;
  store.items[0].projectId = "enrollment";
  store.items[0].payment.status = "pending";
  store.commit = async (items) => {
    store.items = items;
  };
  const order = {
    key: "collection:receipt",
    type: "collection",
    sourceId: "receipt",
    amount: 1800,
  };
  try {
    await transactOrder(order, { outcome: "failure" });
    assert.equal(
      s.hub.all.find((o) => o.type === "collection").state,
      "failed",
    );
    store.items[0].payment.status = "verifying";
    store.items[0].projectId = "association-talent";
    await transactOrder(order, { query: true });
    assert.equal(store.items[0].payment.status, "paid");
    assert.equal(store.items[0].status, 40);
    assert.equal(store.items[0].payment.amount, 1800);
  } finally {
    store.commit = commit;
  }
});
test("original print checkout can retry or query its hidden draft without another order", async () => {
  const s = scope(),
    store = getStore("printLibrary"),
    commit = store.commit;
  store.orders = [
    { ...data().print[0], id: "pending-print", status: "pending" },
  ];
  store.draft.orderId = "pending-print";
  store.commit = async (mutate) => {
    const next = plainPrintState(store);
    mutate(next);
    Object.assign(store, plainPrintState(next));
  };
  const p = createController("printStudio", [], {}).scope;
  p.$nextTick = () => {};
  p.orderId = "pending-print";
  p.view = "confirm";
  p.online = true;
  p.checkoutPayment = true;
  try {
    assert.equal(
      s.hub.all.some((o) => o.type === "print"),
      false,
    );
    p.demoOutcome = "failure";
    await p.pay();
    assert.equal(
      normalizeOrders({ owner, print: store.orders })[0].state,
      "failed",
    );
    p.demoOutcome = "timeout";
    await p.pay();
    assert.equal(store.orders[0].status, "verifying");
    assert.equal(
      s.hub.all.some((o) => o.type === "print"),
      false,
    );
    assert.equal(p.guardPendingPayment(), true);
    assert.equal(p.modal, "resolution");
    assert.equal(p.view, "confirm");
    p.resolution = "unpaid";
    await p.resolvePayment();
    assert.equal(store.orders[0].status, "pending");
    p.demoOutcome = "success";
    await p.pay();
    assert.equal(store.orders.length, 1);
    assert.equal(store.orders[0].status, "producing");
    assert.equal(store.orders[0].fulfillment.status, "producing");
    assert.equal(s.hub.all.find((o) => o.type === "print").state, "paid");
  } finally {
    store.commit = commit;
  }
});
test("thumbnails never borrow another order and old prices/pixels never infer a size or version", () => {
  const d = data(),
    output = new Blob(["output"]);
  d.tools[0].output = output;
  d.tools[1].photo = null;
  d.tools[1].output = null;
  d.print[0].photo = { blob: new Blob([]) };
  d.electronic[0].specification = "413 × 579 px";
  const list = normalizeOrders(d);
  assert.equal(list.find((o) => o.type === "repair").thumbnailBlob, output);
  assert.equal(list.find((o) => o.type === "outfit").thumbnailBlob, null);
  assert.equal(list.find((o) => o.type === "print").thumbnailBlob, null);
  const e = list.find((o) => o.type === "electronic");
  assert.equal(e.title, "证件照制作");
  assert.equal(e.description, "电子照片");
  assert.deepEqual(e.details, [["文件尺寸", "413 × 579 px"]]);
  assert.equal(
    shortenedOrderNumber("electronic-1234567890-abcdefgh"),
    "electron…abcdefgh",
  );
  assert.equal(orderTime("bad"), "未记录");
  assert.match(orderTime(Date.now()), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
});
test("legacy routes and obsolete search params preserve valid filters, back target and security", () => {
  const s = scope();
  s.filter("print", "paid");
  s.open(s.list[0]);
  s.sync();
  assert.equal(printOrderPath("same"), location.pathname + location.search);
  s.back();
  s.sync();
  assert.equal(s.status, "paid");
  assert.equal(s.type, "print");
  assert.equal(s.selected, "");
  locationValue = new URL(
    "http://127.0.0.1:4180/?page=orders&type=repair&status=paid&q=no-match",
  );
  s.sync();
  assert.equal(s.list.length, 1);
  s.open(s.list[0]);
  assert.equal(location.searchParams.has("q"), false);
  assert.equal(safeOrderPath("https://bad.test/?page=orders"), "/?page=my");
  openOrderCenter("print", "/?page=my");
  assert.equal(location.searchParams.get("type"), "print");
});
test("empty-state copy reflects the four statuses, loading and read failures", () => {
  const s = scope();
  s.filter("all", "failed");
  assert.equal(s.emptyTitle, "暂无支付失败订单");
  s.filter("repair", "refunded");
  assert.equal(s.emptyTitle, "暂无已退款订单");
  for (const key of ["printLibrary", "toolOrders", "collectionRecords"])
    getStore(key)[key === "printLibrary" ? "orders" : "items"] = [];
  s.hub.electronic = [];
  s.filter("all", "all");
  assert.equal(s.emptyTitle, "暂无订单");
  s.hub.electronicReady = false;
  assert.equal(s.emptyTitle, "正在读取订单");
  s.hub.error = "读取失败";
  assert.equal(s.emptyTitle, "订单暂时无法加载");
});

test("fresh tool entry retains an unresolved original payment and exposes query before image checks", async () => {
  scope();
  const store = getStore("toolOrders");
  store.items = [
    {
      ...base,
      id: "uncertain-original",
      action: "repair",
      status: "verifying",
    },
  ];
  store.loading = Promise.resolve();
  const tool = createController("toolStudio", [], {}).scope;
  tool.action = "repair";
  tool.route = () => {};
  await tool.start();
  assert.equal(tool.orderId, "uncertain-original");
  assert.equal(tool.step, 1);
  assert.equal(tool.primaryLabel, "查询付款结果");
  assert.equal(tool.primaryEnabled, true);
  assert.equal(tool.repairSettingsLocked, true);
  assert.equal(store.items.length, 1);
  assert.equal(tool.photo.blob, blob);
  assert.match(tool.error, /先查询原订单/);
});

test("non-print processing, delivery and completion labels never imply a successful payment", () => {
  for (const status of [
    "producing",
    "printing",
    "shipped",
    "delivered",
    "completed",
  ]) {
    const d = data();
    d.electronic[0].status = status;
    d.tools.forEach((r) => {
      r.status = status;
    });
    d.collection[0].payment.status = status;
    const rows = normalizeOrders(d);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, "print");
  }
});
