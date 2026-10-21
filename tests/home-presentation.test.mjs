// React structure, navigation actions and shipped asset checks; no browser automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PNG } from "pngjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createController } from "../src/runtime/state.js";
import { HOME_HERO_SLIDES } from "../src/domain/home-hero.js";
await import("../src/domain/app.js");

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
after(() => server.close());
const { default: HomeCollectionCard } = await server.ssrLoadModule(
  "/src/components/HomeCollectionCard.jsx",
);
const { default: HomePage } = await server.ssrLoadModule(
  "/src/pages/HomePage.jsx",
);
const { default: HomeHeroSlide } = await server.ssrLoadModule(
  "/src/components/HomeHeroSlide.jsx",
);
const { default: ImageCarousel } = await server.ssrLoadModule(
  "/src/components/ImageCarousel.jsx",
);

function nodes(tree) {
  return React.Children.toArray(tree).flatMap((node) =>
    React.isValidElement(node) ? [node, ...nodes(node.props.children)] : [],
  );
}

test("home keeps its top promotion and search before the single collection entry and tools", () => {
  const elements = nodes(HomePage({ scope: { page: "home" } }));
  const promotion = elements.find((node) => node.type.name === "ImageCarousel");
  assert.deepEqual(promotion.props.args, ["hero"]);
  const search = elements.find(
    (node) => node.props.className === "search-form home-search-entry",
  );
  const content = elements.find(
    (node) => node.props.className === "home-content",
  );
  const [collection, tools] = React.Children.toArray(content.props.children);
  assert.equal(collection.type.name, "HomeCollectionCard");
  assert.equal(tools.props.className, "tools-card utility-card");
  assert.ok(elements.indexOf(promotion) < elements.indexOf(search));
  assert.ok(
    elements.indexOf(search) <
      elements.findIndex((node) => node.type.name === "HomeCollectionCard"),
  );
  const calls = [];
  search.props.events[0].run({ go: (page) => calls.push(page) });
  assert.deepEqual(calls, ["search"]);
});

test("collection entry has one heading, one link and its audience before the decorative artwork", () => {
  const tree = HomeCollectionCard({ scope: { go() {} } });
  const elements = nodes(tree);
  assert.equal(elements.filter((node) => node.type === "h2").length, 1);
  assert.equal(elements.filter((node) => node.type === "a").length, 1);
  assert.equal(elements.filter((node) => node.type === "button").length, 0);
  const link = elements.find((node) => node.type === "a");
  const audience = elements.find((node) => node.type === "p");
  const image = elements.find((node) => node.type === "img");
  assert.equal(link.props.href, "/?page=collection");
  assert.equal(link.props["aria-describedby"], audience.props.id);
  assert.equal(image.props.alt, "");
  assert.ok(elements.indexOf(link) < elements.indexOf(audience));
  assert.ok(elements.indexOf(audience) < elements.indexOf(image));
  const html = renderToStaticMarkup(
    React.createElement(HomeCollectionCard, { scope: { go() {} } }),
  );
  assert.equal((html.match(/>专项采集</g) || []).length, 1);
  assert.ok(html.includes("新生入学 · 毕业生 · 行业协会会员"));
  assert.ok(!html.includes("轮播") && !html.includes("collection-bear"));
  const bytes = fs.readFileSync("public/" + image.props.src);
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  assert.equal(bytes.readUInt32BE(16), Number(image.props.width));
  assert.equal(bytes.readUInt32BE(20), Number(image.props.height));
  assert.equal(Number(image.props.width) / Number(image.props.height), 3);
});

test("normal and keyboard-style link activation enter the zone once; modified activation keeps native navigation", () => {
  const calls = [];
  const link = nodes(
    HomeCollectionCard({ scope: { go: (page) => calls.push(page) } }),
  ).find((node) => node.type === "a");
  const activate = (overrides = {}) => {
    let prevented = false;
    link.props.onClick({
      button: 0,
      defaultPrevented: false,
      preventDefault: () => (prevented = true),
      ...overrides,
    });
    return prevented;
  };
  assert.equal(activate({ detail: 1 }), true);
  assert.equal(activate({ detail: 0 }), true);
  assert.deepEqual(calls, ["collection", "collection"]);
  for (const overrides of [
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
    { defaultPrevented: true },
  ])
    assert.equal(activate(overrides), false);
  assert.equal(calls.length, 2);
});

test("all eight tool entries preserve their destinations and enable the specification entry", () => {
  const elements = nodes(HomePage({ scope: { page: "home" } }));
  const tools = elements.filter(
    (node) =>
      node.props.as === "button" &&
      node.props.className?.split(" ").includes("tool"),
  );
  const calls = [];
  const scope = {
    openPrint: () => calls.push("print"),
    openPhotoTool: (tool) => calls.push(tool),
  };
  for (const tool of tools) tool.props.events[0].run(scope);
  assert.deepEqual(calls, [
    "print",
    "repair",
    "outfit",
    "spec",
    "crop",
    "background",
    "format",
    "resize",
  ]);
  assert.equal(tools[3].props["aria-disabled"], undefined);
  assert.equal(
    elements.filter((node) => node.type.name === "HomeToolIcon").length,
    8,
  );
  assert.equal(
    elements.filter((node) => node.props.className === "free-corner").length,
    4,
  );
});

test("three complete banners start with collection and retain image copy as accessible names", () => {
  assert.deepEqual(
    HOME_HERO_SLIDES.map((slide) => slide.action),
    ["collection", "camera", "repair"],
  );
  const s = createController("imageCarousel").scope;
  assert.equal(s.index, 0);
  assert.deepEqual([...s.loadedSlides], [0]);
  for (const [index, slide] of HOME_HERO_SLIDES.entries()) {
    const html = renderToStaticMarkup(
      React.createElement(HomeHeroSlide, {
        scope: s,
        slide,
        index,
        active: index === 0,
        loaded: index === 0,
      }),
    );
    assert.equal((html.match(/<img /g) || []).length, 1);
    assert.equal((html.match(/<button /g) || []).length, 1);
    assert.ok(
      html.includes(slide.title) &&
        html.includes(slide.subtitle) &&
        html.includes(slide.actionLabel),
    );
    assert.ok(
      !/<(h1|h2|p|svg|span)[ >]/.test(html),
      "normal banners add no visible DOM copy or icon",
    );
    assert.equal(html.includes('inert=""'), index !== 0);
    const bytes = fs.readFileSync("public/" + slide.image);
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), slide.width);
    assert.equal(bytes.readUInt32BE(20), slide.height);
  }
});

test("banner trimming is an exact top crop of the existing art, with no scaling or changed portrait/text pixels", () => {
  const manifest = JSON.parse(
    fs.readFileSync("docs/assets/home-hero-mature-20261020.json", "utf8"),
  );
  assert.equal(manifest.croppedAssets.length, 3);
  for (const asset of manifest.croppedAssets) {
    const source = PNG.sync.read(fs.readFileSync(asset.sourceAsset));
    const cropped = PNG.sync.read(fs.readFileSync(asset.asset));
    assert.equal(cropped.width, source.width);
    assert.equal(cropped.height, source.height - asset.crop.top);
    assert.ok(
      cropped.data.equals(
        source.data.subarray(asset.crop.top * source.width * 4),
      ),
    );
    assert.equal(
      "public/" + HOME_HERO_SLIDES.find((slide) => slide.id === asset.id).image,
      asset.asset,
    );
  }
});

test("immersive header uses the complete image from the screen edge without a separate system spacer", () => {
  const controller = ImageCarousel({});
  const s = createController("imageCarousel").scope;
  const tree = controller.props.children(s);
  const children = React.Children.toArray(tree.props.children);
  assert.equal(children.length, 1);
  assert.equal(children[0].props.className, "carousel-track");
});

test("banner actions enter real flows once and swipe release never activates a flow", () => {
  const calls = [];
  const s = createController("imageCarousel", [], {
    go: (page) => calls.push(page),
    openCamera: () => calls.push("camera"),
    openPhotoTool: (tool) => calls.push(tool),
  }).scope;
  const click = {
    detail: 1,
    preventDefault() {
      calls.push("prevented");
    },
  };
  for (const slide of s.slides) s.activate(click, slide.action);
  assert.deepEqual(calls, ["collection", "camera", "repair"]);
  s.swiped = true;
  s.activate(click, "camera");
  assert.deepEqual(calls, ["collection", "camera", "repair", "prevented"]);
  s.swiped = true;
  s.activate({ detail: 0 }, "camera");
  assert.equal(calls.at(-1), "camera");
});

test("camera and repair banner handoffs retain the homepage as their return source", () => {
  const previous = { window: globalThis.window, location: globalThis.location };
  const events = [],
    routes = [];
  globalThis.location = {
    pathname: "/",
    search: "?page=home&category=all&section=home",
  };
  globalThis.window = { dispatchEvent: (event) => events.push(event) };
  try {
    const root = createController("phoneDemo").scope;
    root.go = (page) => routes.push(page);
    const s = createController("imageCarousel", [], root).scope;
    s.activate({ detail: 0 }, "camera");
    assert.equal(events[0].type, "zhipai-camera-open");
    assert.equal(
      events[0].detail.returnTo,
      "/?page=home&category=all&section=home",
    );
    assert.deepEqual(routes, ["camera"]);
    s.activate({ detail: 0 }, "repair");
    assert.equal(events[1].type, "zhipai-tool-open");
    assert.equal(events[1].detail.action, "repair");
    assert.equal(events[1].detail.returnTo, events[0].detail.returnTo);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("lazy carousel keeps current picture on failure and ignores an obsolete image load", async () => {
  const previous = globalThis.Image;
  const pending = [];
  globalThis.Image = class {
    set src(value) {
      this.url = value;
      pending.push(this);
    }
  };
  try {
    const s = createController("imageCarousel").scope;
    const failed = s.select(1);
    pending.shift().onerror();
    await failed;
    assert.equal(s.index, 0);
    assert.deepEqual([...s.loadedSlides], [0]);
    const first = s.select(1);
    const second = s.select(2);
    pending[0].onload();
    await first;
    assert.equal(s.index, 0);
    pending[1].onload();
    await second;
    assert.equal(s.index, 2);
    assert.ok(s.loadedSlides.includes(2));
    await s.select(3);
    assert.equal(s.index, 0);
  } finally {
    globalThis.Image = previous;
  }
});
