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
globalThis.history = {
  pushState(a, b, url) {
    loc = new URL(url, loc);
  },
  replaceState(a, b, url) {
    loc = new URL(url, loc);
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
test("crop flows through real reactive routing into both layout previews and checkout", async () => {
  const store = getStore("printLibrary");
  await store.load();
  const ctl = createController(
    "printStudio",
    [],
    observable({ page: "print" }),
  );
  ctl.setElement({ querySelectorAll: () => [] });
  ctl.refs.printDialog = { querySelector: () => null };
  ctl.start();
  const s = ctl.scope;
  const settle = async () => {
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 5));
      if (s.layoutOptions.length === 2 && !s.layoutsLoading && !store.busy)
        return;
    }
    assert.fail("layout preparation did not finish: " + s.layoutError);
  };
  try {
    const oldPhoto = {
      id: "old",
      name: "previous",
      width: 295,
      height: 413,
      type: "image/jpeg",
      blob: new Blob([JSON.stringify({ width: 295, height: 413 })], {
        type: "image/jpeg",
      }),
    };
    await s.choosePhoto(oldPhoto, "phone");
    await settle();
    const oldURLs = s.layoutOptions.map((p) => p.previewURL);
    const photo = {
      id: "original",
      name: "landscape",
      width: 900,
      height: 600,
      type: "image/jpeg",
      blob: new Blob([JSON.stringify({ width: 900, height: 600 })], {
        type: "image/jpeg",
      }),
    };
    await s.choosePhoto(photo, "phone");
    assert.equal(s.view, "crop");
    s.setCrop({ scale: 1.5, offsetX: 50, offsetY: 30 });
    await s.applyCrop();
    await settle();
    assert.equal(s.view, "layouts");
    assert.notEqual(s.draft.photo.id, photo.id);
    assert.equal(s.draft.photo.width * 7, s.draft.photo.height * 5);
    const cropped = JSON.parse(await s.draft.photo.blob.text());
    assert.equal(cropped.width, s.draft.photo.width);
    assert.equal(cropped.height, s.draft.photo.height);
    assert.equal(cropped.draws[0].source.width, 900);
    assert.ok(
      cropped.draws[0].coords[0] > 400,
      "manual horizontal offset is retained",
    );
    for (const option of s.layoutOptions) {
      assert.ok(!oldURLs.includes(option.previewURL));
      const preview = await (await fetch(option.previewURL)).json();
      assert.equal(preview.draws.length, option.count);
      for (const drawn of preview.draws) {
        assert.equal(drawn.source.width, cropped.width);
        assert.deepEqual(drawn.source.draws, cropped.draws);
      }
      await s.selectLayout(option.id);
      const markup = s.sheet(option.id, true, true);
      assert.match(markup, /viewBox="0 0 152 102"/);
      const images = [...markup.matchAll(/<image href="([^"]+)"/g)];
      assert.equal(images.length, option.count);
      for (const [, url] of images) {
        assert.equal(url, s.photoURL);
        const source = await (await fetch(url)).json();
        assert.deepEqual(source, cropped);
      }
    }
    s.confirm();
    assert.equal(s.view, "confirm");
    const checkout = s.sheet(s.draft.layout);
    assert.ok(checkout.includes(s.photoURL));
    assert.equal(photo.width, 900);
    assert.equal(photo.height, 600);
  } finally {
    ctl.stop();
  }
});

test("layout markup has a sized preview stage and uses the current draft for all previews", () => {
  const page = fs.readFileSync(
    new URL("../src/pages/PrintPage.jsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /className="print-paper-stage"/);
  assert.doesNotMatch(page, /className="print-source-strip"/);
  assert.doesNotMatch(page, /href=\{s\.(selectedLayout\?|item)\.previewURL/);
  const css = fs.readFileSync(
    new URL("../src/styles/print.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.print-paper-stage\{position:relative/);
  assert.match(
    css,
    /\.print-paper-preview>svg,\.print-template-preview>svg\{display:block;width:100%;height:auto/,
  );
});
