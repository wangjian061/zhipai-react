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
test("five sources preserve amounts and business progress; payment never implies production completion", () => {
  const list = normalizeOrders(data());
  assert.equal(list.length, 5);
  assert.equal(new Set(list.map((o) => o.key)).size, 5);
  assert.equal(list.find((o) => o.type === "print").state, "processing");
  assert.equal(list.find((o) => o.type === "repair").state, "processing");
  assert.equal(list.find((o) => o.type === "outfit").state, "complete");
  assert.equal(list.find((o) => o.type === "outfit").photo, blob);
  assert.equal(
    list.find((o) => o.type === "outfit").details[1][1],
    "女装 · 衬衫",
  );
  const c = list.find((o) => o.type === "collection");
  assert.equal(c.state, "processing");
  assert.equal(c.progress, "审核未通过");
  assert.equal(c.tone, "red");
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
        verifying: "processing",
        producing: "processing",
        completed: "complete",
        cancelled: "closed",
      }[status],
    );
  }
});
test("personal order details identify the purchased version and preserve its captured price and photo", () => {
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
  assert.deepEqual(ordinary.details[0], ["照片版本", "普通证件照"]);
  assert.equal(ordinary.photo, blob);
  assert.equal(refined.savedId, "retouched-photo");
});
test("collection status grouping keeps review/CHSI progress and captured payment price", () => {
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
    assert.equal(o.state, state, String(status));
    assert.equal(o.tone, tone);
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
test("hub counts, type/status/search filters and contextual navigation use one account-scoped source", () => {
  const s = scope();
  assert.equal(s.hub.count, 5);
  assert.equal(s.count("processing"), 3);
  s.filter("outfit", "all");
  assert.equal(s.list.length, 1);
  s.open(s.list[0]);
  s.sync();
  assert.equal(s.current.type, "outfit");
  const back = s.url();
  s.continue();
  assert.equal(location.searchParams.get("resume"), "outfit");
  assert.equal(location.searchParams.get("orderBack"), back);
  assert.equal(returnToOrderCenter(), true);
  s.sync();
  assert.equal(s.current.type, "outfit");
  s.back();
  s.sync();
  assert.equal(s.selected, "");
  assert.equal(s.type, "outfit");
  s.filter("all", "all");
  s.query = "student-id";
  assert.equal(s.list.length, 0);
  s.query = "receipt";
  assert.equal(s.list.length, 1);
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
test("source rendering exposes list filters and one detail action, plus signed-out/error states", () => {
  const s = scope();
  let html = renderToStaticMarkup(React.createElement(OrdersContent, { s }));
  assert.match(html, /订单状态/);
  assert.match(html, /订单类型/);
  assert.match(html, /¥9.80/);
  assert.match(html, /照片换装/);
  s.open(s.list.find((o) => o.type === "collection"));
  s.sync();
  html = renderToStaticMarkup(React.createElement(OrdersContent, { s }));
  assert.match(html, /审核未通过/);
  assert.match(html, /查看采集任务/);
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
  s.filter("print", "processing");
  s.query = "same";
  s.search();
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
    assert.equal(s.status, "processing");
    assert.equal(s.query, "same");
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
    assert.equal(s.current.state, "processing");
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

test("print detail renders transaction and delivery once, reveals layout on demand and varies payment actions by status", () => {
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
      assert.match(html, /查看排版照片/);
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

test("layout preview uses transient history and back closes it without leaving the order", () => {
  const { p, restore } = printScope();
  const push = history.pushState,
    oldBack = history.back;
  const path = location.pathname + location.search;
  history.pushState = function (state, title, url) {
    this.state = state;
    push(state, title, url);
  };
  history.back = () => {
    history.state = null;
    p.syncLocation();
  };
  try {
    p.showModal("layout");
    assert.equal(p.modal, "layout");
    assert.equal(history.state.zhipaiPrintLayout, "checkout");
    p.closeModal();
    assert.equal(p.modal, null);
    assert.equal(getStore("printUi").opened, false);
    assert.equal(location.pathname + location.search, path);
    assert.equal(p.order.id, "checkout");
  } finally {
    history.pushState = push;
    history.back = oldBack;
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
