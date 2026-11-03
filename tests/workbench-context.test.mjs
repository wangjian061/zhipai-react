// Pure route/state contracts, no browser automation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveWorkbenchContext as resolve,
  safeAddress,
} from "../src/workbench/context.js";
import {
  registerController,
  createController,
  createDetachedController,
  getControllerScopes,
} from "../src/runtime/state.js";

test("page, tool step and same-address drawers resolve their own document context", () => {
  const scope = { view: "records", panel: "" },
    url = "?page=collection&view=records";
  assert.equal(
    resolve(url, { collectionFlow: scope }).guide,
    "collection.records",
  );
  scope.view = "project";
  scope.panel = "qrCheck";
  const auth = resolve(url, { collectionFlow: scope });
  assert.equal(auth.guide, "collection.project");
  assert.equal(auth.state, "确认身份信息");
  assert.equal(auth.section, "核对身份信息");
  scope.panel = "";
  assert.notEqual(resolve(url, { collectionFlow: scope }).key, auth.key);
  const tool = { action: "repair", step: 0, panel: null };
  assert.equal(
    resolve("?page=tool&tool=repair", { toolStudio: tool }).guide,
    "tool.repair.select",
  );
  tool.step = 1;
  assert.equal(
    resolve("?page=tool&tool=repair", { toolStudio: tool }).guide,
    "tool.repair.settings",
  );
  tool.step = 2;
  assert.equal(
    resolve("?page=tool&tool=repair", { toolStudio: tool }).guide,
    "tool.repair.result",
  );
});
test("page address display excludes personal, photo, record and login-return data", () => {
  const address = safeAddress(
    "?page=camera&camera=confirm&session=secret-session&record=person&phone=13800008000&back=private&q=姓名",
  );
  assert.equal(address, "/?page=camera&camera=confirm");
  assert.ok(!address.includes("secret"));
  assert.ok(!address.includes("138"));
  assert.equal(resolve("?page=unexpected").page, "home");
});
test("current helpers, scanner guide, color drawer and photo picker follow actual flags", () => {
  const s = { view: "services", helpOpen: "review" };
  assert.match(
    resolve("?page=collection", { collectionFlow: s }).state,
    /审核未通过/,
  );
  s.helpOpen = "save";
  assert.match(
    resolve("?page=collection", { collectionFlow: s }).state,
    /保存照片/,
  );
  assert.match(
    resolve("?page=scan", {
      collectionScanner: { guideOpen: true, guidePage: "chsi" },
    }).state,
    /采集码帮助/,
  );
  const picker = { selectedId: "one", opened: false };
  assert.equal(
    resolve("?page=specifications", { specificationPicker: picker }).panel,
    "",
  );
  picker.opened = true;
  assert.equal(
    resolve("?page=specifications", { specificationPicker: picker }).state,
    "选择背景颜色",
  );
  assert.equal(
    resolve("?page=tool&tool=crop", {}, { photoChoice: true }).state,
    "选择照片",
  );
});
test("task status, print modal, account panel and album viewer remain distinct", () => {
  assert.equal(
    resolve("?page=collection&view=detail", {
      collectionFlow: { view: "detail", statusKey: "upload_failed" },
    }).state,
    "上网失败",
  );
  assert.equal(
    resolve("?page=print", {
      printStudio: { view: "confirm", modal: "payment" },
    }).state,
    "付款",
  );
  assert.equal(
    resolve("?page=account", {
      accountFlow: { view: "password", panel: "policy" },
    }).state,
    "阅读协议",
  );
  assert.equal(
    resolve("?page=album&photo=local-id", {
      albumCenter: { view: "detail", previewHistoryId: "viewer" },
    }).state,
    "放大查看",
  );
});
test("demo context does not rewrite route, and busy operations block outside interruption", () => {
  const url = "?page=home";
  const current = resolve(
    url,
    {},
    {},
    { guide: "update.demo", title: "强制更新", state: "发现新版本" },
  );
  assert.equal(current.address, "/?page=home");
  assert.equal(current.isDemo, true);
  assert.equal(
    resolve("?page=camera", {
      cameraStudio: { step: "confirm", panel: "making" },
    }).busy,
    true,
  );
  assert.equal(
    resolve("?page=collection", { collectionFlow: { busy: true } }).busy,
    true,
  );
});
test("controller observation cleans up and detached controllers never start real lifecycles", () => {
  let started = 0,
    stopped = 0;
  registerController("workbench-contract", () => ({
    init() {
      started++;
    },
    destroy() {
      stopped++;
    },
    value: 0,
  }));
  const one = createController("workbench-contract"),
    two = createController("workbench-contract");
  one.start();
  two.start();
  assert.equal(getControllerScopes()["workbench-contract"], two.scope);
  two.stop();
  assert.equal(getControllerScopes()["workbench-contract"], one.scope);
  const detached = createDetachedController("workbench-contract", {
    value: 42,
  });
  detached.value++;
  assert.equal(detached.value, 43);
  assert.equal(one.scope.value, 0);
  assert.equal(started, 2);
  one.stop();
  assert.equal(getControllerScopes()["workbench-contract"], undefined);
  assert.equal(stopped, 2);
});
