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
  plugins: [{
    name: "ssr-tool-sheet-host",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/runtime/components.jsx")) return;
      return code.replace(
        "return host ? createPortal(children, host) : null;",
        'return target === "#tool-modal-layer" ? children : null;',
      );
    },
  }],
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
      repairBackgroundId: null,
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
  ["repair", null],
  ["outfit", "选择服装"],
]) {
  test(`${action}: empty workspace shows an example and selection without old step navigation`, () => {
    const { nodes, content } = render(action);
    if (heading) assert.match(content, new RegExp(heading));
    else assert.doesNotMatch(content, /背景颜色/);
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
    if (heading) assert.match(content, new RegExp(heading));
    else assert.doesNotMatch(content, /背景颜色/);
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
test("repair shows the original until processing and keeps background controls off both work states", () => {
  const first = render("repair");
  const [service] = byClass(first.nodes, "tool-repair-service");
  assert.ok(first.nodes.indexOf(service) > first.nodes.indexOf(byClass(first.nodes, "repair-workspace-poster")[0]));
  assert.match(first.content, /人像质感精修/);
  assert.doesNotMatch(first.content, /¥2\.00/);
  assert.match(first.content, /高清画质增强自然肤色匀净五官光影立体可选四色证件底/);
  assert.match(first.content, /拍照建议单人正面平视 · 光线充足/);
  assert.match(first.content, /交付方式自动存至知拍相册（保留原图）/);
  assert.doesNotMatch(first.content, /标准化/);
  const chosen = render("repair", false, "idle", { repairBackgroundId: "red" });
  assert.equal(posterSource(first), posterSource(chosen));
  assert.equal(byClass(chosen.nodes, "photo-selection-next").length, 1);
  assert.match(chosen.content, /选取照片/);
  assert.doesNotMatch(chosen.content, /背景颜色/);

  const real = render("repair", true, "passed", { repairBackgroundId: "red" });
  assert.equal(posterSource(real), undefined);
  assert.equal(byClass(real.nodes, "tool-repair-service").length, 0);
  assert.ok(real.nodes.some((node) => node.name === "img" && node.attribs.src === "blob:original"));
  assert.ok(!real.nodes.some((node) => node.name === "img" && node.attribs.src === "blob:output"));
  assert.equal(byClass(real.nodes, "tool-photo-range").length, 0);
  assert.doesNotMatch(real.content, /背景颜色|标准化/);

  const result = render("repair", true, "passed", { serviceApplied: true });
  assert.equal(posterSource(result), undefined);
  assert.equal(byClass(result.nodes, "tool-repair-service").length, 0);
  assert.equal(byClass(result.nodes, "tool-photo-range").length, 1);
  assert.doesNotMatch(result.content, /背景颜色|标准化/);
});
test("repair payment sheet presents four unselected colors before payment and updates the order summary", () => {
  const open = (repairBackgroundId) => render("repair", true, "passed", {
    panel: "payment",
    repairBackgroundId,
  });
  const initial = open(null);
  const [sheet] = byClass(initial.nodes, "shared-sheet");
  const [order] = byClass(initial.nodes, "tool-payment-order");
  const [colorGroup] = byClass(initial.nodes, "tool-repair-background");
  const [body] = byClass(initial.nodes, "ui-sheet-body");
  assert.equal(sheet.attribs.role, "dialog");
  assert.equal(order.parent, body);
  assert.equal(colorGroup.parent, body);
  assert.ok(body.children.indexOf(order) < body.children.indexOf(colorGroup));
  assert.match(initial.content, /照片精修订单.*请选择背景颜色.*¥2\.00.*背景颜色蓝色白色红色浅灰.*Apple 内购/);
  assert.doesNotMatch(initial.content, /请先选择一种背景颜色|标准化/);
  const radios = ({ nodes }) => nodes.filter((node) => node.attribs?.name === "repair-background");
  assert.deepEqual(radios(initial).map((radio) => radio.attribs.value), ["blue", "white", "red", "gray"]);
  assert.ok(radios(initial).every((radio) => radio.attribs.checked === undefined && radio.attribs.disabled === undefined));
  const pay = byClass(initial.nodes, "ui-sheet-footer")[0].children.find((node) => node.name === "button");
  assert.equal(pay.attribs.disabled, undefined);
  assert.equal(pay.children[0].data, "使用 Apple 内购");
  const selected = open("white");
  assert.match(selected.content, /白色背景/);
  assert.deepEqual(radios(selected).filter((radio) => radio.attribs.checked !== undefined).map((radio) => radio.attribs.value), ["white"]);
});
test("repair photo selection and check accept clear individual portraits without a plain background requirement", () => {
  const selection = render("repair", false, "idle", { panel: "album" });
  assert.match(selection.content, /请选择一张清晰的单人正面人像/);
  const check = render("repair", true, "awaiting", { panel: "portraitOutcome" });
  assert.match(check.content, /清晰的单人正面人像，可继续精修/);
  assert.doesNotMatch(check.content, /证件照|照片背景复杂|标准化/);
  const busy = render("repair", true, "passed", { stage: "processing", paid: true });
  assert.match(busy.content, /正在精修照片/);
  assert.doesNotMatch(busy.content, /标准化|背景颜色/);
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
