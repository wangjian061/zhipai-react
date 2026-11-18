// Render the real page with isolated state. No browser, file picker or payment.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument } from "htmlparser2";
import { createServer } from "vite";
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "zhipai-workspace-ui-"));
const server = await createServer({
  cacheDir,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
after(async () => {
  await server.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
});
await server.ssrLoadModule("/src/domain/tools.js");
const runtime = await server.ssrLoadModule("/src/runtime/state.js");
const { default: ToolsPage } = await server.ssrLoadModule(
  "/src/pages/ToolsPage.jsx",
);
const definition = Object.getOwnPropertyDescriptors(
  runtime.createDetachedController("toolStudio", {}),
);
const photo = {
  id: "input",
  width: 295,
  height: 413,
  type: "image/jpeg",
  spec: "一寸",
  blob: new Blob(["real input"], { type: "image/jpeg" }),
};
function render(action, selected = false, status = "passed", settings = {}) {
  runtime.registerController("toolStudio", () =>
    Object.assign(Object.defineProperties({}, definition), {
      page: "tool",
      action,
      photo: selected ? photo : null,
      sourceURL: selected ? "blob:original" : "",
      sourceKind: "phone",
      output:
        selected && status === "passed"
          ? new Blob(["result"], { type: "image/jpeg" })
          : null,
      outputURL: selected && status === "passed" ? "blob:output" : "",
      stage: selected ? "ready" : "empty",
      standardized: selected && status === "passed",
      backgroundEditing: selected && status === "passed",
      portraitCheck: { status: selected ? status : "idle", reasons: [] },
      repairBackgroundId: selected && status === "passed" ? "white" : null,
      ...settings,
    }),
  );
  const tree = parseDocument(
    renderToStaticMarkup(React.createElement(ToolsPage)),
  );
  const nodes = [];
  function walk(node, hidden = false) {
    const attrs = node.attribs || {};
    hidden ||=
      attrs.hidden !== undefined || /display:\s*none/.test(attrs.style || "");
    if (!hidden) nodes.push(node);
    for (const child of node.children || []) walk(child, hidden);
  }
  walk(tree);
  const content = nodes
    .filter((n) => n.type === "text")
    .map((n) => n.data)
    .join("");
  return { nodes, content };
}
const byClass = (nodes, name) =>
  nodes.filter((n) => (n.attribs?.class || "").split(" ").includes(name));
const posterSource = ({ nodes }) =>
  byClass(nodes, "tool-capability-poster-art")[0]?.attribs.src;

test("preselecting parameters keeps the poster fixed for its tool", () => {
  const format = render("format", false, "idle", { format: "png" });
  const formatButtons = byClass(format.nodes, "tool-format-list")[0].children;
  assert.equal(formatButtons[0].attribs["aria-pressed"], "false");
  assert.equal(formatButtons[1].attribs["aria-pressed"], "true");
  assert.equal(posterSource(format), posterSource(render("format")));

  const resize = render("resize");
  const size = resize.nodes.find(
    (node) => node.name === "input" && node.attribs["aria-label"] === "目标文件体积",
  );
  assert.equal(size.attribs.disabled, undefined);
  assert.notEqual(posterSource(resize), posterSource(format));
});
for (const [action, heading] of [
  ["crop", "裁剪尺寸"],
  ["background", "背景颜色"],
  ["format", "输出格式"],
  ["resize", "目标文件体积"],
  ["repair", "背景颜色"],
  ["outfit", "选择服装"],
]) {
  test(`${action}: empty workspace shows an example and selection without old step navigation`, () => {
    const { nodes, content } = render(action);
    assert.match(content, new RegExp(heading));
    assert.equal(byClass(nodes, "tool-stepper").length, 0);
    assert.equal(byClass(nodes, "photo-selection-empty").length, 0);
    const [poster] = byClass(nodes, `${action}-workspace-poster`);
    assert.equal(poster.name, "button");
    assert.equal(poster.attribs["aria-label"], "选取照片");
    assert.equal(poster.attribs["aria-haspopup"], "dialog");
    assert.equal(posterSource({ nodes }), `./assets/tool-${action}-banner-20261117.jpg`);
    assert.equal(byClass(nodes, "tool-photo-range").length, 0);
    assert.doesNotMatch(content, /效果示例 · 未选照片/);
    assert.doesNotMatch(content, /上一步|下一步/);
    assert.equal(byClass(nodes, "photo-selection-replace").length, 0);
    assert.match(content, /选取照片/);
    assert.doesNotMatch(content, /知拍相册 \/ 手机相册/);
  });
  test(`${action}: chosen real photo exposes only replacement and save with the existing settings`, () => {
    const { nodes, content } = render(action, true);
    assert.match(content, new RegExp(heading));
    assert.equal(byClass(nodes, "tool-stepper").length, 0);
    assert.equal(byClass(nodes, "tool-capability-poster").length, 0);
    assert.doesNotMatch(content, /效果示例 · 未选照片/);
    assert.doesNotMatch(content, /上一步|下一步/);
    assert.equal(byClass(nodes, "photo-selection-replace").length, 1);
    assert.match(
      content,
      new RegExp(
        "更换照片.*" +
          ({ resize: "确认修改", repair: "付款并开始精修", outfit: "开始换装" }[
            action
          ] || "保存到设备"),
      ),
    );
    assert.equal(
      byClass(nodes, "photo-selection-next")[0].attribs.disabled,
      undefined,
    );
  });
}
test("repair poster stays static when choosing a background, then yields to real input and its result comparison", () => {
  const first = render("repair");
  const chosen = render("repair", false, "idle", { repairBackgroundId: "red" });
  assert.equal(posterSource(first), posterSource(chosen));
  assert.equal(byClass(chosen.nodes, "photo-selection-next").length, 1);
  assert.match(chosen.content, /选取照片/);

  const real = render("repair", true, "passed", { output: null, outputURL: "", repairBackgroundId: "red" });
  assert.equal(posterSource(real), undefined);
  assert.ok(real.nodes.some((node) => node.name === "img" && node.attribs.src === "blob:original"));
  assert.equal(byClass(real.nodes, "tool-photo-range").length, 0);

  const result = render("repair", true, "passed", { serviceApplied: true });
  assert.equal(posterSource(result), undefined);
  assert.equal(byClass(result.nodes, "tool-photo-range").length, 1);
});
test("rejected background visibly disables its colors and save while keeping replacement and reasons", () => {
  const { nodes, content } = render("background", true, "rejected");
  assert.match(content, /照片不符合证件照要求.*查看原因/);
  assert.ok(
    byClass(nodes, "photo-selection-next")[0].attribs.disabled !== undefined,
  );
  assert.equal(
    byClass(nodes, "photo-selection-replace")[0].attribs.disabled,
    undefined,
  );
  const list = byClass(nodes, "tool-color-list")[0];
  const buttons = (list.children || []).filter((n) => n.name === "button");
  assert.equal(buttons.length, 4);
  assert.ok(buttons.every((n) => n.attribs.disabled !== undefined));
});
test("resize has one confirm action and no redundant apply button", () => {
  const { content } = render("resize", true);
  assert.doesNotMatch(content, /应用体积|保存到设备/);
  assert.match(content, /确认修改/);
});
