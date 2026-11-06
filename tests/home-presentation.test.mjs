// React structure, navigation actions and shipped asset checks; no browser automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PNG } from "pngjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  createController,
  createDetachedController,
} from "../src/runtime/state.js";
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

test("brand header leads directly into the collection card, with only the bell actionable", () => {
  const elements = nodes(HomePage({ scope: { page: "home" } }));
  const brand = elements.find((node) => node.type.name === "HomeBrandHeader");
  assert.ok(brand);
  const markup = renderToStaticMarkup(brand);
  assert.match(markup, /知拍证件照/);
  assert.match(markup, /<img\b[^>]*src="\/assets\/home-brand-tagline\.svg"[^>]*alt="拍照片，用知拍！"/);
  const lettering = fs.readFileSync("public/assets/home-brand-tagline.svg", "utf8");
  assert.match(lettering, /<path\b/);
  assert.doesNotMatch(lettering, /<(?:text|font|image|use)\b|@font-face/);
  assert.match(markup, /zhipai-mascot\.webp/);
  assert.equal((markup.match(/<button\b/g) || []).length, 1);
  assert.doesNotMatch(markup, /home-brand-unread/);
  assert.match(renderToStaticMarkup(React.cloneElement(brand, {unread: true})), /home-brand-unread/);
  assert.ok(!elements.some((node) => node.type.name === "ImageCarousel" || node.props.className === "home-main-card"));
  const search = elements.find(
    (node) => node.props.className === "search-form home-search-entry",
  );
  const content = elements.find(
    (node) => node.props.className === "home-content",
  );
  const [collection, tools] = React.Children.toArray(content.props.children);
  assert.equal(collection.type.name, "HomeCollectionCard");
  assert.equal(tools.props.className, "tools-card utility-card");
  assert.equal(search, undefined);
  assert.ok(
    elements.indexOf(brand) <
      elements.findIndex((node) => node.type.name === "HomeCollectionCard"),
  );
  assert.doesNotMatch(renderToStaticMarkup(collection), /home-collection-progress/);
});

test("full header shows glass whenever content is under it, including on the way back up", (t) => {
  const viewport = { clientHeight: 800, scrollHeight: 1500, scrollTop: 0 };
  const phone = createDetachedController("phoneDemo", { $refs: { homePage: viewport } });
  let frame;
  const original = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
  globalThis.requestAnimationFrame = (callback) => {
    frame = callback; return 1;
  };
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "requestAnimationFrame", original);
    else delete globalThis.requestAnimationFrame;
  });
  const update = (offset, expected, page = "home") => {
    phone.page = page;
    viewport.scrollTop = offset;
    phone.scheduleHomeNavScrim();
    frame();
    assert.equal(phone.homeHeaderOverContent, expected);
    assert.equal(viewport.scrollTop, offset);
  };
  update(0, false);
  update(0.5, true);
  update(46, true);
  update(49, true);
  update(240, true);
  update(238, true);
  update(240, true); // Horizontal movement does not change the vertical offset.
  update(226, true); // Reversing direction still leaves content underneath.
  update(229, true);
  update(242, true);
  update(0, true, "collection"); // Visiting notifications doesn't discard home state.
  update(242, true);
  update(725, true);
  update(700, true); // Clamping elastic overscroll prevents a false reversal.
  update(1, true);
  update(0, false);
  update(-15, false);
  viewport.scrollHeight = viewport.clientHeight;
  update(12, false);
});

test("the full header keeps the bear, tagline and one accessible notification action over content", () => {
  const s = {page:"home", homeHeaderOverContent:true, homeHasUnread:true};
  const brand = nodes(HomePage({scope:s})).find(node=>node.type.name==="HomeBrandHeader");
  const html = renderToStaticMarkup(brand);
  assert.match(html, /data-over-content="true"/);
  assert.match(html, /知拍证件照/);
  assert.match(html, /通知中心，有未读消息/);
  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.match(html, /zhipai-mascot/);
  assert.match(html, /home-brand-tagline/);
});

test("old personal search URLs resolve to home while collection project searches retain their query", (t) => {
  const location = new URL("http://localhost/");
  const replaced = [];
  for (const [key, value] of Object.entries({
    location,
    history: {
      replaceState(_state, _title, url) {
        replaced.push(url);
      },
    },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }
  const phone = createDetachedController("phoneDemo", { $nextTick() {} });
  for (const field of ["page", "state"]) {
    location.search = new URLSearchParams({ [field]: "search", q: "一寸" });
    phone.readLocation();
    assert.equal(phone.page, "home");
    assert.equal(replaced.at(-1), "/?page=home");
  }
  location.search = "?page=collection&view=projects&category=all&q=test";
  phone.readLocation();
  assert.equal(phone.page, "collection");
  assert.equal(replaced.length, 2);
});

test("category links navigate once and retain native modified-click behavior", (t) => {
  const location = new URL("https://example.test/?page=home");
  const pushes = [],
    events = [];
  const previous = Object.getOwnPropertyDescriptors(globalThis);
  for (const [name, value] of Object.entries({
    location,
    history: { state: {}, pushState: (...args) => pushes.push(args) },
    window: { dispatchEvent: (event) => events.push(event.type) },
  })) {
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() => {
      if (previous[name])
        Object.defineProperty(globalThis, name, previous[name]);
      else delete globalThis[name];
    });
  }
  const links = nodes(HomeCollectionCard()).filter((node) => node.type === "a");
  for (const link of links) {
    const href = link.props.href;
    const activate = (overrides) => {
      let prevented = false;
      link.props.onClick({
        button: 0,
        currentTarget: { href },
        preventDefault: () => {
          prevented = true;
        },
        ...overrides,
      });
      return prevented;
    };
    for (const overrides of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
      { defaultPrevented: true },
    ]) {
      assert.equal(activate(overrides), false);
    }
    for (const detail of [1, 0]) {
      assert.equal(activate({ detail }), true);
      assert.equal(pushes.at(-1)[2], href);
      assert.deepEqual(pushes.at(-1)[0].collectionCategoryBack, {
        source: "/?page=home",
        target: href,
      });
    }
  }
  assert.equal(pushes.length, 6);
  assert.deepEqual(events, Array(6).fill("zhipai-route"));
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
  assert.ok(nodes(tools[7]).some(node => node.props.children === "修改大小(kb)"));
  for (const icon of elements.filter(node => node.type.name === "HomeToolIcon"))
    assert.match(renderToStaticMarkup(icon), /--tool-icon-detail/);
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
