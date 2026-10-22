import test from "node:test";
import assert from "node:assert/strict";
import {
  clampOrderTabScroll,
  orderTabScrollTarget,
} from "../src/components/order-tab-position.js";

test("first and last order types stop at real content boundaries without filler space", () => {
  assert.equal(orderTabScrollTarget(0, 85, 370, 510), 0);
  assert.equal(orderTabScrollTarget(425, 85, 370, 510), 140);
  assert.equal(orderTabScrollTarget(0, 85, 600, 510), 0);
});

test("middle order types center where the real scroll range permits", () => {
  assert.equal(orderTabScrollTarget(255, 85, 370, 510), 112.5);
  assert.equal(orderTabScrollTarget(170, 85, 370, 510), 27.5);
});

test("restored horizontal positions keep their context and clamp when viewport changes", () => {
  assert.equal(clampOrderTabScroll(72, 370, 510), 72);
  assert.equal(clampOrderTabScroll(140, 450, 510), 60);
  assert.equal(clampOrderTabScroll(-30, 370, 510), 0);
  assert.equal(clampOrderTabScroll(140, 600, 510), 0);
});
