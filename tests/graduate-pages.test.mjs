import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import assert from "node:assert/strict";
import { createController, registerStore } from "../src/runtime/state.js";
import {
  graduateCheckoutIssue,
  graduateCropReady,
  graduateQuote,
  graduateRatio,
  graduateSourceAllowed,
  graduatePrintPath,
  goGraduate,
} from "../src/domain/graduate-print.js";
import { universityPath } from "../src/domain/collection-history.js";
import { normalizeOrders } from "../src/domain/orders.js";
import { universityChsiSteps } from "../src/domain/collection-code-help.js";
import { createCollectionConfig, graduateHeroMode, GRADUATE_FLOW_STEPS } from "../src/domain/collection-config.js";
import { collectionStatusInfo } from "../src/domain/collection-status.js";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
after(() => server.close());
const { PrintShowroom, showroomSwipeProduct, openPrintProduct, clearPrintReturn } = await server.ssrLoadModule("/src/components/CollectionPrintShowroom.jsx");

const { default: SchoolDock } = await server.ssrLoadModule("/src/components/CollectionSchoolDock.jsx");
const { default: UniversityLanding, GraduateHeroRail } = await server.ssrLoadModule("/src/pages/UniversityCollectionPage.jsx");
const bytes = new Blob(["photo"], { type: "image/jpeg" });
function photo(id, orientation = "landscape") {
  const [width, height] = graduateRatio(orientation);
  return { id, crop: { orientation, scale: 1.2, offsetX: 7, offsetY: 0 },
    output: { width: width * 600, height: height * 600, blob: bytes } };
}

test("graduation prints begin at 10 photos and charge shipping separately", () => {
  assert.equal(graduateQuote(9), null);
  assert.equal(graduateQuote(10).print, 6000);
  assert.equal(graduateQuote(11).print, 6600);
  assert.deepEqual(graduateQuote(12), { base: 6000, extraCount: 2, extra: 1200, print: 7200, shipping: 1000, total: 8200 });
  assert.equal(graduateQuote(1001).total, 601600);
});

test("6-inch snapshots require a blob and correct width and orientation for every photo", () => {
  const completed = Array.from({ length: 10 }, (_, n) => photo(`ready-${n}`, n % 2 ? "portrait" : "landscape"));
  const missing = [{ id: "first" }, { id: "next" }, ...completed.slice(2)];
  assert.deepEqual(graduateCheckoutIssue(missing.slice(0, -1)), { missing: 1 });
  assert.deepEqual(graduateCheckoutIssue(missing), { photoId: "first" });
  assert.equal(graduateCropReady({ ...completed[0], crop: { orientation: "portrait" } }), false);
  assert.equal(graduateCropReady({ ...completed[0], output: { ...completed[0].output, blob: new Blob() } }), false);
  missing[0] = photo("first");
  assert.deepEqual(graduateCheckoutIssue(missing), { photoId: "next" });
  missing[1] = photo("next", "portrait");
  assert.equal(graduateCheckoutIssue(missing), null);
  assert.equal(graduateSourceAllowed(bytes), true);
  assert.equal(graduateSourceAllowed({ type: "image/webp", size: 30 * 1024 ** 2 }), true);
  assert.equal(graduateSourceAllowed({ type: "image/webp", size: 30 * 1024 ** 2 + 1 }), false);
  assert.equal(graduateSourceAllowed(new Blob(["image"], { type: "image/gif" })), false);
});

test("confirmation and return reuse the account draft and preserve the checkout address", async () => {
  const owner = "13800008000";
  let url = new URL(graduatePrintPath, "http://localhost");
  Object.defineProperty(globalThis, "location", { configurable: true, get: () => url });
  globalThis.window = new EventTarget();
  globalThis.history = {
    pushState(_state, _title, next) { url = new URL(next, url); },
    replaceState(_state, _title, next) { url = new URL(next, url); },
  };
  const selected = Array.from({ length: 12 }, (_, n) => photo(String(n)));
  const data = { orders: [], addresses: [], graduateDrafts: { [owner]: { photos: selected, address: {}, orderId: null } } };
  registerStore("account", { session: { phone: owner } });
  registerStore("printLibrary", { ...data, ready: true, async commit(update) { update(data); } });
  const instance = createController("graduatePrint");
  try {
    instance.start();
    const s = instance.scope;
    s.confirm();
    assert.equal(s.view, "confirm");
    s.fields = { name: "测试收件人" };
    await s.back();
    assert.equal(s.view, "work");
    assert.equal(s.photos.length, 12);
    assert.equal(s.waiting.length, 0);
    s.confirm();
    assert.equal(s.view, "confirm");
    assert.equal(s.fields.name, "测试收件人");
  } finally { instance.stop(); }
});

test("graduate purchase renders as a physical print order and supports original-order payment recovery", () => {
  const owner = "13800008000";
  const base = { kind: "graduate", owner, id: "qa", quantity: 12, base: 600, shipping: 1000,
    total: 8200, photo: photo("first").output };
  const [paid] = normalizeOrders({ owner, print: [{ ...base, status: "producing" }] });
  assert.equal(paid.title, "毕业照片 6 寸冲印（共 12 张）");
  assert.equal(paid.thumbnailBlob, bytes);
  assert.equal(paid.amount, 8200);
  assert.equal(paid.fulfillmentSteps.length, 4);
  assert.deepEqual(paid.fees, [["冲印费", "¥72.00"], ["配送费", "¥10.00"]]);
  const [pending] = normalizeOrders({ owner, print: [{ ...base, status: "verifying" }] });
  assert.equal(pending.checkoutPath, graduatePrintPath + "&print=confirm&order=qa");
  assert.equal(pending.payment, "待确认支付");
  assert.deepEqual(normalizeOrders({ owner: "other", print: [base] }), []);
});

test("the university landing leads to existing university, scanner and records routes", () => {
  assert.match(universityPath, /page=collection&view=university/);
  const source = readFileSync(new URL("../src/pages/UniversityCollectionPage.jsx", import.meta.url), "utf8");
  assert.match(source, /<CollectionHeader\b[^>]*support=\{!mode && flow\}/);
  assert.doesNotMatch(source, />全部院校<|universityLink\("all"\)/);
  assert.match(source, /school\.status === "ongoing"/);
  assert.match(source, /universityProjectPath\(id, route\)/);
  assert.match(source, /detail: \{ intent: "collectionIdentity", returnTo: route \}/);
  assert.match(source, /goGraduate\("\/\?page=scan", false, collectionHistoryState\("\/\?page=scan"\)\)/);
  assert.match(source, /view=records&category=graduate&from=university/);
  const dock = renderToStaticMarkup(React.createElement(SchoolDock, { records: { count: 0, label: "0 条" } }));
  assert.match(dock, /毕业生采集记录，0 条.*class="university-record-count" aria-hidden="true">0<\/strong>/);
  assert.match(dock, /采集码指引.*毕业照冲印/);
  assert.doesNotMatch(source, /搜索院校|新规与须知|项目|机构|凭学信(?:网图像采集)?码办理/);
});

test("graduate hero config defaults to the five illustrated instructions, with a scoped prototype override", () => {
  const config = createCollectionConfig();
  assert.equal(graduateHeroMode(config), "flow");
  assert.equal(graduateHeroMode({ graduateHeroMode: "schools" }), "schools");
  assert.equal(graduateHeroMode(config, "schools"), "schools");
  assert.equal(graduateHeroMode({ graduateHeroMode: "other" }, "unknown"), "flow");
  assert.match(GRADUATE_FLOW_STEPS[1].description, /扫码.*相册选取/);
  assert.equal(GRADUATE_FLOW_STEPS[4].title, collectionStatusInfo("uploaded").label);
  assert.match(GRADUATE_FLOW_STEPS[4].description, /已成功上传至学信网/);
  const html = renderToStaticMarkup(React.createElement(UniversityLanding, { route: universityPath }));
  assert.match(html, /role="radiogroup" aria-label="原型配置切换 · 正式版由后台配置"/);
  assert.match(html, /type="radio"[^>]*checked=""[^>]*value="flow"/);
  const rail = html.match(/<section class="university-rail"[^>]*>(.*?)<\/section>/s)[1];
  assert.equal((rail.match(/<article /g) || []).length, 15);
  assert.equal((rail.match(/aria-hidden="true"/g) || []).length, 10);
  assert.doesNotMatch(rail, /<button|university-school-date|university-school-enter/);
  for (const { title, description, image } of GRADUATE_FLOW_STEPS) {
    assert.ok(rail.includes(title) && rail.includes(description) && rail.includes(image));
    const webp = readFileSync(new URL("../public" + image, import.meta.url));
    assert.equal(webp.toString("ascii", 8, 16), "WEBPVP8 ");
    assert.deepEqual([webp.readUInt16LE(26) & 0x3fff, webp.readUInt16LE(28) & 0x3fff], [810, 756]);
  }
  const schools = [{ id: "sample", organization: "海南师范大学", status: "ongoing",
    image: "assets/campus-hainan.webp", crest: "assets/university-hainnu-crest.webp", date: "2026-08-01 至 2026-11-30" }];
  const school = renderToStaticMarkup(React.createElement(GraduateHeroRail, { mode: "schools", items: schools, controls: { current: null } }));
  assert.match(school, /<button.*university-school-crest.*海南师范大学.*进行中.*开始时间.*结束时间.*university-school-enter/s);
  assert.doesNotMatch(school, /university-flow-card/);
});

test("the dock opens the code guide with access to the sample and scanner", () => {
  const source = readFileSync(new URL("../src/pages/UniversityCollectionPage.jsx", import.meta.url), "utf8");
  assert.deepEqual(universityChsiSteps.map(step => step.title), ["打开学信网", "找到图像采集码", "保存并回知拍识别"]);
  assert.equal(universityChsiSteps.at(-1).path, "保存完整图片，点下方按钮从相册上传");
  assert.equal(source.match(/overlay\("help", event\)/g)?.length, 1);
  assert.match(source, /<CollectionSchoolDock[\s\S]*onGuide=\{event => overlay\("help", event\)\}/);
  assert.doesNotMatch(source, /查看学信采集码示例/);
  assert.match(source, /title="3 步获取图像采集码"[\s\S]*已有采集码，去扫码 \/ 上传[\s\S]*<CodeGuide onOpenSample=\{openSample\}/);
  assert.match(source, /学信网官方凭证[\s\S]*图像采集码长这样[\s\S]*放大看样图/);
  assert.equal(source.match(/aria-haspopup="dialog" onClick=\{onOpenSample\}/g)?.length, 2);
  assert.match(source, /找不到入口？[\s\S]*查看图文教程/);
  assert.match(source, /focusDialogOnOpen=\{guideFromPointer.current\}/);
  assert.match(source, /layer === "sample" && <SampleViewer onClose=\{closeSample\}/);
  assert.ok(readFileSync(new URL("../public/assets/collection-chsi-code-sample.webp", import.meta.url)).length > 0);
});

test("the showroom renders a single product, its matching studio image and one order action", () => {
  for (const [initialProduct, id, tab, action, footnote, filename] of [
    [undefined, "graduate", "毕业 6 寸冲印", "开始挑选照片", "10 张起印", "print-hero-graduate-6inch.webp"],
    [true, "graduate", "毕业 6 寸冲印", "开始挑选照片", "10 张起印", "print-hero-graduate-6inch.webp"],
    ["layout", "layout", "背胶排版照", "去排版冲印", "一寸 / 二寸可选版式", "print-hero-diecut-layout.webp"],
  ]) {
    const html = renderToStaticMarkup(React.createElement(PrintShowroom, { initialProduct, target: null }));
    assert.ok(html.includes('data-product="' + id + '"'));
    assert.ok(html.includes('aria-pressed="true" aria-controls="university-print-product">' + tab));
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    assert.equal((html.match(/<img\b/g) || []).length, 1);
    assert.ok(html.includes('src="/assets/' + filename + '"'));
    assert.ok(html.includes(">" + action + "</button>"));
    assert.ok(html.includes(footnote));
    assert.match(html, /aria-label="关闭"/);
    assert.doesNotMatch(html, /自由混排|运费|¥/);
    assert.equal(readFileSync(new URL("../public/assets/" + filename, import.meta.url)).toString("ascii", 8, 12), "WEBP");
  }
});

test("intentional horizontal swipes select the neighboring product; taps and vertical scrolls keep the current one", () => {
  assert.equal(showroomSwipeProduct(-58, 9).path, "/?page=print&preset=layout");
  assert.equal(showroomSwipeProduct(52, -8).path, graduatePrintPath);
  assert.equal(showroomSwipeProduct(12, 2), null);
  assert.equal(showroomSwipeProduct(58, 70), null);
});

test("closing the showroom clears its history marker and restores focus to its dock entry", () => {
  const source = readFileSync(new URL("../src/pages/UniversityCollectionPage.jsx", import.meta.url), "utf8");
  assert.match(source, /printEntry=\{printEntry\}[\s\S]*onPrint=\{\(\) => \{ rememberHero\(\); setLayer\("print"\)/);
  assert.match(source, /onClose=\{closePrint\} returnFocusRef=\{printEntry\}/);
  assert.match(source, /function closePrint\(\)[\s\S]*?clearPrintReturn\(\);[\s\S]*?setLayer\(null\);/);
});

test("the full-screen code sample covers the guide and restores its original trigger", () => {
  const source = readFileSync(new URL("../src/pages/UniversityCollectionPage.jsx", import.meta.url), "utf8");
  const collectionStyles = readFileSync(new URL("../src/styles/collection.css", import.meta.url), "utf8");
  const graduateStyles = readFileSync(new URL("../src/pages/graduate-pages.css", import.meta.url), "utf8");
  assert.match(source, /function SampleViewer\([\s\S]*?target="#collection-modal-layer"[\s\S]*?className="album-photo-viewer collection-example-viewer"/);
  assert.match(source, /ref=\{focusClose\}[^>]*aria-label="关闭大图"/);
  assert.match(collectionStyles, /#collection-modal-layer:has\(\.collection-example-viewer\)\s*\{\s*z-index:\s*var\(--ui-layer-viewer\)/);
  assert.match(source, /suspended=\{layer === "sample"\}/);
  assert.match(graduateStyles, /\.shared-sheet-overlay\[inert\]:has\(> \.university-guide-sheet\)\s*\{\s*visibility:hidden/);
  assert.match(source, /sampleTrigger\.current = event\.currentTarget;[\s\S]*?function closeSample\(\)\s*\{[\s\S]*?trigger\.focus\(/);
});

test("each available print service returns to its source showroom after intermediate routes", async () => {
  let entries = [];
  let cursor = 0;
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    get: () => entries[cursor].url,
  });
  globalThis.window = new EventTarget();
  globalThis.history = {
    get state() { return entries[cursor].state; },
    get length() { return entries.length; },
    pushState(state, _, url) {
      entries.splice(cursor + 1, Infinity, { state, url: new URL(url, location) });
      cursor++;
    },
    replaceState(state, _, url) {
      entries[cursor] = { state, url: url === undefined ? location : new URL(url, location) };
    },
    back() { this.go(-1); },
    go(offset) { cursor += offset; },
  };
  function begin(product, landing) {
    entries = [{ url: new URL(landing, "http://localhost"), state: { source: "home" } }];
    cursor = 0;
    openPrintProduct(product);
    assert.equal(location.pathname + location.search, product.path);
  }
  const graduate = createController("graduatePrint").scope;
  begin(showroomSwipeProduct(60, 0), universityPath);
  goGraduate(graduatePrintPath + "&print=confirm");
  goGraduate(graduatePrintPath);
  await graduate.back();
  assert.equal(location.pathname + location.search, universityPath);
  assert.deepEqual(history.state, { source: "home", universityPrintPanel: "graduate" });

  for (const landing of [universityPath, "/?page=collection&view=projects&category=enrollment"]) {
    const layout = createController("printStudio").scope;
    begin(showroomSwipeProduct(-60, 0), landing);
    layout.route("layouts");
    layout.route("layouts", {}, true);
    layout.view = "layouts";
    layout.back();
    assert.equal(location.pathname + location.search, landing);
    assert.deepEqual(history.state, { source: "home", universityPrintPanel: "layout" });
    clearPrintReturn();
    assert.deepEqual(history.state, { source: "home" });
  }
});


test("enrollment offers only die-cut layout prints, even with an older six-inch history marker", () => {
  for (const initialProduct of [undefined, "layout", "graduate"]) {
    const html = renderToStaticMarkup(React.createElement(PrintShowroom, { category: "enrollment", initialProduct, target: null }));
    assert.ok(html.includes('data-product="layout"'));
    assert.ok(html.includes(">照片冲印</h2>"));
    assert.ok(html.includes('aria-label="关闭"'));
    assert.ok(html.includes(">四六级报名 · 入学报到必备</span>"));
    assert.ok(html.includes(">背胶模切排版照</h3>"));
    assert.ok(html.includes(">四六级报名、入学建档、学生证，一撕即贴都服帖。</p>"));
    assert.ok(html.includes(">去排版冲印</button>"));
    assert.ok(html.includes(">一寸 / 二寸可选版式 · 免剪刀精准模切 · 顺丰直发</p>"));
    assert.ok(html.includes('src="/assets/print-hero-diecut-layout.webp"'));
    assert.doesNotMatch(html, /aria-pressed|选择冲印商品|6 寸冲印/);
    assert.equal((html.match(/<button\b/g) || []).length, 2);
    assert.equal((html.match(/<img\b/g) || []).length, 1);
  }
  for (const dx of [-60, 60]) assert.equal(showroomSwipeProduct(dx, 0, [{ id: "layout" }]), null);
});
