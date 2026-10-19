// Numerical image geometry and UI state mapping; no browser or UI automation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  visiblePhotoBounds,
  toolPhotoProcessingLabel,
} from "../src/components/photo-processing.js";
const frame = { left: 40, top: 60, width: 250, height: 350 };
const measure = (width, height, extra = {}) =>
  visiblePhotoBounds({
    frame,
    image: frame,
    naturalWidth: width,
    naturalHeight: height,
    ...extra,
  });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("matching portrait fills the image frame", () => {
  assert.deepEqual(measure(500, 700), {
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
});
test("landscape and square photos exclude top and bottom contain gutters", () => {
  const wide = measure(1200, 600);
  near(wide.top, (112.5 / 350) * 100);
  near(wide.height, (125 / 350) * 100);
  near(wide.width, 100);
  near(wide.left, 0);
  const square = measure(600, 600);
  near(square.top, (50 / 350) * 100);
  near(square.height, (250 / 350) * 100);
});
test("narrow portrait excludes side gutters", () => {
  const tall = measure(100, 400);
  near(tall.left, (81.25 / 250) * 100);
  near(tall.width, (87.5 / 250) * 100);
  near(tall.top, 0);
  near(tall.height, 100);
});
test("device scaling and translated viewport preserve normalized image boundaries", () => {
  for (const scale of [0.35, 0.6, 0.8, 1]) {
    const transformed = {
      left: 123,
      top: 87,
      width: 250 * scale,
      height: 350 * scale,
    };
    const got = measure(1200, 600, { frame: transformed, image: transformed }),
      expected = measure(1200, 600);
    for (const key of Object.keys(expected)) near(got[key], expected[key]);
  }
});
test("manual crop uses only the visible intersection of the enlarged photo", () => {
  assert.deepEqual(
    measure(1200, 600, {
      image: { left: -200, top: -100, width: 900, height: 900 },
      fit: "fill",
    }),
    { left: 0, top: 0, width: 100, height: 100 },
  );
  const partial = measure(400, 400, {
    image: { left: 20, top: 80, width: 100, height: 100 },
    fit: "fill",
  });
  near(partial.left, 0);
  near(partial.top, (20 / 350) * 100);
  near(partial.width, (80 / 250) * 100);
  near(partial.height, (100 / 350) * 100);
});
test("hidden, unreadable and offscreen photo boxes have no processing effect", () => {
  assert.equal(measure(0, 0), null);
  assert.equal(measure(400, 300, { frame: { ...frame, width: 0 } }), null);
  assert.equal(measure(Infinity, 300), null);
  assert.equal(
    measure(400, 300, {
      image: { left: 1000, top: 1000, width: 100, height: 100 },
    }),
    null,
  );
});
test("object position and resizing recompute the actual image area", () => {
  const top = measure(1200, 600, { positionY: 0 });
  near(top.top, 0);
  const bottom = measure(1200, 600, { positionY: 1 });
  near(bottom.top, ((350 - 125) / 350) * 100);
  const wideFrame = { left: 0, top: 0, width: 350, height: 250 };
  const result = measure(500, 700, { frame: wideFrame, image: wideFrame });
  near(result.height, 100);
  near(result.width, ((250 * 5) / 7 / 350) * 100);
});
test("only actual photo work shows a processing status; completion, error and payment do not", () => {
  const base = { photo: { id: "photo" }, stage: "ready", action: "repair" };
  assert.equal(
    toolPhotoProcessingLabel({ ...base, stage: "checking" }),
    "正在检查照片",
  );
  assert.equal(
    toolPhotoProcessingLabel({ ...base, stage: "standardizing" }),
    "正在准备照片",
  );
  assert.equal(
    toolPhotoProcessingLabel({ ...base, stage: "processing" }),
    "正在精修照片",
  );
  assert.equal(
    toolPhotoProcessingLabel({
      ...base,
      stage: "processing",
      action: "outfit",
    }),
    "正在换装",
  );
  for (const action of ["crop", "format", "resize", "background"])
    assert.ok(
      toolPhotoProcessingLabel({ ...base, action, previewPending: true }),
    );
  for (const override of [
    {},
    { photo: null, stage: "checking" },
    { stage: "processing", error: "失败" },
    { stage: "processing", paying: true },
    { previewPending: true, saving: true },
  ])
    assert.equal(toolPhotoProcessingLabel({ ...base, ...override }), "");
});
