// Real controller navigation and static React rendering; no browser/UI automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { ENROLLMENT_FLOW_STEPS, createCollectionConfig, enrollmentHeroMode } from "../src/domain/collection-config.js";
import { createController, getStore } from "../src/runtime/state.js";

let current = new URL("http://127.0.0.1:4180/?page=collection");
let pushes = 0;
let replaces = 0;
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
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => server.close());
const { default: CollectionProjects } = await server.ssrLoadModule(
  "/src/components/CollectionProjects.jsx",
);
const settle = () => new Promise((resolve) => setTimeout(resolve, 8));

function setup(path = "/?page=collection") {
  current = new URL(path, "http://127.0.0.1:4180");
  pushes = replaces = 0;
  getStore("account").session = null;
  const records = getStore("collectionRecords");
  records.items = [];
  records.ready = true;
  records.error = "";
  const root = createController("phoneDemo");
  root.scope.page = "collection";
  const flow = createController("collectionFlow", [], root.scope);
  for (const name of [
    "collectionScroll",
    "collectionProjectList",
    "collectionCategoryList",
    "collectionProjectSearchScroll",
  ])
    flow.refs[name] = { scrollTop: 0 };
  flow.start();
  return { s: flow.scope, flow, records };
}

function render(s) {
  return renderToStaticMarkup(
    React.createElement(CollectionProjects, { scope: s }),
  );
}

test("empty all-project search renders its own search surface without pre-search results or a category hero", () => {
  const { s, flow } = setup("/?page=collection&view=projects&category=all");
  try {
    const html = render(s);
    assert.equal(s.isProjectSearch, true);
    assert.ok(html.includes('role="search"'));
    assert.ok(
      html.includes('enterKeyHint="search"') ||
        html.includes('enterkeyhint="search"'),
    );
    assert.ok(html.includes("搜索项目名称或机构"));
    assert.ok(html.includes("查找采集项目"));
    assert.ok(!html.includes('class="collection-project-row"'));
    assert.ok(!html.includes("collection-home-hero"));
    assert.ok(!html.includes("collection-floating-nav"));
    assert.ok(!html.includes("collection-record-entry"));
    assert.ok(!html.includes("搜索结果</h2>"));
  } finally {
    flow.stop();
  }
});

test("the legacy graduate category still offers its compact search, records and scanner", () => {
  const { s, flow } = setup("/?page=collection&view=projects&category=graduate");
  try {
    const html = render(s);
    assert.match(html, /collection-category-actions.*?role="search".*?collection-record-entry/s);
    assert.match(html, /毕业生采集记录，登录后查看/);
    assert.match(html, /已有学信网图像采集码/);
  } finally { flow.stop(); }
});

test("association leads with one interactive offer, then ongoing organization cards, scoped search and records", async () => {
  const { s, flow } = setup("/?page=collection&view=projects&category=association");
  try {
    const html = render(s);
    assert.match(html, /<h1>其它采集<\/h1>/);
    assert.doesNotMatch(html, /class="collection-hero-art"|campus-|采集客服|了解合作/);
    for (const project of s.projects.filter(item => item.type === "association")) {
      const visible = project.status === "ongoing";
      assert.equal(html.includes('data-project-id="' + project.id + '"'), visible);
      if (visible) {
        assert.ok(html.includes(project.image) && html.includes(project.organization) && html.includes(project.name));
        const card = html.split('data-project-id="' + project.id + '"')[1].split("</button>")[0];
        assert.match(card, /class="association-org-project">[^<]+<\/span><span class="association-org-status">进行中<\/span><\/span><span class="university-school-date">/);
        const [start, end] = project.date.replaceAll("-", ".").split(" 至 ");
        const rows = [...card.matchAll(/<span>\s*(开始时间|结束时间)<\/span><strong[^>]*>([^<]+)<\/strong>/g)];
        assert.deepEqual(rows.map(([, label, date]) => [label, date]), [["开始时间", start], ["结束时间", end]]);
      }
    }
    assert.match(html, /背胶模切排版照.*企业工牌定制.*比赛证书定制.*会员卡定制.*<h2 id="association-orgs-title">正在采集<\/h2>.*查找所属机构，开启照片采集.*搜索查找机构/s);
    assert.doesNotMatch(html, /姓名[与和]工号/);
    const posters = [...html.matchAll(/(<button[^>]*class="association-slide"[^>]*>)(.*?)<\/button>/gs)];
    const expectedFiles = ["diecut", "badge", "certificate", "membership"];
    const pager = html.match(/<\/button><\/div>(<div class="association-offer-pages"[^>]*>.*?<\/div>)<\/section>/s)?.[1];
    assert.ok(pager, "the segment control follows the poster stage");
    assert.equal((pager.match(/<span data-active="true" aria-hidden="true"><\/span>/g) || []).length, 1);
    assert.equal((pager.match(/<span data-active="false" aria-hidden="true"><\/span>/g) || []).length, 3);
    assert.match(pager, /<input[^>]*type="range"[^>]*min="1" max="4" step="1"[^>]*aria-valuetext="第 1 张，背胶模切排版照"[^>]*value="1"/);
    assert.equal(posters.length, 4);
    for (const [i, [, button, content]] of posters.entries()) {
      assert.equal(button.includes('aria-hidden="true"'), i > 0);
      assert.equal(button.includes('inert=""'), i > 0);
      assert.ok(button.includes(i === 0 ? "立即下单" : "了解详情"));
      assert.match(content, /^<img [^>]+\/>$/);
      const filename = "association-banner-" + expectedFiles[i] + ".webp";
      assert.ok(content.includes('src="/assets/' + filename + '"'));
      const file = readFileSync(new URL("../public/assets/" + filename, import.meta.url));
      assert.equal(file.toString("ascii", 0, 4), "RIFF");
      assert.equal(file.toString("ascii", 8, 12), "WEBP");
      assert.ok(content.includes('alt=""'));
    }
    const intake = html.match(/<section[^>]+aria-labelledby="association-intake-title".*?<\/section>/s)[0];
    assert.equal(intake.match(/<button\b/g).length, 1);
    assert.match(intake, /href="#i-search".*搜索查找机构<\/button>/s);
    const dock = html.match(/<nav class="university-dock"[^>]*>.*?<\/nav>/s)[0];
    assert.equal(dock.match(/<button\b/g).length, 3);
    assert.match(dock, /data-columns="3".*association-dock-scan\.svg.*扫码进机构.*university-dock-records\.webp.*采集记录.*university-dock-print\.webp.*冲印照片/s);
    assert.doesNotMatch(dock, /aria-haspopup="dialog"/);
    assert.doesNotMatch(render(s), /示例行业服务中心/);
    s.scrollHost.scrollTop = 85;
    s.openProject("association-engineering");
    s.back();
    await settle();
    assert.equal(s.scrollHost.scrollTop, 85);
    s.enterProjectSearch();
    assert.match(render(s), /机构搜索.*搜索机构或项目名称/s);
    s.keyword = "行业人才";
    s.searchProjects();
    assert.deepEqual(s.projectsShown.map(p => p.id), ["association-talent"]);
    s.openProject("association-talent");
    s.back();
    assert.equal(s.searchTerm, "行业人才");
    assert.equal(s.projectCategory, "association");
    s.back();
    assert.equal(s.isAssociationLanding, true);
  } finally { flow.stop(); }
});

test("search from the collection entrance preserves the supplied query and project recognition information", () => {
  const { s, flow } = setup();
  try {
    s.keyword = "  毕业  ";
    s.searchProjects();
    assert.equal(s.view, "projects");
    assert.equal(s.projectCategory, "all");
    assert.equal(s.keyword, "毕业");
    assert.equal(current.searchParams.get("q"), "毕业");
    const html = render(s);
    assert.ok(html.includes('value="毕业"'));
    assert.ok(html.includes("5 个项目"));
    for (const project of s.projectsShown) {
      assert.ok(html.includes(project.name));
      assert.ok(html.includes(project.organization));
      assert.ok(html.includes(project.date));
      assert.ok(html.includes(s.projectStatus(project).label));
    }
    assert.equal((html.match(/role="listitem"/g) || []).length, 5);
    assert.equal(pushes, 1);
  } finally {
    flow.stop();
  }
});

test("project detail returns to the submitted search and its independent scroll position", async () => {
  const { s, flow } = setup(
    "/?page=collection&view=projects&category=all&q=毕业",
  );
  try {
    await settle();
    s.$refs.collectionCategoryList.scrollTop = 41;
    s.scrollHost.scrollTop = 212;
    s.projectSearchReturnId = "graduate-degree";
    s.openProject("graduate-degree");
    assert.equal(s.view, "project");
    assert.equal(s.projectFrom, "projects");
    assert.equal(s.projectQuery, "毕业");
    s.back();
    await settle();
    assert.equal(s.isProjectSearch, true);
    assert.equal(s.keyword, "毕业");
    assert.equal(s.searchTerm, "毕业");
    assert.equal(s.scrollHost.scrollTop, 212);
    assert.equal(s.$refs.collectionCategoryList.scrollTop, 41);
    assert.equal(s.projectSearchReturnId, "graduate-degree");
    assert.equal(current.searchParams.get("q"), "毕业");
    s.back();
    assert.equal(current.searchParams.get("page"), "home");
  } finally {
    flow.stop();
  }
});

test("new queries replace search history, reset results to the top and match institution names", async () => {
  const { s, flow } = setup(
    "/?page=collection&view=projects&category=all&q=毕业",
  );
  try {
    await settle();
    s.scrollHost.scrollTop = 180;
    s.keyword = "示例协会";
    s.searchProjects();
    await settle();
    assert.equal(pushes, 0);
    assert.equal(replaces, 1);
    assert.equal(s.sectionScroll["projects:all:毕业"], 180);
    assert.equal(s.scrollHost.scrollTop, 0);
    assert.deepEqual(
      s.projectsShown.map((p) => p.id),
      ["association"],
    );
    s.scrollHost.scrollTop = 60;
    s.keyword = "  示例协会  ";
    s.searchProjects();
    assert.equal(s.keyword, "示例协会");
    assert.equal(s.scrollHost.scrollTop, 0);
    assert.equal(replaces, 1);
  } finally {
    flow.stop();
  }
});

test("clearing keeps the previous search position under its old key and restores the initial empty state", async () => {
  const { s, flow } = setup(
    "/?page=collection&view=projects&category=all&q=毕业",
  );
  try {
    await settle();
    s.scrollHost.scrollTop = 155;
    s.projectSearchReturnId = "graduate";
    s.clearSearch();
    await settle();
    assert.equal(s.keyword, "");
    assert.equal(s.searchTerm, "");
    assert.equal(current.searchParams.has("q"), false);
    assert.equal(s.sectionScroll["projects:all:毕业"], 155);
    assert.equal(s.scrollHost.scrollTop, 0);
    assert.equal(s.projectSearchReturnId, "");
    const html = render(s);
    assert.ok(html.includes("查找采集项目"));
    assert.ok(!html.includes('class="collection-project-row"'));
  } finally {
    flow.stop();
  }
});

test("no-result search preserves input and offers modification without clearing it or showing all projects", () => {
  const { s, flow } = setup(
    "/?page=collection&view=projects&category=all&q=没有这个项目",
  );
  try {
    const html = render(s);
    assert.equal(s.projectsShown.length, 0);
    assert.ok(html.includes('value="没有这个项目"'));
    assert.ok(html.includes("未找到相关采集项目"));
    assert.ok(html.includes("修改关键词"));
    assert.ok(!html.includes('class="collection-project-row"'));
    assert.ok(!html.includes("清除搜索"));
    assert.equal(s.keyword, "没有这个项目");
  } finally {
    flow.stop();
  }
});

test("project searching does not require a signed-in account or successful personal-record loading", () => {
  const { s, flow, records } = setup(
    "/?page=collection&view=projects&category=all&q=毕业",
  );
  try {
    records.ready = false;
    records.error = "个人记录读取失败";
    assert.equal(s.account.session, null);
    assert.ok(render(s).includes("2026届毕业生图像采集"));
    assert.equal(s.isProjectSearch, true);
    s.panel = "identity";
    s.keyword = "协会";
    s.searchProjects();
    assert.equal(s.searchTerm, "毕业");
  } finally {
    flow.stop();
  }
});

test("category browsing remains available while its personal-record count represents login, loading and failure truthfully", () => {
  const {s,flow,records}=setup("/?page=collection&view=projects&category=enrollment");
  try {
    for (const [ready,error] of [[false,""],[true,"读取错误"],[true,""]]) {
      records.ready=ready; records.error=error;
      const html=render(s);
      assert.match(html, /aria-label="新生采集记录，登录后查看"/);
      assert.doesNotMatch(html, /university-record-count|读取失败|读取中/);
      assert.match(html, /查找录取院校/);
    }
    getStore("account").session={phone:"count-test"};
    for (const [error, label] of [["", "读取中…"], ["failed", "读取失败"]]) {
      records.ready = false;
      records.error = error;
      const html = render(s);
      assert.ok(html.includes(`aria-label="新生采集记录，${label}"`));
      assert.doesNotMatch(html, /university-record-count/);
    }
    records.ready=true; records.error="";
    const empty = render(s);
    assert.match(empty, /aria-label="新生采集记录，0 条"/);
    assert.match(empty, /class="university-record-count" aria-hidden="true">0<\/strong>/);
    current=new URL("/?page=collection&view=records&category=enrollment",current);
    s.sync();
    assert.equal(s.scopedRecords,true);
    assert.equal(current.searchParams.get("view"),"records");
    assert.equal(current.searchParams.get("category"),"enrollment");
    current=new URL("/?page=collection&view=records",current);
    s.sync();
    assert.equal(current.searchParams.get("page"),"home");
  } finally {flow.stop();}
});


test("the enrollment landing defaults to six display-only steps with independently configured modes", () => {
  const { s, flow } = setup("/?page=collection&view=projects&category=enrollment");
  try {
    const config = createCollectionConfig();
    assert.equal(config.enrollmentHeroMode, "flow");
    assert.equal(enrollmentHeroMode({ graduateHeroMode: "schools" }), "flow");
    assert.equal(enrollmentHeroMode({ enrollmentHeroMode: "schools" }, "unknown"), "schools");
    assert.equal(enrollmentHeroMode({ enrollmentHeroMode: "schools" }, "flow"), "flow");
    assert.equal(enrollmentHeroMode({ enrollmentHeroMode: "unknown" }), "flow");
    const html = render(s);
    assert.match(html, /role="radiogroup" aria-label="原型配置切换 · 正式版由后台配置"/);
    assert.match(html, /type="radio"[^>]*checked=""[^>]*value="flow"/);
    assert.doesNotMatch(html, /enrollment-wall|学信网/);
    const rail = html.match(/<section class="university-rail"[^>]*>(.*?)<\/section>/s)[1];
    assert.equal((rail.match(/<article /g) || []).length, 18);
    assert.equal((rail.match(/aria-hidden="true"/g) || []).length, 12);
    assert.doesNotMatch(rail, /<button|<a |university-school-enter/);
    assert.deepEqual(ENROLLMENT_FLOW_STEPS.map(step => step.title),
      ["搜索院校", "获取采集学籍", "确认学籍信息", "拍摄照片", "提交审核", "采集成功"]);
    for (const step of ENROLLMENT_FLOW_STEPS) {
      assert.ok(rail.includes(step.description) && rail.includes(step.alt) && rail.includes(step.image));
      const webp = readFileSync(new URL("../public" + step.image, import.meta.url));
      assert.equal(webp.toString("ascii", 8, 16), "WEBPVP8 ");
      assert.deepEqual([webp.readUInt16LE(26) & 0x3fff, webp.readUInt16LE(28) & 0x3fff], [810, 756]);
    }
  } finally { flow.stop(); }
});

test("enrollment landing presents three seamless rows, only configured school links and a scoped search", async () => {
  const { s, flow } = setup("/?page=collection&view=projects&category=enrollment");
  try {
    s.config.enrollmentHeroMode = "schools";
    const html = render(s);
    assert.match(html, /<h1>新生入学采集<\/h1>/);
    assert.doesNotMatch(html, /项目|机构|学信|class="collection-hero-art"/);
    const rows = html.split('class="enrollment-marquee"').slice(1);
    assert.equal(rows.length, 3);
    ["enrollment", "enrollment-vocational", "enrollment-postgraduate"].forEach((id, index) => {
      assert.ok(rows[index].includes('data-project-id="' + id + '"'));
    });
    assert.equal((html.match(/class="enrollment-marquee-group" aria-hidden="true"/g) || []).length, 3);
    for (const school of s.projects.filter(p => p.type === "enrollment")) {
      assert.equal(html.split('data-project-id="' + school.id + '"').length - 1, 2);
      assert.ok(html.includes('data-project-id="' + school.id + '" tabindex="-1"'));
    }
    assert.doesNotMatch(html, /data-project-id="graduate/);
    for (const label of ["演示数据", "查找你的录取院校", "采集记录", "冲印照片"]) assert.ok(html.includes(label));
    s.openProject("enrollment-vocational");
    assert.equal(s.project.id, "enrollment-vocational");
    s.back();
    s.enterProjectSearch();
    assert.equal(current.searchParams.get("category"), "enrollment");
    assert.equal(current.searchParams.get("search"), "1");
    assert.match(render(s), /院校搜索.*输入院校名称/);
    s.keyword = "浙江大学";
    s.searchProjects();
    assert.match(render(s), /未找到相关院校/);
    s.keyword = "示例学院";
    s.searchProjects();
    assert.deepEqual(s.projectsShown.map(p => p.id), ["enrollment"]);
    assert.doesNotMatch(render(s), /项目|机构|学信/);
    s.openProject("enrollment");
    getStore("account").session = { phone: "enrollment-test" };
    s.begin();
    assert.equal(s.panel, "identity");
    s.alternate("student");
    assert.equal(s.method, "student");
    assert.equal(s.panel, "alternate");
    s.closePanel();
    s.back();
    assert.equal(s.searchTerm, "示例学院");
    s.back();
    assert.equal(s.isProjectSearch, false);
    assert.equal(s.projectCategory, "enrollment");
  } finally { flow.stop(); }
});


test("the enrollment dock has two equal entries and opens layout printing directly even with an old showroom marker", () => {
  const { s, flow } = setup("/?page=collection&view=projects&category=enrollment");
  try {
    getStore("account").session = { phone: "enrollment-dock" };
    const html = render(s);
    const dock = html.match(/<nav class="university-dock"[^>]*>.*?<\/nav>/s)[0];
    assert.equal((dock.match(/<button\b/g) || []).length, 2);
    assert.match(dock, /university-dock-records\.webp.*?>0<\/strong>.*?>采集记录<\/span>/s);
    assert.match(dock, /university-dock-print\.webp.*?>冲印照片<\/span>/s);
    assert.doesNotMatch(dock, /aria-haspopup="dialog"|热印/);
    assert.doesNotMatch(html, /拍摄须知|入学照冲印|采集码指引/);
    assert.match(dock, /data-columns="2"/);
    const css = readFileSync(new URL("../src/pages/graduate-pages.css", import.meta.url), "utf8");
    assert.match(css, /\.university-dock\[data-columns="2"\]\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    history.state = { universityPrintPanel: "layout" };
    const restored = render(s);
    assert.doesNotMatch(restored, /enrollment-landing" inert|university-print-sheet/);
  } finally {
    delete history.state;
    flow.stop();
  }
});

test("school rows honor touch holds, alternating tempos and a single manually scrollable copy in reduced motion", () => {
  const css = readFileSync(new URL("../src/pages/enrollment-page.css", import.meta.url), "utf8");
  assert.match(css, /animation: enrollment-schools 32s linear infinite/);
  assert.match(css, /nth-child\(2\)[^{]*\{\s*animation-duration: 46s;\s*animation-direction: reverse/);
  assert.match(css, /nth-child\(3\)[^{]*\{\s*animation-duration: 38s/);
  assert.match(css, /translate3d\(-50%, 0, 0\)/);
  assert.match(css, /data-held.*?animation-play-state: paused/s);
  assert.match(css, /prefers-reduced-motion: reduce.*?overflow-x: auto.*?animation: none.*?aria-hidden="true".*?display: none/s);
});
