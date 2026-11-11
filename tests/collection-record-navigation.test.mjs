// Domain navigation and static React checks; no real accounts or browser automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createController, getStore } from "../src/runtime/state.js";

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
});
after(() => server.close());
const { default: Records } = await server.ssrLoadModule(
  "/src/components/CollectionRecords.jsx",
);
const { default: Projects } = await server.ssrLoadModule(
  "/src/components/CollectionProjects.jsx",
);
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
      status: i === 2 ? "complete" : "reviewing",
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

test("all three entries count only owned non-fixture tasks and open the matching record list", () => {
  for (const category of ["graduate", "enrollment", "association"]) {
    const { s, flow } = setup(category);
    try {
      assert.equal(s.categoryRecordSummary.count, 1);
      const projects = render(Projects, s);
      assert.match(projects, /collection-themed-hero has-back is-compact/);
      assert.ok(projects.includes(`aria-label="${s.categoryInfo.recordsTitle}，1 条"`));
      assert.match(projects, /class="collection-record-count" aria-hidden="true">1<\/span>/);
      assert.ok(
        projects.indexOf('role="search"') <
          projects.indexOf("collection-record-entry"),
      );
      assert.ok(
        projects.indexOf("collection-record-entry") <
          projects.indexOf("采集项目</h2>"),
      );
      s.openCategoryRecords();
      assert.equal(s.scopedRecords, true);
      assert.equal(s.recordCategory, category);
      assert.deepEqual(
        s.filteredRecords.map((r) => r.id),
        [category],
      );
      const html = render(Records, s);
      assert.match(html, /collection-themed-hero has-back is-compact/);
      assert.ok(html.includes(`<h1>${s.categoryInfo.recordsTitle}</h1>`));
      assert.doesNotMatch(html, /进度追踪 · 照片归档|collection-record-statistics/);
      assert.ok(html.indexOf("collection-themed-hero") < html.indexOf("collection-record-filters"));
      assert.ok(html.includes('data-record-id="' + category + '"'));
      assert.doesNotMatch(html, /data-record-id="(?:fixture|other-account)"/);
    } finally {
      flow.stop();
    }
  }
});
test("task back restores scoped filters and scroll, then returns to its original category and position", async () => {
  const { s, flow } = setup("graduate");
  try {
    await wait();
    s.scrollHost.scrollTop = 128;
    s.openCategoryRecords();
    await wait();
    s.toggleRecordFilter("complete"); // leave ongoing selected
    s.scrollHost.scrollTop = 216;
    s.openRecord(s.filteredRecords[0]);
    await wait();
    assert.equal(s.projectFrom, "records");
    assert.equal(s.taskReturnLabel, "返回采集记录");
    assert.equal(s.primaryLabel, "返回采集记录");
    s.back();
    await wait();
    assert.equal(s.recordCategory, "graduate");
    assert.equal(s.recordFilter, "ongoing");
    assert.equal(s.scrollHost.scrollTop, 216);
    s.back();
    await wait();
    assert.equal(s.view, "projects");
    assert.equal(s.projectCategory, "graduate");
    assert.equal(s.scrollHost.scrollTop, 128);
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
