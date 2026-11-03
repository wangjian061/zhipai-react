// Route/document ownership and reading state only; never opens a browser.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { resolveWorkbenchContext as resolve } from "../src/workbench/context.js";
const cacheDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "zhipai-workbench-ssr-"),
);
const server = await createServer({
  cacheDir,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
after(async () => {
  await server.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
});
const { PAGE_IDS, loadPage, pageContents, markdownHeadings } =
  await server.ssrLoadModule("/src/workbench/documentation.js");
const { scenariosFor, GLOBAL_SCENARIOS } = await server.ssrLoadModule(
  "/src/workbench/demo-sessions.js",
);
const { scrollToDocumentSection, restorePageReading } =
  await server.ssrLoadModule("/src/workbench/reading-position.js");
const { default: Markdown } = await server.ssrLoadModule(
  "/src/workbench/GuideMarkdown.jsx",
);
const routes = [];
for (const page of [
  "home",
  "search",
  "scan",
  "specifications",
  "my",
  "support",
])
  routes.push(resolve("?page=" + page));
routes.push(resolve("?page=my&my=share"));
for (const view of [
  "home",
  "projects",
  "project",
  "records",
  "detail",
  "complete",
  "notifications",
  "services",
])
  routes.push(
    resolve("?page=collection&category=enrollment", {
      collectionFlow: { view },
    }),
  );
routes.push(
  resolve("?page=collection&view=projects&category=all", {
    collectionFlow: { view: "projects" },
  }),
);
for (const view of [
  "welcome",
  "phone",
  "code",
  "password",
  "forgot",
  "bind",
  "reset",
  "set",
  "change",
  "security",
  "privacy",
  "settings",
])
  routes.push(resolve("?page=account", { accountFlow: { view } }));
for (const action of [
  "repair",
  "outfit",
  "crop",
  "background",
  "format",
  "resize",
])
  for (const step of [0, 1, 2])
    routes.push(
      resolve("?page=tool&tool=" + action, { toolStudio: { action, step } }),
    );
for (const step of ["capture", "confirm", "editor", "saved", "processing"])
  routes.push(resolve("?page=camera", { cameraStudio: { step } }));
for (const step of ["capture", "confirm"])
  routes.push(
    resolve("?page=camera", {
      cameraStudio: { step, collectionCapture: true },
    }),
  );
for (const view of [
  "select",
  "crop",
  "layouts",
  "confirm",
  "addresses",
  "address",
  "preview",
])
  routes.push(resolve("?page=print", { printStudio: { view } }));
routes.push(
  resolve("?page=print", {
    printStudio: { view: "confirm", flowCompleted: true },
  }),
);
for (const view of ["library", "detail"])
  routes.push(resolve("?page=album", { albumCenter: { view } }));
for (const selected of [null, { id: "example" }])
  routes.push(resolve("?page=orders", { ordersFlow: { selected } }));
routes.push(
  resolve(
    "?page=home",
    {},
    {},
    { page: "collection", guide: "notification.detail", title: "通知详情" },
  ),
);
routes.push(
  resolve("?page=home", {}, {}, { guide: "update.demo", title: "强制更新" }),
);

test("every supported page and business step loads its own complete document, including addresses and six distinct tools", async () => {
  const ids = new Set(routes.map((c) => c.guide));
  for (const id of ids) {
    assert.ok(PAGE_IDS.includes(id), "missing " + id);
    const doc = await loadPage(id);
    assert.ok(doc.contents.length >= 4, id);
    assert.ok(doc.body.length > 350, id);
  }
  assert.equal(
    ids.size,
    PAGE_IDS.length,
    "orphan page documents should be linked to a real context",
  );
  for (const action of [
    "repair",
    "outfit",
    "crop",
    "background",
    "format",
    "resize",
  ]) {
    assert.match(
      (await loadPage("tool." + action + ".settings")).title,
      new RegExp(
        {
          repair: "精修",
          outfit: "换装",
          crop: "裁剪",
          background: "背景",
          format: "转换",
          resize: "体积",
        }[action],
      ),
    );
  }
});
test("local scenes respect page ownership; force update is a separate global control", () => {
  for (const guide of [
    "home",
    "collection.services",
    "collection.detail",
    "notification.detail",
    "orders.detail",
  ])
    assert.deepEqual(
      scenariosFor({ page: guide === "home" ? "home" : "collection", guide }),
      [],
    );
  assert.ok(
    scenariosFor({
      page: "collection",
      guide: "collection.notifications",
    }).every((id) => id.startsWith("notice.")),
  );
  assert.deepEqual(scenariosFor({ page: "account", guide: "account.code" }), [
    "login.code-error",
    "login.code-expired",
  ]);
  assert.deepEqual(
    scenariosFor({ page: "account", guide: "account.password" }),
    ["login.password-error"],
  );
  assert.deepEqual(GLOBAL_SCENARIOS, ["app.update"]);
});
test("drawers remain in the owner document and critical section anchors actually exist", async () => {
  const cases = [
    [
      "?page=collection",
      { collectionFlow: { view: "project", panel: "qrCheck" } },
    ],
    [
      "?page=collection",
      { collectionFlow: { view: "project", panel: "payment" } },
    ],
    [
      "?page=collection",
      { collectionFlow: { view: "detail", panel: "reviewReason" } },
    ],
    [
      "?page=collection",
      { collectionFlow: { view: "detail", panel: "confirm" } },
    ],
    [
      "?page=collection",
      { collectionFlow: { view: "detail", panel: "taskSupport" } },
    ],
    [
      "?page=collection",
      { collectionFlow: { view: "services", helpOpen: "review" } },
    ],
    [
      "?page=tool",
      {
        toolStudio: {
          action: "repair",
          step: 0,
          portraitCheck: { status: "failed" },
        },
      },
    ],
    [
      "?page=tool",
      { toolStudio: { action: "repair", step: 1, panel: "payment" } },
    ],
    ["?page=camera", { cameraStudio: { step: "confirm", panel: "spec" } }],
    ["?page=camera", { cameraStudio: { step: "confirm", panel: "making" } }],
    ["?page=camera", { cameraStudio: { step: "editor", panel: "discard" } }],
    ["?page=account", { accountFlow: { view: "code", panel: "policy" } }],
    ["?page=account", { accountFlow: { view: "security", panel: "delete" } }],
    [
      "?page=album",
      { albumCenter: { view: "detail", previewHistoryId: "preview" } },
    ],
    ["?page=specifications", { specificationPicker: { opened: true } }],
    ["?page=scan", { collectionScanner: { guideOpen: true } }],
  ];
  for (const [url, scopes] of cases) {
    const c = resolve(url, scopes),
      doc = await loadPage(c.guide);
    assert.ok(c.section, c.guide);
    assert.ok(
      doc.contents.some((item) => item.label === c.section),
      c.guide + ": " + c.section,
    );
  }
  for (const [step, panel, section] of [
    ["confirm", "photoCheck", "照片检测"],
    ["confirm", "makingFailure", "制作状态与失败"],
    ["editor", "discardResult", "返回与丢弃"],
    ["editor", "compare", "版本对照"],
  ]) {
    const c = resolve("?page=camera", { cameraStudio: { step, panel } });
    assert.equal(c.section, section);
    assert.notEqual(c.state, "当前弹窗");
    assert.ok(
      (await loadPage(c.guide)).contents.some((item) => item.label === section),
    );
  }
  const selected = resolve("?page=tool&tool=format", {}, { photoChoice: true });
  assert.equal(selected.guide, "tool.format.select");
  assert.equal(selected.section, "照片来源");
});
test("full documents render unique anchors even when subsection names repeat, and contain valid local links", async () => {
  for (const id of PAGE_IDS) {
    const doc = await loadPage(id),
      html = renderToStaticMarkup(
        React.createElement(Markdown, { text: doc.body }),
      );
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, id);
    for (const item of pageContents(doc.body))
      assert.ok(ids.includes(item.id), id + ": " + item.id);
    assert.ok(!doc.body.includes("建议"), id);
    for (const m of doc.body.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/.test(m[1])) continue;
      const file = decodeURIComponent(m[1].split("#")[0]);
      assert.ok(
        fs.existsSync(path.resolve("docs/product/pages", file)),
        id + ": " + file,
      );
    }
  }
  const heads = markdownHeadings(
    "## 相同\n### 相同\n```\n## 代码\n```\n## 相同",
  );
  assert.deepEqual(
    heads.map((h) => h.id),
    ["workbench-doc-相同", "workbench-doc-相同-2", "workbench-doc-相同-3"],
  );
});
test("left reading position returns after a drawer, nested drawer or source document without stealing phone focus", () => {
  let focused = false;
  const node = {
    id: "workbench-doc-失败原因",
    getBoundingClientRect: () => ({ top: 720 }),
    setAttribute() {},
    focus() {
      focused = true;
    },
  };
  const pane = {
    scrollTop: 240,
    getBoundingClientRect: () => ({ top: 100 }),
    querySelectorAll: () => [node],
  };
  const memory = {
    positions: new Map([
      ["collection.detail", 240],
      ["home", 380],
    ]),
    guide: "collection.detail",
    panel: "",
    source: null,
    panelOrigin: null,
  };
  restorePageReading(pane, memory, {
    guide: "collection.detail",
    panel: "reviewReason",
    section: "失败原因",
  });
  assert.equal(pane.scrollTop, 844);
  assert.equal(focused, false);
  assert.equal(memory.panelOrigin, 240);
  restorePageReading(pane, memory, {
    guide: "collection.detail",
    panel: "email",
    section: "邮件联系",
  });
  restorePageReading(pane, memory, {
    guide: "collection.detail",
    panel: "",
    section: "",
  });
  assert.equal(pane.scrollTop, 240);
  memory.source = "PRODUCT.md";
  memory.sourceOrigin = 320;
  pane.scrollTop = 20;
  restorePageReading(pane, memory, {
    guide: "collection.detail",
    panel: "",
    section: "",
  });
  assert.equal(pane.scrollTop, 320);
  restorePageReading(pane, memory, { guide: "home", panel: "", section: "" });
  assert.equal(pane.scrollTop, 380);
  assert.equal(
    scrollToDocumentSection(pane, "workbench-doc-失败原因", true),
    true,
  );
  assert.equal(focused, true);
});
