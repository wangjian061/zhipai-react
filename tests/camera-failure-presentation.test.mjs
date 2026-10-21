// Static React state presentation; no browser automation or pixel-accuracy claim.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
import { transformWithOxc } from "vite";
import { CAMERA_DETECTION_SCENARIOS } from "../src/domain/camera-detection.js";
import {
  CAMERA_DETECTION_CONFIG,
  cameraDetectionItems,
} from "../src/domain/camera-detection.js";
import { observable } from "../src/runtime/state.js";
const generate = generateModule.default || generateModule;
async function compile(file, names, deps = {}) {
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
    )
    .filter(Boolean);
  const out = await transformWithOxc(generate(ast).code, file, {
    jsx: { runtime: "classic" },
  });
  return new Function(
    "React",
    ...Object.keys(deps),
    out.code + ";return {" + names.join(",") + "};",
  )(React, ...Object.values(deps));
}
const { CameraConfirmationSettings } = await compile(
  "src/components/CameraConfirmationSettings.jsx",
  ["CameraConfirmationSettings"],
);
const View = ({ as = "div", scope, refName, children, ...props }) =>
  React.createElement(as, props, children);
const { CameraResultVersions } = await compile(
  "src/components/CameraResultVersions.jsx",
  ["CameraResultVersions"],
);
const components = await compile(
  "src/components/CameraWorkflow.jsx",
  ["CameraConfirmationPage", "CameraResultPage", "CameraWorkflowModal"],
  { View, CameraConfirmationSettings, CameraResultVersions },
);
const sheetComponents = await compile(
  "src/components/CameraTaskSheet.jsx",
  ["CameraTaskSheet"],
  {
    View,
    PhotoProcessingEffect: ({ active }) =>
      active ? React.createElement("span", { "data-photo-scan": true }) : null,
  },
);
Object.assign(components, sheetComponents);
Object.assign(
  components,
  await compile(
    "src/components/CameraVersionComparison.jsx",
    ["CameraVersionComparison", "comparisonPan"],
    {
      useEffect: React.useEffect,
      useRef: React.useRef,
      useState: React.useState,
    },
  ),
);
function state(extra = {}) {
  return {
    page: "camera",
    step: "confirm",
    panel: null,
    workflowModal: false,
    taskSheet: false,
    detection: null,
    detectionScenarios: CAMERA_DETECTION_SCENARIOS,
    busy: false,
    processing: false,
    unlocked: false,
    sourceURL: "/original.jpg",
    previewURL: "/made.jpg",
    sourcePhoto: { blob: true },
    outputBlob: true,
    canSave: false,
    confirmationBackLabel: "返回拍摄",
    confirmationReplaceLabel: "重新拍摄",
    canConfigureConfirmation: true,
    spec: { name: "二寸", mm: "35 × 49 mm" },
    quickSpecs: [
      { id: "one", name: "一寸" },
      { id: "two", name: "二寸" },
      { id: "small-two", name: "小二寸" },
    ],
    colors: [{ name: "白色", value: "#ffffff" }],
    draft: {
      status: "queued",
      specId: "two",
      background: "#ffffff",
      failureReason: "",
    },
    confirmationSizeLabel: "35 × 49 mm",
    primaryLabel: "解锁并保存",
    $store: { photoLibrary: { error: "", load() {} } },
    ...extra,
  };
}
const render = (name, s) =>
  renderToStaticMarkup(React.createElement(components[name], { scope: s }));
test("confirmation shows the original, preset settings and two fixed footer actions", () => {
  const html = render("CameraConfirmationPage", state());
  assert.ok(html.includes("证件照制作"));
  assert.ok(html.includes("/original.jpg"));
  assert.ok(html.includes("更多规格"));
  assert.ok(html.includes("背景颜色"));
  assert.ok(html.indexOf("重新拍摄") > html.indexOf("<footer"));
  assert.ok(html.includes("camera-outline-button"));
  assert.ok(html.includes("开始制作"));
  assert.ok(!html.includes("制作成功"));
  assert.ok(!html.includes("正在制作"));
  const album = render(
    "CameraConfirmationPage",
    state({ confirmationReplaceLabel: "重新选择" }),
  );
  assert.ok(album.includes("重新选择"));
  assert.ok(!album.includes("重新拍摄"));
});
test("project-controlled confirmation does not expose personal size and color controls", () => {
  const html = render(
    "CameraConfirmationPage",
    state({ collectionCapture: true, canConfigureConfirmation: false }),
  );
  assert.ok(html.includes("采集规格由项目统一设置"));
  assert.ok(!html.includes("更多规格"));
  assert.ok(!html.includes("背景颜色"));
});
test("detection scenarios are chosen in a cancellable modal before checking", () => {
  const choices = [];
  let cancelled = 0;
  const s = state({
    panel: "detectionScenario",
    workflowModal: true,
    chooseDetectionScenario(value) {
      choices.push(value);
    },
    closePanel() {
      cancelled++;
    },
  });
  const html = render("CameraWorkflowModal", s);
  assert.ok(html.includes("选择演示场景"));
  assert.ok(html.includes("原型演示"));
  assert.ok(html.includes('role="dialog"'));
  assert.equal((html.match(/<button/g) || []).length, 6);
  for (const scenario of CAMERA_DETECTION_SCENARIOS)
    assert.ok(html.includes(scenario.label));
  assert.ok(html.includes("取消"));
  assert.ok(!html.includes("正在制作"));
  const tree = components.CameraWorkflowModal({ scope: s });
  const section = React.Children.only(tree.props.children);
  const message = React.Children.toArray(section.props.children)[0];
  const options = React.Children.toArray(message.props.children).find(
    (node) => node.props?.className === "camera-scenario-options",
  );
  for (const button of React.Children.toArray(options.props.children))
    button.props.onClick();
  assert.deepEqual(choices, [
    "pass",
    "no_person",
    "multiple",
    "animal",
    "error",
  ]);
  tree.props.onClick({ target: "backdrop", currentTarget: "backdrop" });
  tree.props.onClick({ target: "option", currentTarget: "backdrop" });
  assert.equal(cancelled, 1);
});
test("scenario modal renders and configured checks run through the real reactive state", () => {
  const s = observable(
    state({
      panel: "detectionScenario",
      workflowModal: true,
      detectionConfig: CAMERA_DETECTION_CONFIG,
    }),
  );
  const html = render("CameraWorkflowModal", s);
  assert.ok(html.includes("选择演示场景"));
  for (const scenario of CAMERA_DETECTION_SCENARIOS)
    assert.ok(html.includes(scenario.label));
  assert.equal(cameraDetectionItems(s.detectionConfig).length, 3);
});
test("making is a single modal status without any cancel control or result chooser", () => {
  const html = render(
    "CameraWorkflowModal",
    state({
      panel: "making",
      workflowModal: true,
      processing: true,
      busy: true,
    }),
  );
  assert.ok(html.includes("正在制作"));
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes('role="status"'));
  assert.ok(!html.includes("<button"));
  assert.ok(!html.includes("模拟"));
  assert.ok(!html.includes("制作失败"));
});
test("personal production offers two successes, each partial success, photo rejection and service failure", () => {
  const choices = [];
  const s = state({
    panel: "makingResult",
    workflowModal: true,
    busy: true,
    chooseMakingResult(value) {
      choices.push(value);
    },
  });
  const html = render("CameraWorkflowModal", s);
  assert.ok(html.includes("选择制作结果"));
  assert.ok(html.includes("原型演示"));
  assert.ok(html.includes('role="dialog"'));
  assert.equal((html.match(/<button/g) || []).length, 5);
  assert.ok(html.includes("两版均成功"));
  assert.ok(html.includes("仅普通版成功"));
  assert.ok(html.includes("仅精修版成功"));
  assert.ok(html.includes("照片制作失败"));
  assert.ok(html.includes("服务不可用"));
  assert.ok(html.includes("is-result-choice"));
  assert.ok(!html.includes("取消"));
  assert.ok(!html.includes("disabled"));
  const tree = components.CameraWorkflowModal({ scope: s }),
    section = React.Children.only(tree.props.children),
    footer = React.Children.toArray(section.props.children).find(
      (n) => n.type === "footer",
    ),
    fragment = React.Children.only(footer.props.children);
  function choose(node) {
    if (!React.isValidElement(node)) return;
    if (node.type === "button") node.props.onClick();
    else React.Children.forEach(node.props.children, choose);
  }
  choose(fragment);
  assert.deepEqual(choices, [
    "success",
    "ordinary_only",
    "retouched_only",
    "failure",
    "service_unavailable",
  ]);
});
test("making failure uses the shared bottom sheet with direct reason and return", () => {
  let returned = 0;
  const s = observable(
    state({
      panel: "makingFailure",
      taskSheet: true,
      draft: {
        failureKind: "photo",
        failureReason: "照片清晰度不足，请重新拍摄。",
      },
      closeTaskSheet() {
        returned++;
      },
    }),
  );
  const html = render("CameraTaskSheet", s);
  assert.ok(html.includes('id="camera-task-title">制作失败</h2>'));
  assert.ok(html.includes("照片清晰度不足"));
  assert.ok(html.includes('role="alertdialog"'));
  assert.equal((html.match(/<button/g) || []).length, 2);
  assert.ok(html.includes("返回调整"));
  assert.ok(html.includes("camera-task-sheet ui-sheet"));
  assert.ok(html.includes('data-failure="true"'));
  assert.ok(
    html.includes(
      'aria-describedby="camera-task-description camera-task-failure-reasons"',
    ),
  );
  // React SSR may hoist an image preload; compare the actual image element.
  assert.ok(html.indexOf("照片清晰度不足") < html.indexOf("<img"));
  assert.ok(!html.includes("检测明细"));
  assert.ok(!html.includes("data-photo-scan"));
  assert.ok(!html.includes("查看失败原因"));
  const section = React.Children.only(
    components.CameraTaskSheet({ scope: s }).props.children,
  );
  const footer = React.Children.toArray(section.props.children).find(
    (node) => node.type === "footer",
  );
  const fragment = React.Children.only(footer.props.children);
  React.Children.toArray(fragment.props.children).at(-1).props.onClick();
  assert.equal(returned, 1);
});
test("making service failure and legacy unknown failures never blame the photo", () => {
  for (const failureKind of ["service", undefined]) {
    const html = render(
      "CameraTaskSheet",
      observable(
        state({
          panel: "makingFailure",
          taskSheet: true,
          draft: {
            failureKind,
            failureReason: "制作服务暂时不可用，请稍后再试。",
          },
        }),
      ),
    );
    assert.ok(html.includes('id="camera-task-title">暂时无法制作</h2>'));
    assert.ok(html.includes("无需更换照片"));
    const reason =
      failureKind === "service"
        ? "制作服务暂时不可用"
        : "本次制作未完成，请稍后再试。";
    assert.ok(html.includes(reason));
    assert.ok(html.includes(">返回</button>"));
    assert.ok(!html.includes("返回调整"));
    assert.ok(!html.includes("检测明细"));
    assert.ok(html.includes("原照片和设置已保留"));
    assert.ok(html.indexOf(reason) < html.indexOf("<img"));
  }
  const legacy = render(
    "CameraTaskSheet",
    state({
      panel: "makingFailure",
      taskSheet: true,
      draft: {
        failureKind: "old-unknown",
        failureReason: "请重新制作或更换照片。",
      },
    }),
  );
  assert.ok(!legacy.includes("请重新制作或更换照片"));
  assert.ok(legacy.includes("本次制作未完成，请稍后再试。"));
});
test("checking, content rejection and service error share a sheet with distinct recovery", () => {
  const checks = [{ id: "person", label: "照片中有人像", status: "pending" }];
  const checking = render(
    "CameraTaskSheet",
    state({
      panel: "photoCheck",
      taskSheet: true,
      detection: { status: "checking", checks },
    }),
  );
  assert.ok(checking.includes("取消检测"));
  assert.ok(checking.includes("data-photo-scan"));
  assert.ok(!checking.includes('data-failure="true"'));
  assert.ok(!checking.includes("开始制作</button>"));
  const passed = render(
    "CameraTaskSheet",
    state({
      panel: "photoCheck",
      taskSheet: true,
      detection: {
        status: "passed",
        checks: checks.map((item) => ({ ...item, status: "passed" })),
      },
    }),
  );
  assert.ok(!passed.includes("无法开始制作"));
  assert.ok(passed.includes("正在开始制作"));
  assert.ok(!passed.includes('data-failure="true"'));
  const rejected = render(
    "CameraTaskSheet",
    observable(
      state({
        panel: "photoCheck",
        taskSheet: true,
        detection: {
          status: "failed",
          checks: Object.freeze([
            ...checks.map((item) =>
              Object.freeze({ ...item, status: "failed" }),
            ),
            Object.freeze({
              id: "no_animal",
              label: "照片中不含动物",
              status: "passed",
            }),
          ]),
          reasons: ["照片中包含多人"],
        },
      }),
    ),
  );
  assert.ok(rejected.includes('id="camera-task-title">检测未通过</h2>'));
  assert.ok(!rejected.includes("照片中包含多人"));
  assert.ok(rejected.includes("未通过"));
  assert.ok(rejected.includes('data-failure="true"'));
  assert.ok(
    rejected.indexOf("当前照片不符合制作要求") < rejected.indexOf("<img"),
  );
  assert.ok(!rejected.includes("camera-task-failure-reasons"));
  assert.ok(rejected.includes('aria-describedby="camera-task-description"'));
  assert.ok(rejected.indexOf("<img") < rejected.indexOf("检测明细"));
  assert.ok(rejected.includes("符合要求"));
  assert.ok(!rejected.includes("data-photo-scan"));
  assert.ok(!rejected.includes("重新检测</button>"));
  const error = render(
    "CameraTaskSheet",
    state({
      panel: "photoCheck",
      taskSheet: true,
      detection: { status: "error", reasons: ["网络异常"] },
    }),
  );
  assert.ok(error.includes("检测暂未完成"));
  assert.ok(error.includes("重新检测"));
  assert.ok(error.includes("返回调整"));
  assert.ok(!error.includes('data-failure="true"'));
});
test("making retains complete reasons while configured detection omits all directed advice", () => {
  const reason = "照片制作服务暂时不可用，请稍后重新开始。原照片和设置已保留。";
  const making = render(
    "CameraTaskSheet",
    observable(
      state({
        panel: "makingFailure",
        taskSheet: true,
        draft: { failureKind: "service", failureReason: reason },
      }),
    ),
  );
  assert.ok(making.includes(reason));
  assert.equal((making.match(/原照片和设置已保留/g) || []).length, 1);
  const longReason = "照片中包含多人，请使用本人单人正面照片。".repeat(20);
  const rejected = render(
    "CameraTaskSheet",
    observable(
      state({
        panel: "photoCheck",
        taskSheet: true,
        detection: {
          status: "failed",
          checks: [],
          reasons: ["照片不符合要求", longReason],
        },
      }),
    ),
  );
  assert.ok(!rejected.includes(longReason));
  assert.ok(!rejected.includes("照片不符合要求"));
  assert.ok(!rejected.includes("camera-task-failure-reasons"));
  const longMaking = render(
    "CameraTaskSheet",
    state({
      panel: "makingFailure",
      taskSheet: true,
      draft: { failureKind: "photo", failureReason: longReason },
    }),
  );
  assert.ok(longMaking.includes(longReason));
  assert.ok(longMaking.indexOf(longReason) < longMaking.indexOf("<img"));
  assert.ok(rejected.includes("原照片和设置已保留"));
  const noReason = render(
    "CameraTaskSheet",
    state({
      panel: "photoCheck",
      taskSheet: true,
      detection: { status: "failed", checks: [], reasons: [] },
    }),
  );
  assert.ok(!noReason.includes("暂未获取具体原因"));
  assert.ok(noReason.includes("当前照片不符合制作要求，暂时无法开始制作。"));
  assert.ok(!noReason.includes("camera-task-failure-reasons"));
});
test("success result is read-only with watermark and a single unlock action", () => {
  const html = render(
    "CameraResultPage",
    state({ step: "editor", draft: { status: "ready" } }),
  );
  assert.ok(html.includes("制作成功"));
  assert.ok(html.includes("/made.jpg"));
  assert.ok(html.includes("photo-watermark"));
  assert.ok(html.includes("解锁并保存"));
  assert.equal((html.match(/<button/g) || []).length, 2);
  for (const unwanted of [
    "选择规格",
    "选择背景色",
    "重新生成预览",
    "丢弃照片",
    "调整裁剪",
  ])
    assert.ok(!html.includes(unwanted), unwanted);
  const paid = render(
    "CameraResultPage",
    state({
      step: "editor",
      unlocked: true,
      canSave: true,
      primaryLabel: "保存到知拍相册",
      draft: { status: "ready" },
    }),
  );
  assert.ok(!paid.includes("photo-watermark"));
  assert.ok(paid.includes("保存到知拍相册"));
});
test("discard confirmation describes its scope and invokes result discard rather than whole-source deletion", () => {
  let discarded = 0,
    cancelled = 0;
  const s = state({
    panel: "discardResult",
    workflowModal: true,
    discardResult() {
      discarded++;
    },
    closePanel() {
      cancelled++;
    },
  });
  const html = render("CameraWorkflowModal", s);
  assert.ok(html.includes("原照片和设置会保留"));
  assert.ok(html.includes("继续查看"));
  assert.ok(html.includes("丢弃并返回"));
  const tree = components.CameraWorkflowModal({ scope: s }),
    section = React.Children.only(tree.props.children),
    footer = React.Children.toArray(section.props.children).find(
      (n) => n.type === "footer",
    );
  const fragment = React.Children.only(footer.props.children);
  const buttons = React.Children.toArray(fragment.props.children);
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.equal(cancelled, 1);
  assert.equal(discarded, 1);
});
test("workflow components only render on their assigned stages", () => {
  assert.equal(render("CameraConfirmationPage", state({ step: "editor" })), "");
  assert.equal(render("CameraResultPage", state()), "");
  assert.equal(render("CameraWorkflowModal", state()), "");
  assert.equal(render("CameraTaskSheet", state()), "");
  assert.equal(
    render(
      "CameraWorkflowModal",
      state({ page: "home", panel: "making", workflowModal: true }),
    ),
    "",
  );
});

function dualState(extra = {}) {
  return state({
    step: "editor",
    dualResults: true,
    unlocked: false,
    backgroundLabel: "蓝色",
    primaryLabel: "请选择一个照片版本",
    canPurchaseVersion: false,
    draft: { status: "ready", outputWidth: 295, outputHeight: 413 },
    resultVersions: [
      {
        id: "ordinary",
        name: "普通证件照",
        shortName: "普通版",
        price: "1.98",
        status: "ready",
        url: "/ordinary.jpg",
        selected: false,
      },
      {
        id: "retouched",
        name: "精修证件照",
        shortName: "精修版",
        price: "9.80",
        status: "ready",
        url: "/retouched.jpg",
        selected: false,
      },
    ],
    ...extra,
  });
}
test("dual result shows both prices, no preselection and one disabled purchase action until a choice", () => {
  const html = render("CameraResultPage", dualState());
  assert.ok(html.includes("普通证件照") && html.includes("精修证件照"));
  assert.ok(html.includes("¥1.98") && html.includes("¥9.80"));
  assert.equal((html.match(/type="radio"/g) || []).length, 2);
  assert.ok(!html.includes('checked=""'));
  assert.ok(html.includes("放大对比"));
  assert.equal((html.match(/class="primary-button"/g) || []).length, 1);
  assert.match(html, /disabled=""[^>]*>请选择一个照片版本/);
});
test("partial result keeps the good photo selectable and directly displays the failed version reason/retry", () => {
  const s = dualState();
  s.resultVersions[1] = {
    ...s.resultVersions[1],
    status: "failed",
    url: "",
    reason: "精修服务未能完成本版本。",
  };
  const html = render("CameraResultPage", s);
  assert.ok(html.includes("精修服务未能完成本版本。"));
  assert.ok(html.includes("重试精修版"));
  assert.equal((html.match(/type="radio"/g) || []).length, 1);
  assert.ok(html.includes("/ordinary.jpg"));
});
test("paid save-retry state only exposes the purchased version rather than a second purchase", () => {
  const s = dualState({
    unlocked: true,
    versionLocked: true,
    canPurchaseVersion: true,
    primaryLabel: "保存到知拍相册",
    error: "保存未完成，请重试。",
  });
  s.resultVersions[1].selected = true;
  const html = render("CameraResultPage", s);
  assert.ok(!html.includes("普通证件照"));
  assert.ok(html.includes("精修证件照") && html.includes("已解锁"));
  assert.ok(!html.includes("预览水印"));
  assert.ok(html.includes("保存到知拍相册"));
});
test("enlarged comparison has two matched image layers and shared position/zoom controls", () => {
  const html = render(
    "CameraVersionComparison",
    dualState({ panel: "compare" }),
  );
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes("关闭成片对比"));
  assert.ok(html.includes("/ordinary.jpg") && html.includes("/retouched.jpg"));
  assert.ok(
    html.includes("普通版与精修版分割位置") &&
      html.includes("两张照片同步缩放"),
  );
  assert.ok(!html.includes("确认付款"));
});
test("comparison dragging remains in logical photo pixels when the phone preview is scaled", () => {
  const pan = components.comparisonPan(
    {
      x: 100,
      y: 100,
      width: 200,
      height: 280,
      unitScale: 0.5,
      pan: { x: 0, y: 0 },
    },
    { x: 125, y: 80 },
    2,
  );
  assert.deepEqual(pan, { x: 50, y: -40 });
  const edge = components.comparisonPan(
    {
      x: 100,
      y: 100,
      width: 200,
      height: 280,
      unitScale: 0.5,
      pan: { x: 0, y: 0 },
    },
    { x: 400, y: -200 },
    2,
  );
  assert.deepEqual(edge, { x: 100, y: -140 });
});
