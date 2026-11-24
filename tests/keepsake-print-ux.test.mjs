// Exercise the live print controller's export and checkout boundaries without a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { createController, registerStore } from "../src/runtime/state.js";

Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
globalThis.location = new URL("http://localhost:4180/?page=print&print=layouts");
globalThis.history = { state: { printPreview: "active-preview" } };

let pauseLayout;
globalThis.Image = class {
  async decode() {
    const { width, height } = await (await fetch(this.src)).json();
    this.naturalWidth = width;
    this.naturalHeight = height;
  }
};
globalThis.document = {
  createElement() {
    const canvas = {
      getContext() {
        return { fillRect() {}, drawImage() {}, scale() {}, save() {}, restore() {}, translate() {}, rotate() {}, fillText() {} };
      },
      toBlob(callback) {
        const output = photoBlob(canvas.width, canvas.height);
        if (canvas.width !== 612 || !pauseLayout) {
          callback(output);
          return;
        }
        const wait = pauseLayout;
        pauseLayout = null;
        wait.then((success) => callback(success ? output : null));
      },
    };
    return canvas;
  },
};
function photoBlob(width, height) {
  return new Blob([JSON.stringify({ width, height })], { type: "image/jpeg" });
}

const { PRINT_LAYOUTS, printDraftSeed } = await import("../src/domain/print.js");

function setup() {
  const original = { id: "original", width: 900, height: 600, blob: photoBlob(900, 600) };
  const current = { id: "current", width: 425, height: 595, blob: photoBlob(425, 595) };
  const layout = PRINT_LAYOUTS[0];
  registerStore("printLibrary", {
    ready: true,
    busy: false,
    orders: [],
    draft: {
      ...printDraftSeed(),
      sourcePhoto: original,
      photo: current,
      crop: { scale: 1, offsetX: 0, offsetY: 0 },
      kind: "phone",
      layout: layout.id,
      layoutSnapshot: layout,
    },
    async commit(update) { update(this); },
  });
  const { scope: studio } = createController("printStudio");
  studio.modal = "printPreview";
  studio.previewHistoryId = "active-preview";
  studio.previewTab = "crop";
  studio.layoutOptions = PRINT_LAYOUTS;
  studio.loadedPhotoKey = studio.photoKey;
  const routes = [];
  studio.route = (view) => {
    routes.push({ view, photo: studio.draft.photo.id, crop: { ...studio.draft.crop } });
    studio.view = view;
  };
  return { studio, current, layout, routes };
}

test("the last complete sheet remains visible while the edited sheet renders and checkout waits", async () => {
  const { studio, current, layout, routes } = setup();
  const first = studio.workspaceSheet(layout.id);
  studio.setCrop({ scale: 1.4, offsetX: 32, offsetY: -18 });
  assert.equal(studio.cropReady, true);
  assert.equal(studio.previewReady, false);

  let finish;
  pauseLayout = new Promise((resolve) => { finish = resolve; });
  studio.showPreviewTab("sheet");
  const confirmation = studio.confirm();
  assert.ok(studio.cropJob);
  assert.equal(studio.workspaceSheet(layout.id), first);
  assert.equal(studio.draft.photo.id, current.id);
  assert.deepEqual(routes, []);
  finish(true);
  await confirmation;
  assert.notEqual(studio.workspaceSheet(layout.id), first);
  assert.notEqual(studio.draft.photo.id, current.id);
  assert.equal(studio.draft.photo.width * 7, studio.draft.photo.height * 5);
  assert.deepEqual(routes, [{
    view: "confirm",
    photo: studio.draft.photo.id,
    crop: { scale: 1.4, offsetX: 32, offsetY: -18 },
  }]);
  studio.releaseLayouts();
});

test("failure preparing a new sheet retains the previous composition and blocks checkout", async () => {
  const { studio, current, layout, routes } = setup();
  const first = studio.workspaceSheet(layout.id);
  studio.setCrop({ scale: 1.4, offsetX: 0, offsetY: 0 });
  pauseLayout = Promise.resolve(false);
  await studio.confirm();
  assert.match(studio.cropError, /裁剪未完成/);
  assert.equal(studio.workspaceSheet(layout.id), first);
  assert.equal(studio.draft.photo.id, current.id);
  assert.equal(studio.crop.scale, 1.4);
  assert.deepEqual(routes, []);
});

test("gallery browsing leaves purchase unchanged, and choosing a layout returns to its matching sheet", async () => {
  const { studio } = setup();
  const [mixed, two] = PRINT_LAYOUTS;
  const { photo, sourcePhoto, crop } = studio.draft;
  Object.assign(studio.draft, { photo: null, sourcePhoto: null, crop: null });
  studio.modal = null;
  assert.deepEqual(studio.galleryItems.map((item) => item.label), ["混排整版", "二寸8张", "斜角实拍", "模切细节"]);
  studio.selectGalleryImage("angle");
  assert.equal(studio.galleryItem.label, "斜角实拍");
  assert.equal(studio.draft.layout, mixed.id);
  await studio.selectLayout(two.id);
  assert.equal(studio.galleryItem.label, "二寸8张");
  assert.equal(studio.draft.layoutSnapshot.count, 8);

  Object.assign(studio.draft, { photo, sourcePhoto, crop });
  assert.equal(studio.galleryItem.label, "二寸8张");
  assert.equal(studio.galleryItems.length, 4);
  studio.modal = "layoutPreview";
  studio.selectGalleryImage("angle");
  studio.stepGalleryImage(1);
  assert.equal(studio.galleryItem.label, "模切细节");
  studio.stepGalleryImage(1);
  assert.equal(studio.galleryItem.label, "模切细节");
  assert.equal(studio.draft.layout, two.id);
  assert.equal(studio.draft.layoutSnapshot.count, 8);

  studio.modal = "printPreview";
  await studio.selectLayout(mixed.id);
  assert.equal(studio.galleryItem.label, "模切细节");
  assert.equal(studio.draft.layoutSnapshot.count, 12);
  studio.modal = null;
  await studio.selectLayout(mixed.id);
  assert.equal(studio.galleryItem.label, "混排整版");
  assert.equal((studio.workspaceSheet(studio.layout.id).match(/<image /g) || []).length, 12);
  assert.equal(studio.draft.photo.blob, photo.blob);
});

test("a layout changed in preview retains even the initial product cover", async () => {
  const { studio } = setup();
  assert.equal(studio.gallerySelection, null);
  assert.equal(studio.galleryItem.id, PRINT_LAYOUTS[0].id);
  await studio.selectLayout(PRINT_LAYOUTS[1].id);
  assert.equal(studio.draft.layout, PRINT_LAYOUTS[1].id);
  assert.equal(studio.galleryItem.id, PRINT_LAYOUTS[0].id);
});
