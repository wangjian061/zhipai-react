// Domain/state and server-rendered markup only. No camera, browser or UI automation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createController, getStore } from "../src/runtime/state.js";
import {
  collectionCodeAdapter,
  collectionScanService,
  resolveCollectionCode,
  validateCollectionCodeFile,
} from "../src/domain/collection-code.js";
let current = new URL("http://127.0.0.1:4180/?page=home"),
  replaces = 0,
  permissionCalls = 0,
  stops = 0;
globalThis.window = new EventTarget();
globalThis.CustomEvent = class extends Event {
  constructor(type, options) {
    super(type);
    this.detail = options?.detail;
  }
};
Object.defineProperty(globalThis, "location", {
  get: () => current,
  configurable: true,
});
const doc = new EventTarget();
doc.hidden = false;
doc.activeElement = { focus() {} };
doc.querySelector = () => null;
globalThis.document = doc;
globalThis.history = {
  pushState(a, b, url) {
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
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
const institution = (id) => `zhipai-demo://institution?project=${id}`;
const chsi = (school = "demo-10001") =>
  `zhipai-demo://chsi?school=${school}&name=${encodeURIComponent("演示同学")}&number=20260001&lastFour=1234`;
function navigate(url) {
  current = new URL(url, current);
  window.dispatchEvent(new Event("zhipai-route"));
}
function setup(page = "home", login = true) {
  current = new URL(`http://127.0.0.1:4180/?page=${page}`);
  replaces = permissionCalls = stops = 0;
  doc.hidden = false;
  delete navigator.mediaDevices;
  const account = getStore("account");
  account.session = login ? { phone: "13800008000" } : null;
  const records = getStore("collectionRecords");
  records.ready = true;
  records.busy = false;
  records.error = "";
  records.items = [];
  const root = createController("phoneDemo");
  root.scope.page = page;
  root.scope.go = function (page) {
    this.page = page;
    navigate(`/?page=${page}`);
  };
  const flow = createController("collectionFlow", [], root.scope);
  flow.refs.collectionDialog = { querySelector: () => ({ focus() {} }) };
  flow.start();
  const scanner = createController("collectionScanner", [], root.scope);
  scanner.refs.scanVideo = { srcObject: null, async play() {} };
  scanner.refs.qrInput = { click() {} };
  scanner.refs.scanGuide = scanner.refs.scanResult = {
    querySelector: () => ({ focus() {} }),
  };
  scanner.refs.scanGuideBody = { scrollTop: 90 };
  scanner.start();
  return {
    s: scanner.scope,
    c: flow.scope,
    account,
    records,
    close() {
      scanner.stop();
      flow.stop();
      collectionScanService.clear();
    },
  };
}
function openScan(ctx, detail = {}) {
  window.dispatchEvent(
    new CustomEvent("zhipai-scan-open", {
      detail: { returnTo: current.pathname + current.search, ...detail },
    }),
  );
  navigate("/?page=scan");
}
function fakeCamera(supported = true) {
  navigator.mediaDevices = {
    async getUserMedia() {
      permissionCalls++;
      return {
        getTracks: () => [
          {
            stop() {
              stops++;
            },
          },
        ],
        getVideoTracks: () => [
          {
            getCapabilities: () => ({ torch: supported }),
            async applyConstraints() {},
          },
        ],
      };
    },
  };
}
test("both QR kinds resolve by configured project and school bindings; school code is not a project id", async () => {
  const ctx = setup();
  const directory = collectionScanService.directory();
  assert.equal(
    (await resolveCollectionCode(institution("graduate"), {}, directory)).kind,
    "institution",
  );
  const result = await resolveCollectionCode(chsi(), {}, directory);
  assert.equal(result.projectId, "graduate");
  assert.equal(result.identity.name, "演示同学");
  assert.equal(result.prototype, true);
  await assert.rejects(resolveCollectionCode(chsi("graduate"), {}, directory), {
    code: "unmapped",
  });
  ctx.close();
});
test("unknown, arbitrary external, cross-project, ambiguous, missing and incompatible codes fail instead of navigating", async () => {
  const ctx = setup();
  const directory = collectionScanService.directory();
  for (const raw of ["random", "https://untrusted.example/?project=graduate"])
    await assert.rejects(resolveCollectionCode(raw, {}, directory), {
      code: "unsupported",
    });
  await assert.rejects(
    resolveCollectionCode(
      institution("graduate"),
      { intent: "collectionIdentity", projectId: "graduate" },
      directory,
    ),
    { code: "personal_required" },
  );
  await assert.rejects(
    resolveCollectionCode(chsi(), { projectId: "graduate-degree" }, directory),
    { code: "mismatch" },
  );
  await assert.rejects(
    resolveCollectionCode(institution("missing"), {}, directory),
    { code: "missing" },
  );
  directory.bindings = [
    ...directory.bindings,
    { schoolCode: "demo-10001", projectIds: ["graduate-degree"] },
  ];
  await assert.rejects(resolveCollectionCode(chsi(), {}, directory), {
    code: "ambiguous",
  });
  assert.equal(
    (await resolveCollectionCode(chsi(), { projectId: "graduate" }, directory))
      .projectId,
    "graduate",
  );
  const wrong = {
    ...directory,
    bindings: [{ schoolCode: "demo-10001", projectIds: ["enrollment"] }],
  };
  await assert.rejects(resolveCollectionCode(chsi(), {}, wrong), {
    code: "method",
  });
  ctx.close();
});
test("closed, not-started and disabled projects cannot start authentication", async () => {
  const ctx = setup();
  const directory = collectionScanService.directory();
  for (const id of ["enrollment-postgraduate", "association-talent"])
    await assert.rejects(
      resolveCollectionCode(institution(id), {}, directory),
      { code: "closed", projectId: id },
    );
  ctx.c.config.entries.graduate = false;
  await assert.rejects(
    resolveCollectionCode(chsi(), {}, collectionScanService.directory()),
    { code: "closed" },
  );
  ctx.close();
});
test("generic institution scan consumes scan route, opens configured first authentication and creates no records", async () => {
  for (const [id, panel, method] of [
    ["graduate", "qr", "qr"],
    ["enrollment", "identity", "id"],
    ["association", "employee", "employee"],
  ]) {
    const ctx = setup();
    openScan(ctx);
    await ctx.s.accept(institution(id));
    await settle();
    assert.equal(current.searchParams.get("project"), id);
    assert.equal(current.searchParams.get("page"), "collection");
    assert.equal(ctx.c.panel, panel);
    assert.equal(ctx.c.method, method);
    assert.equal(ctx.c.qrRead, false);
    assert.equal(ctx.records.items.length, 0);
    assert.equal(replaces, 1);
    assert.equal(collectionScanService.pending, null);
    ctx.close();
  }
});
test("generic CHSI scan enters second-stage identity check, with real returned fields only and no success interstitial", async () => {
  const ctx = setup();
  openScan(ctx);
  await ctx.s.accept(chsi());
  await settle();
  assert.equal(ctx.c.panel, "qrCheck");
  assert.equal(ctx.c.method, "qr");
  assert.equal(ctx.c.qrRead, true);
  assert.equal(ctx.c.identity.number, "20260001");
  assert.equal(ctx.c.identity.lastFour, "1234");
  assert.equal(ctx.c.qrPrototype, true);
  assert.equal(ctx.s.result, false);
  assert.equal(ctx.records.items.length, 0);
  assert.ok(!current.search.includes("20260001"));
  ctx.close();
});
test("project-scoped mismatch stays in scanner; cancelling restores original project and typed fields", async () => {
  const ctx = setup("collection");
  navigate("/?page=collection&view=project&project=graduate");
  await settle();
  ctx.c.begin();
  ctx.c.identity.name = "原有输入";
  ctx.c.scanCode();
  await settle();
  await ctx.s.accept(chsi("demo-10002"));
  assert.equal(ctx.s.failure.title, "采集码与当前项目不符");
  assert.equal(current.search, "?page=scan");
  ctx.s.dismissFailure();
  ctx.s.back();
  await settle();
  assert.equal(ctx.c.projectId, "graduate");
  assert.equal(ctx.c.panel, "qr");
  assert.equal(ctx.c.identity.name, "原有输入");
  ctx.close();
});
test("project-scoped CHSI success reuses original project and advances without uploading again", async () => {
  const ctx = setup("collection");
  navigate("/?page=collection&view=project&project=graduate");
  await settle();
  ctx.c.begin();
  ctx.c.scanCode();
  await ctx.s.accept(chsi());
  await settle();
  assert.equal(ctx.c.projectId, "graduate");
  assert.equal(ctx.c.panel, "qrCheck");
  assert.equal(ctx.c.qrRead, true);
  ctx.close();
});
test("login preserves single-use handoff; cancellation does not force a login loop, later login resumes without rescan", async () => {
  const ctx = setup("home", false);
  openScan(ctx);
  await ctx.s.accept(chsi());
  await settle();
  assert.equal(current.searchParams.get("page"), "account");
  assert.equal(collectionScanService.pending.kind, "chsi");
  navigate("/?page=collection&view=project&project=graduate");
  await settle();
  assert.equal(current.searchParams.get("page"), "collection");
  assert.equal(ctx.c.panel, null);
  ctx.c.begin();
  assert.equal(current.searchParams.get("page"), "account");
  ctx.account.session = { phone: "13800008000" };
  navigate("/?page=collection&view=project&project=graduate");
  await settle();
  assert.equal(ctx.c.panel, "qrCheck");
  assert.equal(collectionScanService.pending, null);
  ctx.close();
});
test("abandoned, expired, changed-owner and now-closed handoffs are never resumed", async () => {
  for (const condition of ["expired", "owner", "closed", "abandon"]) {
    const ctx = setup();
    const result = await collectionScanService.resolve(chsi());
    collectionScanService.queue(result, "13800008000");
    if (condition === "expired") collectionScanService.pending.expires = 0;
    if (condition === "owner") ctx.account.session = { phone: "13900008000" };
    if (condition === "closed")
      ctx.c.projects.find((p) => p.id === "graduate").status = "ended";
    navigate(
      condition === "abandon"
        ? "/?page=home"
        : "/?page=collection&view=project&project=graduate",
    );
    await settle();
    assert.equal(ctx.c.panel, null);
    assert.equal(ctx.c.qrRead, false);
    assert.equal(collectionScanService.pending, null);
    ctx.close();
  }
});
test("denied camera never re-requests on help close, failed album input, visibility resume or picker cancellation", async () => {
  const ctx = setup();
  navigator.mediaDevices = {
    async getUserMedia() {
      permissionCalls++;
      throw Object.assign(Error("denied"), { name: "NotAllowedError" });
    },
  };
  openScan(ctx);
  await settle();
  assert.equal(permissionCalls, 1);
  assert.match(ctx.s.cameraError, /权限/);
  ctx.s.openGuide();
  ctx.s.closeGuide();
  await settle();
  ctx.s.pickPhoto();
  ctx.s.cancelPick();
  await ctx.s.upload({
    target: { files: [{ type: "image/jpeg", size: 16 * 1048576 }], value: "x" },
  });
  assert.equal(ctx.s.failure.title, "图片超过大小限制");
  ctx.s.dismissFailure();
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  await settle();
  assert.equal(permissionCalls, 1);
  assert.equal(ctx.s.source, "album");
  ctx.close();
});
test("camera resumes only its previous mode, torch is gated, streams stop for help/background/leave", async () => {
  const ctx = setup();
  fakeCamera();
  openScan(ctx);
  await settle();
  assert.equal(ctx.s.ready, true);
  await ctx.s.toggleTorch();
  assert.equal(ctx.s.torch, true);
  ctx.s.openGuide();
  assert.equal(ctx.s.ready, false);
  assert.ok(stops > 0);
  ctx.s.showGuide("chsi");
  await settle();
  assert.equal(ctx.s.$refs.scanGuideBody.scrollTop, 0);
  ctx.s.guideBack();
  assert.equal(ctx.s.guideOpen, true);
  assert.equal(ctx.s.guidePage, "");
  ctx.s.guideBack();
  await settle();
  assert.equal(ctx.s.ready, true);
  ctx.s.pickPhoto();
  ctx.s.cancelPick();
  await settle();
  assert.equal(ctx.s.ready, true);
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(ctx.s.ready, false);
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  await settle();
  assert.equal(ctx.s.ready, true);
  navigate("/?page=home");
  assert.equal(ctx.s.ready, false);
  assert.equal(ctx.s.$refs.scanVideo.srcObject, null);
  ctx.close();
});
test("late camera and project parse results cannot navigate or populate another account/task", async () => {
  const ctx = setup();
  let release;
  navigator.mediaDevices = {
    getUserMedia() {
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  };
  openScan(ctx);
  await settle();
  navigate("/?page=home");
  release({
    getTracks: () => [
      {
        stop() {
          stops++;
        },
      },
    ],
  });
  await settle();
  assert.ok(stops > 0);
  assert.equal(ctx.s.ready, false);
  openScan(ctx);
  const parse = collectionCodeAdapter.parse;
  let finish;
  collectionCodeAdapter.parse = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = ctx.s.accept(chsi());
  ctx.s.back();
  finish({ kind: "chsi", schoolCode: "demo-10001", prototype: true });
  await pending;
  await settle();
  assert.equal(current.searchParams.get("page"), "home");
  assert.equal(collectionScanService.pending, null);
  collectionCodeAdapter.parse = parse;
  ctx.close();
});
test("one shared 15MB image rule distinguishes type and size, and closing a failure suppresses immediate repeats", async () => {
  validateCollectionCodeFile({ type: "image/webp", size: 15 * 1048576 });
  assert.throws(
    () => validateCollectionCodeFile({ type: "image/gif", size: 2 }),
    { code: "format" },
  );
  assert.throws(
    () =>
      validateCollectionCodeFile({ type: "image/png", size: 15 * 1048576 + 1 }),
    { code: "size" },
  );
  const ctx = setup();
  openScan(ctx);
  await ctx.s.accept("unverified");
  assert.equal(ctx.s.ignoredCode, "unverified");
  ctx.s.dismissFailure();
  assert.ok(ctx.s.ignoredUntil > Date.now());
  assert.equal(ctx.s.failure, null);
  ctx.s.back();
  assert.equal(current.searchParams.get("page"), "home");
  ctx.close();
});
test("help has two local bodies, official external link, fixed actions and shared typography; missing iframe and false verification removed", () => {
  const page = fs.readFileSync("src/pages/ScanPage.jsx", "utf8"),
    css = fs.readFileSync("src/styles/scan.css", "utf8");
  assert.match(page, /机构／院校二维码/);
  assert.match(page, /学信档案/);
  assert.match(page, /my\.chsi\.com\.cn\/archive\/index\.jsp/);
  assert.ok(!page.includes("iframe"));
  assert.ok(!page.includes("collection-code-guide.html"));
  assert.ok(!page.includes("验证采集码"));
  assert.ok(!page.includes("scan-collection-guide.webp"));
  assert.match(css, /font-size:17px/);
  assert.match(css, /var\(--ui-sheet-radius\)/);
  assert.match(css, /\.scan-sheet-body\{[^}]*overflow-y:auto/);
  assert.match(css, /\.scan-sheet footer\{flex:none/);
  assert.match(css, /prefers-reduced-motion/);
});
test("scan-project return preserves homepage/section source, and cancellation preserves category/search return context", async () => {
  for (const source of ["/?page=home", "/?page=collection&view=records"]) {
    const ctx = setup();
    navigate(source);
    openScan(ctx);
    await ctx.s.accept(institution("graduate"));
    await settle();
    ctx.c.closePanel();
    ctx.c.back();
    await settle();
    assert.equal(current.pathname + current.search, source);
    ctx.close();
  }
  const ctx = setup("collection");
  navigate(
    "/?page=collection&view=project&project=graduate&from=projects&category=graduate&q=2026",
  );
  await settle();
  ctx.c.begin();
  ctx.c.scanCode();
  await ctx.s.accept(chsi());
  await settle();
  ctx.c.closePanel();
  ctx.c.back();
  assert.equal(current.searchParams.get("view"), "projects");
  assert.equal(current.searchParams.get("q"), "2026");
  assert.equal(current.searchParams.get("category"), "graduate");
  ctx.close();
});
test("shipped demonstration QR PNGs decode to their explicit fictional manifests", async () => {
  const vm = await import("node:vm"),
    { PNG } = await import("pngjs");
  const environment = {
    module: { exports: {} },
    exports: {},
    Uint8ClampedArray,
  };
  vm.runInNewContext(
    fs.readFileSync("public/vendor/jsQR.js", "utf8"),
    environment,
  );
  const manifest = JSON.parse(
    fs.readFileSync("public/demo/collection-codes/manifest.json", "utf8"),
  );
  for (const entry of manifest) {
    const png = PNG.sync.read(
      fs.readFileSync("public/demo/collection-codes/" + entry.image),
    );
    const decoded = environment.module.exports(
      new Uint8ClampedArray(png.data),
      png.width,
      png.height,
    );
    assert.equal(decoded?.data, entry.payload);
    assert.equal(entry.prototype, true);
  }
});
test("actual QR image upload hands off to the project; project upload uses the same typed resolution and rejects institution codes", async () => {
  const vm = await import("node:vm"),
    { PNG } = await import("pngjs");
  const environment = {
    module: { exports: {} },
    exports: {},
    Uint8ClampedArray,
  };
  vm.runInNewContext(
    fs.readFileSync("public/vendor/jsQR.js", "utf8"),
    environment,
  );
  const manifest = JSON.parse(
    fs.readFileSync("public/demo/collection-codes/manifest.json", "utf8"),
  );
  const entry = manifest.find((entry) => entry.id === "chsi-graduate"),
    png = PNG.sync.read(
      fs.readFileSync("public/demo/collection-codes/" + entry.image),
    );
  const oldImage = globalThis.Image,
    oldCanvas = doc.createElement,
    oldDecoder = window.jsQR;
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = png.width;
      this.naturalHeight = png.height;
    }
    async decode() {}
  };
  doc.createElement = () => ({
    getContext: () => ({
      drawImage() {},
      getImageData: () => ({
        data: new Uint8ClampedArray(png.data),
        width: png.width,
        height: png.height,
      }),
    }),
  });
  window.jsQR = environment.module.exports;
  const file = new Blob(
    [fs.readFileSync("public/demo/collection-codes/" + entry.image)],
    { type: "image/png" },
  );
  const ctx = setup();
  openScan(ctx);
  await ctx.s.upload({ target: { files: [file], value: "x" } });
  await settle();
  assert.equal(ctx.c.panel, "qrCheck");
  assert.equal(ctx.c.identity.name, "演示同学");
  assert.equal(ctx.s.uploading, false);
  ctx.c.closePanel();
  ctx.c.begin();
  await ctx.c.uploadQR({ target: { files: [file], value: "x" } });
  assert.equal(ctx.c.panel, "qrCheck");
  assert.equal(ctx.c.qrRead, true);
  assert.equal(ctx.c.method, "qr");
  ctx.c.returnAuthentication();
  window.jsQR = () => ({ data: institution("graduate") });
  await ctx.c.uploadQR({ target: { files: [file], value: "x" } });
  assert.equal(ctx.c.panel, "qr");
  assert.equal(ctx.c.qrRead, false);
  assert.match(ctx.c.error, /不能代替/);
  ctx.close();
  globalThis.Image = oldImage;
  doc.createElement = oldCanvas;
  window.jsQR = oldDecoder;
});
test("a successful code waits for record-store availability without losing its target authentication stage", async () => {
  const ctx = setup();
  ctx.records.ready = false;
  openScan(ctx);
  await ctx.s.accept(chsi());
  await settle();
  assert.equal(ctx.c.panel, null);
  assert.equal(collectionScanService.pending.kind, "chsi");
  ctx.records.ready = true;
  ctx.records.busy = true;
  await settle();
  assert.equal(ctx.c.panel, null);
  assert.ok(collectionScanService.pending);
  ctx.records.busy = false;
  await settle();
  assert.equal(ctx.c.panel, "qrCheck");
  assert.equal(ctx.c.identity.number, "20260001");
  assert.equal(collectionScanService.pending, null);
  ctx.close();
});
