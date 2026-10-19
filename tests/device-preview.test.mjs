// Numerical preview geometry and existing controller behavior only. No browser/UI automation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  IPHONE_PREVIEW as phone,
  fitPhonePreview,
} from "../src/domain/device-preview.js";
import { LiquidTabIndicator } from "../src/domain/liquid-tabs.js";
import { createController } from "../src/runtime/state.js";
await import("../src/domain/app.js");
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("phone body proportions and OS-safe dimensions stay correct", () => {
  assert.equal(phone.screenWidth * 3, 1206);
  assert.equal(phone.screenHeight * 3, 2622);
  assert.ok(
    Math.abs(
      phone.bodyHeight / phone.bodyWidth -
        phone.bodyHeightMm / phone.bodyWidthMm,
    ) < 0.001,
  );
  assert.equal(phone.bodyWidth - 2 * phone.insetX, phone.screenWidth);
  assert.equal(phone.bodyHeight - 2 * phone.insetY, phone.screenHeight);
  assert.equal(phone.screenHeight - phone.statusHeight - phone.homeHeight, 778);
  const navigationBottom =
    phone.homeIndicatorBottom + phone.homeIndicatorHeight + phone.navigationGap;
  assert.equal(navigationBottom, 29);
  assert.equal(
    navigationBottom - (phone.homeIndicatorBottom + phone.homeIndicatorHeight),
    16,
  );
});
test("small, tall, landscape and large windows fit the complete device without distortion or enlargement", () => {
  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [483, 855],
    [472, 877],
    [844, 390],
    [1440, 1080],
    [1920, 1200],
  ]) {
    const g = fitPhonePreview(w, h);
    assert.ok(g.scale > 0 && g.scale <= 1);
    assert.ok(g.width <= w - 32 + 0.000001);
    assert.ok(g.height <= h - 32 + 0.000001);
    close(g.width / g.height, phone.bodyWidth / phone.bodyHeight);
  }
  assert.equal(fitPhonePreview(1920, 1200).scale, 1);
  for (const [w, h] of [
    [0, 0],
    [1, 1],
    [NaN, NaN],
    [Infinity, Infinity],
  ]) {
    const g = fitPhonePreview(w, h);
    assert.ok(Number.isFinite(g.scale) && g.scale > 0);
  }
});
test("floating menu indicator positions stay in logical pixels under whole-device scaling", () => {
  for (const scale of [1, 0.91, 0.6])
    for (const index of [0, 1, 2]) {
      const menu = {
        clientWidth: 240,
        offsetWidth: 242,
        clientLeft: 1,
        clientTop: 1,
        getBoundingClientRect: () => ({
          left: 70,
          top: 720,
          width: 242 * scale,
        }),
      };
      const expected = {
        left: 4 + index * 80,
        right: 4 + (index + 1) * 80,
        top: 4,
        bottom: 50,
      };
      const buttons = [0, 1, 2].map((i) => ({
        getBoundingClientRect: () => ({
          left: 70 + (5 + i * 80) * scale,
          right: 70 + (5 + (i + 1) * 80) * scale,
          top: 720 + 5 * scale,
          bottom: 720 + 51 * scale,
        }),
      }));
      const actual = LiquidTabIndicator.prototype.measure.call(
        { menu, buttons },
        index,
      );
      for (const k of Object.keys(expected)) close(actual[k], expected[k]);
    }
});
test("navigation acrylic threshold remains the same logical distance at every preview scale", () => {
  const old = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (fn) => {
    queueMicrotask(fn);
    return 1;
  };
  return (async () => {
    for (const scale of [1, 0.8, 0.6])
      for (const [gap, expected] of [
        [36, 0],
        [24, 0],
        [12, 0.5],
        [0, 1],
        [-10, 1],
      ]) {
        const instance = createController("phoneDemo"),
          s = instance.scope;
        s.page = "home";
        instance.refs.bottomNav = {
          offsetWidth: 370,
          getBoundingClientRect: () => ({ top: 700, width: 370 * scale }),
        };
        instance.refs.homeTools = {
          getBoundingClientRect: () => ({ bottom: 700 - gap * scale }),
        };
        s.scheduleHomeNavScrim();
        await Promise.resolve();
        close(s.homeNavScrim, expected);
      }
  })().finally(() => {
    globalThis.requestAnimationFrame = old;
  });
});
test("full-bleed page hosts use fixed transparent OS chrome with protected controls and drawers", () => {
  const shell = fs.readFileSync("src/components/AppShell.jsx", "utf8");
  assert.ok(shell.includes("<NativePhoneChrome />"));
  assert.ok(shell.includes('className="app-viewport"'));
  const css = fs.readFileSync("src/styles/device-preview.css", "utf8");
  assert.ok(/\.app-viewport\{[^}]*inset:0/.test(css));
  assert.ok(
    /\.native-status-bar\{[^}]*position:fixed[^}]*background:transparent[^}]*z-index:1000/.test(
      css,
    ),
  );
  assert.ok(
    /\.native-home-area\{[^}]*position:fixed[^}]*background:transparent[^}]*z-index:1000/.test(
      css,
    ),
  );
  assert.ok(
    /\.device-entry>\.phone>\.screen\{[^}]*transform:translateZ\(0\)/.test(css),
  );
  assert.ok(
    css.includes(".device-fit .page{padding-top:var(--device-status-height)}"),
  );
  assert.ok(
    css.includes(".device-fit .phone .tabbar{bottom:var(--device-nav-bottom)}"),
  );
  assert.ok(
    css.includes(
      ".device-fit .collection-floating-nav{bottom:var(--device-nav-bottom)}",
    ),
  );
  for (const element of [
    ".collection-home-hero",
    ".album-hero-copy",
    ".service-hero",
    ".account-welcome-hero",
    ".camera-floating-back",
  ])
    assert.ok(css.includes(element));
  assert.ok(css.includes(".photo-choice-sheet)"));
  for (const name of ["ToolsPage", "PrintPage"])
    assert.ok(
      fs
        .readFileSync("src/pages/" + name + ".jsx", "utf8")
        .includes("data-view={s.view}"),
    );
  const chrome = fs.readFileSync(
    "src/components/NativePhoneChrome.jsx",
    "utf8",
  );
  for (const name of [
    "native-clock",
    "native-island",
    "native-signal",
    "native-wifi",
    "native-battery",
    "native-home-indicator",
  ])
    assert.ok(chrome.includes(name));
});
