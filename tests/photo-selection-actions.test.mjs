// Static React contracts only, no browser or UI automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => server.close());
const { default: Actions } = await server.ssrLoadModule(
  "/src/components/PhotoSelectionActions.jsx",
);
const { default: Preview } = await server.ssrLoadModule(
  "/src/components/PhotoSelectionPreview.jsx",
);
const render = (props) =>
  renderToStaticMarkup(React.createElement(Actions, props));

test("empty selection has exactly one bottom action that opens selection", () => {
  let picks = 0,
    nexts = 0;
  const props = {
    hasPhoto: false,
    onSelect: () => picks++,
    onNext: () => nexts++,
  };
  const html = render(props);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.ok(html.includes("选取照片"));
  assert.ok(!html.includes("更换照片"));
  const buttons = React.Children.toArray(Actions(props).props.children);
  buttons[0].props.onClick();
  assert.deepEqual([picks, nexts], [1, 0]);
});

test("selected photo has separate replacement and Next actions; image is display-only", () => {
  let picks = 0,
    nexts = 0;
  const props = {
    hasPhoto: true,
    onSelect: () => picks++,
    onNext: () => nexts++,
  };
  const html = render(props);
  assert.equal((html.match(/<button/g) || []).length, 2);
  assert.ok(html.indexOf("更换照片") < html.indexOf("下一步"));
  const buttons = React.Children.toArray(Actions(props).props.children);
  buttons[0].props.onClick();
  assert.deepEqual([picks, nexts], [1, 0]);
  buttons[1].props.onClick();
  assert.deepEqual([picks, nexts], [1, 1]);
  const preview = renderToStaticMarkup(
    React.createElement(Preview, {
      photo: { spec: "一寸 · 25 × 35 mm" },
      src: "/sample.jpg",
    }),
  );
  assert.ok(preview.includes("一寸 · 25 × 35 mm"));
  assert.ok(!preview.includes("<button"));
  assert.ok(!preview.includes("更换照片"));
});

test("checking disables both actions; failed checking still allows replacement", () => {
  const running = render({
    hasPhoto: true,
    disabled: true,
    nextLabel: "正在检查照片…",
  });
  assert.equal((running.match(/disabled=""/g) || []).length, 2);
  assert.ok(running.includes("正在检查照片…"));
  const blocked = Actions({ hasPhoto: true, nextEnabled: false });
  const buttons = React.Children.toArray(blocked.props.children);
  assert.equal(buttons[0].props.disabled, false);
  assert.equal(buttons[1].props.disabled, true);
});

test("print and six tools reuse the same first-step controls and spacing rules", () => {
  for (const file of ["src/pages/ToolsPage.jsx", "src/pages/PrintPage.jsx"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(source.includes("<PhotoSelectionActions"));
    assert.ok(source.includes("photo-selection-footer"));
    assert.ok(!source.includes("onChange={() => s.pick()}"));
    assert.ok(!source.includes("onChange={() => s.openAlbum()}"));
  }
  const css = fs.readFileSync("src/styles/photo-selection.css", "utf8");
  assert.ok(css.includes('.photo-selection-actions[data-selected="true"]'));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(!css.includes(".photo-selection-change"));
});
