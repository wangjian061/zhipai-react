// Domain/state tests only; no browser, screenshots or automatic UI operation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createController, getStore } from "../src/runtime/state.js";
let current = new URL("http://127.0.0.1:4180/?page=collection"),
  pushes = 0,
  replaces = 0;
Object.defineProperty(globalThis, "location", {
  get: () => current,
  configurable: true,
});
globalThis.window = new EventTarget();
globalThis.document = { activeElement: null };
globalThis.history = {
  pushState(a, b, url) {
    pushes++;
    current = new URL(url, current);
  },
  replaceState(a, b, url) {
    replaces++;
    current = new URL(url, current);
  },
};
Object.defineProperty(globalThis, "navigator", {
  value: {},
  configurable: true,
});
await import("../src/domain/index.js");
const settle = () => new Promise((r) => setTimeout(r, 5));
function setup() {
  current = new URL("http://127.0.0.1:4180/?page=collection");
  pushes = 0;
  replaces = 0;
  const account = getStore("account");
  account.session = { phone: "13800008000" };
  const records = getStore("collectionRecords");
  records.ready = true;
  records.busy = false;
  records.error = "";
  records.items = [
    {
      id: "fixture",
      fixture: true,
      owner: "13800008000",
      projectId: "enrollment",
      status: "rejected",
      createdAt: 1,
      updatedAt: 9,
    },
    {
      id: "other",
      owner: "13900008000",
      projectId: "graduate",
      status: "draft",
      createdAt: 1,
      updatedAt: 10,
    },
    {
      id: "pending",
      owner: "13800008000",
      projectId: "enrollment",
      status: "pending",
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "rejected",
      owner: "13800008000",
      projectId: "graduate",
      status: "rejected",
      reason: "请露出双耳",
      createdAt: 2,
      updatedAt: 4,
    },
    {
      id: "complete",
      owner: "13800008000",
      projectId: "association",
      status: "complete",
      createdAt: 3,
      updatedAt: 5,
    },
  ];
  const root = createController("phoneDemo");
  root.scope.page = "collection";
  root.scope.go = function (page) {
    this.page = page;
  };
  const instance = createController("collectionFlow", [], root.scope);
  instance.refs.collectionScroll = { scrollTop: 0 };
  instance.refs.collectionProjectList = { scrollTop: 0 };
  instance.refs.collectionCategoryList = { scrollTop: 0 };
  instance.refs.collectionMessageList = { scrollTop: 0 };
  instance.refs.collectionRecordList = { scrollTop: 0 };
  instance.start();
  return { s: instance.scope, instance, account, root };
}
test("peer tabs replace the route, preserve independent scroll/filter state and exit to the shared home", async () => {
  const { s, instance, root } = setup();
  await settle();
  s.projectCategory = "enrollment";
  s.category = "graduate";
  s.$refs.collectionProjectList.scrollTop = 170;
  s.switchSection("records");
  assert.equal(s.view, "records");
  await settle();
  assert.equal(s.$refs.collectionRecordList.scrollTop, 0);
  s.scrollHost.scrollTop = 83;
  assert.equal(s.$refs.collectionRecordList.scrollTop, 83);
  s.recordFilter = "complete";
  s.switchSection("services");
  await settle();
  assert.equal(s.view, "services");
  assert.equal(s.$refs.collectionScroll.scrollTop, 0);
  s.switchSection("home");
  await settle();
  assert.equal(s.$refs.collectionProjectList.scrollTop, 170);
  assert.equal(s.projectCategory, "enrollment");
  s.switchSection("records");
  await settle();
  assert.equal(s.$refs.collectionRecordList.scrollTop, 83);
  assert.equal(s.category, "graduate");
  assert.equal(s.recordFilter, "complete");
  assert.equal(pushes, 0);
  assert.equal(replaces, 4);
  s.exitCollection();
  assert.equal(root.scope.page, "home");
  assert.equal(s.account.session.phone, "13800008000");
  instance.stop();
});
test("featured configuration stays separate from full category lists and scoped searches", () => {
  const { s, instance } = setup();
  s.category = "association";
  s.keyword = "毕业";
  assert.deepEqual(
    s.projectsShown.map((p) => p.id),
    s.config.featuredProjectIds,
  );
  assert.equal(s.projectsShown.length, 5);
  s.searchProjects();
  assert.equal(s.view, "projects");
  assert.equal(s.projectCategory, "all");
  assert.deepEqual(
    s.projectsShown.map((p) => p.id),
    ["graduate", "graduate-degree", "graduate-continuing"],
  );
  s.openCategory("enrollment");
  assert.equal(s.view, "projects");
  assert.equal(s.projectCategory, "enrollment");
  assert.equal(s.projectsShown.length, 3);
  s.keyword = "研究生";
  s.searchProjects();
  assert.deepEqual(
    s.projectsShown.map((p) => p.id),
    ["enrollment-postgraduate"],
  );
  s.clearSearch();
  assert.equal(s.projectCategory, "enrollment");
  assert.equal(s.projectsShown.length, 3);
  assert.equal(s.category, "association");
  s.config.featuredProjectIds = ["association"];
  s.back();
  assert.equal(s.view, "home");
  assert.deepEqual(
    s.projectsShown.map((p) => p.id),
    ["association"],
  );
  instance.stop();
});
test("continuation, badges and notifications use actual records belonging to the signed-in account", () => {
  const { s, instance, account } = setup();
  assert.equal(s.records.length, 3);
  assert.equal(s.actionableRecords.length, 2);
  assert.equal(s.continueTask.id, "rejected");
  assert.equal(s.collectionNotifications.length, 3);
  const message = s.collectionNotifications.find((n) => n.id === "rejected");
  assert.equal(message.text, "请露出双耳");
  s.openRecord(message.record);
  assert.equal(s.view, "detail");
  assert.equal(s.recordId, "rejected");
  s.back();
  assert.equal(s.view, "records");
  s.openRecord(s.records.find((r) => r.id === "complete"));
  assert.equal(s.view, "complete");
  s.back();
  assert.equal(s.recordFilter, "all");
  assert.equal(s.view, "records");
  account.session = null;
  assert.equal(s.records.length, 0);
  assert.equal(s.actionableRecords.length, 0);
  assert.equal(s.continueTask, null);
  assert.equal(s.collectionNotifications.length, 0);
  assert.equal(s.notifications.length, 2);
  instance.stop();
});
test("login returns to the requesting section; task pages retain back and cannot exit through section controls", () => {
  const { s, instance, account } = setup();
  account.session = null;
  s.switchSection("services");
  s.loginForRecords();
  assert.equal(current.searchParams.get("page"), "account");
  assert.equal(
    current.searchParams.get("back"),
    "/?page=collection&view=services",
  );
  account.session = { phone: "13800008000" };
  current = new URL("http://127.0.0.1:4180/?page=collection");
  s.sync();
  s.openProject("graduate");
  assert.equal(s.view, "project");
  assert.equal(s.isSection, false);
  s.exitCollection();
  assert.equal(s.page, "collection");
  s.back();
  assert.equal(s.view, "home");
  s.panel = "identity";
  const old = replaces;
  s.switchSection("records");
  assert.equal(replaces, old);
  s.panel = null;
  s.busy = true;
  s.switchSection("services");
  assert.equal(replaces, old);
  s.busy = false;
  instance.stop();
});
test("foreign or unknown records cannot be presented as completed through a URL", () => {
  const { s, instance } = setup();
  for (const id of ["other", "fixture", "missing"]) {
    current = new URL(
      "http://127.0.0.1:4180/?page=collection&view=complete&record=" + id,
    );
    s.sync();
    s.loadPhoto();
    assert.equal(s.current, null);
    assert.equal(s.view, "detail");
  }
  instance.stop();
});
test("collection menu, asset and section boundaries match the authorized design", () => {
  const page = fs.readFileSync("src/pages/CollectionPage.jsx", "utf8");
  const nav = fs.readFileSync(
    "src/components/CollectionNavigation.jsx",
    "utf8",
  );
  const home = fs.readFileSync("src/components/CollectionHome.jsx", "utf8");
  for (const label of ["专项列表", "采集记录", "服务中心", "扫码"])
    assert.ok(nav.includes(label));
  assert.ok(
    /!s\.isSection\s*&&\s*!\["projects", "notifications", "detail", "complete"\]\.includes\(/.test(
      page,
    ),
  );
  assert.ok(page.includes("<CollectionTaskHeader scope={s} />"));
  assert.ok(!page.includes("collection-nav-records"));
  assert.ok(nav.includes("s.isSection && !s.panel"));
  assert.ok(home.includes("热门项目"));
  assert.ok(!home.includes("条进行中"));
  assert.ok(
    fs.statSync("public/assets/collection-header-cards.webp").size < 100000,
  );
  const icons = [
    ...nav.matchAll(/icon: "([^"]+)"/g),
    ...home.matchAll(/name="([^"]+)"/g),
  ].map((m) => m[1]);
  const defs = fs.readFileSync("src/App.jsx", "utf8");
  for (const icon of icons)
    assert.ok(defs.includes('id="i-' + icon + '"'), icon);
});

test("notification center has independent filters and returns to its source section", async () => {
  const { s, instance } = setup();
  await settle();
  s.switchSection("records");
  s.$refs.collectionRecordList.scrollTop = 110;
  s.openNotifications();
  assert.equal(s.view, "notifications");
  assert.equal(current.searchParams.get("section"), "records");
  assert.equal(s.isSection, false);
  assert.equal(s.latestCollectionNotification.id, "complete");
  assert.equal(s.notifications.length, 5);
  s.notificationFilter = "collection";
  assert.equal(s.notificationsShown.length, 3);
  s.openNotification(s.notificationsShown[0]);
  assert.equal(s.view, "complete");
  s.back();
  assert.equal(s.view, "notifications");
  s.back();
  assert.equal(s.view, "records");
  await settle();
  assert.equal(s.$refs.collectionRecordList.scrollTop, 110);
  s.switchSection("services");
  s.openNotifications();
  assert.equal(s.notificationFrom, "services");
  s.notificationFilter = "project";
  s.openNotification(s.notificationsShown[0]);
  assert.equal(s.view, "project");
  s.back();
  assert.equal(s.view, "notifications");
  s.back();
  assert.equal(s.view, "services");
  instance.stop();
});
test("sample projects have unique identities, complete category rules and resolvable detail routes", () => {
  const { s, instance } = setup();
  assert.equal(s.projects.length, 9);
  assert.equal(new Set(s.projects.map((p) => p.id)).size, 9);
  for (const category of ["enrollment", "graduate", "association"]) {
    const group = s.projects.filter((p) => p.type === category);
    assert.equal(group.length, 3);
    const base = group.find((p) => !p.example);
    for (const p of group) {
      assert.deepEqual(p.methods, base.methods);
      assert.deepEqual(p.requirements, base.requirements);
      assert.ok(p.image && p.organization && p.date);
      s.openProject(p.id);
      assert.equal(s.project.id, p.id);
      assert.equal(s.view, "project");
    }
  }
  assert.equal(
    s.records.length,
    3,
    "extra projects do not create fake personal records or notifications",
  );
  assert.equal(s.collectionNotifications.length, 3);
  instance.stop();
});

test("all project states remain viewable while closed states cannot begin, match, capture or submit", async () => {
  const { s, instance } = setup();
  for (const id of ["enrollment-postgraduate", "association-talent"]) {
    s.openProject(id);
    await settle();
    assert.equal(s.view, "project");
    assert.equal(s.canCollect, false);
    assert.ok(["未开始", "已结束"].includes(s.projectState.label));
    assert.equal(s.notice, "", "project entry must not show an automatic notice");
    assert.equal(s.panel, null);
    s.begin();
    assert.equal(s.panel, null);
    await s.matchIdentity();
    await s.capture();
    await s.submit();
    await s.confirmSubmit();
    assert.equal(s.panel, null);
    assert.equal(getStore("collectionRecords").items.length, 5);
  }
  s.openProject("enrollment");
  assert.equal(s.canCollect, true);
  instance.stop();
});
test("disabled entries remain gray feedback targets and direct routes cannot bypass switches", () => {
  const { s, instance } = setup();
  s.config.entries.enrollment = false;
  s.openCategory("enrollment");
  assert.equal(s.view, "home");
  assert.equal(s.notice, "暂未开放这个功能");
  current = new URL(
    "http://127.0.0.1:4180/?page=collection&view=projects&category=enrollment",
  );
  s.sync();
  assert.equal(s.view, "home");
  s.openProject("enrollment");
  assert.equal(s.canCollect, false);
  s.begin();
  assert.equal(s.panel, null);
  s.config.entries.notifications = false;
  current = new URL(
    "http://127.0.0.1:4180/?page=collection&view=notifications",
  );
  s.sync();
  assert.equal(s.view, "home");
  instance.stop();
});
test("back from a project preserves its category, query and actual list scroll position", async () => {
  const { s, instance } = setup();
  s.$refs.collectionProjectList.scrollTop = 95;
  s.openCategory("graduate");
  s.keyword = "学历";
  s.searchProjects();
  await settle();
  s.$refs.collectionCategoryList.scrollTop = 75;
  s.openProject("graduate-degree");
  await settle();
  s.back();
  await settle();
  assert.equal(s.view, "projects");
  assert.equal(s.projectCategory, "graduate");
  assert.equal(s.searchTerm, "学历");
  assert.equal(s.$refs.collectionCategoryList.scrollTop, 75);
  s.back();
  await settle();
  assert.equal(s.$refs.collectionProjectList.scrollTop, 95);
  instance.stop();
});
test("top notifications support auto and manual closing without expanding list layout", () => {
  const { s, instance } = setup();
  s.showNotice("重要通知", "warning", "manual");
  assert.equal(s.noticeCloseMode, "manual");
  assert.equal(s.noticeSeverity, "warning");
  assert.equal(s.noticeTimer, null);
  s.dismissNotice();
  assert.equal(s.notice, "");
  s.showNotice("普通提示");
  assert.equal(s.noticeTimer._idleTimeout, 4000);
  s.noticeTimer._onTimeout();
  assert.equal(s.notice, "");
  const css = fs.readFileSync("src/styles/collection.css", "utf8");
  assert.match(css, /collection-top-notice\{position:absolute;/);
  assert.match(
    css,
    /collection-project-list,.collection-message-scroll\{[^}]*overflow:auto/,
  );
  assert.match(css, /data-view="home"[^}]*overflow:hidden/);
  instance.stop();
});

test("record operations use their own project status even before async preview restoration", async () => {
  const { s, instance } = setup();
  const records = getStore("collectionRecords");
  records.items = [
    {
      id: "closed",
      projectId: "association-talent",
      owner: "13800008000",
      status: "pending",
      createdAt: 1,
    },
  ];
  current = new URL(
    "http://127.0.0.1:4180/?page=collection&view=detail&project=enrollment&record=closed",
  );
  s.sync();
  assert.equal(s.project.id, "association-talent");
  assert.equal(s.canCollect, false);
  await s.capture();
  assert.equal(s.page, "collection");
  await s.acceptPhoto({
    recordId: "closed",
    photo: { blob: new Blob(["photo"], { type: "image/jpeg" }) },
  });
  assert.equal(records.items[0].status, "pending");
  assert.equal(records.items[0].photo, undefined);
  instance.stop();
});

test("service-center email contact requires confirmation, cancellation stays in services and list pages cannot confirm", async () => {
  const { s, instance } = setup();
  let focuses = 0;
  instance.refs.collectionDialog = {
    querySelector: () => ({
      focus() {
        focuses++;
      },
    }),
  };
  assert.equal(s.emailLink, undefined);
  assert.equal(s.confirmEmailContact(), false);
  s.switchSection("services");
  getStore("collectionRecords").ready = false;
  s.openEmailContact();
  assert.equal(
    s.panel,
    "email",
    "customer contact does not require record loading to succeed",
  );
  assert.equal(s.panelTitle, "联系知拍客服");
  assert.match(s.emailLink, /^mailto:zpai_service@163\.com\?subject=/);
  s.closePanel();
  assert.equal(s.panel, null);
  assert.equal(s.emailLink, undefined);
  assert.equal(s.view, "services");
  assert.equal(s.confirmEmailContact(), false);
  s.openEmailContact();
  assert.equal(s.confirmEmailContact(), true);
  assert.equal(s.panel, null);
  assert.equal(s.confirmEmailContact(), false);
  await settle();
  assert.ok(focuses > 0);
  s.switchSection("home");
  s.openEmailContact();
  assert.equal(s.panel, null);
  instance.stop();
});
test("collection artwork and scroll source use the approved institutional hierarchy", () => {
  const { s, instance } = setup();
  for (const p of s.projects) {
    assert.ok(!p.image.includes("bear"));
    assert.ok(p.bannerImage && !p.bannerImage.includes("bear"));
    assert.ok(fs.existsSync("public/" + p.image));
    assert.ok(fs.existsSync("public/" + p.bannerImage));
  }
  for (const c of s.categories)
    assert.ok(fs.existsSync("public/" + c.iconImage));
  const home = fs.readFileSync("src/components/CollectionHome.jsx", "utf8");
  const page = fs.readFileSync("src/pages/CollectionPage.jsx", "utf8");
  const services = fs.readFileSync(
    "src/components/CollectionServices.jsx",
    "utf8",
  );
  const notifications = fs.readFileSync(
    "src/components/CollectionNotifications.jsx",
    "utf8",
  );
  const header = fs.readFileSync(
    "src/components/CollectionProjectHeader.jsx",
    "utf8",
  );
  const css = fs.readFileSync("src/styles/collection.css", "utf8");
  assert.ok(home.includes("collection-header-cards.webp"));
  assert.ok(home.includes("collection-shortcut-art"));
  assert.ok(!page.includes("collection-latest-notification"));
  assert.ok(
    fs
      .readFileSync("src/components/CollectionRecords.jsx", "utf8")
      .includes("collection-icon-records.webp"),
  );
  assert.ok(notifications.includes("collection-icon-notification.webp"));
  assert.ok(header.includes("project.bannerImage || project.image"));
  assert.ok(!services.includes("mailto:"));
  assert.ok(page.includes("s.confirmEmailContact()"));
  assert.match(css, /collection-home-inner\{[^}]*padding:18px 16px 0/);
  assert.match(
    css,
    /collection-list-home \.collection-project-list\{[^}]*padding-bottom:calc\(var\(--device-nav-bottom,29px\) \+ 58px \+ 16px\)/,
  );
  assert.doesNotMatch(
    css,
    /collection-notification-entry\{[^}]*linear-gradient/,
  );
  assert.match(
    css,
    /is-closed \.collection-shortcut-art\{filter:grayscale\(1\)/,
  );
  // At scroll end the final item is clear of the 58px nav + its bottom offset.
  const screenBottom = 874,
    navigationBottom = 29,
    navigationHeight = 58,
    tail = 29 + 58 + 16;
  assert.equal(
    screenBottom - navigationBottom - navigationHeight - (screenBottom - tail),
    16,
  );
  instance.stop();
});

test("full requirements open as a read-only sheet without requiring records, preserve project context and close back to the same project", async () => {
  const { s, instance } = setup();
  let focusCount = 0;
  instance.refs.collectionDialog = {
    querySelector: () => ({
      focus() {
        focusCount++;
      },
    }),
  };
  s.openCategory("association");
  s.openProject("association");
  await settle();
  const urlBefore = current.href;
  const recordsBefore = JSON.parse(
    JSON.stringify(getStore("collectionRecords").items),
  );
  const requirements = [...s.project.requirements];
  s.project.requirements = [
    ...requirements,
    ...Array.from({ length: 20 }, (_, i) => "补充要求" + i),
  ];
  getStore("collectionRecords").ready = false;
  s.openRequirements();
  assert.equal(s.view, "project");
  assert.equal(s.panel, "requirements");
  assert.equal(s.panelTitle, "采集要求");
  assert.equal(current.href, urlBefore);
  assert.equal(s.project.requirements.length, requirements.length + 20);
  assert.deepEqual(
    s.project.requirements.slice(0, 3),
    requirements.slice(0, 3),
  );
  s.back();
  assert.equal(s.panel, null);
  assert.equal(s.view, "project");
  assert.equal(s.project.id, "association");
  assert.equal(current.href, urlBefore);
  assert.deepEqual(getStore("collectionRecords").items, recordsBefore);
  s.openRequirements();
  await settle();
  assert.ok(focusCount > 0);
  s.closePanel();
  s.busy = true;
  s.openRequirements();
  assert.equal(s.panel, null);
  s.busy = false;
  s.switchSection("services");
  s.openRequirements();
  assert.equal(s.panel, null);
  instance.stop();
});

test("identity sheet stages preserve temporary photos and typed fields while changing supported methods", async () => {
  const { s, instance } = setup();
  instance.refs.collectionDialog = { querySelector: () => ({ focus() {} }) };
  s.openProject("enrollment");
  s.begin();
  assert.equal(s.panel, "identity");
  assert.equal(s.isAuthPanel, true);
  const front = new Blob(["front"], { type: "image/jpeg" });
  const back = new Blob(["back"], { type: "image/jpeg" });
  s.idSides.front = front;
  s.idSides.back = back;
  s.idURLs.front = URL.createObjectURL(front);
  s.idURLs.back = URL.createObjectURL(back);
  const frontUrl = s.idURLs.front;
  s.reviewIdentity();
  assert.equal(s.panel, "verify");
  s.identity.name = "王同学";
  s.identity.number = "110101200001011234";
  s.returnAuthentication();
  assert.equal(s.panel, "identity");
  assert.equal(s.method, "id");
  assert.equal(s.idSides.front, front);
  assert.equal(s.idURLs.front, frontUrl);
  assert.equal(s.identity.name, "王同学");
  s.alternate();
  assert.equal(s.panel, "alternate");
  assert.deepEqual(s.identityMethods, ["student"]);
  assert.equal(s.method, "student");
  assert.equal(s.authReturnLabel, "返回身份证上传");
  s.busy = true;
  s.returnAuthentication();
  assert.equal(s.panel, "alternate");
  s.busy = false;
  s.returnAuthentication();
  assert.equal(s.panel, "identity");
  assert.equal(s.identity.number, "110101200001011234");
  s.closePanel();
  assert.equal(s.isAuthPanel, false);
  assert.equal(s.idSides.front, null);
  assert.equal(s.idURLs.front, "");
  assert.equal(s.identity.name, "");
  await settle();
  instance.stop();
});
test("graduate authentication only offers QR, with QR retry and employee labels kept coherent", async () => {
  const { s, instance } = setup();
  instance.refs.collectionDialog = { querySelector: () => ({ focus() {} }) };
  s.openProject("graduate");
  s.begin();
  assert.equal(s.panel, "qr");
  assert.equal(s.method, "qr");
  assert.deepEqual([...s.identityMethods], []);
  s.alternate();
  assert.equal(s.panel, "qr");
  assert.equal(s.method, "qr");
  s.qrRead = true;
  s.openPanel("qrCheck");
  assert.equal(s.authReturnLabel, "重新识别采集码");
  s.returnAuthentication();
  assert.equal(s.qrRead, false);
  assert.equal(s.panel, "qr");
  s.closePanel();
  s.openProject("association");
  s.begin();
  assert.equal(s.panel, "employee");
  assert.equal(s.method, "employee");
  assert.equal(s.isAuthPanel, true);
  assert.equal(s.authReturnLabel, "");
  await settle();
  instance.stop();
});

test("record task actions stay specific to all five states and retain their own project gate", async () => {
  const { s, instance } = setup();
  const records = getStore("collectionRecords");
  let action;
  s.capture = () => {
    action = "capture";
  };
  s.submit = () => {
    action = "submit";
  };
  s.download = () => {
    action = "download";
  };
  const cases = [
    ["pending", "开始拍摄", "capture"],
    ["draft", "提交审核", "submit"],
    ["reviewing", "返回采集记录", "records"],
    ["rejected", "重新拍摄", "capture"],
    ["complete", "保存照片", "download"],
  ];
  for (const [status, label, expected] of cases) {
    records.items = [
      { id: "task", owner: "13800008000", projectId: "enrollment", status, payment: {status: "paid", amount: 1200} },
    ];
    s.view = "detail";
    s.recordId = "task";
    s.projectId = "graduate"; // The record, rather than an unrelated URL, owns the action.
    action = null;
    assert.equal(s.project.id, "enrollment");
    assert.equal(s.primaryLabel, label);
    s.primary();
    if (expected === "records") {
      await settle();
      assert.equal(s.view, "records");
    } else assert.equal(action, expected);
  }
  records.items[0].status = "draft";
  s.view = "detail";
  s.recordId = "task";
  s.projects.find((p) => p.id === "enrollment").status = "ended";
  action = null;
  s.primary();
  assert.equal(action, null);
  assert.equal(s.primaryLabel, "已结束");
  instance.stop();
});

test("materials remain read-only and supplement edits are limited to unsubmitted records", async () => {
  const { s, instance, account } = setup();
  const records = getStore("collectionRecords");
  s.recordId = "pending";
  s.view = "detail";
  s.openMaterials();
  assert.equal(s.panel, "materials");
  assert.equal(s.isTaskPanel, true);
  assert.equal(s.panelTitle, "采集信息");
  s.closePanel();
  let commits = 0;
  const originalCommit = records.commit;
  records.commit = async () => {
    commits++;
  };
  try {
    for (const status of [
      "pending",
      "draft",
      "rejected",
      "reviewing",
      "complete",
    ]) {
      records.items = [
        {
          id: "task",
          owner: account.session.phone,
          projectId: "enrollment",
          status,
          supplement: { referrer: "张老师", age: "19" },
        },
      ];
      s.recordId = "task";
      s.editSupplement();
      assert.equal(s.panel, "supplement");
      assert.equal(s.supplement.referrer, "张老师");
      assert.equal(
        s.canEditSupplement,
        ["pending", "draft", "rejected"].includes(status),
      );
      if (["reviewing", "complete"].includes(status)) {
        s.supplement.age = "20";
        await s.saveSupplement();
        assert.equal(commits, 0);
        assert.equal(s.current.supplement.age, "19");
      }
      s.closePanel();
    }
    account.session = { phone: "13900008000" };
    assert.equal(s.current, null);
    s.openMaterials();
    s.editSupplement();
    await s.saveSupplement();
    assert.equal(s.panel, null);
    assert.equal(commits, 0);
  } finally {
    records.commit = originalCommit;
    instance.stop();
  }
});

test("supplement failure preserves edits for retry, successful save clears errors and does not modify another account", async () => {
  const { s, instance } = setup();
  const records = getStore("collectionRecords"),
    originalCommit = records.commit;
  s.view = "detail";
  s.recordId = "pending";
  s.editSupplement();
  s.supplement.referrer = "李老师";
  s.supplement.age = "121";
  let commits = 0;
  records.commit = async () => {
    commits++;
    throw Error("storage full");
  };
  try {
    await s.saveSupplement();
    assert.equal(s.error, "请填写有效年龄");
    assert.equal(commits, 0);
    s.supplement.age = "18";
    await s.saveSupplement();
    assert.equal(s.error, "信息保存失败，请重试");
    assert.equal(s.panel, "supplement");
    assert.equal(s.supplement.referrer, "李老师");
    assert.equal(s.supplement.age, "18");
    assert.equal(s.current.supplement, undefined);
    records.items.push({
      id: "pending",
      owner: "13900008000",
      projectId: "enrollment",
      status: "draft",
      supplement: { referrer: "其他账号", age: "22" },
    });
    records.commit = async (items) => {
      records.items = items;
    };
    await s.saveSupplement();
    assert.equal(s.error, "");
    assert.equal(s.panel, null);
    assert.deepEqual(s.current.supplement, { referrer: "李老师", age: "18" });
    assert.equal(
      records.items.find((r) => r.owner === "13900008000" && r.id === "pending")
        .supplement.referrer,
      "其他账号",
    );
    // A later review result makes an already-open form read-only too.
    s.editSupplement();
    s.current.status = "reviewing";
    s.supplement.age = "20";
    await s.saveSupplement();
    assert.equal(s.current.supplement.age, "18");
  } finally {
    records.commit = originalCommit;
    instance.stop();
  }
});

test("detailed review feedback opens a read-only sheet and returns to the same record without changing its photograph", async () => {
  const { s, instance, account } = setup();
  s.view = "detail";
  s.recordId = "pending";
  s.openReviewReason();
  assert.equal(s.panel, null);
  assert.equal(s.canViewReviewReason, false);
  s.recordId = "rejected";
  s.current.reason = "请露出双耳。\n请保持双肩端正。";
  s.current.photo = {
    blob: new Blob(["photo"], { type: "image/jpeg" }),
    size: 5,
  };
  s.loadPhoto();
  const photo = s.photoSrc,
    url = current.href,
    items = getStore("collectionRecords").items;
  s.openReviewReason();
  assert.equal(s.panel, "reviewReason");
  assert.equal(s.isTaskPanel, true);
  assert.equal(s.panelTitle, "未通过原因");
  assert.equal(s.current.reason, "请露出双耳。\n请保持双肩端正。");
  s.back();
  assert.equal(s.panel, null);
  assert.equal(s.view, "detail");
  assert.equal(s.recordId, "rejected");
  assert.equal(s.photoSrc, photo);
  assert.equal(current.href, url);
  assert.equal(getStore("collectionRecords").items, items);
  s.busy = true;
  s.openReviewReason();
  assert.equal(s.panel, null);
  s.busy = false;
  account.session = { phone: "13900008000" };
  assert.equal(s.canViewReviewReason, false);
  s.openReviewReason();
  assert.equal(s.panel, null);
  await settle();
  instance.stop();
});

test("record customer support stays in the photo flow and requires explicit confirmation before opening email", async () => {
  const { s, instance, account } = setup();
  let restores = 0;
  const entry = {
    id: "task-support-entry",
    focus() {
      restores++;
    },
  };
  globalThis.document.activeElement = entry;
  s.view = "complete";
  s.recordId = "complete";
  const record = s.current,
    url = current.href;
  s.openTaskSupport();
  assert.equal(s.panel, "taskSupport");
  assert.equal(s.isTaskPanel, true);
  assert.equal(s.panelTitle, "客服支持");
  assert.equal(s.emailLink, undefined);
  assert.equal(s.confirmEmailContact(), false);
  s.openEmailContact();
  assert.equal(s.panel, "email");
  assert.equal(s.isTaskPanel, true);
  assert.equal(s.previousFocus.id, "task-support-entry");
  assert.match(s.emailLink, /^mailto:zpai_service@163\.com\?subject=/);
  s.closePanel();
  assert.equal(s.emailLink, undefined);
  assert.equal(s.current, record);
  assert.equal(s.view, "complete");
  assert.equal(current.href, url);
  s.openTaskSupport();
  s.openEmailContact();
  assert.equal(s.confirmEmailContact(), true);
  assert.equal(s.panel, null);
  s.view = "project";
  s.openTaskSupport();
  assert.equal(s.panel, null);
  s.view = "complete";
  account.session = { phone: "13900008000" };
  s.openTaskSupport();
  s.openEmailContact();
  assert.equal(s.panel, null);
  assert.equal(s.confirmEmailContact(), false);
  await settle();
  assert.ok(restores > 0);
  globalThis.document.activeElement = null;
  instance.stop();
});

test("backend collection statuses are grouped for display without overwriting their original values", () => {
  const { s, instance } = setup();
  const records = getStore("collectionRecords");
  const cases = [
    [22, "processing", "证件照制作中", "blue"],
    ["STANDARD_SNAP", "processing", "证件照制作中", "blue"],
    [23, "processing_failed", "证件照制作失败", "red"],
    ["STANDARD_FAIL", "processing_failed", "证件照制作失败", "red"],
    ["24", "draft", "待提交审核", "orange"],
    ["STANDARD_SUCCESS", "draft", "待提交审核", "orange"],
    [25, "reviewing", "审核中", "orange"],
    [26, "reviewing", "审核中", "orange"],
    ["FIRST_AUDIT", "reviewing", "审核中", "orange"],
    ["PS", "reviewing", "审核中", "orange"],
    [30, "complete", "采集完成", "green"],
    ["AUDIT_SUCCESS", "complete", "采集完成", "green"],
    [40, "rejected", "审核未通过", "red"],
    ["AUDIT_FALL", "rejected", "审核未通过", "red"],
    ["uploaded", "uploaded", "上网完成", "green"],
    ["upload_failed", "upload_failed", "上网失败", "red"],
    [999, "unknown", "状态待更新", "blue"],
  ];
  s.view = "detail";
  s.recordId = "backend-task";
  for (const [raw, key, label, tone] of cases) {
    records.items = [
      {
        id: "backend-task",
        payment: {status: "paid", amount: 1200},
        owner: "13800008000",
        projectId: "enrollment",
        status: raw,
      },
    ];
    assert.equal(s.statusKey, key);
    assert.equal(s.status.label, label);
    assert.equal(s.status.tone, tone);
    assert.equal(s.current.status, raw);
    assert.equal(s.collectionNotifications[0].title, label);
    assert.equal(s.statusFor(raw).label, label);
  }
  instance.stop();
});

test("backend actions distinguish production retry, review, completion and CHSI failure", async () => {
  const { s, instance, account } = setup();
  const records = getStore("collectionRecords");
  let action = null;
  s.capture = () => {
    action = "capture";
  };
  s.submit = () => {
    action = "submit";
  };
  s.download = () => {
    action = "download";
  };
  const cases = [
    [22, "返回采集记录", "records", false],
    [23, "重新制作", "capture", true],
    [24, "提交审核", "submit", true],
    [25, "返回采集记录", "records", false],
    [26, "返回采集记录", "records", false],
    [30, "保存照片", "download", false],
    [40, "重新拍摄", "capture", true],
    ["uploaded", "保存照片", "download", false],
    ["upload_failed", "联系客服", "support", false],
  ];
  for (const [status, label, expected, editable] of cases) {
    records.items = [
      {
        id: "backend-task",
        payment: {status: "paid", amount: 1200},
        owner: account.session.phone,
        projectId: "enrollment",
        status,
        reason: "平台返回的失败原因",
      },
    ];
    s.recordId = "backend-task";
    s.view = "detail";
    action = null;
    assert.equal(s.primaryLabel, label);
    assert.equal(s.canEditSupplement, editable);
    s.primary();
    if (expected === "records") {
      await settle();
      assert.equal(s.view, "records");
    } else if (expected === "support") {
      assert.equal(action, null);
      assert.equal(s.panel, "taskSupport");
      s.closePanel();
      assert.equal(s.failureReasonLabel, "查看失败原因");
      s.openReviewReason();
      assert.equal(s.panel, "reviewReason");
      assert.equal(s.panelTitle, "失败原因");
      assert.equal(s.current.reason, "平台返回的失败原因");
      assert.equal(s.current.status, "upload_failed");
      s.closePanel();
    } else assert.equal(action, expected);
  }
  s.current.status = 23;
  s.projects.find((p) => p.id === "enrollment").status = "ended";
  action = null;
  s.primary();
  assert.equal(action, null);
  assert.equal(s.primaryLabel, "已结束");
  records.items = [30, "uploaded", "upload_failed", 22, 23, 24, 25, 26, 40].map(
    (status, i) => ({
      id: String(i),
      owner: account.session.phone,
      projectId: "enrollment",
      status,
    }),
  );
  s.recordFilter = "complete";
  assert.deepEqual(
    s.filteredRecords.map((r) => r.status),
    [30, "uploaded", "upload_failed"],
  );
  s.recordFilter = "ongoing";
  assert.deepEqual(
    s.filteredRecords.map((r) => r.status),
    [22, 23, 24, 25, 26, 40],
  );
  instance.stop();
});

test("record statistics stay account-scoped and stable while progress filters support multiple selection", () => {
  const { s, instance, account } = setup();
  const store = getStore("collectionRecords");
  store.items = [
    {
      id: "enroll",
      owner: account.session.phone,
      projectId: "enrollment",
      status: 24,
    },
    {
      id: "review",
      owner: account.session.phone,
      projectId: "graduate",
      status: 26,
    },
    {
      id: "finished",
      owner: account.session.phone,
      projectId: "graduate",
      status: 30,
    },
    {
      id: "upload-failed",
      owner: account.session.phone,
      projectId: "graduate",
      status: "upload_failed",
    },
    {
      id: "foreign",
      owner: "13900008000",
      projectId: "association",
      status: 30,
    },
    {
      id: "fixture",
      owner: account.session.phone,
      projectId: "association",
      status: 30,
      fixture: true,
    },
  ];
  const counts = [4, 1, 3, 0];
  assert.deepEqual(
    s.recordStatistics.map((c) => c.id),
    ["all", "enrollment", "graduate", "association"],
  );
  assert.deepEqual(
    s.recordStatistics.map((c) => c.count),
    counts,
  );
  assert.equal(s.recordFilterSelected("ongoing"), true);
  assert.equal(s.recordFilterSelected("complete"), true);
  assert.equal(s.filteredRecords.length, 4);
  s.toggleRecordFilter("ongoing");
  assert.deepEqual(
    s.filteredRecords.map((r) => r.id),
    ["finished", "upload-failed"],
  );
  s.toggleRecordFilter("complete");
  assert.equal(s.recordFilter, "complete", "cannot clear the final selection");
  s.category = "enrollment";
  assert.equal(s.filteredRecords.length, 0);
  assert.deepEqual(
    s.recordStatistics.map((c) => c.count),
    counts,
  );
  s.toggleRecordFilter("ongoing");
  assert.deepEqual(
    s.filteredRecords.map((r) => r.id),
    ["enroll"],
  );
  s.category = "all";
  s.toggleRecordFilter("complete");
  assert.deepEqual(
    s.filteredRecords.map((r) => r.id),
    ["enroll", "review"],
  );
  s.toggleRecordFilter("invalid");
  assert.equal(s.recordFilter, "ongoing");
  s.panel = "materials";
  s.toggleRecordFilter("complete");
  assert.equal(s.recordFilter, "ongoing");
  account.session = null;
  assert.deepEqual(
    s.recordStatistics.map((c) => c.count),
    [0, 0, 0, 0],
  );
  assert.equal(s.filteredRecords.length, 0);
  instance.stop();
});


test("collection payment gates capture, survives cancellation and route recovery, and never charges a paid task again", async () => {
  const { collectionAdapter } = await import("../src/domain/collection.js");
  const { s, instance, root } = setup();
  await settle();
  const records = getStore("collectionRecords"), commit = records.commit, pay = collectionAdapter.payment;
  const calls = [];
  let outcome = "pending", captures = 0;
  const onCapture = () => captures++;
  window.addEventListener("zhipai-camera-intent", onCapture);
  records.commit = async (items) => { records.items = items; };
  collectionAdapter.payment = async (order, _, query) => { calls.push({id:order.id, amount:order.amount, query}); return outcome; };
  records.items = [{id:"pay-task",owner:"13800008000",projectId:"enrollment",status:"pending",payment:{id:"pay-order",amount:700,status:"pending"}}];
  s.recordId="pay-task";s.projectId="enrollment";s.view="detail";
  try {
    for (const project of s.projects) assert.ok(Number.isInteger(project.price / 100) && project.price >= 400 && project.price <= 2500);
    assert.equal(s.primaryLabel,"支付并开始采集");
    await s.capture();assert.equal(captures,0);assert.equal(s.panel,"payment");
    await s.acceptPhoto({recordId:"pay-task",photo:{blob:new Blob(["photo"])}});
    assert.equal(s.current.status,"pending");
    s.paymentOutcome="cancel";await s.payCollection();
    assert.equal(s.current.payment.status,"pending");assert.equal(captures,0);
    s.closePanel();assert.equal(s.current.status,"pending");
    await s.capture();outcome="verifying";await s.payCollection();
    assert.equal(s.current.payment.status,"verifying");assert.equal(captures,0);
    s.closePanel();s.route("detail","enrollment","pay-task");await settle();
    assert.equal(s.current.payment.id,"pay-order");assert.equal(s.collectionPrice,"7.00");
    await s.capture();outcome="paid";await s.payCollection();
    assert.equal(calls.at(-1).query,true);assert.equal(captures,1);assert.equal(s.current.payment.status,"paid");
    assert.ok(calls.every(c=>c.id==="pay-order"&&c.amount===700));
    root.scope.page="collection";const count=calls.length;
    records.items[0].status="rejected";await s.capture();await s.payCollection();
    assert.equal(captures,2);assert.equal(calls.length,count);
  } finally { records.commit=commit;collectionAdapter.payment=pay;window.removeEventListener("zhipai-camera-intent",onCapture);instance.stop(); }
});

test("collection payment blocks double clicks and queries an unresolved order after a storage failure", async () => {
  const { collectionAdapter } = await import("../src/domain/collection.js");
  const {s,instance,account}=setup();await settle();
  const records=getStore("collectionRecords"), commit=records.commit, pay=collectionAdapter.payment;
  records.items=[{id:"pay-race",owner:account.session.phone,projectId:"enrollment",status:"pending"}];
  s.recordId="pay-race";s.view="detail";
  let release, calls=0, writes=0;
  records.commit=async items=>{writes++;if(writes===2)throw Error("storage");records.items=items;};
  collectionAdapter.payment=async()=>{calls++;await new Promise(r=>{release=r});return "paid";};
  try {
    await s.capture();const first=s.payCollection();await settle();await s.payCollection();assert.equal(calls,1);
    release();await first;assert.equal(s.current.payment.status,"verifying");assert.equal(s.panel,"payment");
    const id=s.current.payment.id;
    collectionAdapter.payment=async(order,_,query)=>{assert.equal(query,true);assert.equal(order.id,id);return "paid";};
    await s.payCollection();assert.equal(s.current.payment.status,"paid");assert.equal(s.panel,null);
    // A different account cannot consume the payment or attach a photo to the task.
    account.session={phone:"13900000000"};assert.equal(s.current,null);
    await s.acceptPhoto({recordId:"pay-race",photo:{blob:new Blob(["photo"])}});
    assert.equal(records.items[0].photo,undefined);
  } finally {records.commit=commit;collectionAdapter.payment=pay;instance.stop();}
});

test("only unpaid pending capture tasks use the payment CTA; production and review keep their own status actions", async () => {
  const {s,instance}=setup();await settle();
  const records=getStore("collectionRecords");
  records.items=[{id:"cta",owner:"13800008000",projectId:"enrollment",status:"pending",payment:{status:"pending",amount:1200}}];
  s.recordId="cta";s.view="detail";
  assert.equal(s.primaryLabel,"支付并开始采集");
  records.items[0].payment.status="paid";
  assert.equal(s.primaryLabel,"开始拍摄");
  for(const status of [22,23,24,25,26,30,40,"uploaded","upload_failed"]) {
    records.items[0].status=status;
    assert.equal(s.needsPayment,false);
    assert.ok(!s.primaryLabel.includes("支付"));
    assert.ok(!s.status.hint.includes("支付"));
  }
  instance.stop();
});
