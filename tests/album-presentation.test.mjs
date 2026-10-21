// Static React and source handlers only; no browser or screenshot automation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
import { transformWithOxc } from "vite";
import { observable, withLocals } from "../src/runtime/state.js";
import { visiblePhotoBounds } from "../src/components/photo-processing.js";
const generate = generateModule.default || generateModule;
async function compile(file, name, deps) {
  const ast = parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"],
  });
  ast.program.body = ast.program.body
    .filter((n) => n.type !== "ImportDeclaration")
    .map((n) =>
      ["ExportDefaultDeclaration", "ExportNamedDeclaration"].includes(n.type)
        ? n.declaration
        : n,
    );
  const out = await transformWithOxc(generate(ast).code, file, {
    jsx: { runtime: "classic" },
  });
  return new Function(
    "React",
    ...Object.keys(deps),
    out.code + ";return " + name,
  )(React, ...Object.values(deps));
}
const { View, Repeat } = await compile(
  "src/runtime/components.jsx",
  "({View,Repeat})",
  {
    createContext: React.createContext,
    useContext: React.useContext,
    useRef: React.useRef,
    useState: React.useState,
    useSyncExternalStore: React.useSyncExternalStore,
    useLayoutEffect: React.useLayoutEffect,
    withLocals,
  },
);
const AlbumPhotoViewer = await compile(
  "src/components/AlbumPhotoViewer.jsx",
  "AlbumPhotoViewer",
  { View, visiblePhotoBounds },
);
const photo = {
  id: "one",
  name: "证件照.jpg",
  width: 413,
  height: 579,
  spec: "二寸 · 35 × 49 mm",
  blob: new Blob(["photo"]),
};
const makeState = (extra = {}) =>
  observable({
    page: "album",
    view: "library",
    modal: null,
    photo: null,
    photoId: null,
    photos: [photo],
    selected: [],
    tools: [],
    managing: false,
    disabled: false,
    downloading: false,
    working: false,
    message: "",
    notice: "",
    previewClosing: false,
    $store: { photoChoice: { printReturnContext: null } },
    store: {
      ready: true,
      busy: false,
      error: "",
      addedIds: [],
      url: () => "/original.jpg",
    },
    photoInfo: () => "413 × 579 px · JPG · 49 KB",
    ...extra,
  });
let current;
const AlbumPage = await compile("src/pages/AlbumPage.jsx", "AlbumPage", {
  View,
  Repeat,
  AlbumPhotoViewer,
  Controller: ({ children }) => children(current),
  Portal: ({ target, children }) =>
    React.createElement("div", { "data-portal-target": target }, children),
});
function renderPage(state) {
  current = state;
  return renderToStaticMarkup(React.createElement(AlbumPage));
}
test("library shows photos without captions while detail keeps photo metadata", () => {
  const library = renderPage(makeState());
  assert.ok(library.includes("/original.jpg"));
  assert.ok(!library.includes("album-photo-caption"));
  assert.ok(!library.includes("35 × 49 mm"));
  const detail = renderPage(
    makeState({ view: "detail", photo, photoId: photo.id }),
  );
  assert.ok(detail.includes("二寸 · 35 × 49 mm"));
  assert.ok(detail.includes("413 × 579 px · JPG · 49 KB"));
  assert.ok(detail.includes('class="zoom-hint"'));
  assert.ok(detail.includes('aria-haspopup="dialog"'));
  assert.ok(!detail.includes("zoomed"));
});
test("viewer is a separate modal in the existing Portal and locks the unchanged detail", () => {
  const html = renderPage(
    makeState({ view: "detail", photo, modal: "preview" }),
  );
  const portal = html.indexOf('data-portal-target="#album-modal-layer"');
  assert.ok(html.indexOf('class="album-photo-viewer"') > portal);
  assert.ok(html.includes('aria-label="照片大图"'));
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes('aria-label="关闭照片大图"'));
  assert.ok(html.includes('inert=""'));
  assert.ok(html.includes('data-preview="true"'));
  assert.equal((html.match(/class="detail-preview"/g) || []).length, 1);
  assert.ok(html.includes("35 × 49 mm"));
  assert.equal(AlbumPhotoViewer({ scope: makeState() }), null);
  const unavailable = renderToStaticMarkup(
    React.createElement(AlbumPhotoViewer, {
      scope: makeState({ modal: "preview", photo: null }),
    }),
  );
  assert.ok(unavailable.includes("照片暂时无法显示"));
  assert.ok(unavailable.includes("关闭照片大图"));
});
test("clicking letterbox blank closes the viewer, actual photo content does not", () => {
  for (const scale of [1, 0.6]) {
    let closed = 0;
    const tree = AlbumPhotoViewer({
      scope: makeState({ photo, modal: "preview", closeModal: () => closed++ }),
    });
    const stage = React.Children.toArray(tree.props.children).at(-1);
    const rect = {
      left: 100,
      top: 200,
      width: 360 * scale,
      height: 600 * scale,
    };
    const frame = {
      getBoundingClientRect: () => rect,
      querySelector: () => ({
        getBoundingClientRect: () => rect,
        naturalWidth: 1000,
        naturalHeight: 500,
      }),
    };
    stage.props.onClick({
      currentTarget: frame,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
    assert.equal(closed, 0);
    stage.props.onClick({
      currentTarget: frame,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + 10 * scale,
    });
    assert.equal(closed, 1);
    const button = React.Children.toArray(tree.props.children)[0].props
      .children;
    button.props.onClick();
    assert.equal(closed, 2);
  }
});
