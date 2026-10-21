// Domain and source-render tests only; no browser interaction.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { getStore, createController } from "../src/runtime/state.js";
let locationValue = new URL("http://127.0.0.1:4180/?page=orders");
Object.defineProperty(globalThis, "location", {
  configurable: true,
  get: () => locationValue,
});
globalThis.window = new EventTarget();
globalThis.history = {
  pushState(a, b, url) {
    locationValue = new URL(url, locationValue);
  },
  replaceState(a, b, url) {
    locationValue = new URL(url, locationValue);
  },
};
await import("../src/domain/index.js");
const { normalizeOrders, money } = await import("../src/domain/orders.js");
const { openOrderCenter, returnToOrderCenter, safeOrderPath } =
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
      { ...base, id: "same", status: "shipped", total: 2400, quantity: 2 },
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
test("five sources retain identification thumbnails without exposing business actions", () => {
  const list = normalizeOrders(data());
  assert.equal(list.length, 5);
  assert.equal(new Set(list.map((o) => o.key)).size, 5);
  assert.ok(list.every((o) => o.state === "paid"));
  assert.ok(list.every((o) => o.thumbnailBlob === blob));
  assert.ok(
    list.every(
      (o) => !o.action && !o.photo && !o.progress && !o.result && !o.savedId,
    ),
  );
  assert.equal(
    list.find((o) => o.type === "outfit").details[0][1],
    "女装 · 衬衫",
  );
  const c = list.find((o) => o.type === "collection");
  assert.equal(c.payment, "已支付");
  assert.equal(c.number, "receipt");
  assert.equal(c.amount, 1800);
  assert.equal(money(980), "¥9.80");
  assert.equal(money(undefined), "金额待确认");
});
test("orders exclude foreign, anonymous and fixture records; retries and immutable source ids do not duplicate", () => {
  const d = data();
  d.tools.push(
    { ...base, id: "same", action: "repair", status: "paid" },
    { ...base, id: "foreign", owner: other, action: "repair" },
    { ...base, id: "old", owner: null, action: "repair" },
  );
  d.collection.push(
    { ...d.collection[0], id: "example", fixture: true },
    {
      ...d.collection[0],
      id: "legacy",
      payment: { id: "legacy-receipt", status: "paid", legacyPrototype: true },
    },
  );
  assert.equal(normalizeOrders(d).length, 5);
  assert.equal(normalizeOrders({ ...d, owner: null }).length, 0);
  assert.equal(normalizeOrders({ ...d, owner: other }).length, 1);
  for (const status of [
    "pending",
    "verifying",
    "producing",
    "completed",
    "cancelled",
  ]) {
    const p = normalizeOrders({
      owner,
      print: [{ ...base, id: "p", total: 400, status }],
    })[0];
    assert.equal(
      p.state,
      {
        pending: "pending",
        verifying: "verifying",
        producing: "paid",
        completed: "paid",
        cancelled: "closed",
      }[status],
    );
  }
});
test("personal orders identify the purchased version and price once with the matching thumbnail", () => {
  const d = data();
  d.electronic = [
    {
      ...base,
      id: "ordinary-order",
      versionId: "ordinary",
      versionName: "普通证件照",
      amount: 198,
      status: "paid",
      savedId: "ordinary-photo",
      specification: "295 × 413 px",
    },
    {
      ...base,
      id: "retouched-order",
      versionId: "retouched",
      versionName: "精修证件照",
      amount: 980,
      status: "paid",
      savedId: "retouched-photo",
      specification: "295 × 413 px",
    },
  ];
  const orders = normalizeOrders(d).filter(
    (order) => order.type === "electronic",
  );
  assert.equal(orders.length, 2);
  const ordinary = orders.find((order) => order.amount === 198);
  const refined = orders.find((order) => order.amount === 980);
  assert.equal(ordinary.title, "普通证件照解锁");
  assert.equal(refined.title, "精修证件照解锁");
  assert.deepEqual(ordinary.details, []);
  assert.equal(ordinary.description, "295 × 413 px");
  assert.equal(ordinary.thumbnailBlob, blob);
  assert.equal(refined.savedId, undefined);
});
test("collection review states never change payment grouping or its captured price", () => {
  for (const [status, state, tone] of [
    [22, "processing", "blue"],
    [23, "processing", "red"],
    [24, "processing", "orange"],
    [25, "processing", "orange"],
    [26, "processing", "orange"],
    [30, "complete", "green"],
    ["uploaded", "complete", "green"],
    ["upload_failed", "processing", "red"],
  ]) {
    const d = data();
    d.collection[0].status = status;
    const o = normalizeOrders(d).find((o) => o.type === "collection");
    assert.equal(o.state, "paid", String(status));
    assert.equal(o.tone, undefined);
    assert.equal(o.progress, undefined);
    assert.equal(o.amount, 1800);
  }
});
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
test("hub counts, type/status filters and contextual navigation use one account-scoped source", () => {
  const s = scope();
  assert.equal(s.hub.count, 5);
  assert.equal(s.count("paid"), 5);
  s.filter("outfit", "all");
  assert.equal(s.list.length, 1);
  s.open(s.list[0]);
  s.sync();
  assert.equal(s.current.type, "outfit");
  const back = s.url();
  s.continue();
  assert.equal(location.pathname + location.search, back);
  assert.equal(s.paymentOpen, false);
  s.sync();
  assert.equal(s.current.type, "outfit");
  s.back();
  s.sync();
  assert.equal(s.selected, "");
  assert.equal(s.type, "outfit");
  s.filter("all", "all");
  assert.equal(s.list.length, 5);
  s.open(s.list[0]);
  getStore("account").session = { phone: other };
  assert.equal(s.current, null);
  assert.equal(s.hub.count, 0);
  assert.equal(safeOrderPath("https://bad.test/?page=orders"), "/?page=my");
  openOrderCenter("print", "/?page=print&print=preview");
  assert.equal(location.searchParams.get("type"), "print");
  assert.equal(location.searchParams.get("back"), "/?page=print&print=preview");
});
test("business detail back actions return to their originating filtered order hub", () => {
  scope();
  const target =
    "/?page=orders&type=collection&status=processing&id=collection%3Areceipt&back=%2F%3Fpage%3Dmy";
  for (const [name, view] of [
    ["collectionFlow", "detail"],
    ["albumCenter", "detail"],
    ["printStudio", "order"],
    ["toolStudio", "work"],
    ["cameraStudio", "editor"],
  ]) {
    locationValue = new URL(
      "http://127.0.0.1:4180/?page=tool&orderBack=" +
        encodeURIComponent(target),
    );
    const s = createController(name, [], {}).scope;
    s.view = view;
    s.back();
    assert.equal(location.search, target.slice(1), name);
  }
});
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => server.close());
const { OrdersContent } = await server.ssrLoadModule(
  "/src/pages/OrdersPage.jsx",
);
test("source rendering exposes transaction filters, paid details without business actions and signed-out states", () => {
  const s = scope();
  let html = renderToStaticMarkup(React.createElement(OrdersContent, { s }));
  assert.match(html, /订单状态/);
  assert.match(html, /订单类型/);
  assert.doesNotMatch(html, /搜索订单|orders-search|<form|order-service-icon/);
  assert.match(html, /暂无订单照片/);
  assert.match(html, /¥9.80/);
  assert.match(html, /照片换装/);
  s.open(s.list.find((o) => o.type === "collection"));
  s.sync();
  html = renderToStaticMarkup(React.createElement(OrdersContent, { s }));
  assert.doesNotMatch(html, /审核未通过|查看采集任务|orders-footer/);
  assert.match(html, /已支付/);
  assert.match(html, /receipt/);
  assert.doesNotMatch(html, /student-id/);
  getStore("account").session = null;
  html = renderToStaticMarkup(React.createElement(OrdersContent, { s }));
  assert.match(html, /登录后查看订单/);
  assert.doesNotMatch(html, /receipt|¥18.00/);
});

test("print details share one canonical route including legacy result links and retained filters", async () => {
  const s = scope();
  const { printOrderPath } = await import("../src/domain/order-routing.js");
  s.filter("print", "paid");
  s.open(s.list[0]);
  s.sync();
  const canonical = location.pathname + location.search;
  assert.equal(printOrderPath("same"), canonical);
  s.continue();
  assert.equal(location.pathname + location.search, canonical);
  const p = createController("printStudio", [], {}).scope;
  p.$nextTick = () => {};
  p.$el = { querySelectorAll: () => [] };
  const onRoute = () => p.syncLocation();
  window.addEventListener("zhipai-route", onRoute);
  try {
    for (const view of ["order", "result"]) {
      locationValue = new URL(
        "http://127.0.0.1:4180/?page=print&print=" +
          view +
          "&order=same&orderBack=" +
          encodeURIComponent(canonical),
      );
      p.syncLocation();
      assert.equal(location.pathname + location.search, canonical);
      assert.equal(p.order.id, "same");
      assert.equal(p.view, "order");
    }
    p.route("order", { order: "same" }, true);
    assert.equal(location.pathname + location.search, canonical);
    s.sync();
    s.back();
    s.sync();
    assert.equal(s.type, "print");
    assert.equal(s.status, "paid");
    assert.equal(location.searchParams.has("q"), false);
    assert.equal(s.selected, "");
    locationValue = new URL(
      "http://127.0.0.1:4180/?page=print&print=order&order=same",
    );
    const fallback = new URL(
      printOrderPath("same", "/?page=print&print=order&order=same"),
      location.origin,
    );
    assert.equal(fallback.searchParams.get("back"), "/?page=my");
  } finally {
    window.removeEventListener("zhipai-route", onRoute);
  }
});

function printScope() {
  const s = scope(),
    store = getStore("printLibrary");
  store.busy = false;
  store.orders = [
    {
      ...base,
      id: "checkout",
      status: "pending",
      total: 2980,
      base: 1980,
      shipping: 1000,
      quantity: 1,
      addon: 0,
      layout: "adhesive-mixed-4-8",
      layoutSnapshot: { id: "adhesive-mixed-4-8", name: "4大8小" },
      address: {
        name: "测试",
        phone: "13800000000",
        region: "测试省市",
        street: "测试地址",
      },
      events: [],
    },
  ];
  store.draft.orderId = "checkout";
  const commit = store.commit;
  store.commit = async (mutate) => {
    store.busy = true;
    try {
      mutate(store);
    } finally {
      store.busy = false;
    }
  };
  s.filter("print", "pending");
  s.open(s.list[0]);
  s.sync();
  const p = createController("printStudio", [], {}).scope;
  p.$nextTick = () => {};
  p.online = true;
  p.syncLocation();
  return {
    s,
    p,
    store,
    restore() {
      store.commit = commit;
      getStore("printUi").opened = false;
    },
  };
}

test("unified print detail continues the original payment, resolves unknown results and never creates another order", async () => {
  const { s, p, store, restore } = printScope();
  globalThis.document = { activeElement: null };
  const onRoute = () => p.syncLocation();
  window.addEventListener("zhipai-route", onRoute);
  try {
    const path = location.pathname + location.search;
    p.continuePayment();
    assert.equal(p.modal, "payment");
    assert.equal(p.checkoutPayment, false);
    p.demoOutcome = "timeout";
    await Promise.all([p.pay(), p.pay()]);
    assert.equal(p.order.status, "verifying");
    assert.equal(p.modal, null);
    assert.equal(store.orders.length, 1);
    assert.equal(p.order.total, 2980);
    p.continuePayment();
    assert.equal(p.modal, null);
    p.showModal("resolution");
    p.resolution = "unknown";
    await p.resolvePayment();
    assert.equal(p.order.status, "verifying");
    assert.equal(p.modal, "resolution");
    p.resolution = "paid";
    await p.resolvePayment();
    assert.equal(p.order.status, "producing");
    assert.equal(p.modal, null);
    assert.equal(location.pathname + location.search, path);
    assert.equal(s.current.payment, "已支付");
    assert.equal(s.current.state, "paid");
    assert.equal(store.draft.completedOrderId, "checkout");
    assert.equal(store.orders.length, 1);
  } finally {
    window.removeEventListener("zhipai-route", onRoute);
    restore();
  }
});

test("detail payment success stays on the same detail; cancel only applies to pending orders", async () => {
  const { p, store, restore } = printScope();
  try {
    const path = location.pathname + location.search;
    p.continuePayment();
    await p.pay();
    assert.equal(p.order.status, "producing");
    assert.equal(p.modal, null);
    assert.equal(getStore("printUi").opened, false);
    assert.equal(location.pathname + location.search, path);
    await p.cancelOrder();
    assert.equal(p.order.status, "producing");
    p.order.status = "pending";
    p.showModal("cancel");
    await p.cancelOrder();
    assert.equal(p.order.status, "cancelled");
    assert.equal(p.modal, null);
    assert.ok(p.order.photo.blob);
    assert.ok(p.order.address);
    assert.equal(store.draft.orderId, null);
  } finally {
    restore();
  }
});

test("print detail shows transaction and delivery without layout previews or production controls", () => {
  const { s, p, restore } = printScope();
  try {
    for (const status of [
      "pending",
      "verifying",
      "producing",
      "printing",
      "shipped",
      "completed",
      "cancelled",
    ]) {
      p.order.status = status;
      const html = renderToStaticMarkup(
        React.createElement(OrdersContent, { s, print: p }),
      );
      assert.match(html, /配送信息/);
      assert.doesNotMatch(html, /查看排版照片|原型演示|订单记录|<img/);
      assert.match(html, /¥29.80/);
      assert.doesNotMatch(html, /查看冲印详情|客服|背胶模切排版预览/);
      assert.equal(
        (html.match(/<h1[^>]*[^>]*title="订单详情"/g) || []).length,
        1,
      );
      assert.equal(html.includes("继续付款"), status === "pending");
      assert.equal(html.includes("取消订单"), status === "pending");
      assert.equal(html.includes("查询付款结果"), status === "verifying");
      if (["producing", "printing", "shipped", "completed"].includes(status))
        assert.match(html, /实付金额/);
    }
  } finally {
    restore();
  }
});

test("nested order controller retains its own lifecycle route handler", () => {
  const { p, restore } = printScope();
  p.onRoute = () => p.syncLocation();
  const printHandler = p.onRoute;
  const orders = createController("ordersFlow", [], p);
  try {
    orders.start();
    assert.equal(p.onRoute, printHandler);
    assert.notEqual(orders.scope.onRoute, printHandler);
  } finally {
    orders.stop();
    restore();
  }
});

test("all paid service details use read-only thumbnails, unique specifications and no business entry", () => {
  const s = scope();
  for (const order of s.hub.all) {
    s.open(order);
    s.sync();
    const html = renderToStaticMarkup(
      React.createElement(OrdersContent, { s }),
    );
    assert.match(html, /order-thumbnail/);
    assert.doesNotMatch(
      html,
      /<img|查看照片|下载照片|查看排版|继续处理|查看采集任务|客服|服务进度|orders-footer/,
    );
    if (order.description)
      assert.equal(html.split(order.description).length - 1, 1);
  }
});

test("non-print payments stay in orders, reuse receipts, query uncertain responses and never process photos", async () => {
  const { transactOrder } = await import("../src/domain/order-payment.js");
  const s = scope(),
    store = getStore("toolOrders"),
    originalCommit = store.commit;
  store.items = [
    { ...base, id: "pay-tool", action: "repair", status: "pending" },
  ];
  store.commit = async (mutate) => {
    const items = store.items.map((r) => ({ ...r }));
    mutate(items);
    store.items = items;
  };
  try {
    s.open(s.hub.all.find((o) => o.sourceId === "pay-tool"));
    s.sync();
    const path = location.href;
    s.continue();
    assert.equal(s.paymentOpen, true);
    assert.equal(getStore("orderUi").opened, true);
    s.paymentOutcome = "unknown";
    await Promise.all([s.pay(), s.pay()]);
    assert.equal(store.items.length, 1);
    assert.equal(store.items[0].status, "verifying");
    assert.equal(s.current.state, "verifying");
    await assert.rejects(transactOrder(s.current), /状态已变化/);
    assert.equal(store.items[0].output, undefined);
    s.paymentOutcome = "success";
    await s.pay();
    assert.equal(s.current.state, "paid");
    assert.equal(store.items[0].amount, 200);
    assert.equal(store.items[0].photo.blob, blob);
    assert.equal(store.items[0].output, undefined);
    assert.equal(s.paymentOpen, false);
    assert.equal(location.href, path);
    await assert.rejects(transactOrder(s.current), /状态已变化/);
  } finally {
    store.commit = originalCommit;
  }
});

test("collection pay/query updates only its payment; closed projects can query an existing uncertain payment", async () => {
  const { transactOrder } = await import("../src/domain/order-payment.js");
  const s = scope(),
    store = getStore("collectionRecords"),
    originalCommit = store.commit;
  const record = {
    ...data().collection[0],
    projectId: "enrollment",
    payment: { id: "receipt", status: "pending", amount: 1800 },
  };
  store.items = [record];
  store.commit = async (items) => {
    store.items = items;
  };
  const order = () => s.hub.all.find((o) => o.type === "collection");
  try {
    const path = location.href;
    await transactOrder(order(), { outcome: "failure" });
    assert.equal(store.items[0].payment.status, "pending");
    store.items[0].projectId = "association-talent";
    await assert.rejects(transactOrder(order()), /不支持付款/);
    store.items[0].payment.status = "verifying";
    await transactOrder(order(), { query: true });
    assert.equal(store.items[0].payment.status, "paid");
    assert.equal(store.items[0].status, record.status);
    assert.equal(store.items[0].payment.amount, 1800);
    assert.equal(location.href, path);
  } finally {
    store.commit = originalCommit;
  }
});

test("payment persistence failure and account mismatch never create or complete another transaction", async () => {
  const { transactOrder } = await import("../src/domain/order-payment.js");
  const s = scope(),
    store = getStore("toolOrders"),
    originalCommit = store.commit;
  store.items = [{ ...base, id: "guard", action: "outfit", status: "pending" }];
  const order = s.hub.all.find((o) => o.sourceId === "guard");
  try {
    store.commit = async () => {
      throw Error("storage failure");
    };
    await assert.rejects(transactOrder(order), /storage failure/);
    assert.equal(store.items[0].status, "pending");
    getStore("account").session = { phone: other };
    await assert.rejects(transactOrder(order), /状态已变化/);
    assert.equal(store.items.length, 1);
  } finally {
    store.commit = originalCommit;
  }
});

test("paid unfinished photo recovery stays in album and the original tool, outside orders", async () => {
  const { pendingPurchasedResults } =
    await import("../src/domain/pending-results.js");
  const s = scope();
  let pending = pendingPurchasedResults(owner);
  assert.equal(pending.length, 2);
  assert.equal(pendingPurchasedResults(other).length, 0);
  assert.deepEqual(
    pendingPurchasedResults(owner, "repair").map((r) => r.type),
    ["repair"],
  );
  assert.equal(pendingPurchasedResults(owner, "outfit").length, 0);
  getStore("toolOrders").items[0].savedId = "saved";
  getStore("orderCenter").electronic[0].savedId = "saved-electronic";
  assert.equal(pendingPurchasedResults(owner).length, 0);
  assert.equal(s.hub.all.length, 5);
});

test("returning to a stale tool payment view cannot pay an already paid or uncertain order again", async () => {
  scope();
  const store = getStore("toolOrders");
  store.items = [
    { ...base, id: "guard-existing", action: "repair", status: "verifying" },
  ];
  const s = createController("toolStudio", [], {}).scope;
  s.action = "repair";
  s.orderId = "guard-existing";
  let resumed = 0;
  s.resumeOrder = async (order) => {
    assert.equal(order.status, "paid");
    resumed++;
  };
  assert.equal(await s.restoreExistingPayment(), true);
  assert.match(s.error, /我的订单/);
  assert.equal(resumed, 0);
  store.items[0].status = "paid";
  assert.equal(await s.restoreExistingPayment(), true);
  assert.equal(resumed, 1);
  assert.equal(store.items[0].amount, 200);
});

test("electronic order payment locks the captured version and paid-photo recovery is idempotent", async () => {
  const { database } = await import("./helpers/memory-indexeddb.mjs");
  globalThis.indexedDB = database();
  const { writeCameraSession, readCameraSession, readElectronicOrders } =
    await import("../src/domain/camera.js");
  const { transactOrder } = await import("../src/domain/order-payment.js");
  const { savePurchasedElectronic } =
    await import("../src/domain/pending-results.js");
  const s = scope();
  const record = {
    id: "receipt-recovery",
    draft: {
      id: "receipt-recovery",
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
    photo: { blob: new Blob(["source"], { type: "image/jpeg" }) },
    output: new Blob(["ordinary-output"], { type: "image/jpeg" }),
  };
  await writeCameraSession(record);
  const normalized = normalizeOrders({
    owner,
    electronic: await readElectronicOrders(),
  })[0];
  await transactOrder(normalized, { outcome: "unknown" });
  assert.equal(
    (await readCameraSession(record.id)).draft.order.status,
    "verifying",
  );
  await transactOrder(normalized, { query: true });
  let receipt = (await readElectronicOrders())[0];
  assert.equal(receipt.status, "paid");
  assert.equal(receipt.amount, 198);
  assert.equal(receipt.versionId, "ordinary");
  assert.equal(await receipt.photo.blob.text(), "ordinary-output");
  const library = getStore("photoLibrary"),
    commit = library.commit;
  library.ready = true;
  library.busy = false;
  library.finished = [];
  library.commit = async (next) => {
    library.finished = next.finished;
  };
  const previousImage = globalThis.Image;
  globalThis.Image = class {
    naturalWidth = 295;
    naturalHeight = 413;
    async decode() {}
  };
  try {
    await Promise.all([
      savePurchasedElectronic(receipt.id),
      savePurchasedElectronic(receipt.id),
    ]);
    await savePurchasedElectronic(receipt.id);
    assert.equal(library.finished.length, 1);
    assert.equal(await library.finished[0].blob.text(), "ordinary-output");
    assert.equal(library.finished[0].versionId, "ordinary");
    receipt = (await readElectronicOrders())[0];
    assert.equal(receipt.savedId, library.finished[0].id);
    assert.equal(
      (await readCameraSession(record.id)).draft.savedId,
      receipt.savedId,
    );
    assert.equal((await readElectronicOrders()).length, 1);
  } finally {
    library.commit = commit;
    globalThis.Image = previousImage;
  }
});

test("thumbnails select the matching output, use own input before output and never another order", () => {
  const output = new Blob(["retouched-output"], { type: "image/jpeg" });
  const purchased = new Blob(["purchased-version"], { type: "image/jpeg" });
  const d = data();
  d.tools[0].output = output;
  d.tools[1].photo = null;
  d.tools[1].output = null;
  d.electronic[0].photo = { blob: purchased };
  d.print[0].photo = { blob: new Blob([]) };
  d.collection[0].photo = null;
  const items = normalizeOrders(d);
  assert.equal(items.find((o) => o.type === "repair").thumbnailBlob, output);
  assert.equal(
    items.find((o) => o.type === "electronic").thumbnailBlob,
    purchased,
  );
  for (const type of ["print", "outfit", "collection"])
    assert.equal(items.find((o) => o.type === type).thumbnailBlob, null);
  d.tools[0].output = null;
  assert.equal(
    normalizeOrders(d).find((o) => o.type === "repair").thumbnailBlob,
    blob,
  );
});

test("obsolete q links cannot hide orders or propagate search on navigation", () => {
  const s = scope();
  locationValue = new URL(
    "http://127.0.0.1:4180/?page=orders&type=repair&status=paid&q=no-match",
  );
  s.sync();
  assert.equal(s.list.length, 1);
  assert.equal(s.list[0].type, "repair");
  assert.equal(s.query, undefined);
  assert.equal(s.searchOpen, undefined);
  s.open(s.list[0]);
  s.sync();
  assert.equal(location.searchParams.has("q"), false);
  assert.equal(s.current.type, "repair");
  s.back();
  s.sync();
  assert.equal(s.status, "paid");
  assert.equal(s.type, "repair");
  assert.equal(s.list.length, 1);
});

test("empty copy distinguishes selected filters, first purchase, loading and unavailable data", () => {
  const s = scope();
  s.filter("all", "pending");
  assert.equal(s.emptyTitle, "暂无待付款订单");
  assert.equal(s.emptyDescription, "可切换订单状态或类型查看");
  s.filter("repair", "closed");
  assert.equal(s.emptyTitle, "暂无已关闭订单");
  for (const key of ["printLibrary", "toolOrders", "collectionRecords"])
    getStore(key)[key === "printLibrary" ? "orders" : "items"] = [];
  s.hub.electronic = [];
  s.filter("all", "all");
  assert.equal(s.emptyTitle, "暂无订单");
  assert.equal(s.emptyDescription, "购买的服务将在这里展示");
  s.hub.electronicReady = false;
  assert.equal(s.emptyTitle, "正在读取订单");
  assert.equal(s.emptyDescription, "");
  s.hub.error = "读取失败";
  assert.equal(s.emptyTitle, "订单暂时无法加载");
  assert.equal(s.emptyDescription, "请重试加载后查看完整订单");
});
