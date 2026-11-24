// Domain/state integration only: no browser, screenshots or automated UI interaction.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createController,
  getStore,
  registerStore,
  observable,
} from "../src/runtime/state.js";
let loc = new URL("http://127.0.0.1:4180/?page=print&print=select"),
  snapshot;
Object.defineProperty(globalThis, "location", {
  get: () => loc,
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: { onLine: true },
  configurable: true,
});
globalThis.window = new EventTarget();
const visited = [{ url: loc.href, state: {} }];
const session = new Map();
globalThis.sessionStorage = {
  getItem: (key) => session.get(key) || null,
  setItem: (key, value) => session.set(key, value),
  removeItem: (key) => session.delete(key),
};
globalThis.history = {
  get state() { return visited.at(-1).state; },
  pushState(state, _, url) {
    loc = new URL(url, loc);
    visited.push({ url: loc.href, state });
  },
  replaceState(state, _, url) {
    loc = new URL(url, loc);
    visited[visited.length - 1] = { url: loc.href, state };
  },
  back() {
    visited.pop();
    loc = new URL(visited.at(-1).url);
    window.dispatchEvent(new Event("popstate"));
  },
};
globalThis.indexedDB = {
  open() {
    const request = {
      result: {
        createObjectStore() {},
        transaction() {
          const tx = {
            objectStore() {
              return {
                get() {
                  const req = { result: snapshot };
                  queueMicrotask(() => req.onsuccess());
                  return req;
                },
                put(value) {
                  snapshot = structuredClone(value);
                  queueMicrotask(() => tx.oncomplete());
                },
              };
            },
          };
          return tx;
        },
      },
    };
    queueMicrotask(() => request.onsuccess());
    return request;
  },
};
const draws = [];
globalThis.document = {
  activeElement: null,
  createElement() {
    const canvas = {
      width: 0,
      height: 0,
      draws: [],
      getContext() {
        return {
          fillRect() {},
          drawImage(...args) {
            canvas.draws.push(args);
            draws.push(args);
          },
          scale() {},
          save() {},
          restore() {},
          translate() {},
          rotate() {},
          fillText() {},
        };
      },
      toBlob(cb, type) {
        cb(
          new Blob(
            [
              JSON.stringify({
                width: canvas.width,
                height: canvas.height,
                draws: canvas.draws.map((d) => ({
                  source: d[0].data,
                  coords: d.slice(1),
                })),
              }),
            ],
            { type },
          ),
        );
      },
    };
    return canvas;
  },
};
globalThis.Image = class {
  async decode() {
    this.data = await (await fetch(this.src)).json();
    this.naturalWidth = this.data.width;
    this.naturalHeight = this.data.height;
  }
};
await import("../src/domain/print.js");
registerStore("photoLibrary", { ready: true, busy: false, finished: [] });
registerStore("photoChoice", {});
registerStore("account", { session: { phone: "13800008000" } });
test("print preview keeps an independent crop across layout changes, return, reload and checkout", async () => {
  const store = getStore("printLibrary");
  await store.load();
  const attach = () => {
    const ctl = createController("printStudio", [], observable({ page: "print" }));
    ctl.setElement({ querySelectorAll: () => [] });
    ctl.refs.printDialog = { querySelector: () => null };
    ctl.start();
    return ctl;
  };
  let ctl = attach();
  let s = ctl.scope;
  const settle = async () => {
    for (let i = 0; i < 100; i++) {
      if (s.previewReady && !s.disabled) return;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.fail("preview preparation did not finish: " + (s.cropError || s.layoutError));
  };
  const input = (id, width, height) => ({
    id, name: id, width, height, type: "image/jpeg",
    blob: new Blob([JSON.stringify({ width, height })], { type: "image/jpeg" }),
  });
  try {
    assert.equal(s.layouts.length, 2);
    assert.match(s.workspaceSheet(s.layout.id), /print-portrait-blue\.webp/);
    s.selectGalleryImage("angle");
    const matching = input("matching", 295, 413);
    await s.choosePhoto(matching, "phone");
    assert.equal(s.view, "layouts");
    assert.equal(s.modal, "printPreview");
    assert.equal(s.previewTab, "sheet");
    await settle();
    assert.notEqual(s.draft.photo.id, matching.id);
    assert.equal(s.galleryItem.id, "angle");
    assert.equal(s.galleryItems.length, 4);
    s.showPreviewTab("crop");
    s.setCrop({ scale: 1.2, offsetX: 15, offsetY: 0 });
    assert.equal(s.cropReady, true);
    assert.equal(s.cropCurrent, false);
    assert.equal(s.previewReady, false);
    s.openAlbum();
    assert.equal(s.modal, "album");
    s.closeModal();
    assert.equal(s.modal, "printPreview");
    assert.equal(s.previewTab, "crop");
    assert.equal(s.crop.scale, 1.2);
    history.back();
    assert.equal(s.modal, null);
    await settle();
    assert.equal(s.galleryItem.id, "angle");
    const oldURLs = s.layoutOptions.map((option) => option.previewURL);
    const landscape = input("landscape", 900, 600);
    await s.choosePhoto(landscape, "phone");
    assert.equal(s.modal, "printPreview");
    assert.equal(s.view, "layouts");
    await settle();
    assert.equal(s.crop.scale, 1);
    s.showPreviewTab("crop");
    s.setCrop({ scale: 1.5, offsetX: 50, offsetY: 30 });
    assert.equal(s.canSubmit, false);
    // Reload before returning to the sheet: the pending adjustment and source survive.
    ctl.stop();
    await store.load();
    ctl = attach();
    s = ctl.scope;
    await settle();
    assert.equal(s.modal, "printPreview");
    assert.equal(s.crop.scale, 1.5);
    const cropped = JSON.parse(await s.draft.photo.blob.text());
    assert.equal(s.draft.photo.width * 7, s.draft.photo.height * 5);
    assert.equal(cropped.draws[0].source.width, 900);
    assert.ok(cropped.draws[0].coords[0] > 400, "manual horizontal offset is retained");
    for (const option of s.layoutOptions) {
      assert.ok(!oldURLs.includes(option.previewURL));
      const preview = await (await fetch(option.previewURL)).json();
      assert.equal(preview.draws.length, option.count);
      for (const drawn of preview.draws) assert.deepEqual(drawn.source.draws, cropped.draws);
      await s.selectLayout(option.id);
      assert.equal(s.crop.scale, 1.5);
      const markup = s.workspaceSheet(option.id);
      assert.match(markup, /viewBox="0 0 152 102"/);
      const images = [...markup.matchAll(/<image href="([^"]+)"/g)];
      assert.equal(images.length, option.count);
      for (const [, url] of images) assert.equal(url, s.photoURL);
    }
    const layout = s.draft.layout;
    await s.confirm();
    assert.equal(s.view, "confirm");
    assert.equal(s.checkoutQuantity, 1);
    assert.ok(s.checkoutSheet.includes(s.photoURL));
    s.openAddresses();
    s.addressFields = { name: "测试", phone: "13800001000", region: "广东省 深圳市 南山区", street: "测试街道18号" };
    await s.saveAddress();
    assert.equal(s.view, "confirm");
    await s.previousStep();
    assert.equal(s.view, "layouts");
    assert.equal(s.modal, "printPreview");
    assert.equal(s.draft.layout, layout);
    assert.equal(s.crop.scale, 1.5);
    assert.ok(s.address);
    history.back();
    assert.equal(s.view, "layouts");
    assert.equal(s.modal, null);
    s.openPrintPreview();
    assert.equal(s.modal, "printPreview");
    s.showPreviewTab("crop");
    s.setCrop({ scale: 1.3, offsetX: 20, offsetY: 5 });
    s.showPreviewTab("sheet");
    await settle();
    assert.equal(s.previewTab, "sheet");
    assert.equal(s.draft.crop.scale, 1.3);
    // The direct legacy URL still exports from the original.
    history.replaceState({}, "", "/?page=print&print=crop");
    window.dispatchEvent(new Event("zhipai-route"));
    assert.equal(s.view, "crop");
    s.setCrop({ scale: 1.1, offsetX: 10, offsetY: 5 });
    await s.applyCrop();
    await settle();
    assert.equal(s.view, "layouts");
    const legacy = JSON.parse(await s.draft.photo.blob.text());
    assert.equal(legacy.draws[0].source.width, 900);
    assert.equal(s.draft.sourcePhoto.blob.size, landscape.blob.size);
    assert.equal(s.draft.layout, layout);
    assert.ok(s.address);
  } finally {
    ctl.stop();
  }
});

test("layout markup has a sized preview stage and uses the current draft for all previews", () => {
  const page = fs.readFileSync(
    new URL("../src/components/PrintWorkspace.jsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /<PrintSheetArtwork /);
  assert.doesNotMatch(page, /ToolCapabilityPoster|PhotoSelectionPreview|print-source-strip/);
  assert.doesNotMatch(page, /href=\{s\.(selectedLayout\?|item)\.previewURL/);
  const css = fs.readFileSync(
    new URL("../src/styles/print.css", import.meta.url),
    "utf8",
  );
  assert.match(page, /className="keepsake-product-stage print-gallery-stage"/);
  assert.match(page, /className="keepsake-choice-rail print-gallery-rail"/);
  assert.doesNotMatch(css, /\.print-workspace-options|\.print-product-stage/);
  const stage = css.match(/\.keepsake-product-stage\.print-gallery-stage \{([^}]+)\}/)?.[1];
  assert.match(stage, /aspect-ratio: 3 \/ 2/);
  assert.match(stage, /padding: 0;/);
  assert.match(stage, /overflow: hidden/);
  assert.match(css, /\.print-gallery-stage \.keepsake-product-art img \{[^}]*object-fit: cover/);
  assert.match(css, /\.print-gallery-rail > button > img \{ object-fit: cover/);
  assert.match(css, /\.print-sheet-svg svg \{ display: block; width: 100%;/);
});
