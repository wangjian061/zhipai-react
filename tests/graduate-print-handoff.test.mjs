import test from "node:test";
import assert from "node:assert/strict";
import { createController, getStore, registerStore, storageValue } from "../src/runtime/state.js";
import { graduatePrintPath, graduateCropReady, goGraduate } from "../src/domain/graduate-print.js";
import { normalizeOrders } from "../src/domain/orders.js";

const owner = "existing-owner";
const address = { name: "测试收件人", phone: "13800000000", region: "测试省测试市", street: "测试地址一号楼" };
const jpg = new Blob(["test-photo"], { type: "image/jpeg" });
const wait = () => new Promise(resolve => setTimeout(resolve, 8));
function photos(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: prefix + index, source: { name: prefix + index, blob: jpg, width: 1200, height: 1800 },
    crop: { orientation: "portrait", scale: 1.25, offsetX: 4, offsetY: 7 },
    output: { width: 1200, height: 1800, blob: jpg },
  }));
}
function setup(status, count = 12) {
  let entries = [{ path: graduatePrintPath, state: {} }], cursor = 0;
  globalThis.window = new EventTarget();
  Object.defineProperty(globalThis, "location", { configurable: true,
    get: () => new URL(entries[cursor].path, "http://localhost") });
  globalThis.history = {
    get state() { return entries[cursor].state; },
    get length() { return entries.length; },
    pushState(state, _, path) { entries.splice(++cursor, Infinity, { path, state }); },
    replaceState(state, _, path) { entries[cursor] = { path, state }; },
    back() { if (cursor > 0) { cursor--; window.dispatchEvent(new Event("popstate")); } },
  };
  const old = photos("original-", 10);
  registerStore("account", { session: null });
  registerStore("printLibrary", {
    ready: true, orders: status ? [{ owner, id: "old", kind: "graduate", status, address: { ...address, name: "原单收件人" },
      quantity: 10, total: 7000, base: 600, shipping: 1000, photo: old[0].output, graduatePhotos: old.map(p => p.output) }] : [],
    graduateDrafts: { [owner]: { orderId: status ? "old" : null, photos: old, address: {} },
      guest: { orderId: null, photos: photos("guest-", count), address: {} } },
    fail: false,
    async commit(update) {
      const next = storageValue({ graduateDrafts: this.graduateDrafts, orders: this.orders });
      update(next);
      if (this.fail) throw Error("storage unavailable");
      Object.assign(this, next);
    },
  });
  const instance = createController("graduatePrint");
  instance.start();
  return { s: instance.scope, store: getStore("printLibrary"), instance };
}
for (const status of ["pending", "verifying"]) test("guest login preserves both selections with a " + status + " order", async () => {
  const { s, store, instance } = setup(status);
  try {
    s.confirm();
    s.fields = { ...address };
    s.requestPayment();
    await wait();
    assert.equal(location.searchParams.get("page"), "account");
    const back = location.searchParams.get("back");
    getStore("account").session = { phone: owner };
    goGraduate(back, true);
    await wait();
    assert.equal(s.panel, "guestChoice");
    assert.equal(s.guestDraft.photos.length, 12);
    assert.equal(location.searchParams.get("order"), null);
    assert.equal(s.editable, false);
    const originalOrder = storageValue(store.orders[0]);
    s.panel = "";
    await s.adoptGuest();
    assert.equal(s.panel, "guestChoice");
    s.viewGuestOrder();
    assert.equal(location.searchParams.get("order"), "old");
    assert.equal(s.order.total, 7000);
    assert.equal(s.fields.name, originalOrder.address.name);
    assert.equal(s.guestDraft.photos.length, 12);
    await s.back();
    assert.equal(s.panel, "guestChoice");
    store.fail = true;
    await s.adoptGuest(true);
    assert.match(s.error, /草稿.*重试/);
    assert.equal(s.draft.orderId, "old");
    assert.equal(s.guestDraft.photos.length, 12);
    store.fail = false;
    await s.adoptGuest(true);
    assert.equal(s.view, "confirm");
    assert.equal(location.searchParams.get("guest"), null);
    assert.equal(s.draft.orderId, null);
    assert.equal(s.guestDraft, undefined);
    assert.equal(s.fields.name, address.name);
    assert.equal(s.quote.total, 8200);
    assert.equal(s.waiting.length, 0);
    assert.deepEqual(s.photos.map(p => p.id), photos("guest-", 12).map(p => p.id));
    assert.equal(s.photos[0].crop.offsetY, 7);
    assert.deepEqual(storageValue(store.orders[0]), originalOrder);
    const [entry] = normalizeOrders({ owner, print: store.orders });
    assert.equal(entry.amount, 7000);
    goGraduate(entry.checkoutPath);
    assert.equal(s.order.status, status);
    assert.equal(s.order.graduatePhotos.length, 10);
    await s.back();
    assert.equal(s.quote.total, 8200);
    // Finishing the older order later must not erase the independent new working draft.
    store.orders[0].paidAt = "2026-11-26T08:00:00Z";
    goGraduate(graduatePrintPath + "&print=complete&order=old");
    await s.restart();
    assert.equal(s.photos.length, 12);
  } finally { instance.stop(); }
});

test("guest login merges an unbound draft and isolates another account's order", async () => {
  const { s, store, instance } = setup(null, 2);
  try {
    s.loginForAlbum();
    const back = location.searchParams.get("back");
    getStore("account").session = { phone: owner };
    store.orders.push({ owner: "different", id: "old", kind: "graduate", status: "pending" });
    goGraduate(back, true);
    await wait();
    assert.equal(s.view, "work");
    assert.equal(s.panel, "");
    assert.equal(s.photos.length, 12);
    assert.equal(s.photos.at(-1).id, "guest-1");
    assert.equal(s.guestDraft, undefined);
    assert.equal(s.order, undefined);
    assert.equal(store.orders[0].owner, "different");
  } finally { instance.stop(); }
});

test("checkout explains remaining crops before opening the first, then continues until checkout and Back", async t => {
  const { s, store, instance } = setup(null, 10);
  t.after(() => instance.stop());
  const pending = [1, 4];
  for (const i of pending) {
    store.graduateDrafts.guest.photos[i].crop = null;
    store.graduateDrafts.guest.photos[i].output = null;
  }
  const encodings = [];
  const oldImage = globalThis.Image, oldDocument = globalThis.document;
  globalThis.Image = class { naturalWidth = 1200; naturalHeight = 1800; async decode() {} };
  globalThis.document = { createElement() { return {
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toBlob(done) { encodings.push([this.width, this.height]); done(jpg); },
  }; } };
  t.after(() => { globalThis.Image = oldImage; globalThis.document = oldDocument; });
  let located;
  instance.refs["photo-guest-1"] = { scrollIntoView(options) { located = options.block; } };
  s.confirm();
  assert.match(s.cropNotice, /还有 2 张照片待裁剪为 6 寸/);
  assert.equal(s.panel, "");
  await wait();
  assert.equal(located, "nearest");
  assert.equal(s.highlight, "guest-1");
  assert.equal(s.cropId, "guest-1");
  assert.equal(s.panel, "crop");
  s.changeCrop({ orientation: "landscape", scale: 1.3, offsetX: 9 });
  await s.saveCrop(true);
  assert.equal(s.cropId, "guest-4");
  assert.match(s.cropNotice, /还有 1 张/);
  await s.saveCrop(false);
  assert.equal(s.panel, "");
  assert.deepEqual(encodings, [[1800, 1200], [1200, 1800]]);
  assert.ok(s.photos.every(graduateCropReady));
  s.confirm();
  assert.equal(s.view, "confirm");
  await s.back();
  assert.equal(s.photos.length, 10);
  assert.equal(s.photos[1].crop.offsetX, 9);
  assert.equal(s.quote.total, 7000);
});
