// Source render and action checks only; no browser or UI automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
after(() => server.close());
const { default: MyOverview } = await server.ssrLoadModule(
  "/src/components/MyOverview.jsx",
);
function setup(loggedIn) {
  const calls = [];
  const s = {
    myView: "overview",
    $store: {
      account: { loggedIn, masked: "138****8000" },
      photoLibrary: { finished: [{}, {}] },
      orderCenter: { ready: true, count: 5, pendingCount: 2 },
    },
  };
  for (const name of [
    "accountRoute",
    "go",
    "openOrders",
    "showPanel",
    "openShare",
  ])
    s[name] = (...args) => calls.push([name, ...args]);
  return { s, calls };
}
function nodes(tree) {
  return React.Children.toArray(tree).flatMap((n) =>
    React.isValidElement(n) ? [n, ...nodes(n.props.children)] : [],
  );
}
test("personal hub retains all account, library, order, help and settings destinations", () => {
  const { s, calls } = setup(true);
  const tree = MyOverview({ scope: s });
  for (const n of nodes(tree).filter((n) => n.type === "button"))
    n.props.onClick();
  assert.deepEqual(calls, [
    ["accountRoute", "security", "/?page=my"],
    ["go", "album"],
    ["openOrders"],
    ["showPanel", "guide"],
    ["showPanel", "support"],
    ["showPanel", "feedback"],
    ["showPanel", "language"],
    ["accountRoute", "security", "/?page=my"],
    ["accountRoute", "privacy", "/?page=my"],
    ["openShare"],
  ]);
});
test("signed-out security requires login while privacy stays public; counts come from current stores", () => {
  const { s, calls } = setup(false);
  const elements = nodes(MyOverview({ scope: s }));
  const buttons = elements.filter((n) => n.type === "button");
  buttons[0].props.onClick();
  buttons[7].props.onClick();
  buttons[8].props.onClick();
  assert.deepEqual(calls, [
    ["accountRoute", "welcome", "/?page=my"],
    ["accountRoute", "welcome", "/?page=my"],
    ["accountRoute", "privacy", "/?page=my"],
  ]);
  const html = renderToStaticMarkup(
    React.createElement(MyOverview, { scope: s }),
  );
  assert.ok(html.includes("登录 / 注册"));
  assert.ok(!html.includes("138****8000"));
  assert.ok(html.includes("登录后查看"));
  assert.deepEqual(
    elements.filter((n) => n.type === "b").map((n) => n.props.children),
    [2, "—"],
  );
  s.$store.photoLibrary.finished = [];
  s.$store.orderCenter.count = 0;
  assert.deepEqual(
    nodes(MyOverview({ scope: s }))
      .filter((n) => n.type === "b")
      .map((n) => n.props.children),
    [0, "—"],
  );
  for (const img of elements.filter((n) => n.type === "img"))
    assert.ok(fs.existsSync("public/" + img.props.src));
});
test("sharing stays a separate page and authenticated hub displays only the masked identifier", () => {
  const { s } = setup(true);
  const html = renderToStaticMarkup(
    React.createElement(MyOverview, { scope: s }),
  );
  assert.ok(html.includes("138****8000"));
  assert.ok(html.includes("2笔待付款"));
  assert.ok(html.includes("<b>5</b>"));
  assert.ok(html.includes("帮助与服务") && html.includes("偏好与设置"));
  s.myView = "share";
  assert.equal(MyOverview({ scope: s }), null);
});
