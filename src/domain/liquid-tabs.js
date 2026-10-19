import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";

function liquidTabFrame(from, to, progress) {
  const p = Math.max(0, Math.min(1, progress)),
    ease = (t) => 1 - Math.pow(1 - t, 4);
  if (p === 1)
    return {
      ...to,
    };
  const front = ease(p),
    tail = ease(Math.max(0, (p - 0.1) / 0.9));
  const rightward = to.left + to.right >= from.left + from.right;
  let left = from.left + (to.left - from.left) * (rightward ? tail : front);
  let right = from.right + (to.right - from.right) * (rightward ? front : tail);
  const width = to.right - to.left,
    maxWidth = width * 1.55;
  if (right - left > maxWidth) {
    const center = (left + right) / 2;
    left = center - maxWidth / 2;
    right = center + maxWidth / 2;
  }
  return {
    left,
    right,
    top: to.top,
    bottom: to.bottom,
  };
}
function liquidTabPath(frame, slotWidth) {
  const { left: l, right: r, top: t, bottom: b } = frame,
    h = b - t,
    rad = Math.min(h / 2, (r - l) / 2),
    mid = (l + r) / 2;
  const pinch = Math.min(3, Math.max(0, (r - l - slotWidth) / slotWidth) * 5),
    f = (n) => Number(n.toFixed(2));
  return `M${f(l + rad)} ${f(t)} Q${f(mid)} ${f(t + pinch * 2)} ${f(r - rad)} ${f(t)} C${f(r - rad * 0.448)} ${f(t)} ${f(r)} ${f(t + rad * 0.448)} ${f(r)} ${f((t + b) / 2)} C${f(r)} ${f(b - rad * 0.448)} ${f(r - rad * 0.448)} ${f(b)} ${f(r - rad)} ${f(b)} Q${f(mid)} ${f(b - pinch * 2)} ${f(l + rad)} ${f(b)} C${f(l + rad * 0.448)} ${f(b)} ${f(l)} ${f(b - rad * 0.448)} ${f(l)} ${f((t + b) / 2)} C${f(l)} ${f(t + rad * 0.448)} ${f(l + rad * 0.448)} ${f(t)} ${f(l + rad)} ${f(t)} Z`;
}
class LiquidTabIndicator {
  constructor(menu, readPage, keys = ["home", "album", "my"]) {
    this.menu = menu;
    this.readPage = readPage;
    this.keys = keys;
    this.current = null;
    this.target = null;
    this.raf = null;
    this.duration = 320;
    this.width = 0;
    this.destroyed = false;
    this.buttons = [...menu.querySelectorAll(":scope > .tab")];
    this.canClip =
      typeof CSS !== "undefined" &&
      CSS.supports("clip-path", 'path("M0 0H1V1H0Z")');
    const ns = "http://www.w3.org/2000/svg";
    this.svg = document.createElementNS(ns, "svg");
    this.svg.setAttribute("class", "liquid-tab-indicator");
    this.svg.setAttribute("aria-hidden", "true");
    this.path = document.createElementNS(ns, "path");
    this.svg.append(this.path);
    this.copy = document.createElement("div");
    this.copy.className = "liquid-tab-copy";
    this.copy.setAttribute("aria-hidden", "true");
    for (const button of this.buttons) {
      const label = document.createElement("span");
      label.className = "liquid-tab-label";
      label.innerHTML = button.innerHTML;
      this.copy.append(label);
    }
    menu.prepend(this.svg);
    menu.append(this.copy);
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.onMotion = () => this.sync(true);
    this.motion.addEventListener?.("change", this.onMotion);
    this.resize = new ResizeObserver(() => this.sync(true));
    this.resize.observe(menu);
    this.onDeviceResize = () => this.sync(true);
    if (typeof window !== "undefined")
      window.addEventListener("zhipai-device-resize", this.onDeviceResize);
  }
  stop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.menu.classList.remove("liquid-moving");
  }
  measure(index) {
    if (!this.menu.clientWidth || !this.buttons[index]) return null;
    const outer = this.menu.getBoundingClientRect(),
      button = this.buttons[index].getBoundingClientRect();
    // The whole preview can be transformed. SVG/clip-path coordinates remain
    // logical CSS pixels, while client rectangles are viewport pixels.
    const scale =
      this.menu.offsetWidth && outer.width
        ? outer.width / this.menu.offsetWidth
        : 1;
    const x = outer.left + this.menu.clientLeft * scale,
      y = outer.top + this.menu.clientTop * scale;
    return {
      left: (button.left - x) / scale,
      right: (button.right - x) / scale,
      top: (button.top - y) / scale,
      bottom: (button.bottom - y) / scale,
    };
  }
  paint(frame) {
    this.current = {
      ...frame,
    };
    const d = liquidTabPath(frame, this.target.right - this.target.left);
    this.path.setAttribute("d", d);
    if (this.canClip) this.copy.style.clipPath = `path("${d}")`;
  }
  sync(snap = false) {
    if (this.destroyed) return;
    const index = this.keys.indexOf(this.readPage());
    if (index < 0) {
      this.stop();
      return;
    }
    const target = this.measure(index);
    if (!target) return;
    const resized = this.width !== this.menu.clientWidth;
    this.width = this.menu.clientWidth;
    if (
      this.target &&
      Object.keys(target).every((key) => target[key] === this.target[key]) &&
      !snap &&
      !resized
    )
      return;
    this.stop();
    this.target = target;
    if (
      !this.current ||
      snap ||
      resized ||
      this.motion.matches ||
      !this.canClip
    ) {
      this.paint(target);
      this.menu.classList.add("liquid-ready");
      this.menu.classList.toggle("liquid-no-clip", !this.canClip);
      return;
    }
    const from = {
        ...this.current,
      },
      start = performance.now();
    this.menu.classList.add("liquid-moving");
    const tick = (now) => {
      if (this.destroyed) return;
      const progress = Math.min(1, (now - start) / this.duration);
      this.paint(liquidTabFrame(from, target, progress));
      if (progress < 1) this.raf = requestAnimationFrame(tick);
      else {
        this.raf = null;
        this.menu.classList.remove("liquid-moving");
      }
    };
    this.raf = requestAnimationFrame(tick);
  }
  destroy() {
    this.destroyed = true;
    this.stop();
    this.resize.disconnect();
    this.motion.removeEventListener?.("change", this.onMotion);
    if (typeof window !== "undefined")
      window.removeEventListener("zhipai-device-resize", this.onDeviceResize);
    this.svg.remove();
    this.copy.remove();
    this.menu.classList.remove("liquid-ready", "liquid-no-clip");
  }
}
registerController("liquidTabs", () => {
  let indicator;
  return {
    init() {
      indicator = new LiquidTabIndicator(this.$el, () => this.page);
      this.$watch("page", () => this.$nextTick(() => indicator.sync()));
      this.$nextTick(() => indicator.sync(true));
    },
    destroy() {
      indicator?.destroy();
    },
  };
});
export { liquidTabFrame, liquidTabPath, LiquidTabIndicator };
