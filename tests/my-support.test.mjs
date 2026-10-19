// Source render and isolated state checks; no browser or external mail application.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
after(() => server.close());
const { default: Sheet } = await server.ssrLoadModule(
  "/src/components/MySupportSheet.jsx",
);
const source = fs
  .readFileSync("src/domain/my.js", "utf8")
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replace(/^export \{[\s\S]*?\};/m, "");
function setup(writeText = async () => {}) {
  let factory;
  vm.runInNewContext(source, {
    registerStore() {},
    registerController(n, f) {
      factory = f;
    },
    navigator: { clipboard: { writeText } },
    document: { activeElement: null },
  });
  const s = factory();
  s.$store = { myUi: { opened: false } };
  s.$nextTick = (fn) => fn();
  s.$refs = {
    dialog: {
      querySelector() {
        return { focus() {} };
      },
    },
  };
  return s;
}
const render = (s) =>
  renderToStaticMarkup(React.createElement(Sheet, { scope: s }));
test("contact stays in one drawer and email navigation exists only after confirmation", () => {
  const s = setup();
  s.showPanel("support");
  assert.equal(s.panelTitle, "客服中心");
  assert.equal(s.$store.myUi.opened, true);
  assert.ok(render(s).includes("客服邮箱"));
  assert.ok(!render(s).includes("mailto:"));
  s.requestSupportEmail();
  assert.equal(s.panelTitle, "打开邮箱");
  assert.ok(render(s).includes("mailto:zpai_service@163.com"));
  assert.ok(render(s).includes("取消"));
  s.cancelSupportEmail();
  assert.ok(!render(s).includes("mailto:"));
  s.closePanel();
  assert.equal(render(s), "");
  s.showPanel("support");
  assert.equal(s.supportEmailConfirm, false);
});
test("copy supports denied clipboard fallback and ignores completions after closing", async () => {
  let copied;
  const s = setup(async (text) => {
    copied = text;
  });
  s.showPanel("support");
  await s.copySupportEmail();
  assert.equal(copied, "zpai_service@163.com");
  assert.equal(s.supportNotice, "客服邮箱已复制");
  const denied = setup(async () => {
    throw Error("denied");
  });
  denied.showPanel("support");
  await denied.copySupportEmail();
  assert.equal(denied.supportCopyManual, true);
  assert.ok(render(denied).includes("手动复制客服邮箱"));
  let release;
  const slow = setup(() => new Promise((r) => (release = r)));
  slow.showPanel("support");
  const job = slow.copySupportEmail();
  slow.closePanel();
  slow.showPanel("support");
  release();
  await job;
  assert.equal(slow.supportNotice, "");
  assert.equal(slow.supportCopyManual, false);
});
