// Real domain/state and SVG raster checks only; no browser or real payment.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveObjectURL } from "node:buffer";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";
import {
  createController,
  getStore,
  registerStore,
  storageValue,
} from "../src/runtime/state.js";
globalThis.window = new EventTarget();
globalThis.document = { activeElement: null };
globalThis.location = new URL(
  "http://localhost:4180/?page=keepsake&kind=postcard&view=confirm",
);
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { onLine: true },
});
await import("../src/domain/index.js");
const {
  KEEPSAKE_TEMPLATES,
  KEEPSAKE_PRODUCTS,
  keepsakeSVG,
  templateGeometry,
  STAMP_PANE,
  renderKeepsake,
  sampleArt,
  frameArt,
  stampViewImage,
} = await import("../src/domain/keepsake-templates.js");
const { confirmKeepsakeReceipt } = await import("../src/domain/keepsakes.js");
const { normalizeOrders } = await import("../src/domain/orders.js");
const { recentPhotos, photoFacts } =
  await import("../src/domain/photo-actions.js");
const owner = "13800008000";
const photo = {
  id: "source",
  name: "照片.png",
  width: 2,
  height: 2,
  type: "image/png",
  blob: new Blob(["photo"], { type: "image/png" }),
};
function embeddedFrame(template) {
  const url = frameArt(template);
  const mime = template.kind === "postcard" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync("public" + url).toString("base64")}`;
}
function fixture() {
  globalThis.window = new EventTarget();
  globalThis.location = new URL(
    "http://localhost:4180/?page=keepsake&kind=postcard&view=confirm",
  );
  navigator.onLine = true;
  registerStore("account", { session: { phone: owner } });
  const parent = { page: "keepsake" },
    s = createController("keepsakeStudio", [], parent).scope;
  const orders = getStore("keepsakeOrders");
  orders.items = [];
  orders.ready = true;
  orders.busy = false;
  orders.loading = Promise.resolve();
  orders.error = "";
  orders.commit = async (mutate) => {
    const next = storageValue(orders.items);
    await mutate(next);
    orders.items = next;
  };
  const library = getStore("printLibrary");
  library.ready = true;
  library.busy = false;
  library.addresses = [
    {
      id: "address",
      name: "收件人",
      phone: owner,
      region: "北京",
      street: "示例地址",
    },
  ];
  library.commit = async (mutate) => {
    const next = { addresses: storageValue(library.addresses) };
    await mutate(next);
    library.addresses = next.addresses;
  };
  const entries = [{ url: location.href, state: null }];
  let cursor = 0;
  function navigate(entry) {
    globalThis.location = new URL(entry.url, location.origin);
    parent.page = location.searchParams.get("page");
  }
  globalThis.history = {
    get state() { return entries[cursor].state; },
    set state(value) { entries[cursor].state = value; },
    pushState(state, _title, url) {
      entries.splice(cursor + 1, entries.length, { url, state });
      navigate(entries[++cursor]);
    },
    replaceState(state, _title, url) {
      entries[cursor] = { url, state };
      navigate(entries[cursor]);
    },
    back() {
      if (!cursor) return;
      navigate(entries[--cursor]);
      window.dispatchEvent(new Event("popstate"));
    },
  };
  s.photo = photo;
  s.image = { data: "data:image/png;base64,AAAA", width: 2, height: 2 };
  s.previewFrame = { data: "data:image/png;base64,AAAA", templateId: s.templateId };
  s.output = new Blob(["finished"], { type: "image/png" });
  s.outputURL = URL.createObjectURL(s.output);
  s.addressId = "address";
  s.view = "confirm";
  s.init();
  return {
    s,
    orders,
    library,
    close() {
      s.destroy();
    },
  };
}

test("all postcard and stamp layouts rasterize the chosen file into every bounded photo slot with one embedded source", () => {
  assert.equal(
    KEEPSAKE_TEMPLATES.filter((x) => x.kind === "postcard").length,
    6,
  );
  assert.equal(KEEPSAKE_TEMPLATES.filter((x) => x.kind === "stamp").length, 1);
  const pixels = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < pixels.data.length; i += 4) {
    pixels.data.set([240, 32, 50, 255], i);
  }
  const data =
    "data:image/png;base64," + PNG.sync.write(pixels).toString("base64");
  for (const template of KEEPSAKE_TEMPLATES) {
    const geometry = templateGeometry(template);
    const frame = embeddedFrame(template);
    const svg = keepsakeSVG(
      template,
      { data, width: 2, height: 2 },
      { scale: 1.5, offsetX: 70, offsetY: -40 },
      "test",
      frame,
    );
    assert.equal(
      svg.split(data).length - 1,
      1,
      "do not duplicate large photos per stamp",
    );
    const png = PNG.sync.read(new Resvg(svg).render().asPng());
    assert.equal(png.width, geometry.width);
    assert.equal(png.height, geometry.height);
    for (const slot of geometry.slots) {
      assert.ok(
        slot.x >= 0 &&
          slot.y >= 0 &&
          slot.x + slot.w <= png.width &&
          slot.y + slot.h <= png.height,
      );
      const i =
        (Math.floor(slot.y + slot.h / 2) * png.width +
          Math.floor(slot.x + slot.w / 2)) *
        4;
      assert.deepEqual([...png.data.subarray(i, i + 4)], [240, 32, 50, 255]);
    }
    assert.equal(geometry.slots.length, template.kind === "stamp" ? 5 : 1);
    if (template.kind === "postcard") {
      const original = PNG.sync.read(fs.readFileSync("public" + frameArt(template)));
      assert.equal(original.width, 1800);
      assert.equal(original.height, 1200);
      const [{ x, y, w, h }] = geometry.slots;
      for (let row = 0; row < png.height; row++) {
        for (let col = 0; col < png.width; col++) {
          const i = (row * png.width + col) * 4;
          const inside = col >= x && col < x + w && row >= y && row < y + h;
          assert.equal(original.data[i + 3], inside ? 0 : 255);
          assert.equal(png.data[i + 3], 255);
        }
      }
      assert.deepEqual(png.data.subarray(0, 4), original.data.subarray(0, 4));
    }
  }
});

test("catalogue shows the six approved postcards and the frontal stamp; samples cannot be submitted as input", async () => {
  const designs = KEEPSAKE_TEMPLATES.filter((t) => t.kind === "postcard");
  assert.deepEqual(
    designs.map((t) => t.name),
    ["校园来信", "生日祝福", "毕业留念", "旅行邮记", "日常问候", "相聚留影"],
  );
  assert.equal(KEEPSAKE_PRODUCTS.postcard.price, 1000);
  assert.equal(
    stampViewImage("inner"),
    "/assets/keepsakes/stamp-product-inner-20261106.webp",
  );
  for (const url of [
    ...designs.map(sampleArt),
    ...["inner", "open", "cover", "back"].map(stampViewImage),
  ]) {
    assert.ok(fs.statSync("public" + url).size > 0);
  }
  await assert.rejects(renderKeepsake(designs[0], null, {}), /选取/);
  const f = fixture();
  try {
    const s = f.s;
    s.view = "work";
    s.editComposition();
    s.setTransform({ scale: 1.5, offsetX: 20 });
    s.close();
    const input = s.photo;
    s.chooseTemplate("postcard-together");
    assert.equal(s.template.name, "相聚留影");
    assert.equal(s.photo, input);
    assert.equal(s.transform.scale, 1.5);
    assert.equal(s.output, null);
    history.replaceState({}, "", "/?page=keepsake&kind=stamp&view=templates");
    s.sync();
    assert.equal(s.view, "work");
    assert.equal(location.searchParams.get("view"), "work");
    assert.equal(s.stampView, "inner");
    assert.equal(s.canPay, false);
  } finally {
    f.close();
  }
});
function mockPhotoReading() {
  const originals = {
    Image: globalThis.Image,
    FileReader: globalThis.FileReader,
    fetch: globalThis.fetch,
  };
  globalThis.fetch = async (url) => new Response(fs.readFileSync("public" + url), {
    headers: { "Content-Type": url.endsWith(".png") ? "image/png" : "image/jpeg" },
  });
  globalThis.Image = class {
    naturalWidth = 2;
    naturalHeight = 2;
    async decode() {}
  };
  globalThis.FileReader = class {
    async readAsDataURL(blob) {
      const bytes = Buffer.from(await blob.arrayBuffer()).toString("base64");
      this.result = `data:${blob.type};base64,${bytes}`;
      this.onload();
    }
  };
  return () => Object.assign(globalThis, originals);
}

for (const kind of ["postcard", "stamp"]) {
  test(
    kind +
      ": selecting, cancelling and replacing photos never navigate to production or generate output",
    async () => {
      const f = fixture(),
        s = f.s,
        restoreReading = mockPhotoReading();
      const library = getStore("photoLibrary");
      library.ready = true;
      library.finished = [photo];
      await s.enter({ kind, returnTo: "/?page=home" });
      let cameraOpens = 0;
      window.addEventListener("zhipai-camera-open", () => cameraOpens++);
      try {
        const originalRoute = location.href;
        s.pick();
        assert.equal(s.panel, "album");
        s.selectCandidate(photo.id);
        assert.equal(s.photo, null, "a thumbnail only highlights a candidate");
        await s.useCandidate();
        assert.equal(s.panel, "keepsakeCrop");
        assert.equal(s.photo.blob, photo.blob);
        assert.equal(s.image.width, 2);
        assert.equal(s.previewReady, true);
        s.setTransform({ scale: 1.6, offsetX: 20 });
        const originalCrop = { ...s.activeTransform };
        s.pick();
        s.close();
        assert.equal(s.panel, "keepsakeCrop");
        assert.deepEqual({ ...s.activeTransform }, originalCrop);
        s.pick();
        history.back();
        assert.equal(s.panel, "keepsakeCrop");
        assert.deepEqual({ ...s.activeTransform }, originalCrop);
        s.pick();
        await s.useCandidate();
        assert.equal(s.panel, "keepsakeCrop");
        assert.deepEqual({ ...s.activeTransform }, originalCrop);
        s.pick();
        await s.usePhoneFile(undefined);
        assert.equal(s.panel, "album");
        await s.usePhoneFile(
          new File(["invalid"], "test.txt", { type: "text/plain" }),
        );
        assert.equal(s.panel, "keepsakeCrop");
        assert.match(s.previewError, /JPG/);
        assert.equal(s.canContinue, false);
        assert.equal(s.photo.blob, photo.blob);
        assert.deepEqual({ ...s.activeTransform }, originalCrop);
        const file = new File(["replacement"], "picked.png", {
          type: "image/png",
        });
        s.pick();
        await s.usePhoneFile(file);
        assert.equal(s.photo.blob, file);
        assert.equal(s.panel, "keepsakeCrop");
        assert.equal(s.activeTransform.scale, 1);
        assert.equal(s.output, null);
        assert.equal(f.orders.items.length, 0);
        assert.equal(location.href, originalRoute);
        assert.equal(cameraOpens, 0);
      } finally {
        restoreReading();
        f.close();
      }
    },
  );
}

for (const [kind, templateId] of [
  ["postcard", "postcard-birthday"],
  ["stamp", "stamp-youth"],
]) {
  test(
    kind +
      ": explicit creation returns its own saved result and cancellation preserves the product",
    async () => {
      const f = fixture(),
        s = f.s,
        restoreReading = mockPhotoReading();
      const previousDocument = globalThis.document;
      globalThis.document = new EventTarget();
      const camera = createController("cameraStudio", [], {
        page: "keepsake",
      }).scope;
      camera.init();
      let opens = 0;
      window.addEventListener("zhipai-camera-open", () => opens++);
      s.go = (page) => {
        assert.equal(page, "camera");
        history.pushState({}, "", "/?page=camera&camera=capture");
        window.dispatchEvent(new Event("zhipai-route"));
      };
      try {
        const library = getStore("photoLibrary");
        library.ready = true;
        library.finished = [photo];
        await s.enter({
          kind,
          templateId,
          photo,
          returnTo: "/?page=home",
        });
        const proof = kind === "stamp" ? new Blob(["student"]) : null;
        s.studentProof = proof;
        const source = location.href;
        s.editComposition();
        s.setTransform({ scale: 1.7, offsetX: 22 });
        s.close();
        s.pick();
        s.makePhoto();
        assert.equal(opens, 1);
        assert.equal(camera.editingFrom, "keepsake");
        assert.equal(camera.creationContext.templateId, templateId);
        camera.back();
        assert.equal(location.href, source);
        assert.equal(s.photo.blob, photo.blob);
        assert.equal(s.transform.scale, 1.7);

        s.pick();
        s.makePhoto();
        const fresh = {
          ...photo,
          id: "made-new",
          blob: new Blob(["new result"], { type: "image/png" }),
        };
        library.finished = [fresh, photo];
        camera.draft = { id: "new", savedId: fresh.id };
        camera.step = "saved";
        camera.finish();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(location.href, source);
        assert.equal(s.templateId, templateId);
        assert.equal(s.photo.id, fresh.id);
        assert.equal(s.panel, "keepsakeCrop");
        assert.equal(s.output, null);
        assert.equal(opens, 2);
        assert.equal(s.studentProof, proof);
      } finally {
        camera.destroy();
        globalThis.document = previousDocument;
        restoreReading();
        f.close();
      }
    },
  );
}

test("preview loading and frame retry lead to checkout, whose previous step restores the same preview", async () => {
  const f = fixture(), { s } = f;
  const restore = mockPhotoReading();
  const originalDocument = globalThis.document;
  const loadFrame = globalThis.fetch;
  let failFrame = true;
  globalThis.fetch = (url) => failFrame
    ? Promise.resolve(new Response(null, { status: 503 }))
    : loadFrame(url);
  globalThis.document = {
    createElement() {
      return {
        getContext: () => ({ drawImage() {} }),
        toBlob: (done) => done(new Blob(["finished"], { type: "image/png" })),
      };
    },
  };
  try {
    await s.enter({ kind: "postcard", returnTo: "/?page=home" });
    s.view = "templates";
    s.pick();
    assert.equal(s.panel, "album");
    const pending = s.usePhoneFile(new File(["test photo"], "test.png", { type: "image/png" }));
    assert.equal(s.panel, "keepsakeCrop");
    assert.equal(s.previewLoading, true);
    assert.equal(s.canContinue, false);
    await pending;
    assert.match(s.previewError, /模板读取失败/);
    assert.equal(s.photo, null);
    failFrame = false;
    assert.equal(await s.loadPreview(), true);
    assert.equal(s.canContinue, true);
    s.chooseTemplate("postcard-together");
    assert.equal(s.previewLoading, true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(s.previewFrame.templateId, "postcard-together");
    s.setTransform({ scale: 2, offsetX: 15 });
    await s.confirm();
    assert.equal(s.view, "confirm");
    assert.equal(s.panel, null);
    await s.back();
    assert.equal(s.view, "work");
    assert.equal(s.panel, "keepsakeCrop");
    assert.equal(s.templateId, "postcard-together");
    assert.equal(s.activeTransform.offsetX, 15);
    assert.equal(s.activeTransform.scale, 2);
  } finally {
    globalThis.document = originalDocument;
    restore();
    f.close();
  }
});

test("template switches retain the previous frame and reuse ready and in-flight frame loads", async () => {
  const f = fixture(), { s } = f;
  const restore = mockPhotoReading();
  const originalFetch = globalThis.fetch;
  const fetchCounts = new Map();
  const second = KEEPSAKE_TEMPLATES.find((template) => template.id === "postcard-birthday");
  let finishSecond;
  globalThis.fetch = (url) => {
    fetchCounts.set(url, (fetchCounts.get(url) || 0) + 1);
    if (url === frameArt(second)) return new Promise((resolve) => { finishSecond = () => resolve(originalFetch(url)); });
    return originalFetch(url);
  };
  try {
    await s.enter({ kind: "postcard", returnTo: "/?page=home" });
    const first = s.template;
    await s.startPhotoPreview(photo, "phone");
    const frame = s.previewFrame.data;
    s.chooseTemplate(second.id);
    assert.equal(s.previewLoading, true);
    assert.equal(s.previewReady, false);
    assert.equal(s.previewFrame.templateId, first.id);
    assert.equal(s.previewFrame.data, frame);
    const secondLoad = s.loadPreviewFrame(second);
    assert.equal(fetchCounts.get(frameArt(second)), 1);
    finishSecond();
    await secondLoad;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(s.previewFrame.templateId, second.id);
    assert.equal(s.previewReady, true);
    s.chooseTemplate(first.id);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(s.previewFrame.templateId, first.id);
    assert.equal(fetchCounts.get(frameArt(first)), 1);
    assert.equal(fetchCounts.get(frameArt(second)), 1);
  } finally { restore(); f.close(); }
});

test("closing the first preview during reading clears selection and ignores the late result", async () => {
  const f = fixture(), { s } = f;
  const restore = mockPhotoReading();
  const originalFetch = globalThis.fetch;
  let finishFrame;
  globalThis.fetch = (url) => new Promise((resolve) => { finishFrame = () => resolve(originalFetch(url)); });
  try {
    await s.enter({ kind: "postcard", returnTo: "/?page=home" });
    s.pick();
    const pending = s.usePhoneFile(new File(["test photo"], "test.png", { type: "image/png" }));
    assert.equal(s.panel, "keepsakeCrop");
    assert.equal(s.previewLoading, true);
    assert.equal(s.image, null);
    s.close();
    assert.equal(s.panel, null);
    assert.equal(s.previewLoading, false);
    assert.equal(s.previewRequest, null);
    finishFrame();
    await pending;
    assert.equal(s.photo, null);
    assert.equal(s.previewFrame, null);
    assert.equal(s.canContinue, false);
  } finally { restore(); f.close(); }
});

test("pinch-anchored zoom keeps the source point stable within the photo window and clamps the bounds", () => {
  const f = fixture(), { s } = f;
  try {
    s.route("work", true);
    s.image = { width: 1800, height: 1200 };
    s.editComposition();
    const [slot] = templateGeometry(s.template).slots;
    const rect = { left: 0, top: 0, width: 1800, height: 1200 };
    const point = { x: slot.x + slot.w * 0.65, y: slot.y + slot.h * 0.4 };
    const geometry = s.cropGeometry(point, rect);
    const { slot: target } = geometry;
    s.zoomCrop(point, rect, { factor: 2 });
    assert.equal(s.activeTransform.scale, 2);
    const sourceAt = (settings) => {
      const w = Math.min(1800, 1200 * target.w / target.h) / settings.scale;
      const h = w * target.h / target.w;
      return [
        (1800 - w) * (1 + settings.offsetX / 100) / 2 + w * 0.65,
        (1200 - h) * (1 + settings.offsetY / 100) / 2 + h * 0.4,
      ];
    };
    const before = sourceAt({ scale: 1, offsetX: 0, offsetY: 0 });
    const after = sourceAt(s.activeTransform);
    assert.ok(Math.hypot(before[0] - after[0], before[1] - after[1]) < 0.01);
    s.zoomCrop(point, rect, { factor: 100 });
    assert.equal(s.activeTransform.scale, 3);
    s.zoomCrop(point, rect, { toggle: true });
    assert.equal(s.activeTransform.scale, 1);
    assert.equal(s.activeTransform.offsetX, 0);
  } finally { f.close(); }
});

test("personal strip uses only the six most recent real files and does not invent metadata", () => {
  const source = Array.from({ length: 9 }, (_, i) => ({
    ...photo,
    id: String(i),
    createdAt: 100 + i,
  }));
  source.push({ id: "fake", createdAt: 999 });
  assert.deepEqual(
    recentPhotos({ finished: source }).map((x) => x.id),
    ["8", "7", "6", "5", "4", "3"],
  );
  assert.equal(recentPhotos({ finished: source.slice(0, 2) }).length, 2);
  assert.deepEqual(photoFacts({}), []);
  assert.ok(
    !photoFacts({ ...photo, createdAt: "invalid" }).some(
      ([k]) => k === "制作时间",
    ),
  );
});

test("failed/cancelled payment retries the same order; paid snapshot stays read-only and appears in transaction center", async () => {
  const f = fixture();
  try {
    const s = f.s;
    s.open("payment");
    await s.pay("cancel");
    const id = s.orderId;
    assert.equal(f.orders.items.length, 1);
    assert.equal(s.order.status, "pending");
    assert.equal(s.view, "confirm");
    s.open("payment");
    await s.pay("failure");
    assert.equal(s.orderId, id);
    assert.equal(f.orders.items.length, 1);
    s.open("payment");
    await s.pay("success");
    assert.equal(s.orderId, id);
    assert.equal(s.order.status, "paid");
    assert.equal(s.order.total, 2000);
    assert.deepEqual(
      [s.order.price, s.order.shipping, s.order.material, s.order.size],
      [1000, 1000, "富士相纸", "六寸"],
    );
    assert.equal(s.view, "result");
    assert.equal(s.order.output, s.output);
    const list = normalizeOrders({ owner, keepsakes: f.orders.items });
    assert.equal(list.length, 1);
    assert.equal(list[0].type, "postcard");
    assert.equal(list[0].state, "paid");
    assert.equal(list[0].thumbnailBlob, s.output);
    assert.equal(list[0].fulfillment.id, "producing");
    assert.equal(list[0].quantity, undefined);
    assert.equal(list[0].resultURL, undefined);
  } finally {
    f.close();
  }
});

test("unknown payment blocks new work, restores original address snapshot and resolves without a second order", async () => {
  const f = fixture();
  try {
    const s = f.s;
    s.open("payment");
    await s.pay("unknown");
    const id = s.orderId;
    assert.equal(s.order.status, "verifying");
    s.close();
    f.library.addresses = [];
    assert.equal(s.address.street, "示例地址");
    assert.equal(
      s.canPay,
      true,
      "original query must not depend on current address book",
    );
    s.chooseTemplate("postcard-city");
    assert.equal(s.templateId, "postcard-enrollment");
    history.pushState({}, "", "/?page=home");
    s.close();
    await s.enter({
      kind: "postcard",
      returnTo: "/?page=home",
      photo: { ...photo, id: "other" },
    });
    assert.equal(s.orderId, id);
    assert.equal(s.photo.id, "source");
    assert.equal(s.panel, "resolution");
    assert.equal(f.orders.items.length, 1);
    s.resolution = "paid";
    await s.resolvePayment();
    assert.equal(s.order.status, "paid");
    assert.equal(s.view, "result");
    assert.equal(f.orders.items.length, 1);
  } finally {
    f.close();
  }
});

test("cashier failure and a confirmed unpaid query keep the same physical order when retrying", async () => {
  const f = fixture();
  const originalDocument = globalThis.document;
  globalThis.document = new EventTarget();
  try {
    const { s, orders } = f;
    s.demoOutcome = "unavailable";
    await s.requestPayment({ handoff: true });
    const orderId = s.order.id;
    assert.equal(s.order.status, "pending");

    s.demoOutcome = "unknown";
    const inCashier = s.requestPayment({ handoff: true });
    await new Promise((resolve) => setImmediate(resolve));
    const handoff = getStore("paymentHandoff");
    assert.equal(handoff.current.id, orderId);
    handoff.current.returnToApp();
    await inCashier;
    assert.equal(s.order.status, "verifying");
    await s.resolvePayment({ automatic: true });
    assert.equal(s.order.status, "verifying");
    s.checkoutResolution = "unpaid";
    await s.resolvePayment();
    assert.equal(s.order.status, "pending");

    s.demoOutcome = "success";
    const retry = s.requestPayment({ handoff: true });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(handoff.current.id, orderId);
    handoff.current.returnToApp();
    await retry;
    assert.equal(s.order.status, "paid");
    assert.equal(s.view, "result");
    assert.equal(orders.items.length, 1);
  } finally {
    globalThis.document = originalDocument;
    f.close();
  }
});

test("order center hides pending/unknown, shows explicit failure and refund facts for both new kinds", () => {
  const orders = ["postcard", "stamp"]
    .flatMap((kind) => [
      { owner, id: kind + "pending", kind, status: "pending" },
      { owner, id: kind + "unknown", kind, status: "verifying" },
      {
        owner,
        id: kind + "fail",
        kind,
        status: "pending",
        paymentResult: { status: "failed" },
      },
      {
        owner,
        id: kind + "refund",
        kind,
        status: "paid",
        refund: { status: "refunded" },
      },
    ])
    .map((o) => ({
      ...o,
      templateName: "模板",
      price: 1980,
      shipping: 1000,
      total: 2980,
      count: 1,
      unit: "张",
    }));
  const list = normalizeOrders({ owner, keepsakes: orders });
  assert.equal(list.length, 4);
  assert.deepEqual(
    new Set(list.map((x) => x.state)),
    new Set(["failed", "refunded"]),
  );
  assert.equal(
    normalizeOrders({ owner: "other", keepsakes: orders }).length,
    0,
  );
});

test("receipt confirmation requires own paid delivered product and does not fabricate shipping", async () => {
  const f = fixture();
  try {
    const s = f.s;
    s.open("payment");
    await s.pay("success");
    const id = s.orderId;
    await assert.rejects(confirmKeepsakeReceipt(id, owner), /尚未送达/);
    await assert.rejects(confirmKeepsakeReceipt(id, "other"), /重新登录/);
    f.orders.items[0].fulfillment = { status: "delivered" };
    await confirmKeepsakeReceipt(id, owner);
    assert.equal(s.order.fulfillment.status, "received");
    await confirmKeepsakeReceipt(id, owner);
    assert.equal(f.orders.items.length, 1);
  } finally {
    f.close();
  }
});

test("system back closes a sheet before leaving its page; storage failure never claims payment success", async () => {
  const f = fixture();
  try {
    const s = f.s;
    s.open("payment");
    const before = location.pathname + location.search;
    history.pushState({}, "", "/?page=home");
    window.dispatchEvent(new Event("popstate"));
    assert.equal(s.panel, null);
    assert.equal(location.pathname + location.search, before);
    f.orders.commit = async () => {
      throw Error("存储失败");
    };
    s.open("payment");
    await s.pay("success");
    assert.equal(s.view, "confirm");
    assert.equal(s.order, undefined);
    assert.equal(f.orders.items.length, 0);
    assert.match(s.error, /存储失败/);
    assert.equal(s.paying, false);
  } finally {
    f.close();
  }
});

test("address creation shares print validation and default-address behavior", async () => {
  const f = fixture();
  try {
    const s = f.s;
    s.open("addressEdit");
    s.addressFields = {
      name: "收件人",
      phone: "10000000000",
      region: "北京市朝阳区",
      street: "示例街道18号",
      postal: "",
      default: true,
    };
    await s.saveAddress();
    assert.equal(f.library.addresses.length, 1);
    assert.match(s.error, /手机号码/);
    s.addressFields.phone = owner;
    s.addressFields.region = "北京";
    await s.saveAddress();
    assert.equal(f.library.addresses.length, 1);
    assert.match(s.error, /省市区/);
    s.addressFields.region = "北京市朝阳区";
    s.addressFields.postal = "abc";
    await s.saveAddress();
    assert.equal(f.library.addresses.length, 1);
    assert.match(s.error, /邮政编码/);
    s.addressFields.postal = "100000";
    f.library.addresses[0].default = true;
    await s.saveAddress();
    assert.equal(f.library.addresses.length, 2);
    assert.equal(s.address.postal, "100000");
    assert.equal(f.library.addresses[0].default, false);
    assert.equal(s.panel, null);
  } finally {
    f.close();
  }
});

test("late generation cannot reopen confirmation after system Back within the same business", async () => {
  const f = fixture(),
    originalDocument = globalThis.document,
    originalFetch = globalThis.fetch,
    restoreReading = mockPhotoReading();
  f.s.previewFrame = { templateId: f.s.templateId, data: embeddedFrame(f.s.template) };
  let rendered = false;
  globalThis.document = {
    createElement() {
      return {
        getContext() {
          return {
            drawImage() {
              rendered = true;
            },
          };
        },
        toBlob(callback) {
          callback(new Blob(["finished PNG"], { type: "image/png" }));
        },
      };
    },
  };
  const frameUrl = frameArt(f.s.template);
  globalThis.fetch = async (url) => {
    assert.equal(url, frameUrl);
    return new Response(fs.readFileSync("public" + frameUrl), {
      headers: { "Content-Type": "image/png" },
    });
  };
  let finishDecode, signalDecode;
  const decoding = new Promise((resolve) => { signalDecode = resolve; });
  globalThis.Image = class {
    naturalWidth = 1800;
    naturalHeight = 1200;
    async decode() {
      const blob = await originalFetch(this.src).then((r) => r.blob());
      if (blob.type !== "image/svg+xml") return;
      const svg = await blob.text();
      assert.ok(svg.includes(embeddedFrame(f.s.template)));
      return new Promise((resolve) => {
        finishDecode = resolve;
        signalDecode();
      });
    }
  };
  try {
    const s = f.s;
    s.view = "work";
    history.replaceState({}, "", "/?page=keepsake&kind=postcard&view=work");
    s.release();
    const generation = s.confirm();
    assert.equal(s.busy, true);
    await Promise.race([decoding, generation]);
    assert.equal(typeof finishDecode, "function");
    history.pushState({}, "", "/?page=keepsake&kind=postcard&view=templates");
    window.dispatchEvent(new Event("popstate"));
    finishDecode();
    await generation;
    assert.equal(
      rendered,
      true,
      "generation actually finishes after navigation",
    );
    assert.equal(s.view, "work");
    assert.equal(s.busy, false);
    assert.equal(s.output, null);
    assert.equal(location.searchParams.get("view"), "work");
  } finally {
    restoreReading();
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
    f.close();
  }
});

test("paid business history returns to its frozen result, while a new entry starts a separate draft", async () => {
  const f = fixture();
  try {
    const s = f.s;
    s.open("payment");
    await s.pay("success");
    const paid = s.order,
      originalOutput = s.output,
      originalPhoto = s.photo;
    history.pushState(
      {},
      "",
      `/?page=keepsake&kind=postcard&view=work&order=${paid.id}`,
    );
    window.dispatchEvent(new Event("popstate"));
    assert.equal(s.view, "result");
    assert.equal(location.searchParams.get("view"), "result");
    const token = s.token;
    s.view = "work";
    await s.confirm();
    assert.equal(s.view, "result");
    assert.equal(s.token, token, "paid snapshots never start another render");
    s.chooseTemplate("postcard-city");
    s.setTransform({ scale: 2 });
    await s.startPhotoPreview({ ...photo, id: "new" }, "phone");
    s.open("addressEdit");
    assert.equal(s.panel, null);
    assert.equal(s.orderId, paid.id);
    assert.equal(s.templateId, "postcard-enrollment");
    assert.equal(s.output, originalOutput);
    assert.equal(s.photo, originalPhoto);
    await s.enter({ kind: "stamp", returnTo: "/?page=home" });
    assert.equal(s.kind, "stamp");
    assert.equal(s.view, "work");
    assert.equal(s.stampView, "inner");
    assert.equal(s.orderId, null);
    assert.equal(f.orders.items.length, 1);
    assert.equal(f.orders.items[0].output, originalOutput);
  } finally {
    f.close();
  }
});

test("stamp: independent rotations reach the order, proof gates payment and rejection refunds the same order", async () => {
  const f = fixture();
  const restore = mockPhotoReading();
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        getContext: () => ({ drawImage() {} }),
        toBlob: (done) => done(new Blob(["finished stamp"], { type: "image/png" })),
      };
    },
  };
  try {
    const { s, orders } = f;
    s.kind = "stamp";
    s.templateId = "stamp-youth";
    assert.equal(s.canPay, false);
    s.route("work", true);
    s.previewFrame = { templateId: s.templateId, data: embeddedFrame(s.template) };
    assert.equal(s.canContinue, true);
    const proof = new Blob(["sample ID"], { type: "image/jpeg" });
    await s.acceptProof(proof);
    assert.equal(s.studentProof, null);
    s.editComposition();
    s.turnPhoto(false);
    assert.equal(s.activeTransform.rotation, 270);
    assert.equal(s.cropDraft.corners.rotation, undefined);
    s.selectCropSlot("corners");
    s.setTransform({ scale: 2, offsetX: 24, offsetY: -4 });
    s.turnPhoto(true);
    assert.equal(s.activeTransform.rotation, 90);
    assert.equal(s.cropDraft.center.rotation, 270);
    s.resetTransform();
    assert.equal(s.activeTransform.rotation, undefined);
    assert.equal(s.cropDraft.center.rotation, 270);
    s.setTransform({ scale: 2, offsetX: 24, offsetY: -4 });
    s.turnPhoto(true);
    s.close();
    assert.equal(s.composition.center.scale, 1);
    assert.equal(s.composition.corners.scale, 2);
    s.editComposition();
    assert.equal(s.activeTransform.rotation, 270);
    s.selectCropSlot("corners");
    assert.equal(s.activeTransform.rotation, 90);
    await s.confirm();
    assert.equal(s.view, "confirm");
    assert.equal(s.canPay, false);
    await s.acceptProof(proof);
    assert.equal(s.canPay, true);
    const firstURL = s.studentProofURL;
    assert.equal(resolveObjectURL(firstURL)?.size, proof.size);

    await s.back();
    assert.equal(s.view, "work");
    assert.equal(s.panel, "keepsakeCrop");
    assert.equal(s.studentProofURL, firstURL);
    assert.equal(s.composition.corners.rotation, 90);
    await s.confirm();
    assert.equal(s.view, "confirm");
    assert.equal(s.canPay, true);

    s.open("payment");
    await s.pay("cancel");
    const orderId = s.orderId;
    const replacement = new Blob(["replacement ID"], { type: "image/png" });
    await s.acceptProof(new Blob(["invalid"], { type: "text/plain" }));
    assert.match(s.proofError, /JPG/);
    assert.equal(s.studentProof, proof);
    assert.equal(s.studentProofURL, firstURL);
    await s.acceptProof(replacement);
    const replacementURL = s.studentProofURL;
    assert.equal(s.orderId, orderId);
    assert.equal(s.order.studentProof, replacement);
    assert.equal(s.proofError, "");
    assert.equal(resolveObjectURL(firstURL), undefined);
    assert.equal(resolveObjectURL(replacementURL)?.size, replacement.size);

    s.open("payment");
    await s.pay("unknown");
    assert.equal(s.orderId, orderId);
    await s.acceptProof(proof);
    assert.equal(s.studentProof, replacement);
    assert.equal(s.canPay, true, "the locked order can still be queried");
    s.resolution = "paid";
    await s.resolvePayment();
    assert.equal(s.order.transform.rotation, 270);
    assert.equal(s.order.cornerTransform.rotation, 90);
    assert.equal(s.order.price, 5900);
    assert.equal(s.order.shipping, 1000);
    assert.equal(s.order.total, 6900);
    assert.equal(s.order.review, "pending");
    assert.equal(s.order.fulfillment, null);
    assert.equal(
      normalizeOrders({ owner, keepsakes: orders.items })[0].fulfillment,
      null,
    );
    await s.demoReview("rejected");
    const refund = { ...s.order.refund };
    assert.equal(s.order.review, "rejected");
    assert.equal(refund.status, "refunding");
    assert.equal(refund.amount, s.order.total);
    assert.equal(refund.method, "original");
    assert.ok(s.order.cancelledAt);
    assert.equal(s.order.studentProof, undefined);
    assert.equal(s.studentProofURL, "");
    assert.equal(resolveObjectURL(replacementURL), undefined);
    await s.demoReview("approved");
    assert.deepEqual({ ...s.order.refund }, refund);
    s.order.refund.demoDueAt = Date.now() - 1;
    orders.scheduleRefunds();
    await new Promise((resolve) => setTimeout(resolve, 310));
    clearTimeout(orders.refundTimer);
    assert.equal(s.order.refund.status, "refunded");
    assert.equal(orders.items.length, 1);
  } finally {
    globalThis.document = originalDocument;
    restore();
    f.close();
  }
});
test("direct payment entry points still require address and proof on a new stamp order", async () => {
  const f = fixture(), { s, orders } = f;
  try {
    s.kind = "stamp";
    s.templateId = "stamp-youth";
    s.route("confirm", true);
    s.addressId = null;
    assert.equal(s.canPay, false);
    await s.requestPayment({ handoff: true });
    await s.pay("success", { handoff: true });
    assert.equal(orders.items.length, 0);
    assert.equal(s.panel, null);

    s.addressId = "address";
    assert.equal(s.canPay, false);
    await s.requestPayment({ handoff: true });
    await s.pay("success", { handoff: true });
    assert.equal(orders.items.length, 0);
    assert.equal(s.panel, null);

    s.setStudentProof(new Blob(["sample proof"], { type: "image/jpeg" }));
    assert.equal(s.canPay, true);
  } finally {
    f.close();
  }
});

test("student proof URLs are scoped to the current account and released on destroy", async () => {
  const f = fixture(), { s } = f;
  const restore = mockPhotoReading();
  try {
    s.kind = "stamp";
    s.templateId = "stamp-youth";
    s.route("confirm", true);
    const proof = new Blob(["sample ID"], { type: "image/jpeg" });
    await s.acceptProof(proof);
    const firstURL = s.studentProofURL;
    assert.ok(resolveObjectURL(firstURL));
    getStore("account").session = { phone: "13900008000" };
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(s.studentProof, null);
    assert.equal(s.studentProofURL, "");
    assert.equal(resolveObjectURL(firstURL), undefined);

    s.setStudentProof(proof);
    const secondURL = s.studentProofURL;
    s.destroy();
    assert.equal(resolveObjectURL(secondURL), undefined);
  } finally {
    restore();
    f.close();
  }
});

test("an in-flight proof read cannot overwrite another stamp order's proof", async () => {
  const f = fixture(), { s, orders } = f;
  const restore = mockPhotoReading();
  let finishRead;
  const reading = new Promise((resolve) => { finishRead = resolve; });
  globalThis.Image = class extends globalThis.Image {
    decode() { return reading; }
  };
  try {
    s.kind = "stamp";
    s.templateId = "stamp-youth";
    s.route("confirm", true);
    const upload = s.acceptProof(new Blob(["first checkout"], { type: "image/jpeg" }));
    assert.equal(s.proofReading, true);
    const savedProof = new Blob(["stored checkout"], { type: "image/png" });
    orders.items = [{
      id: "other-stamp",
      kind: "stamp",
      owner,
      status: "pending",
      templateId: "stamp-youth",
      studentProof: savedProof,
      photo,
      output: new Blob(["stored stamp"], { type: "image/png" }),
    }];
    history.pushState({}, "", "/?page=keepsake&kind=stamp&view=confirm&order=other-stamp");
    window.dispatchEvent(new Event("popstate"));
    assert.equal(s.orderId, "other-stamp");
    assert.equal(s.studentProof, savedProof);
    finishRead();
    await upload;
    assert.equal(s.studentProof, savedProof);
    assert.equal(resolveObjectURL(s.studentProofURL)?.size, savedProof.size);
    assert.equal(s.proofReading, false);
  } finally {
    finishRead();
    restore();
    f.close();
  }
});

test("approved stamp advances to production only after payment and approval", async () => {
  const f = fixture();
  try {
    const { s } = f;
    s.kind = "stamp";
    s.templateId = "stamp-youth";
    s.studentProof = new Blob(["ID"]);
    s.open("payment");
    await s.pay("success");
    assert.equal(s.order.review, "pending");
    await s.demoReview("approved");
    assert.equal(s.order.fulfillment.status, "producing");
    assert.equal(s.order.studentProof, undefined);
    assert.equal(s.order.refund, undefined);
  } finally {
    f.close();
  }
});

test("physical stamp retains its fixed designs and crops center independently of all four corners", () => {
  const template = KEEPSAKE_TEMPLATES.find((t) => t.kind === "stamp"),
    geo = templateGeometry(template);
  const frame =
    "data:image/jpeg;base64," +
    fs
      .readFileSync("public/assets/keepsakes/stamp-frame.jpg")
      .toString("base64");
  const sample = new PNG({ width: 120, height: 80 });
  for (let y = 0; y < 80; y++)
    for (let x = 0; x < 120; x++)
      sample.data.set(
        x < 60 ? [240, 32, 50, 255] : [20, 54, 225, 255],
        (y * 120 + x) * 4,
      );
  const source = {
    width: 120,
    height: 80,
    data: "data:image/png;base64," + PNG.sync.write(sample).toString("base64"),
  };
  const composition = {
    center: { scale: 2, offsetX: -90 },
    corners: { scale: 2, offsetX: 90 },
  };
  const raster = (s) => PNG.sync.read(new Resvg(s).render().asPng());
  const out = raster(
    keepsakeSVG(template, source, composition, "test-print", frame),
  );
  const pane = raster(
    keepsakeSVG(template, source, composition, "editor", frame, STAMP_PANE),
  );
  assert.equal(pane.width, STAMP_PANE.width);
  assert.equal(pane.height, STAMP_PANE.height);
  for (let y = 0; y < pane.height; y++) {
    const start = ((y + STAMP_PANE.y) * out.width + STAMP_PANE.x) * 4;
    assert.deepEqual(
      pane.data.subarray(y * pane.width * 4, (y + 1) * pane.width * 4),
      out.data.subarray(start, start + pane.width * 4),
    );
  }
  const baseline = raster(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720"><image href="${frame}" width="960" height="720"/></svg>`,
  );
  const pixel = (im, x, y) => [
    ...im.data.subarray((y * im.width + x) * 4, (y * im.width + x) * 4 + 4),
  ];
  for (const s of geo.slots)
    assert.deepEqual(
      pixel(out, Math.floor(s.x + s.w / 2), Math.floor(s.y + s.h / 2)),
      s.group === "center" ? [240, 32, 50, 255] : [20, 54, 225, 255],
    );
  assert.deepEqual(pixel(out, 501, 200), pixel(baseline, 501, 200));

  const rotatedComposition = { center: { rotation: 90 }, corners: { rotation: 270 } };
  const rotatedPrint = raster(keepsakeSVG(template, source, rotatedComposition, "rotated-print", frame));
  const rotatedPreview = raster(keepsakeSVG(template, source, rotatedComposition, "rotated-editor", frame, STAMP_PANE));
  for (const slot of geo.slots) {
    const x = Math.floor(slot.x + slot.w / 2);
    const upper = Math.floor(slot.y + slot.h * 0.2);
    const lower = Math.floor(slot.y + slot.h * 0.8);
    const red = [240, 32, 50, 255];
    const blue = [20, 54, 225, 255];
    const [upperColor, lowerColor] = slot.group === "center" ? [red, blue] : [blue, red];
    for (const [y, expected] of [[upper, upperColor], [lower, lowerColor]]) {
      assert.deepEqual(pixel(rotatedPrint, x, y), expected);
      assert.deepEqual(pixel(rotatedPreview, x - STAMP_PANE.x, y - STAMP_PANE.y), expected);
    }
  }
  assert.deepEqual(pixel(rotatedPrint, 501, 200), pixel(baseline, 501, 200));
  assert.equal(pixel(out, 501, 200)[3], 255);
});

test("stamp browser Back retains edits and dragging targets the cropped pane", () => {
  const f = fixture();
  try {
    const { s } = f;
    s.kind = "stamp";
    s.templateId = "stamp-youth";
    s.route("work", true);
    const product = location.href;
    const originalOutput = s.output;
    const proof = new Blob(["proof"]);
    s.studentProof = proof;
    // Model the extra same-URL history entry used by a native back gesture.
    history.pushState = (state, _, url) => {
      history.state = state;
      globalThis.location = new URL(url, product);
    };
    history.back = () => {
      history.state = null;
      window.dispatchEvent(new Event("popstate"));
    };
    s.editComposition();
    assert.ok(history.state.keepsakeCrop);
    s.setTransform({ scale: 2, offsetX: 12 });
    assert.equal(s.transform.scale, 1);
    assert.equal(s.output, originalOutput);
    history.back();
    assert.equal(location.href, product);
    assert.equal(s.panel, null);
    assert.equal(s.cropDraft, null);
    assert.equal(s.transform.scale, 2);
    s.editComposition();
    const target = {
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: STAMP_PANE.width / 2,
        height: STAMP_PANE.height / 2,
      }),
      setPointerCapture() {},
    };
    const grab = {
      currentTarget: target,
      pointerId: 7,
      clientX: 30,
      clientY: 40,
    };
    s.pointerDown(grab);
    assert.equal(s.activeSlot, "corners");
    s.setTransform({ scale: 2, offsetX: -25 });
    s.pointerUp(grab);
    s.activeSlot = "center";
    s.setTransform({ scale: 1.4, offsetX: 10 });
    s.resetTransform();
    assert.equal(s.cropDraft.corners.scale, 2);
    s.close();
    assert.equal(s.panel, null);
    assert.equal(s.cornerTransform.offsetX, -25);
    assert.equal(s.transform.scale, 1);
    assert.equal(s.studentProof, proof);
    assert.equal(s.output, null);
    s.editComposition();
    s.setTransform({ scale: 2.5 });
    s.close();
    assert.equal(s.transform.scale, 2.5);
    assert.equal(s.cornerTransform.offsetX, -25);
    assert.equal(location.href, product);
  } finally {
    f.close();
  }
});

test("editing a returned unpaid stamp keeps its old quote until the user commits a changed composition", async () => {
  const f = fixture();
  const restore = mockPhotoReading();
  try {
    const { s, orders } = f;
    orders.items = [
      {
        id: "old-stamp",
        owner,
        kind: "stamp",
        templateId: "stamp-youth",
        status: "pending",
        photo,
        studentProof: new Blob(["proof"]),
        output: new Blob(["old paper"]),
        price: 2980,
        shipping: 1000,
        total: 3980,
      },
    ];
    const previous = "/?page=keepsake&kind=stamp&view=work&order=old-stamp";
    history.replaceState({}, "", previous);
    s.sync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(s.image);
    assert.equal(s.total, 3980);
    const replaceState = history.replaceState.bind(history);
    history.pushState = (state, _, url) => {
      history.state = state;
      globalThis.location = new URL(url, location.origin);
    };
    history.replaceState = (state, _, url) => {
      history.state = state;
      replaceState(state, "", url);
    };
    history.back = () => {
      history.state = null;
      window.dispatchEvent(new Event("popstate"));
    };
    s.editComposition();
    s.close();
    assert.equal(s.total, 3980);
    s.editComposition();
    s.setTransform({ scale: 2 });
    s.close();
    assert.equal(s.transform.scale, 2);
    assert.equal(location.searchParams.has("order"), false);
    assert.equal(s.orderId, null);
    assert.equal(s.total, 6900);
    assert.equal(orders.items[0].total, 3980);
  } finally {
    restore();
    f.close();
  }
});

test("postcard keeps composition when leaving the preview and restores it on reopening", () => {
  const f = fixture();
  try {
    const s = f.s;
    s.route("work", true);
    s.editComposition();
    const copy = { scale: 1.8, offsetX: 12, offsetY: 18 };
    s.setTransform(copy);
    assert.equal(s.transform.scale, 1);
    assert.equal(s.cropDraft.center.scale, 1.8);
    s.back();
    assert.equal(s.panel, null);
    assert.deepEqual({ ...s.transform }, copy);
    s.editComposition();
    assert.deepEqual({ ...s.activeTransform }, copy);
    s.resetTransform();
    s.close();
    assert.equal(s.transform.scale, 1);
    assert.equal(s.output, null);
  } finally { f.close(); }
});

test("postcard rotation survives closing and invalidates the previous output", () => {
  const f = fixture(), { s } = f;
  try {
    s.route("work", true);
    s.editComposition();
    s.turnPhoto(false);
    assert.equal(s.activeTransform.rotation, 270);
    s.close();
    assert.equal(s.transform.rotation, 270);
    assert.equal(s.output, null);
    s.editComposition();
    s.turnPhoto(true);
    s.close();
    assert.equal(s.transform.rotation || 0, 0);
    s.editComposition();
    s.turnPhoto(true);
    s.resetTransform();
    s.close();
    assert.equal(s.transform.rotation || 0, 0);
  } finally { f.close(); }
});

test("quarter turns rotate the rectangular photo in place, fill the window and leave the template artwork stationary", () => {
  // Sample the four corners of an asymmetric image through the same SVG used for export.
  const colors=[[240,0,0,255],[0,160,0,255],[0,0,220,255],[235,180,0,255]];
  const image=new PNG({width:40,height:24});
  for(let y=0;y<24;y++) for(let x=0;x<40;x++)
    image.data.set(colors[(x>=20?1:0)+(y>=12?2:0)],(y*40+x)*4);
  const source={data:"data:image/png;base64,"+PNG.sync.write(image).toString("base64"),width:40,height:24};
  const template=KEEPSAKE_TEMPLATES[0],slot=templateGeometry(template).slots[0];
  const frame = embeddedFrame(template);
  let stationaryPixel;
  for(const [rotation,expected] of [[0,[0,1,2,3]],[90,[2,0,3,1]],[180,[3,2,1,0]],[270,[1,3,0,2]]]) {
    const png=PNG.sync.read(new Resvg(keepsakeSVG(template,source,{rotation},"test",frame)).render().asPng());
    const get=(x,y)=>[...png.data.subarray((y*png.width+x)*4,(y*png.width+x)*4+4)];
    for(const [i,[rx,ry]] of [[.02,.02],[.98,.02],[.02,.98],[.98,.98]].entries()) {
      assert.deepEqual(get(Math.round(slot.x+rx*slot.w),Math.round(slot.y+ry*slot.h)),colors[expected[i]],rotation+" degrees, corner "+i);
    }
    const paperPixel=get(1510,720);
    if(stationaryPixel) assert.deepEqual(paperPixel,stationaryPixel);
    stationaryPixel=paperPixel;
  }
});
