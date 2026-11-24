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
    "tool.repair.settings",
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
  const s = {
    view: "services",
    helpOpen: "review",
    panel: "serviceHelp",
    helpArticle: { title: "照片审核未通过怎么办？" },
  };
  assert.match(
    resolve("?page=collection", { collectionFlow: s }).state,
    /审核未通过/,
  );
  s.helpOpen = "save";
  s.helpArticle = { title: "采集完成后如何保存照片？" };
  assert.match(
    resolve("?page=collection", { collectionFlow: s }).state,
    /保存照片/,
  );
  s.panel = null;
  const closed = resolve("?page=collection", { collectionFlow: s });
  assert.equal(closed.panel, "");
  assert.equal(closed.section, "");
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

test("new physical-template pages and personal photo sheets resolve complete owner documentation", () => {
  for (const kind of ["postcard", "stamp"])
    for (const view of ["templates", "work", "confirm", "result"]) {
      const c = resolve(`?page=keepsake&kind=${kind}&view=${view}`);
      const target =
        view === "templates" ? "work" : view;
      assert.equal(c.guide, `keepsake.${kind}.${target}`);
      assert.equal(c.source, "personal-business-upgrade-20261104.md");
    }
  const crop = resolve("?page=keepsake&kind=stamp&view=work", { keepsakeStudio: { kind: "stamp", view: "work", panel: "keepsakeCrop" } });
  assert.equal(crop.section, "定制预览");
  assert.equal(crop.guide, "keepsake.stamp.work");
  const sheet = resolve("?page=my&photoAction=private-photo-id");
  assert.equal(sheet.guide, "my");
  assert.equal(sheet.section, "照片详情抽屉");
  assert.ok(!sheet.address?.includes("private-photo-id"));
  for (const alias of ["select", "preview"])
    assert.equal(resolve(`?page=print&print=${alias}`).guide, "print.layouts");
});

test("all category record pages resolve the common title and record documentation", () => {
  for (const category of ["graduate", "enrollment", "association"]) {
    const c = resolve("?page=collection&view=records&category=" + category);
    assert.equal(c.title, "采集记录");
    assert.equal(c.guide,"collection.records");
  }
});
test("print layout preview keeps its page document and points to the preview section", () => {
  const c = resolve("?page=print&print=layouts", {
    printStudio: { view: "layouts", modal: "layoutPreview" },
  });
  assert.equal(c.guide, "print.layouts");
  assert.equal(c.state, "排版预览");
  assert.equal(c.section, "商品展示、多图画廊与内嵌版式选择（与明信片样式一致）");
  const crop = resolve("?page=print&print=layouts", {
    printStudio: { view: "layouts", modal: "printPreview", previewTab: "crop" },
  });
  assert.equal(crop.guide, "print.layouts");
  assert.equal(crop.section, "冲印预览");
});

test("archive form routing exposes the page guide without member or document IDs",()=>{
  for (const [space,sheet,section] of [["family","member","家人照片"],["documents","new-group","证件照片"]]) {
    const c=resolve("?page=album&space="+space+"&sheet="+sheet+"&member=private-id");
    assert.equal(c.section,section);
    assert.ok(!c.address.includes("private-id"));
  }
});

test("archive management sheets show their own operation and stay in the library guide", () => {
  for (const [space, sheet, member, label, section] of [
    ["family", "manage", "", "管理家人相册", "家人照片"],
    ["family", "edit-member", "private-member", "编辑家人相册", "家人照片"],
    ["family", "delete-member", "private-member", "删除家人相册", "家人照片"],
    ["documents", "manage", "", "管理家人相册", "家人照片"],
    ["family", "manage-photos", "private-member", "管理家人照片", "管理与删除"],
    ["family", "delete-photos", "private-member", "删除家人照片", "管理与删除"],
  ]) {
    const c = resolve("?page=album&space=" + space + "&sheet=" + sheet + (member ? "&member=" + member : ""));
    assert.equal(c.guide, "album.library");
    assert.equal(c.state, label);
    assert.equal(c.section, section);
    assert.ok(!c.address.includes("private-member"));
  }
});

test("archive lists, document operations and family details open the matching documentation", () => {
  const documents = resolve("?page=album&space=documents&member=private-holder");
  assert.equal(documents.guide, "album.library");
  assert.equal(documents.state, "证件列表");
  assert.equal(documents.section, "证件照片");
  const groupPath = "?page=album&space=documents&member=private-holder&group=private-group&item=private-photo";
  for (const [sheet, state, section] of [
    ["view-document", "查看证件照片", "沉浸查看与保存证件照片"],
    ["replace-document", "替换查看中的照片", "沉浸查看与保存证件照片"],
    ["edit-document", "编辑证件", "单层编辑与删除证件"],
    ["confirm-document-delete", "删除证件", "单层编辑与删除证件"],
  ]) {
    const context = resolve(groupPath + "&sheet=" + sheet);
    assert.equal(context.guide, "album.library");
    assert.equal(context.state, state);
    assert.equal(context.section, section);
    assert.ok(!context.address.includes("private-"));
  }
  const listPath = "?page=album&space=family&member=private-member";
  const list = resolve(listPath);
  assert.equal(list.guide, "album.library");
  assert.equal(list.state, "家人照片列表");
  assert.equal(list.section, "家人照片");
  const detail = resolve(listPath + "&item=private-photo");
  assert.equal(detail.guide, "album.detail");
  assert.equal(detail.section, "照片信息");
  const legacyDeletion = resolve(listPath + "&item=private-photo&sheet=delete-photo");
  assert.equal(legacyDeletion.guide, "album.detail");
  assert.equal(legacyDeletion.state, "家人照片详情");
  assert.equal(legacyDeletion.section, "照片信息");
  assert.ok(!legacyDeletion.address.includes("private-"));
});
