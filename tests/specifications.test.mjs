// Pure state + server rendering only. No browser automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createController } from "../src/runtime/state.js";
import {
  PHOTO_SPECIFICATIONS,
  PHOTO_BACKGROUNDS,
  specificationBackgrounds,
  specificationBackgroundState,
  specificationSelection,
  specificationDimensions,
  specificationsReturnPath,
} from "../src/domain/photo-specifications.js";
await import("../src/domain/specifications.js");

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => server.close());
const { CameraSpecificationDirectory, SpecificationColorSheet, SpecificationList, default: SpecificationsPage } =
  await server.ssrLoadModule("/src/pages/SpecificationsPage.jsx");

function environment(url = "/?page=specifications&back=%2F%3Fpage%3Dhome") {
  globalThis.location = new URL(url, "http://localhost:4180");
  globalThis.window = new EventTarget();
  globalThis.CustomEvent = class extends Event {
    constructor(type, options) {
      super(type);
      this.detail = options.detail;
    }
  };
  globalThis.document = { activeElement: { focus() {} } };
  const entries = [{ url: location.href, state: {} }];
  let cursor = 0;
  globalThis.history = {
    get state() {
      return entries[cursor].state;
    },
    pushState(state, _, url) {
      globalThis.location = new URL(url, location.origin);
      entries.splice(cursor + 1);
      entries.push({ state, url: location.href });
      cursor++;
    },
    replaceState(state, _, url) {
      globalThis.location = new URL(url, location.origin);
      entries[cursor] = { state, url: location.href };
    },
    back() {
      if (cursor > 0) {
        cursor--;
        globalThis.location = new URL(entries[cursor].url);
        window.dispatchEvent(new Event("popstate"));
      }
    },
    forward() {
      if (cursor < entries.length - 1) {
        cursor++;
        globalThis.location = new URL(entries[cursor].url);
        window.dispatchEvent(new Event("popstate"));
      }
    },
  };
  const picker = createController("specificationPicker").scope;
  picker.init();
  return { picker, entries };
}

test("nine named presets keep use-case identity, reject custom input and unknown/unsupported colors", () => {
  assert.equal(new Set(PHOTO_SPECIFICATIONS.map((s) => s.id)).size, 9);
  assert.deepEqual(
    PHOTO_SPECIFICATIONS.map((s) => s.name),
    [
      "一寸",
      "二寸",
      "小二寸",
      "大一寸",
      "求职招聘",
      "四六级考试",
      "驾驶证",
      "身份证",
      "中国护照",
    ],
  );
  assert.equal(specificationSelection("custom", "blue"), null);
  assert.equal(specificationSelection("driver", "red"), null);
  assert.equal(specificationSelection("one", "invalid"), null);
  assert.deepEqual(specificationSelection("identity", "white"), {
    specId: "identity",
    background: "#ffffff",
  });
  assert.ok(
    PHOTO_SPECIFICATIONS.every((s) => s.width > 0 && s.height > s.width),
  );
});

test("color policy follows stable spec IDs and configurable order rather than dimensions or names", () => {
  const specs = PHOTO_SPECIFICATIONS.map((s) => ({
    ...s,
    backgrounds: [...s.backgrounds],
  }));
  specs.find((s) => s.id === "job").backgrounds = [
    "gray",
    "transparent",
    "gray",
    "unknown",
  ];
  assert.deepEqual(
    specificationBackgrounds("job", specs).map((c) => c.id),
    ["gray", "transparent"],
  );
  assert.equal(specificationSelection("job", "blue", specs), null);
  assert.equal(
    specificationSelection("two", "blue", specs).background,
    "#438bc6",
  );
  assert.equal(
    specificationBackgroundState("job", "blue", specs).background,
    null,
  );
  assert.equal(
    specificationBackgroundState("job", "gray", specs).background,
    "#d5d9e0",
  );
  specs.find((s) => s.id === "job").backgrounds = ["transparent"];
  assert.equal(
    specificationBackgroundState("job", "blue", specs).background,
    "transparent",
  );
  specs.find((s) => s.id === "job").backgrounds = ["unknown"];
  assert.equal(
    specificationBackgroundState("job", "blue", specs).background,
    null,
  );
  assert.match(
    specificationBackgroundState("job", "blue", specs).message,
    /暂不可用/,
  );
  const palette = PHOTO_BACKGROUNDS.map((c) => ({ ...c, enabled: false }));
  assert.deepEqual(specificationBackgrounds("two", specs, palette), []);
  assert.deepEqual(specificationBackgrounds("two", null), []);
});

test("picker clears invalid multiple choice, auto-selects a sole color and blocks absent configuration", () => {
  const { picker: s } = environment();
  s.specifications = s.specifications.map((spec) => ({
    ...spec,
    backgrounds: [...spec.backgrounds],
  }));
  s.choose("driver");
  assert.equal(s.backgroundId, "white");
  s.close();
  s.specifications.find((spec) => spec.id === "two").backgrounds = [
    "red",
    "blue",
  ];
  s.choose("two");
  assert.equal(s.backgroundId, null);
  assert.equal(s.selection, null);
  assert.match(s.backgroundState.message, /选择背景颜色/);
  const calls = [];
  window.addEventListener("zhipai-camera-open", (e) => calls.push(e.detail));
  s.confirm();
  assert.equal(s.opened, true);
  assert.equal(calls.length, 0);
  s.selectBackground("red");
  assert.equal(s.selection.background, "#d6383d");
  // A changed config is checked again at confirmation, not trusted from the open drawer.
  s.specifications.find((spec) => spec.id === "two").backgrounds = [];
  s.confirm();
  assert.equal(s.opened, true);
  assert.equal(calls.length, 0);
  const tree = SpecificationsPage({}).props.children({
    ...s,
    page: "specifications",
  });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /class="specifications-primary" disabled=""/);
  assert.ok(html.includes("背景颜色暂不可用"));
  s.destroy();
});

test("grouped directory exposes readable size and use case, with complete pixels in the drawer", () => {
  const html = renderToStaticMarkup(
    React.createElement(SpecificationList, {
      specifications: PHOTO_SPECIFICATIONS,
      onChoose() {},
    }),
  );
  assert.equal((html.match(/aria-haspopup="dialog"/g) || []).length, 9);
  assert.ok(html.includes("26 × 32 mm") && html.includes("全程网办电子照"));
  assert.ok(html.includes("求职招聘") && html.includes("常用尺寸") && html.includes("考试与证件"));
  for (const spec of PHOTO_SPECIFICATIONS) {
    assert.ok(html.includes(`>${specificationDimensions(spec)}</small>`));
  }
  assert.ok(html.includes('class="specification-row-label"'));
  assert.ok(!html.includes("自定义"));
  const root = SpecificationsPage({});
  const view = root.props.children({
    page: "specifications",
    opened: false,
    specifications: PHOTO_SPECIFICATIONS,
  });
  const page = renderToStaticMarkup(view);
  assert.match(page, /class="specifications-hero"><img[^>]+alt=""[^>]*>/);
  assert.match(page, /specifications-hero-series-20261117\.webp/);
  assert.doesNotMatch(page, /utility-grid/);
  assert.match(page, /data-appearance="overlay"/);
  assert.equal((page.match(/aria-haspopup="dialog"/g) || []).length, 9);
  assert.ok(page.includes("#i-chevron-left"));
  assert.ok(!page.includes("选择规格后设置底色"));

  const cameraDirectory = renderToStaticMarkup(React.createElement(CameraSpecificationDirectory, {
    scope: { specs: PHOTO_SPECIFICATIONS, colors: PHOTO_BACKGROUNDS, fields: {} },
  }));
  assert.match(cameraDirectory, /data-appearance="overlay"/);
  assert.match(cameraDirectory, /specifications-hero-series-20261117\.webp/);
  assert.equal((cameraDirectory.match(/aria-haspopup="dialog"/g) || []).length, 9);
});

test("shared color sheet reserves outlined swatches for white, very light gray and transparent", () => {
  const colors = [
    { id: "white", name: "白色", value: "#ffffff" },
    { id: "gray", name: "灰色", value: "#d5d9e0" },
    { id: "very-pale", name: "极浅灰", value: "#e4e8ef" },
    { id: "light-blue", name: "浅蓝", value: "#65c5ff" },
    { id: "transparent", name: "透明", value: "transparent" },
    { id: "blue", name: "蓝色", value: "#438bc6" },
  ];
  const html = renderToStaticMarkup(React.createElement(SpecificationColorSheet, {
    spec: PHOTO_SPECIFICATIONS[0],
    background: { colors, backgroundId: "white" },
    label: "使用此规格",
  }));
  assert.equal((html.match(/data-pale="true"/g) || []).length, 3);
  assert.match(html, /data-pale="true" style="background-color:#e4e8ef"/);
  assert.match(html, /<span aria-hidden="true" style="background-color:#65c5ff"/);
  assert.match(html, /<span aria-hidden="true" style="background-color:#d5d9e0"/);
  assert.match(html, /aria-pressed="true"><span aria-hidden="true" data-pale="true" style="background-color:#ffffff"/);
  assert.ok(html.includes("使用此规格"));
});

test("closing or browser Back closes color drawer, preserves selection and does not navigate to camera", () => {
  const { picker: s, entries } = environment();
  s.choose("two");
  s.selectBackground("red");
  assert.equal(s.opened, true);
  assert.equal(entries.length, 2);
  s.close();
  assert.equal(s.opened, false);
  assert.equal(s.selectedId, "two");
  assert.equal(s.backgroundId, "red");
  assert.equal(
    new URLSearchParams(location.search).get("page"),
    "specifications",
  );
  s.choose("driver");
  assert.equal(s.backgroundId, "white");
  assert.deepEqual(
    s.backgrounds.map((c) => c.id),
    ["white"],
  );
  s.selectBackground("red");
  assert.equal(s.backgroundId, "white");
  history.back();
  assert.equal(s.opened, false);
  s.destroy();
});

test("confirm hands verified spec/color to camera once; back returns to list without reopening drawer", () => {
  const { picker: s, entries } = environment();
  const calls = [];
  window.addEventListener("zhipai-camera-open", (e) => calls.push(e.detail));
  s.choose("one");
  s.selectBackground("red");
  s.confirm();
  s.confirm();
  assert.equal(calls.length, 1);
  assert.equal(entries.length, 2);
  assert.deepEqual(calls[0].specification, {
    specId: "one",
    background: "#d6383d",
  });
  assert.equal(new URLSearchParams(location.search).get("spec"), "one");
  assert.equal(
    new URLSearchParams(location.search).get("background"),
    "#d6383d",
  );
  history.back();
  assert.equal(
    new URLSearchParams(location.search).get("page"),
    "specifications",
  );
  assert.equal(s.opened, false);
  s.back();
  assert.equal(location.search, "?page=home");
  s.destroy();
});

test("specification caller excludes external, self and camera targets", () => {
  environment();
  for (const target of [
    "https://example.com/",
    "/?page=specifications",
    "/?page=camera",
  ])
    assert.equal(specificationsReturnPath(target), "/?page=home");
  assert.equal(
    specificationsReturnPath("/?page=search&q=证照"),
    "/?page=home",
  );
});

test("reload and Forward clear stale drawer history; the next close works once", () => {
  const { picker: first } = environment();
  first.choose("two");
  assert.equal(history.state.specificationPanel, true);
  first.destroy();
  const reload = createController("specificationPicker").scope;
  reload.init();
  assert.equal(history.state.specificationPanel, undefined);
  assert.equal(reload.opened, false);
  reload.choose("job");
  assert.equal(reload.selected.name, "求职招聘");
  reload.close();
  assert.equal(reload.opened, false);
  assert.equal(reload.closing, false);
  history.forward();
  assert.equal(reload.opened, false);
  assert.equal(history.state.specificationPanel, undefined);
  reload.choose("one");
  reload.close();
  assert.equal(reload.opened, false);
  reload.destroy();
});

test("home keeps the utility grid and specifications uses a grouped task directory", () => {
  const home = fs.readFileSync("src/pages/HomePage.jsx", "utf8");
  const specs = fs.readFileSync("src/pages/SpecificationsPage.jsx", "utf8");
  const shared = fs.readFileSync("src/styles/utility-grid.css", "utf8");
  const local = fs.readFileSync("src/styles/specifications.css", "utf8");
  assert.ok(home.includes('className="tools-grid utility-grid"'));
  assert.ok(specs.includes('className="specification-group-card"'));
  assert.match(shared, /--utility-divider:\s*#f1f4f8/);
  assert.match(
    local,
    /\.phone\[data-page="specifications"\] \.pages\s*\{\s*bottom:\s*0/,
  );
  assert.ok(!local.includes(".specification-grid > button"));
  assert.ok(specs.includes("去拍照或选图"));
  assert.deepEqual(specificationSelection("job", "red"), {
    specId: "job",
    background: "#d6383d",
  });
});
