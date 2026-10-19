// Hook lifecycle with mocked measurements/events. No browser or UI automation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { transformWithOxc } from "vite";
import { visiblePhotoBounds } from "../src/components/photo-processing.js";
const source = fs
  .readFileSync("src/components/PhotoProcessingEffect.jsx", "utf8")
  .replace(/^import[^\n]+;\n/gm, "");
const compiled = (
  await transformWithOxc(source, "PhotoProcessingEffect.jsx", {
    jsx: { runtime: "classic" },
  })
).code
  .replace(/export default /g, "")
  .replace(/export function /g, "function ");
function harness({ loaded = true, observe = true } = {}) {
  const listeners = new Map(),
    windowListeners = new Map(),
    ref = { current: null };
  let state = null,
    queued,
    previous,
    cleanup;
  const box = { left: 20, top: 30, width: 250, height: 350 };
  const image = {
    complete: loaded,
    naturalWidth: 1200,
    naturalHeight: 600,
    getBoundingClientRect: () => ({ ...box }),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    },
  };
  const frame = {
    getBoundingClientRect: () => ({ ...box }),
    querySelector: () => image,
  };
  const observers = [];
  class Resize {
    constructor(fn) {
      this.callback = fn;
      this.connected = true;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.connected = false;
    }
  }
  const factory = new Function(
    "React",
    "useRef",
    "useState",
    "useLayoutEffect",
    "visiblePhotoBounds",
    "getComputedStyle",
    "ResizeObserver",
    "window",
    compiled + ";return PhotoProcessingEffect;",
  );
  const component = factory(
    React,
    () => ref,
    () => [state, (next) => (state = next)],
    (fn, deps) => (queued = { fn, deps }),
    visiblePhotoBounds,
    () => ({ objectFit: "contain", objectPosition: "50% 50%" }),
    observe ? Resize : undefined,
    {
      addEventListener: (name, fn) => windowListeners.set(name, fn),
      removeEventListener: (name, fn) => {
        if (windowListeners.get(name) === fn) windowListeners.delete(name);
      },
    },
  );
  function render(props) {
    const tree = component(props);
    ref.current = tree ? { parentElement: frame } : null;
    if (
      !previous ||
      queued.deps.some((value, index) => value !== previous[index])
    ) {
      cleanup?.();
      cleanup = queued.fn();
      previous = queued.deps;
    }
    return tree;
  }
  const settled = (props) => {
    render(props);
    return render(props);
  };
  return {
    settled,
    render,
    image,
    frame,
    box,
    listeners,
    windowListeners,
    observers,
  };
}
test("active processing is measured; completion removes the effect and all event subscriptions", () => {
  const h = harness(),
    props = { active: true, imageSrc: "blob:source" };
  const tree = h.settled(props);
  assert.equal(tree.props.className, "photo-processing-effect");
  assert.equal(tree.props.style.width, "100%");
  assert.ok(parseFloat(tree.props.style.top) > 30);
  assert.equal(h.listeners.size, 2);
  assert.equal(h.windowListeners.size, 1);
  assert.equal(h.observers.at(-1).connected, true);
  assert.equal(h.settled({ ...props, active: false }), null);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.windowListeners.size, 0);
  assert.equal(h.observers.at(-1).connected, false);
});
test("loading, image replacement, resize and read failure never use a stale image rectangle", () => {
  const h = harness({ loaded: false }),
    props = { active: true, imageSrc: "blob:source" };
  assert.deepEqual(h.settled(props).props.style, { display: "none" });
  h.image.complete = true;
  h.listeners.get("load")();
  const loaded = h.settled(props);
  assert.equal(loaded.props.style.width, "100%");
  h.box.width = 187.5;
  h.box.height = 262.5;
  h.observers.at(-1).callback();
  assert.equal(h.settled(props).props.style.top, loaded.props.style.top);
  h.image.naturalWidth = 600;
  h.image.naturalHeight = 600;
  const replacement = { active: true, imageSrc: "blob:new" };
  const changed = h.settled(replacement);
  assert.ok(Math.abs(parseFloat(changed.props.style.top) - 100 / 7) < 1e-8);
  assert.equal(h.observers[0].connected, false);
  assert.equal(h.listeners.size, 2);
  h.image.naturalWidth = 0;
  h.listeners.get("error")();
  assert.deepEqual(h.settled(replacement).props.style, { display: "none" });
  h.settled({ active: false });
  assert.equal(h.listeners.size, 0);
});
test("without ResizeObserver the window fallback updates measurements and is removed on stop", () => {
  const h = harness({ observe: false }),
    props = { active: true, imageSrc: "blob:source" };
  h.settled(props);
  assert.equal(h.observers.length, 0);
  h.image.naturalWidth = 500;
  h.image.naturalHeight = 700;
  h.windowListeners.get("resize")();
  assert.equal(h.settled(props).props.style.height, "100%");
  h.settled({ active: false });
  assert.equal(h.windowListeners.size, 0);
});

test("a new task without a photo cannot reuse the previous photo's measured overlay", () => {
  const h = harness();
  h.settled({ active: true, imageSrc: "blob:old" });
  h.settled({ active: false });
  h.frame.querySelector = () => null;
  assert.deepEqual(h.settled({ active: true, imageSrc: "" }).props.style, {
    display: "none",
  });
  assert.equal(h.listeners.size, 0);
});
