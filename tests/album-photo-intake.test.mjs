import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCUMENT_PHOTO_MAX_BYTES,
  PHONE_ALBUM_PHOTO_MAX_BYTES,
  compressDocumentPhoto,
  remainingDocumentPhotoSlots,
} from "../src/domain/document-photos.js";
import {
  addDocumentGroup,
  importPhoneAlbumImage,
  appendDocumentGroupPhotos,
  replaceDocumentPhoto,
} from "../src/domain/album-spaces.js";

const blob = (size, type = "image/png") =>
  new Blob([new Uint8Array(size)], { type });
const photo = (size, name = "身份证.png") => ({
  name,
  blob: blob(size),
  captureDate: "2026-11-18",
});

test("the 5 MB boundary preserves original bytes; over-limit images retain aspect ratio and saved file metadata", async () => {
  const limit = DOCUMENT_PHOTO_MAX_BYTES;
  const original = photo(limit);
  const overLimit = photo(limit + 1);
  assert.equal(
    await compressDocumentPhoto(original, {
      makeCanvas: () => assert.fail("Unnecessary compression"),
    }),
    original,
  );

  const sizes = [];
  const canvas = {
    getContext: () => ({ drawImage: (_, x, y, w, h) => sizes.push([w, h]) }),
    toBlob(callback, type, quality) {
      assert.equal(type, "image/webp");
      assert.ok(quality >= 0.8);
      callback(blob(this.width === 4000 ? limit + 1 : limit, type));
    },
  };
  const result = await compressDocumentPhoto(overLimit, {
    decode: async () => ({ naturalWidth: 4000, naturalHeight: 2500 }),
    makeCanvas: () => canvas,
  });
  assert.deepEqual(sizes, [
    [4000, 2500],
    [3200, 2000],
  ]);
  assert.equal(result.blob.size, limit);
  assert.equal(result.size, limit);
  assert.equal(result.type, "image/webp");
  assert.equal(result.name, "身份证.webp");
  assert.equal(result.captureDate, overLimit.captureDate);
  assert.equal(canvas.width, 0);
});

test("compression failure and oversized results are rejected rather than queued", async () => {
  const overLimit = photo(DOCUMENT_PHOTO_MAX_BYTES + 1);
  const options = {
    decode: async () => ({ naturalWidth: 3200, naturalHeight: 2000 }),
  };
  await assert.rejects(
    compressDocumentPhoto(overLimit, {
      ...options,
      makeCanvas: () => ({
        getContext: () => ({ drawImage() {} }),
        toBlob: (callback) => callback(overLimit.blob),
      }),
    }),
    /仍超过 5 MB/,
  );
  await assert.rejects(
    compressDocumentPhoto(overLimit, {
      ...options,
      makeCanvas: () => ({ getContext: () => null }),
    }),
    /压缩失败/,
  );
});

test("the storage guard enforces the cumulative limit and preserves old files on a rejected batch or replacement", () => {
  const state = { members: [], documents: [] };
  const small = photo(25);
  const big = photo(DOCUMENT_PHOTO_MAX_BYTES + 1);
  assert.throws(
    () => addDocumentGroup(state, "", "身份证", Array(6).fill(small)),
    /最多可选 5 张/,
  );
  assert.equal(state.documents.length, 0);
  const first = addDocumentGroup(state, "", "身份证", Array(3).fill(small));
  assert.equal(remainingDocumentPhotoSlots(3, 1), 1);
  assert.throws(
    () => appendDocumentGroupPhotos(state, first, [small, big]),
    /单张不得超过 5 MB/,
  );
  assert.equal(first.photos.length, 3);
  assert.throws(
    () => appendDocumentGroupPhotos(state, first, [small, small, small]),
    /最多可选 2 张/,
  );
  appendDocumentGroupPhotos(state, first, [small, small]);
  assert.throws(
    () => appendDocumentGroupPhotos(state, first, [small]),
    /已达到 5 张/,
  );
  const image = first.photos[0];
  assert.throws(
    () => replaceDocumentPhoto(state, first, image.id, big),
    /单张不得超过 5 MB/,
  );
  assert.equal(first.photos[0], image);
  replaceDocumentPhoto(state, first, image.id, photo(26));
  assert.equal(first.photos[0].blob.size, 26);
  assert.equal(first.photos.length, 5);
  assert.equal(addDocumentGroup(state, "", "护照", [small]).photos.length, 1);
});


test("the import boundary rejects an oversized file without recorded consent", async () => {
  const file = new File(
    [new Uint8Array(PHONE_ALBUM_PHOTO_MAX_BYTES + 1)],
    "large.jpg",
    { type: "image/jpeg" },
  );
  await assert.rejects(importPhoneAlbumImage(file), /先同意压缩/);
});
