// Domain file/decode boundaries only; no browser, screenshot or UI automation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createDetachedController,
  getStore,
  registerStore,
} from "../src/runtime/state.js";
import { decodePhotoBlob } from "../src/domain/photo-readability.js";
globalThis.window = new EventTarget();
globalThis.location = new URL("http://localhost/?page=my&photoAction=one");
globalThis.history = { replaceState() {}, pushState() {} };
await import("../src/domain/index.js");
const decodes = [];
globalThis.Image = class {
  naturalWidth = 295;
  naturalHeight = 413;
  decode() {
    return new Promise((resolve, reject) => decodes.push({ resolve, reject }));
  }
};
const photo = (id) => ({ id, blob: new Blob([id], { type: "image/jpeg" }) });
function fixtures() {
  const one = photo("one"),
    two = photo("two");
  registerStore("photoLibrary", { finished: [one, two], ready: true });
  const sheet = getStore("photoActions");
  sheet.photoId = "one";
  const album = createDetachedController("albumCenter", {
    photoId: "one",
    $store: { photoLibrary: getStore("photoLibrary") },
  });
  return { one, two, states: [sheet, album] };
}
test("empty/unreadable files cannot decode as a photograph", async () => {
  await assert.rejects(decodePhotoBlob(null));
  await assert.rejects(decodePhotoBlob(new Blob([])));
});
test("personal sheet and full detail both block unreadable photos, retry valid decoding, and reject stale completions", async () => {
  const { states } = fixtures();
  for (const s of states) {
    const first = s.checkPhotoReadability();
    assert.equal(s.photoReadable, false);
    decodes.shift().reject(Error("corrupt file"));
    await first;
    assert.equal(s.photoReadStatus, "failed");
    assert.equal(s.photoReadable, false);
    const retry = s.checkPhotoReadability();
    decodes.shift().resolve();
    await retry;
    assert.equal(s.photoReadable, true);
    const renderKey = s.photoRenderKey;
    s.failPhotoReadability(s.photo.blob);
    const failedEpoch = s.photoReadEpoch;
    s.failPhotoReadability(s.photo.blob);
    assert.equal(
      s.photoRenderKey,
      renderKey,
      "image errors must never remount a broken image",
    );
    assert.equal(
      s.photoReadEpoch,
      failedEpoch,
      "repeated errors are idempotent",
    );
    assert.equal(
      s.photoReadable,
      false,
      "a displayed image failure also closes actions",
    );
    const old = s.checkPhotoReadability(),
      pendingOld = decodes.shift();
    s.photoId = "two";
    const next = s.checkPhotoReadability();
    decodes.shift().resolve();
    await next;
    pendingOld.reject(Error("late old failure"));
    await old;
    assert.equal(s.photoReadStatus, "ready");
    assert.equal(
      s.photoReadable,
      true,
      "late reads cannot disable a newer valid photo",
    );
    s.photoId = "missing";
    await s.checkPhotoReadability();
    assert.equal(s.photoReadable, false);
  }
});

test("missing or deleted sheet photos settle without a self-triggering subscription", async () => {
  const { one } = fixtures(),
    s = getStore("photoActions");
  location.search = "?page=my&photoAction=missing";
  const original = s.checkPhotoReadability;
  let checks = 0;
  s.checkPhotoReadability = function () {
    if (++checks > 5) {
      this.opened = false;
      throw Error("readability subscription repeated");
    }
    return original.call(this);
  };
  try {
    s.init();
    await new Promise(setImmediate);
    assert.equal(s.opened, true);
    assert.equal(s.photo, null);
    assert.equal(checks, 1);
    location.search = "?page=my&photoAction=one";
    s.sync();
    decodes.shift().resolve();
    await new Promise(setImmediate);
    assert.equal(s.photoReadable, true);
    getStore("photoLibrary").finished = [];
    await new Promise(setImmediate);
    const settled = checks;
    await new Promise(setImmediate);
    assert.equal(s.photoReadable, false);
    assert.equal(s.photoReadStatus, "idle");
    assert.equal(checks, settled);
  } finally {
    s.unsubscribe?.();
    window.removeEventListener("zhipai-route", s.onRoute);
    window.removeEventListener("popstate", s.onRoute);
    s.checkPhotoReadability = original;
  }
});
