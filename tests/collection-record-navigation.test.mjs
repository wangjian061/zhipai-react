// Domain navigation and static React checks; no real accounts or browser automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createController, getStore } from "../src/runtime/state.js";
import { collectionHistoryState, layoutPrintPath, openCollectionPrint, rememberEnrollmentHero, rememberGraduateHero, returnToUniversityPrint, returnCollectionHistory, universityPath, universityProjectPath } from "../src/domain/collection-history.js";
import { goGraduate } from "../src/domain/graduate-print.js";

let entries = [],
  cursor = 0;
Object.defineProperty(globalThis, "location", {
  configurable: true,
  get: () => new URL(entries[cursor].url),
});
globalThis.window = new EventTarget();
globalThis.document = { activeElement: null };
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {},
});
globalThis.history = {
  get state() {
    return entries[cursor].state;
  },
  get length() {
    return entries.length;
  },
  pushState(state, _, url) {
    const href = new URL(url, location).href;
    entries.splice(++cursor);
    entries.push({ state, url: href });
  },
  replaceState(state, _, url) {
    entries[cursor] = { state, url: new URL(url, location).href };
  },
  back() {
    if (cursor) {
      cursor--;
      window.dispatchEvent(new Event("popstate"));
    }
  },
};
await import("../src/domain/index.js");
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  plugins: [{
    name: "render-sheet-without-browser",
    enforce: "pre",
    resolveId(id, importer) {
      if (id === "../runtime/components.jsx" && importer?.endsWith("/SharedSheet.jsx")) return "\0static-sheet-portal";
    },
    load(id) {
      if (id === "\0static-sheet-portal") return "export function Portal({children}) {return children}";
    },
  }],
});
after(() => server.close());
const { default: Records } = await server.ssrLoadModule(
  "/src/components/CollectionRecords.jsx",
);
const { default: Projects } = await server.ssrLoadModule(
  "/src/components/CollectionProjects.jsx",
);
const { ProjectRecordsDrawer } = await server.ssrLoadModule("/src/components/CollectionTaskDrawer.jsx");
const { default: AssociationServicePage } = await server.ssrLoadModule("/src/pages/AssociationServicePage.jsx");
const { default: CollectionHeader } = await server.ssrLoadModule("/src/components/CollectionHeader.jsx");
const { default: CollectionSupportDrawer } = await server.ssrLoadModule("/src/components/CollectionSupportDrawer.jsx");
const wait = () => new Promise((r) => setTimeout(r, 8));
function setup(category = "enrollment", path) {
  entries = [
    {
      state: {},
      url:
        "http://127.0.0.1:4180" +
        (path || "/?page=collection&view=projects&category=" + category),
    },
  ];
  cursor = 0;
  getStore("account").session = { phone: "records-owner" };
  const records = getStore("collectionRecords");
  records.ready = true;
  records.busy = false;
  records.error = "";
  records.items = [
    ...["enrollment", "graduate", "association"].map((projectId, i) => ({
      id: projectId,
      owner: "records-owner",
      projectId,
      status: "reviewing",
      createdAt: new Date(2026, 10, 23, 12).getTime(),
      updatedAt: i,
    })),
    {
      id: "other-account",
      owner: "another",
      projectId: category,
      status: "draft",
    },
    {
      id: "fixture",
      owner: "records-owner",
      fixture: true,
      projectId: category,
      status: "draft",
    },
  ];
  const root = createController("phoneDemo");
  root.scope.page = "collection";
  const flow = createController("collectionFlow", [], root.scope);
  for (const name of [
    "collectionCategoryList",
    "collectionRecordList",
    "collectionScroll",
  ])
    flow.refs[name] = { scrollTop: 0 };
  flow.start();
  return { s: flow.scope, flow, records };
}
const render = (Component, s) =>
  renderToStaticMarkup(React.createElement(Component, { scope: s }));

test("school details, records and scanner restore the graduate mode and card in the landing history entry", () => {
  const { s, flow } = setup("graduate", universityPath);
  try {
    rememberGraduateHero("schools", 3);
    const detail = universityProjectPath("graduate-xmu", universityPath);
    goGraduate(detail, false, collectionHistoryState(detail));
    assert.equal(s.project.id, "graduate-xmu");
    s.back();
    assert.equal(location.pathname + location.search, universityPath);
    assert.deepEqual(history.state.graduateHero, { mode: "schools", index: 3 });
    const records = "/?page=collection&view=records&category=graduate&from=university";
    goGraduate(records, false, collectionHistoryState(records));
    assert.equal(s.view, "records");
    s.back();
    assert.deepEqual(history.state.graduateHero, { mode: "schools", index: 3 });
    assert.deepEqual(rememberGraduateHero("flow"), { mode: "flow", index: 0 });
    rememberGraduateHero("flow", 2);
    goGraduate("/?page=scan", false, collectionHistoryState("/?page=scan"));
    assert.equal(returnCollectionHistory("scan"), true);
    assert.deepEqual(history.state.graduateHero, { mode: "flow", index: 2 });
  } finally { flow.stop(); }
});

test("enrollment returns to its saved step or school wall from search, details, records and layout printing", () => {
  const { s, flow } = setup("enrollment", "/?page=home");
  try {
    s.openCategory("enrollment");
    const landing = location.href;
    const categoryBack = history.state.collectionCategoryBack;
    rememberEnrollmentHero("flow", 4);
    s.enterProjectSearch();
    assert.equal(location.searchParams.get("search"), "1");
    s.back();
    assert.equal(location.href, landing);
    assert.deepEqual(history.state.enrollmentHero, { mode: "flow", index: 4 });
    assert.deepEqual(history.state.collectionCategoryBack, categoryBack);
    rememberEnrollmentHero("schools");
    s.openProject("enrollment");
    assert.equal(s.project.organization, "示例学院");
    s.back();
    assert.match(render(Projects, s), /enrollment-wall/);
    s.openCategoryRecords();
    assert.equal(s.recordCategory, "enrollment");
    s.back();
    assert.deepEqual(history.state.enrollmentHero, { mode: "schools", index: 0 });
    rememberEnrollmentHero("flow", 5);
    openCollectionPrint(layoutPrintPath);
    assert.equal(location.searchParams.get("preset"), "layout");
    assert.equal(returnToUniversityPrint(), true);
    assert.equal(location.href, landing);
    assert.deepEqual(history.state.enrollmentHero, { mode: "flow", index: 5 });
    assert.equal(history.state.universityPrintPanel, undefined);
    assert.equal(history.state.graduateHero, undefined);
  } finally { flow.stop(); }
});

test("each category landing opens public support directly and closes on the same history entry", async () => {
  for (const category of ["graduate", "enrollment", "association"]) {
    const view = category === "graduate" ? "university" : "projects";
    const { s, flow, records } = setup(category, "/?page=collection&view=" + view + "&category=" + category);
    try {
      getStore("account").session = null;
      records.ready = false;
      await wait();
      const landing = () => category === "graduate"
        ? renderToStaticMarkup(React.createElement(CollectionHeader, { title: "毕业生图像采集", compact: true, support: s }))
        : render(Projects, s);
      assert.match(landing(), /aria-haspopup="dialog" aria-expanded="false"[^>]*><svg[^>]*><use href="#i-nav-service"[^>]*><\/use><\/svg>客服/);
      if (category === "association") s.$refs.associationRail = { scrollLeft: 112 };
      const url = location.href;
      for (const close of [() => s.closePanel(), () => history.back()]) {
        s.openEmailContact();
        s.openEmailContact();
        assert.equal(cursor, 1);
        assert.equal(history.state.collectionContactFor, category);
        s.sync();
        assert.equal(s.panel, "email");
        assert.match(landing(), /collection-hero-support" aria-haspopup="dialog" aria-expanded="true"/);
        const sheet = render(CollectionSupportDrawer, s);
        assert.match(sheet, /联系知拍客服/);
        assert.match(sheet, /复制邮箱/);
        assert.match(sheet, /href="mailto:/);
        assert.ok(sheet.includes(category === "association" ? "机构名称" : "院校名称"));
        assert.equal(s.confirmEmailContact(), true);
        close();
        await wait();
        assert.equal(s.panel, null);
        assert.equal(cursor, 0);
        assert.equal(location.href, url);
        if (category === "association") assert.equal(history.state.associationRailOffset, 112);
      }
    } finally {
      flow.stop();
    }
  }
});

test("all three entries count only owned non-fixture tasks and open the matching record list", () => {
  for (const category of ["graduate", "enrollment", "association"]) {
    const { s, flow, records } = setup(category);
    try {
      assert.equal(s.categoryRecordSummary.count, 1);
      const projects = render(Projects, s);
      assert.match(projects, /collection-themed-hero has-back is-compact/);
      assert.ok(projects.includes(`aria-label="${s.categoryInfo.recordsTitle}，1 条"`));
      if (category !== "graduate") {
        assert.match(projects, /class="university-dock".*class="university-record-count" aria-hidden="true">1<\/strong>/);
      } else {
        assert.match(projects, /class="collection-record-count" aria-hidden="true">1<\/span>/);
        assert.ok(projects.indexOf('role="search"') < projects.indexOf("collection-record-entry"));
        assert.ok(projects.indexOf("collection-record-entry") < projects.indexOf("采集项目</h2>"));
      }
      s.openCategoryRecords();
      assert.equal(s.scopedRecords, true);
      assert.equal(s.recordCategory, category);
      assert.deepEqual(
        s.filteredRecords.map((r) => r.id),
        [category],
      );
      const html = render(Records, s);
      assert.doesNotMatch(html, /collection-filter-check|可多选/);
      assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
      const masthead = html.slice(0, html.indexOf('class="collection-inner'));
      assert.match(masthead, /collection-records-masthead.*tool-navigation-back.*<h1[^>]*>采集记录<\/h1>.*collection-record-filters--tabs/);
      assert.doesNotMatch(html, /collection-themed-hero|采集机构|collection-chip|查看详情|去修改/);
      const project = s.projects.find(item => item.id === category);
      assert.ok(html.includes(project.organization));
      assert.ok(html.includes(project.name));
      assert.match(html, /collection-record-heading.*collection-record-subtitle.*<time dateTime="2026-11-23">2026\.11\.23<\/time>.*collection-record-outcome.*collection-record-status">审核中/i);
      const record = records.items.find(record => record.id === category);
      for (const [status, label] of [[40, "审核未通过"], ["processing_failed", "证件照制作失败"]]) {
        record.status = status;
        const failed = render(Records, s);
        assert.ok(failed.includes(`class="collection-record-status">${label}</span>`));
        assert.match(failed, /class="collection-record-action is-recovery">去修改/);
      }
      assert.doesNotMatch(html, /进度追踪 · 照片归档|collection-record-statistics/);
      assert.ok(html.includes('data-record-id="' + category + '"'));
      assert.doesNotMatch(html, /data-record-id="(?:fixture|other-account)"/);
    } finally {
      flow.stop();
    }
  }
});
for (const category of ["graduate", "enrollment", "association"]) test(category + " task back restores scoped filters and scroll, then its category and position", async () => {
  const { s, flow } = setup(category);
  try {
    await wait();
    s.scrollHost.scrollTop = 128;
    s.openCategoryRecords();
    await wait();
    s.selectRecordFilter("ongoing");
    s.scrollHost.scrollTop = 216;
    s.openRecord(s.filteredRecords[0]);
    await wait();
    assert.equal(s.projectFrom, "records");
    assert.equal(s.taskReturnLabel, "返回采集记录");
    assert.equal(s.primaryLabel, "返回采集记录");
    s.back();
    await wait();
    assert.equal(s.recordCategory, category);
    assert.equal(s.recordFilter, "ongoing");
    assert.equal(s.scrollHost.scrollTop, 216);
    s.back();
    await wait();
    assert.equal(s.view, "projects");
    assert.equal(s.projectCategory, category);
    assert.equal(s.scrollHost.scrollTop, 128);
  } finally {
    flow.stop();
  }
});
test("graduate dock records retain the selected tab and scroll after viewing an upload failure", async () => {
  const { s, flow, records } = setup(
    "graduate",
    "/?page=collection&view=records&category=graduate&from=university&samples=graduate",
  );
  try {
    records.items.find(record => record.id === "graduate").status = "upload_failed";
    assert.equal(s.selectRecordFilter("ongoing"), true);
    assert.equal(s.filteredRecords.length, 0);
    assert.match(render(Records, s), /当前筛选下暂无记录.*查看全部/s);
    s.selectRecordFilter("all");
    assert.match(render(Records, s), /data-record-id="graduate"/);
    assert.equal(location.searchParams.get("view"), "records");
    assert.equal(s.selectRecordFilter("complete"), true);
    const html = render(Records, s);
    assert.match(html, /aria-pressed="true">已完成/);
    assert.match(html, /class="collection-record-status">上网失败.*class="collection-record-action is-recovery">去修改/);
    s.scrollHost.scrollTop = 184;
    s.openRecord(s.filteredRecords[0]);
    await wait();
    assert.equal(s.projectFrom, "records");
    assert.equal(s.primaryLabel, "联系客服");
    s.back();
    await wait();
    assert.equal(s.recordFilter, "complete");
    assert.equal(s.scrollHost.scrollTop, 184);
    assert.equal(location.searchParams.get("from"), "university");
    assert.equal(location.searchParams.get("samples"), "graduate");
    s.back();
    assert.equal(location.searchParams.get("view"), "university");
  } finally {
    flow.stop();
  }
});
test("the graduate sample link survives the login handoff", () => {
  const path = "/?page=collection&view=records&category=graduate&from=university&samples=graduate";
  const { s, flow } = setup("graduate", path);
  try {
    getStore("account").session = null;
    const html = render(Records, s);
    assert.match(html, /tool-navigation-title[^>]*>采集记录<\/h1>.*登录后查看本人的采集记录/);
    assert.doesNotMatch(html, /collection-record-filters--tabs|还没有这类采集记录/);
    s.loginForRecords();
    assert.equal(location.searchParams.get("page"), "account");
    assert.equal(location.searchParams.get("back"), path);
  } finally {
    flow.stop();
  }
});
test("record deep links survive refresh and fall back to their matching category without reviving aggregate lists", () => {
  const { s, flow } = setup(
    "enrollment",
    "/?page=collection&view=records&category=enrollment",
  );
  try {
    assert.equal(s.scopedRecords, true);
    s.sync();
    assert.equal(s.recordCategory, "enrollment");
    s.back();
    assert.equal(s.view, "projects");
    assert.equal(s.projectCategory, "enrollment");
    history.replaceState(
      {},
      "",
      "/?page=collection&view=detail&project=graduate&record=graduate&from=records&category=graduate",
    );
    s.sync();
    s.back();
    assert.equal(s.scopedRecords, true);
    assert.equal(s.recordCategory, "graduate");
    for (const path of [
      "/?page=collection&view=records",
      "/?page=collection&view=records&category=unknown",
    ]) {
      history.replaceState({}, "", path);
      s.sync();
      assert.equal(location.searchParams.get("page"), "home");
    }
  } finally {
    flow.stop();
  }
});
test("signed-out, loading, failure and empty records keep honest feedback and a category-specific login return", () => {
  const { s, flow, records } = setup(
    "association",
    "/?page=collection&view=records&category=association",
  );
  try {
    records.items = [];
    records.ready = false;
    assert.match(render(Records, s), /正在读取采集记录/);
    assert.doesNotMatch(render(Records, s), /还没有这类采集记录/);
    records.error = "storage";
    assert.match(render(Records, s), /重新读取/);
    records.error = "";
    records.ready = true;
    assert.match(render(Records, s), /还没有这类采集记录/);
    getStore("account").session = null;
    assert.match(render(Records, s), /登录后查看本人的采集记录/);
    s.loginForRecords();
    assert.equal(location.searchParams.get("page"), "account");
    assert.equal(
      location.searchParams.get("back"),
      "/?page=collection&view=records&category=association",
    );
  } finally {
    flow.stop();
  }
});

test("each public association service loads full content and returns to the opening offer and organization rail", async () => {
  const { s, flow, records } = setup("association");
  const landing = location.href;
  try {
    getStore("account").session = null;
    records.ready = false;
    records.error = "unavailable";
    await wait();
    for (const [index, item] of [
      ["employeeBadge", "企业工牌定制", "badge", "哑光 PVC / 高清覆膜", "人像工号匹配"],
      ["certificate", "比赛证书定制", "certificate", "丝绒硬壳烫金封面", "选手照精准嵌位"],
      ["membership", "会员卡定制", "membership", "磨砂 PVC / 拉丝金属", "编号防重核验"],
    ].entries()) {
      const [id, title, asset, specification, highlight] = item;
      let focused;
      s.scrollHost.scrollTop = 73;
      s.$refs.associationRail = { scrollLeft: 187 };
      s.scrollHost.querySelector = selector => selector === `[data-service="${id}"][data-active="true"]`
        ? { focus(options) { focused = options; } } : null;
      s.openAssociationService(id);
      assert.equal(s.view, "association-service");
      assert.equal(s.panel, null);
      assert.equal(s.associationService.id, id);
      assert.equal(location.searchParams.get("service"), id);
      assert.equal(history.state.collectionAssociationServiceBack.source, new URL(landing).pathname + new URL(landing).search);
      assert.equal(render(Projects, s), "");
      const html = render(AssociationServicePage, s);
      assert.match(html, /tool-navigation.*aria-label="返回其它采集"/s);
      assert.match(html, /支持按需定制版面设计.*规格与工艺.*定制合作流程.*沟通需求.*线上采集.*样张核对.*批量交付.*商务定制咨询.*复制商务邮箱.*联系商务咨询/s);
      for (const value of [title, specification, highlight, "zpai_service@163.com"])
        assert.ok(html.includes(value), value);
      assert.doesNotMatch(html, /role="dialog"|立即下单|线上支付|企业微信|href="tel:/);
      const path = "/assets/association-detail-" + asset + ".webp";
      assert.ok(html.includes(path));
      const webp = readFileSync(new URL("../public" + path, import.meta.url));
      assert.equal(webp.toString("ascii", 8, 16), "WEBPVP8 ");
      assert.deepEqual([webp.readUInt16LE(26) & 0x3fff, webp.readUInt16LE(28) & 0x3fff], [1080, 720]);
      assert.ok(webp.length < 140_000);
      const draft = new URL(s.associationServiceEmailLink);
      assert.equal(draft.pathname, "zpai_service@163.com");
      assert.equal(draft.searchParams.get("subject"), "知拍定制咨询｜" + title);
      assert.match(draft.searchParams.get("body"), /预估数量.*期望交付时间.*打样需求/s);

      assert.doesNotMatch(html, /复制联系邮箱|href="mailto:|。可以定制设计/);
      for (const close of [() => s.closePanel(), () => history.back()]) {
        s.openBusinessContact();
        assert.equal(s.panel, "businessContact");
        assert.equal(history.state.associationContactFor, id);
        s.sync();
        assert.equal(s.panel, "businessContact");
        const modal = render(AssociationServicePage, s);
        assert.match(modal, /association-service-page"[^>]+inert=""/);
        assert.equal((modal.match(/role="dialog"/g) || []).length, 1);
        assert.match(modal, /role="dialog".*商务邮箱.*zpai_service@163.com.*邮件主题.*点击打开邮箱将离开知拍.*复制邮箱.*href="mailto:.*打开邮箱/s);
        assert.ok(modal.includes("知拍定制咨询｜" + title));
        assert.equal(s.associationServiceEmailSubject, "知拍定制咨询｜" + title);
        close();
        assert.equal(s.panel, null);
        assert.equal(location.searchParams.get("service"), id);
      }
      s.openAssociationPrint();
      assert.equal(s.view, "association-service");
      if (index === 0) s.back();
      else history.back();
      await wait();
      assert.equal(location.href, landing);
      assert.equal(history.state.associationOffer, id);
      assert.equal(history.state.associationRailOffset, 187);
      assert.equal(s.scrollHost.scrollTop, 73);
      assert.deepEqual(focused, { preventScroll: true });
      const restored = render(Projects, s);
      assert.match(restored, new RegExp('class="association-slide" data-active="true"[^>]*data-service="' + id + '"'));
      assert.ok(restored.includes(`第 ${index + 2} 张，${title}`));
    }
  } finally { flow.stop(); }
});

test("association service deep links support clipboard success, failure and fallback navigation", async () => {
  const detail = "/?page=collection&view=association-service&category=association&service=employeeBadge";
  const { s, flow } = setup("association", detail);
  try {
    assert.equal(s.associationService.id, "employeeBadge");
    let written;
    navigator.clipboard = { async writeText(value) { written = value; } };
    await s.copySupportEmail();
    assert.equal(written, "zpai_service@163.com");
    assert.equal(s.contactNotice, "商务邮箱已复制");
    navigator.clipboard = { async writeText() { throw new Error("denied"); } };
    await s.copySupportEmail();
    assert.equal(s.contactNotice, "复制失败，请长按邮箱地址复制。");
    assert.match(render(AssociationServicePage, s), /role="status">复制失败，请长按邮箱地址复制。/);
    s.back();
    assert.equal(s.isAssociationLanding, true);
    assert.equal(history.length, 1);
    const invalid = detail.replace("employeeBadge", "layout");
    history.replaceState({}, "", invalid);
    s.sync();
    assert.equal(s.isAssociationLanding, true);
  } finally {
    delete navigator.clipboard;
    flow.stop();
  }
});

test("organization directory keeps its entry and query through detail and system Back", async () => {
  const { s, flow } = setup("association");
  try {
    const landing = location.href;
    flow.refs.collectionProjectSearchScroll = { scrollTop: 0 };
    flow.refs.associationRail = { scrollLeft: 146 };
    s.enterProjectSearch();
    await wait();
    assert.match(render(Projects, s), /全部机构/);
    s.keyword = "行业人才";
    s.searchProjects();
    await wait();
    const directory = location.href;
    s.scrollHost.scrollTop = 58;
    s.openProject("association-talent");
    history.back();
    await wait();
    assert.equal(location.href, directory);
    assert.equal(s.searchTerm, "行业人才");
    assert.equal(s.scrollHost.scrollTop, 58);
    assert.equal(s.projectSearchReturnId, "association-talent");
    s.back();
    assert.equal(location.href, landing);
    assert.equal(history.state.associationRailOffset, 146);
  } finally { flow.stop(); }
});

test("returning from the second association card preserves both scroll axes and the focused project", async () => {
  const { s, flow } = setup("association");
  try {
    await wait();
    let focused;
    s.$refs.associationRail = { scrollLeft: 219 };
    s.scrollHost.scrollTop = 37;
    s.scrollHost.querySelectorAll = () => [{
      dataset: { projectId: "association-engineering" },
      focus(options) { focused = options; },
    }];
    s.openProject("association-engineering");
    assert.equal(s.view, "project");
    assert.equal(s.project.id, "association-engineering");
    s.back();
    await wait();
    assert.equal(s.isAssociationLanding, true);
    assert.equal(history.state.associationRailOffset, 219);
    assert.equal(s.scrollHost.scrollTop, 37);
    assert.deepEqual(focused, { preventScroll: true });
  } finally { flow.stop(); }
});

test("the die-cut offer enters layout production directly and its Back action restores the category", async () => {
  const path = "/?page=collection&view=projects&category=association&from=home&section=home";
  const { s, flow } = setup("association", path);
  try {
    s.$refs.associationRail = { scrollLeft: 172 };
    s.scrollHost.scrollTop = 57;
    s.openAssociationPrint();
    assert.equal(location.search, "?page=print&preset=layout");
    const studio = createController("printStudio");
    studio.setElement({ querySelectorAll: () => [] });
    const print = studio.scope;
    print.syncLocation();
    assert.equal(print.view, "layouts");
    print.back();
    await wait();
    assert.equal(location.pathname + location.search, path);
    assert.equal(history.state.associationRailOffset, 172);
    assert.equal(s.scrollHost.scrollTop, 57);
    assert.equal(s.panel, null);
  } finally { flow.stop(); }
});

test("a genuinely empty category leads back to its own landing; a filter empty stays in records", () => {
  const actions = { graduate: "前往毕业生采集", enrollment: "前往新生采集", association: "查看合作机构" };
  for (const [category, action] of Object.entries(actions)) {
    const { s, flow, records } = setup(category, "/?page=collection&view=records&category=" + category);
    try {
      s.selectRecordFilter("complete");
      assert.match(render(Records, s), /当前筛选下暂无记录.*查看全部/s);
      const here = location.href;
      s.selectRecordFilter("all");
      assert.equal(location.href, here);
      assert.ok(s.filteredRecords.some(record => record.id === category));
      records.items = records.items.filter(record => record.projectId !== category);
      for (const filter of ["all", "ongoing", "complete"]) {
        s.selectRecordFilter(filter);
        const html = render(Records, s);
        assert.ok(html.includes("还没有这类采集记录") && html.includes(action));
        assert.doesNotMatch(html, /当前筛选下暂无记录|查看全部/);
      }
      s.returnFromRecords(true);
      assert.equal(location.searchParams.get("category"), category);
      assert.equal(location.searchParams.get("view"), category === "graduate" ? "university" : "projects");
    } finally { flow.stop(); }
  }
});

test("current project tasks share the record list card and open the matching task", () => {
  for (const category of ["graduate", "enrollment", "association"]) {
    const { s, flow } = setup(category);
    try {
      s.openProject(category);
      s.openPanel("projectRecords");
      const html = render(ProjectRecordsDrawer, s);
      assert.match(html, /当前采集任务.*collection-project-records-list.*is-record-list-item.*collection-record-portrait.*collection-record-outcome/s);
      assert.ok(html.includes(s.project.organization) && html.includes(s.project.name));
      assert.doesNotMatch(html, /采集机构|查看详情/);
      s.openRecord(s.projectRecords[0]);
      assert.equal(s.current.id, category);
      s.back();
      assert.equal(s.projectId, category);
    } finally { flow.stop(); }
  }
});

test("both organization directory entries return to the triggering control and previous rail position", async () => {
  const { s, flow } = setup("association");
  try {
    let focused;
    const trigger = name => ({ focus() { focused = name; } });
    s.scrollHost.querySelector = selector => selector === "[data-directory-entry]" ? trigger("directory") : null;
    s.$refs.projectSearchEntry = trigger("primary");
    s.$refs.associationRail = { scrollLeft: 160 };
    for (const source of ["directory", "primary"]) {
      assert.match(render(Projects, s), /正在采集<\/h2><button[^>]+data-directory-entry[^>]*>全部机构/);
      s.enterProjectSearch("", source);
      assert.equal(s.isProjectSearch, true);
      assert.equal(s.focusNewSearch, false);
      assert.match(render(Projects, s), /class="collection-directory-group"/);
      s.back();
      await wait();
      assert.equal(focused, source);
      assert.equal(history.state.associationRailOffset, 160);
    }
    s.openEmailContact();
    assert.match(render(Projects, s), /aria-label="其它采集" inert=""/);
  } finally { flow.stop(); }
});
