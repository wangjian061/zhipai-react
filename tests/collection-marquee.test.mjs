import test from "node:test";
import assert from "node:assert/strict";
import { startCollectionMarquee } from "../src/domain/collection-marquee.js";

// Drive the rail's clocks and native scroll events without opening a browser.
function setup({ reduce = false, speed } = {}) {
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
    contains: () => false,
  });
  const stop = startCollectionMarquee(rail, 3, speed);
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
  return { win, doc, rail, motion, advance, fire, stop };
}

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
