// Render JSX to static markup; no browser, screenshots, camera or UI automation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
import { transformWithOxc } from "vite";
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
const View = await compile("src/runtime/components.jsx", "View", {
  createContext: React.createContext,
  useContext: React.useContext,
  useLayoutEffect: React.useLayoutEffect,
  useRef: React.useRef,
  useState: React.useState,
  useSyncExternalStore: React.useSyncExternalStore,
});
let currentState;
const ScanPage = await compile("src/pages/ScanPage.jsx", "ScanPage", {
  View,
  Controller: ({ children }) => children(currentState),
  Portal: ({ children }) => children,
});
function render(extra = {}) {
  currentState = {
    page: "scan",
    result: false,
    guideOpen: false,
    guidePage: "",
    ready: false,
    torchSupported: false,
    torch: false,
    starting: false,
    reading: false,
    source: "camera",
    cameraError: "",
    failure: null,
    notice: "",
    ...extra,
  };
  return renderToStaticMarkup(React.createElement(ScanPage));
}
test("main scan markup keeps camera, album and help in approved order without an instruction image", () => {
  const html = render();
  assert.ok(html.indexOf("扫码采集") < html.indexOf("二维码取景区域"));
  assert.ok(html.indexOf("二维码取景区域") < html.indexOf("从相册识别"));
  assert.ok(html.indexOf("从相册识别") < html.indexOf("如何获取采集码"));
  assert.ok(!html.includes("scan-instruction-card"));
  assert.ok(!html.includes("手电筒"));
  assert.ok(html.includes("image/jpeg,image/png,image/webp"));
  assert.ok(render({ ready: true, torchSupported: true }).includes("手电筒"));
});
test("help directory and both details are one dialog with complete inline copy and fixed footer, no iframe", () => {
  for (const guidePage of ["", "institution", "chsi"]) {
    const html = render({ guideOpen: true, guidePage });
    assert.equal((html.match(/role="dialog"/g) || []).length, 1);
    assert.ok(html.includes('aria-modal="true"'));
    assert.ok(html.includes('inert=""'));
    assert.ok(html.includes("scan-sheet-body"));
    assert.ok(html.includes("<footer>"));
    assert.ok(!html.includes("iframe"));
    if (guidePage === "institution")
      assert.ok(html.includes("联系本次采集负责人"));
    if (guidePage === "chsi") {
      assert.ok(html.includes("学信档案"));
      assert.ok(html.includes("noopener noreferrer"));
      assert.ok(html.includes("不会索取学信网账号密码"));
    }
  }
});
test("failure sheet presents specific reason and source-appropriate recovery without claiming verification passed", () => {
  for (const source of ["camera", "album"]) {
    const html = render({
      source,
      result: true,
      failure: {
        title: "采集码与当前项目不符",
        message: "请使用本项目对应学籍的图像采集码。",
        projectId: "",
      },
    });
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes("请使用本项目对应学籍"));
    assert.ok(html.includes(source === "album" ? "重新选择图片" : "重新扫描"));
    assert.ok(!html.includes("验证采集码"));
  }
  assert.ok(
    render({
      result: true,
      failure: {
        title: "当前无法开始采集",
        message: "本项目采集已结束",
        projectId: "association-talent",
      },
    }).includes("查看项目"),
  );
});
