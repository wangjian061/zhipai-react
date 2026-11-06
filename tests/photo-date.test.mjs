import test from "node:test";
import assert from "node:assert/strict";
import {
  captureDayAt,
  formatCaptureDate,
  originalDateInFile,
  restoreAlbumCaptureDates,
} from "../src/domain/photo-date.js";
import { plainAlbumState } from "../src/domain/album.js";
import { photoFacts } from "../src/domain/photo-actions.js";

// A JPEG APP1 segment containing one TIFF ExifIFD entry, DateTimeOriginal (0x9003).
function originalPhoto(dateTime) {
  const tiff = Buffer.from(
    "4578696600004d4d002a00000008000187690004000000010000001a00000000000190030002000000140000002c00000000",
    "hex",
  );
  const app1 = Buffer.concat([tiff, Buffer.from(dateTime + "\0")]);
  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(app1.length + 2, 4);
  return new Blob([header, app1, Buffer.from([0xff, 0xd9])], {
    type: "image/jpeg",
  });
}

test("original day survives midnight, invalid or absent EXIF stays unknown", async () => {
  assert.equal(
    await originalDateInFile(originalPhoto("2024:02:29 23:59:58")),
    "2024-02-29",
  );
  assert.equal(
    await originalDateInFile(originalPhoto("2023:02:29 10:00:00")),
    null,
  );
  assert.equal(await originalDateInFile(new Blob(["plain"])), null);
  assert.equal(formatCaptureDate("2024-02-29"), "2024/02/29");
  assert.equal(formatCaptureDate("2024-13-01"), "");
});

test("legacy sources, paid derivatives and restored camera drafts share the original date", async () => {
  const shutterTime = new Date(2025, 2, 15, 0, 1).getTime();
  const photos = [
    { id: "tool-1", sourceId: "made-original", createdAt: Date.now() },
    {
      id: "made-original",
      origin: "made",
      rawBlob: originalPhoto("2024:02:29 23:59:58"),
    },
    { id: "made-from-camera", origin: "made", createdAt: Date.now() },
    { id: "no-original", origin: "upload", createdAt: Date.now() },
    { id: "loop", sourceId: "loop" },
  ];
  await restoreAlbumCaptureDates(photos, async (id) => {
    assert.equal(id, "from-camera");
    return {
      photo: { id: "capture-1", origin: "camera", createdAt: shutterTime },
    };
  });
  assert.equal(captureDayAt(shutterTime), "2025-03-15");
  const saved = plainAlbumState({ finished: photos }).finished;
  assert.deepEqual(
    saved.map((p) => p.captureDate),
    ["2024-02-29", "2024-02-29", "2025-03-15", null, null],
  );
  assert.deepEqual(
    photoFacts(saved[0]).find(([key]) => key === "拍摄日期"),
    ["拍摄日期", "2024/02/29"],
  );
  assert.ok(!photoFacts(saved[3]).some(([key]) => key === "拍摄日期"));
});
