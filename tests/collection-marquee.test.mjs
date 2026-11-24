import test from "node:test";
import assert from "node:assert/strict";
import { startCollectionMarquee } from "../src/domain/collection-marquee.js";
import { mountGraduateRail } from "../src/domain/graduate-hero-rail.js";

import { nextOfferIndex, offerSwipeStep, startOfferRotation } from "../src/domain/collection-offer-rotation.js";

// Drive the rail's clocks and native scroll events without opening a browser.
function railFixture(reduce = false) {
  let now = 0,
    id = 0;
  const jobs = new Map();
  const win = new EventTarget(),
    doc = new EventTarget(),
    rail = new EventTarget();
  const motion = Object.assign(new EventTarget(), { matches: reduce });
  const later = (fn, delay) => {
    jobs.set(++id, { at: now + delay, fn });
    return id;
  };
  Object.assign(win, {
    performance: { now: () => now },
    setTimeout: later,
    clearTimeout: (key) => jobs.delete(key),
    requestAnimationFrame: (fn) => later(() => fn(now), 16),
    cancelAnimationFrame: (key) => jobs.delete(key),
    matchMedia: () => motion,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  });
  doc.defaultView = win;
  Object.assign(rail, {
    ownerDocument: doc,
    scrollLeft: 0,
    clientWidth: 338,
    getBoundingClientRect: () => ({ width: 169 }),
    children: Array.from({ length: 9 }, (_, i) => ({
      getBoundingClientRect: () => ({ left: (i * 136.8) / 2 }),
    })),
    contains: node => node === rail,
    matches: () => false,
  });
  const advance = (ms) => {
    const end = now + ms;
    while (jobs.size) {
      const [key, job] = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (job.at > end) break;
      now = job.at;
      jobs.delete(key);
      job.fn();
    }
    now = end;
  };
  const fire = (target, type, props = {}) =>
    target.dispatchEvent(
      Object.assign(
        new Event(type, { cancelable: true }),
        {
          isPrimary: true,
          pointerId: 1,
          button: 0,
          clientX: 60,
          clientY: 0,
          pointerType: "touch",
        },
        props,
      ),
    );
  return { win, doc, rail, motion, advance, fire };
}

function setup({ reduce = false, speed, offerAdvance } = {}) {
  const fixture = railFixture(reduce);
  const { rail } = fixture;
  const stop = offerAdvance ? startOfferRotation(rail, offerAdvance) : startCollectionMarquee(rail, 3, speed);
  return { ...fixture, stop };
}

function graduateRailFixture(reduce, { count = 5, ...options } = {}) {
  const fixture = railFixture(reduce);
  const { rail } = fixture;
  const step = 250;
  Object.assign(rail, {
    closest: () => rail, dataset: {}, clientWidth: 375,
    children: Array.from({ length: count * 3 }, (_, i) => ({
      offsetLeft: (375 - step) / 2 + step * i, offsetWidth: step, dataset: {},
      style: { setProperty() {} }, toggleAttribute() {},
    })),
  });
  return { ...fixture, controller: mountGraduateRail(rail, { count, ...options }), step };
}

test("graduate rail centers the first item and wraps both ways with reduced motion", () => {
  const { rail, controller, step, advance } = graduateRailFixture(true);
  try {
    assert.equal(rail.scrollLeft, 5 * step);
    assert.equal(controller.centerSide(5), false);
    assert.equal(controller.centerSide(4), true);
    assert.equal(controller.index, 4);
    assert.equal(rail.scrollLeft, 9 * step);
    controller.move(1);
    assert.equal(rail.scrollLeft, 5 * step);
    advance(30_000);
    assert.equal(controller.index, 0);
  } finally { controller.destroy(); }
});

test("enrollment flow can center a side step and loop from six to one without activating the center", () => {
  const { controller, rail, step, advance } = graduateRailFixture(true, { count: 6, initialIndex: 4 });
  try {
    assert.equal(controller.centerSide(10), false);
    assert.equal(controller.centerSide(11), true);
    assert.equal(controller.index, 5);
    controller.move(1);
    assert.equal(rail.scrollLeft, 6 * step);
    controller.move(-1);
    assert.equal(controller.index, 5);
    advance(30_000);
    assert.equal(controller.index, 5);
  } finally { controller.destroy(); }
});

test("graduate rotation honors the 3.2s hold and 650ms slide, and rests after interaction and overlays", () => {
  const { rail, controller, doc, win, step, advance, fire } = graduateRailFixture(false, { initialIndex: 4 });
  try {
    if (rail.children[9].dataset.railEntry === "center") advance(520);
    advance(3199);
    assert.equal(rail.scrollLeft, 9 * step);
    advance(301);
    assert.ok(rail.scrollLeft > 9 * step && rail.scrollLeft < 10 * step);
    advance(365);
    assert.equal(rail.scrollLeft, 5 * step);
    fire(rail, "pointerdown");
    advance(6000);
    assert.equal(rail.scrollLeft, 5 * step);
    fire(win, "pointerup");
    advance(4999);
    assert.equal(rail.scrollLeft, 5 * step);
    advance(300);
    assert.ok(rail.scrollLeft > 5 * step);
    controller.setPaused(true);
    const interrupted = rail.scrollLeft;
    advance(8000);
    assert.equal(rail.scrollLeft, interrupted);
    controller.setPaused(false);
    doc.hidden = true;
    fire(doc, "visibilitychange");
    advance(8000);
    assert.equal(rail.scrollLeft, interrupted);
    doc.hidden = false;
    fire(doc, "visibilitychange");
    advance(4999);
    assert.equal(rail.scrollLeft, interrupted);
    advance(700);
    assert.notEqual(rail.scrollLeft, interrupted);
  } finally { controller.destroy(); }
});

test("starts with two seconds of rest and moves eight logical pixels per second across the loop", () => {
  const { rail, advance, stop } = setup();
  const origin = rail.scrollLeft;
  assert.ok(Math.abs(origin - 410.4) < 0.01);
  advance(1999);
  assert.equal(rail.scrollLeft, origin);
  advance(1001);
  assert.ok(Math.abs(rail.scrollLeft - origin - 8) < 0.2);
  advance(53000);
  assert.ok(Math.abs(rail.scrollLeft - origin - (432 % origin)) < 0.2);
  stop();
  const final = rail.scrollLeft;
  advance(10000);
  assert.equal(rail.scrollLeft, final);
});

test("holds while pressed, waits five seconds from the last scroll, and suppresses only the dragged click", () => {
  const { win, rail, advance, fire, stop } = setup();
  advance(4000);
  const before = rail.scrollLeft;
  fire(rail, "pointerdown");
  advance(9000);
  assert.equal(rail.scrollLeft, before);
  fire(win, "pointermove", { clientX: 10 });
  fire(win, "pointerup");
  advance(3000);
  rail.scrollLeft = before + 40;
  fire(rail, "scroll");
  assert.equal(fire(rail, "click", { detail: 1 }), false);
  advance(4999);
  assert.equal(rail.scrollLeft, before + 40);
  advance(501);
  assert.ok(Math.abs(rail.scrollLeft - before - 44) < 0.2);
  fire(rail, "pointerdown");
  fire(win, "pointerup");
  assert.equal(fire(rail, "click", { detail: 1 }), true);
  stop();
});

test("reduced motion and a hidden document suspend movement", () => {
  const { doc, rail, motion, advance, fire, stop } = setup({ reduce: true });
  const start = rail.scrollLeft;
  advance(30000);
  assert.equal(rail.scrollLeft, start);
  motion.matches = false;
  fire(motion, "change");
  advance(3000);
  assert.ok(rail.scrollLeft > start);
  doc.hidden = true;
  fire(doc, "visibilitychange");
  const whenHidden = rail.scrollLeft;
  advance(10000);
  assert.equal(rail.scrollLeft, whenHidden);
  stop();
});

test("offers get six seconds each and a full fresh interval after touch, hover or focus", () => {
  let steps = 0;
  const { rail, win, doc, advance, fire, stop } = setup({ offerAdvance: () => steps++ });
  advance(5999);
  assert.equal(steps, 0);
  advance(1);
  assert.equal(steps, 1);
  fire(rail, "pointerdown");
  advance(7000);
  assert.equal(steps, 1);
  fire(win, "pointerup");
  advance(5999);
  assert.equal(steps, 1);
  advance(1);
  assert.equal(steps, 2);
  fire(rail, "pointerenter", { pointerType: "mouse" });
  advance(7000);
  assert.equal(steps, 2);
  fire(rail, "pointerleave");
  doc.activeElement = rail;
  fire(rail, "focusin");
  advance(11000);
  assert.equal(steps, 2);
  doc.activeElement = null;
  fire(rail, "focusout", { relatedTarget: null });
  advance(6000);
  assert.equal(steps, 3);
  stop();
  advance(6000);
  assert.equal(steps, 3);
});

test("offers stay still with reduced motion or a hidden document and resume when visible", () => {
  let steps = 0;
  const { motion, doc, advance, fire, stop } = setup({ reduce: true, offerAdvance: () => steps++ });
  advance(18000);
  assert.equal(steps, 0);
  motion.matches = false;
  fire(motion, "change");
  advance(3000);
  doc.hidden = true;
  fire(doc, "visibilitychange");
  advance(18000);
  assert.equal(steps, 0);
  doc.hidden = false;
  fire(doc, "visibilitychange");
  advance(12000);
  assert.equal(steps, 2);
  stop();
});

test("poster swipes wrap four pages in both directions and leave taps and vertical scroll alone", () => {
  for (const [from, dx, dy, to] of [
    [0, -50, 8, 1], [1, -36, 0, 2], [2, -70, 20, 3], [3, -45, 0, 0],
    [0, 50, 8, 3], [2, 50, 0, 1], [2, 0, 0, 2], [2, 35, 1, 2], [2, 37, 80, 2],
  ]) assert.equal(nextOfferIndex(from, offerSwipeStep(dx, dy), 4), to);
});
