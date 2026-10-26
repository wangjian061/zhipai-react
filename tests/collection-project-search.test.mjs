// Real controller navigation and static React rendering; no browser/UI automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
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
  server: { middlewareMode: true },
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
    assert.ok(!html.includes("搜索结果</h2>"));
  } finally {
    flow.stop();
  }
});

test("all three category lists keep their header, unsearched projects and category-scoped searching", () => {
  const { s, flow } = setup();
  try {
    for (const category of ["enrollment", "graduate", "association"]) {
      s.openCategory(category);
      assert.equal(s.isProjectSearch, false);
      const html = render(s);
      assert.ok(html.includes("collection-category-page"));
      assert.ok(html.includes("collection-home-hero"));
      assert.ok(!html.includes('class="collection-project-search"'));
      assert.ok(s.projectsShown.length > 0);
      assert.ok(s.projectsShown.every((project) => project.type === category));
    }
    s.keyword = "工程";
    s.searchProjects();
    assert.equal(s.projectCategory, "association");
    assert.deepEqual(
      s.projectsShown.map((p) => p.id),
      ["association-engineering"],
    );
  } finally {
    flow.stop();
  }
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
    assert.ok(html.includes("3 个项目"));
    for (const project of s.projectsShown) {
      assert.ok(html.includes(project.name));
      assert.ok(html.includes(project.organization));
      assert.ok(html.includes(project.date));
      assert.ok(html.includes(s.projectStatus(project).label));
    }
    assert.equal((html.match(/role="listitem"/g) || []).length, 3);
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
    assert.equal(s.view, "home");
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
