// Domain, canvas-contract and source rendering checks; no browser/UI automation.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  createController,
  getStore,
  registerStore,
  storageValue,
} from "../src/runtime/state.js";

globalThis.location = new URL(
  "http://127.0.0.1:4180/?page=tool&tool=repair&view=work",
);
globalThis.window = new EventTarget();
await import("../src/domain/tools.js");
const owner = "13800008000";
registerStore("account", { session: { phone: owner } });
const sourcePixels = Array.from({ length: 9 }, (_, i) =>
  i === 4 ? [180, 80, 60, 255] : [40, 100, 160, 255],
).flat();
const source = new Blob(
  [JSON.stringify({ width: 3, height: 3, pixels: sourcePixels })],
  { type: "image/jpeg" },
);
const photo = {
  id: "input",
  blob: source,
  width: 3,
  height: 3,
  type: "image/jpeg",
  spec: "原照片规格",
};
const urls = new Map();
const nativeCreate = URL.createObjectURL,
  nativeRevoke = URL.revokeObjectURL;
URL.createObjectURL = (blob) => {
  const url = nativeCreate(blob);
  urls.set(url, blob);
  return url;
};
URL.revokeObjectURL = (url) => {
  urls.delete(url);
  nativeRevoke(url);
};
let failDecode = false,
  failSave = false,
  imageDecodes = 0;
globalThis.Image = class {
  async decode() {
    imageDecodes++;
    if (failDecode) throw Error("mock image failure");
    const data = JSON.parse(await urls.get(this.src).text());
    this.naturalWidth = data.width;
    this.naturalHeight = data.height;
    this.pixels = data.pixels;
  }
};
globalThis.document = {
  createElement() {
    const canvas = { width: 0, height: 0, pixels: null };
    const context = {
      fillRect() {},
      drawImage(image) {
        canvas.pixels = new Uint8ClampedArray(image.pixels);
      },
      getImageData() {
        return { data: new Uint8ClampedArray(canvas.pixels) };
      },
      putImageData(image) {
        canvas.pixels = image.data;
      },
    };
    canvas.getContext = () => context;
    canvas.toBlob = (cb, type) =>
      cb(
        new Blob(
          [
            JSON.stringify({
              width: canvas.width,
              height: canvas.height,
              pixels: [...canvas.pixels],
            }),
          ],
          { type },
        ),
      );
    return canvas;
  },
};
const orders = getStore("toolOrders"),
  library = getStore("photoLibrary");
orders.ready = true;
orders.loading = Promise.resolve();
orders.commit = async (mutate) => {
  const next = storageValue(orders.items);
  mutate(next);
  orders.items = next;
};
library.ready = true;
library.busy = false;
library.snapshot = () => ({
  finished: library.finished.slice(),
  archivedOriginals: [],
});
library.commit = async (next) => {
  if (failSave) throw Error("mock save failure");
  library.finished = next.finished;
};
function studio() {
  orders.items = [];
  orders.busy = false;
  library.finished = [];
  failDecode = false;
  failSave = false;
  const s = createController("toolStudio", [], { page: "tool" }).scope;
  s.action = "repair";
  s.photo = photo;
  s.sourceKind = "phone";
  s.sourceURL = URL.createObjectURL(source);
  s.stage = "ready";
  s.portraitCheck = { status: "passed", reasons: [] };
  s.route = (view) => {
    s.view = view;
  };
  s.openPanel = (panel) => {
    s.panel = panel;
  };
  s.closePanel = () => {
    s.panel = null;
  };
  s.validatePortraitPhoto = async () => {
    s.portraitCheck = { status: "passed", reasons: [] };
  };
  return s;
}
after(() => {
  for (const url of urls.keys()) nativeRevoke(url);
  URL.createObjectURL = nativeCreate;
  URL.revokeObjectURL = nativeRevoke;
});

test("fresh repair requires an explicit valid color at UI, payment and processing gates", async () => {
  const s = studio();
  assert.equal(s.config.steps[1], "照片精修");
  assert.equal(s.step, 1);
  assert.equal(
    s.background,
    "blue",
    "independent background-tool default remains separate",
  );
  assert.equal(s.repairColor, null);
  assert.equal(s.primaryEnabled, false);
  await s.openPayment();
  await s.pay();
  await s.runService();
  assert.equal(s.panel, null);
  assert.equal(orders.items.length, 0);
  assert.equal(s.output, null);
  s.selectRepairBackground("not-a-color");
  assert.equal(s.repairColor, null);
  s.selectRepairBackground("white");
  assert.equal(s.primaryEnabled, true);
  assert.equal(s.output, null, "selecting color does not generate a preview");
  assert.equal(s.sourceURL && s.photo.blob, source);
});

test("previous/same photo preserves selection, new photo clears it and checks again", async () => {
  const s = studio();
  s.selectRepairBackground("gray");
  s.previousStep();
  assert.equal(s.step, 0);
  assert.equal(s.primaryEnabled, true);
  await s.primary();
  assert.equal(s.step, 1);
  assert.equal(s.repairColor.id, "gray");
  await s.accept({ photo, kind: "phone", context: { action: "repair" } });
  assert.equal(s.repairColor.id, "gray");
  await s.accept({
    photo: { ...photo, id: "another" },
    kind: "phone",
    context: { action: "repair" },
  });
  assert.equal(s.repairColor, null);
  assert.equal(s.primaryEnabled, false);
  assert.equal(s.output, null);
  assert.equal(s.orderId, null);
});

test("cancel/change/retry keeps one order; chosen color reaches output, receipt and completion", async () => {
  const s = studio();
  s.selectRepairBackground("white");
  s.paymentOutcome = "cancel";
  await s.pay();
  const id = s.orderId;
  assert.ok(id);
  assert.equal(s.repairColor.id, "white");
  assert.equal(s.paid, false);
  assert.equal(s.output, null);
  assert.equal(orders.items[0].purchaseSnapshot.backgroundName, "白色");
  s.selectRepairBackground("red");
  s.paymentOutcome = "success";
  await s.pay();
  assert.equal(s.orderId, id);
  assert.equal(orders.items.length, 1);
  assert.equal(orders.items[0].amount, 200);
  assert.equal(orders.items[0].repairBackground.id, "red");
  assert.equal(orders.items[0].purchaseSnapshot.backgroundName, "红色");
  assert.equal(s.view, "saved");
  assert.equal(library.finished.length, 1);
  assert.equal(s.resultSummary, "照片精修 · 红色背景");
  const decoded = JSON.parse(await s.output.text());
  assert.deepEqual(decoded.pixels.slice(0, 4), [214, 56, 61, 255]);
  assert.deepEqual(
    decoded.pixels.slice(16, 20),
    [180, 80, 60, 255],
    "edge replacement preserves foreground",
  );
  assert.deepEqual([decoded.width, decoded.height], [3, 3]);
  assert.equal(s.output.type, "image/jpeg");
  assert.equal(
    await source.text(),
    JSON.stringify({ width: 3, height: 3, pixels: sourcePixels }),
    "source stays unchanged",
  );
  s.selectRepairBackground("blue");
  assert.equal(s.repairColor.id, "red");
  s.repairBackgroundId = "blue";
  assert.equal(
    s.repairColor.id,
    "red",
    "paid snapshot overrides mutable local setting",
  );
  await s.pay();
  assert.equal(orders.items.length, 1);
});

test("paid processing failure retries the original color without another charge", async () => {
  const s = studio();
  s.selectRepairBackground("gray");
  failDecode = true;
  await s.pay();
  assert.equal(s.paid, true);
  assert.equal(s.serviceApplied, false);
  assert.match(s.error, /保留/);
  const id = s.orderId;
  s.selectRepairBackground("red");
  assert.equal(s.repairColor.id, "gray");
  failDecode = false;
  await s.primary();
  assert.equal(s.view, "saved");
  assert.equal(s.orderId, id);
  assert.equal(orders.items.length, 1);
  assert.deepEqual(
    JSON.parse(await s.output.text()).pixels.slice(0, 3),
    [217, 224, 232],
  );
});

test("two concurrent first-payment submissions create only one order and output", async () => {
  const s = studio();
  s.selectRepairBackground("white");
  await Promise.all([s.pay(), s.pay()]);
  assert.equal(orders.items.length, 1);
  assert.equal(library.finished.length, 1);
  assert.equal(s.view, "saved");
  assert.equal(s.error, "");
  assert.equal(orders.items[0].repairBackground.id, "white");
});

test("save retry reuses output and its selected color without another processing pass", async () => {
  const s = studio();
  s.selectRepairBackground("blue");
  failSave = true;
  await s.pay();
  assert.equal(s.saveFailed, true);
  assert.equal(s.primaryLabel, "重试保存");
  const output = s.output,
    decodes = imageDecodes,
    id = s.orderId;
  failSave = false;
  await s.primary();
  assert.equal(s.output, output);
  assert.equal(imageDecodes, decodes);
  assert.equal(s.orderId, id);
  assert.equal(orders.items.length, 1);
  assert.equal(library.finished.length, 1);
  assert.equal(s.view, "saved");
});

test("restoring a paid output retains its captured color and never invents a historical one", async () => {
  const s = studio();
  s.selectRepairBackground("white");
  await s.pay();
  const captured = orders.items[0];
  s.reset();
  await s.resumeOrder(captured);
  assert.equal(s.view, "saved");
  assert.equal(s.repairColor.name, "白色");
  assert.equal(s.resultSummary, "照片精修 · 白色背景");
  const old = { ...storageValue(captured), id: "legacy", savedId: null };
  delete old.repairBackground;
  delete old.purchaseSnapshot.backgroundName;
  orders.items = [old];
  s.reset();
  await s.resumeOrder(old);
  assert.equal(s.repairColor, null);
  assert.equal(s.resultSummary, "照片精修");
  assert.equal(s.output, old.output);
  assert.equal(s.view, "saved");
  assert.equal(old.repairBackground, undefined);
  assert.equal(s.repairOptionsReady, true);
});

test("verifying settings are locked; resuming an unpaid legacy order requires a color first", async () => {
  const s = studio();
  orders.items = [
    {
      id: "uncertain",
      owner,
      action: "repair",
      status: "verifying",
      photo,
      repairBackground: { id: "white", name: "白色", value: "#ffffff" },
    },
  ];
  s.orderId = "uncertain";
  s.selectRepairBackground("red");
  assert.equal(s.repairColor.id, "white");
  assert.equal(s.repairSettingsLocked, true);
  const pending = {
    id: "old-unpaid",
    owner,
    action: "repair",
    status: "pending",
    photo,
    amount: 200,
    sourceKind: "phone",
  };
  orders.items = [pending];
  s.reset();
  await s.resumeOrder(pending);
  assert.equal(s.step, 1);
  assert.equal(s.repairColor, null);
  assert.equal(s.panel, null);
  assert.equal(s.primaryEnabled, false);
  s.selectRepairBackground("red");
  assert.equal(s.primaryEnabled, true);
});

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
after(() => server.close());
const { default: Options } = await server.ssrLoadModule(
  "/src/components/RepairBackgroundOptions.jsx",
);
test("background control exposes four named native radios, no default and one selected state", () => {
  const s = studio();
  const render = (color, disabled = false) =>
    renderToStaticMarkup(
      React.createElement(Options, {
        colors: s.colors,
        color,
        disabled,
        onChange() {},
      }),
    );
  let html = render(null);
  assert.equal((html.match(/type="radio"/g) || []).length, 4);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /请选择一种/);
  assert.match(html, /aria-required="true"/);
  for (const name of ["蓝色", "白色", "红色", "浅灰"])
    assert.match(html, new RegExp(name));
  html = render(s.colors[1]);
  assert.equal((html.match(/checked=""/g) || []).length, 1);
  assert.match(html, /已选：白色/);
  assert.equal(
    (render(s.colors[1], true).match(/disabled=""/g) || []).length,
    4,
  );
});
