// Scroll the native rail, so touch scrolling and category links keep their native behavior.
const SPEED = 8 / 1000;
const INITIAL_HOLD = 2000;
const INTERACTION_HOLD = 5000;

export function startCollectionMarquee(rail, count, speed = SPEED, initialHold = INITIAL_HOLD, { autoplay = true } = {}) {
  const doc = rail.ownerDocument;
  const win = doc.defaultView;
  const motion = win.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  const listen = (target, type, fn, options = {}) =>
    target.addEventListener(type, fn, { ...options, signal: listeners.signal });
  let period = 0,
    position = 0,
    lastWritten = 0,
    lastTime = 0;
  let timer = 0,
    frame = 0,
    visible = !win.IntersectionObserver;
  let press = null,
    swiped = false,
    keyboardFocused = false;
  let resumeAt = 0;

  const phase = (x) => ((x % period) + period) % period;
  function write(x) {
    position = x;
    rail.scrollLeft = x;
    lastWritten = rail.scrollLeft;
  }
  function stop() {
    win.clearTimeout(timer);
    win.cancelAnimationFrame(frame);
  }
  function tick(now) {
    const elapsed = Math.min(80, Math.max(0, now - lastTime));
    lastTime = now;
    write(period + phase(position + elapsed * speed));
    frame = win.requestAnimationFrame(tick);
  }
  function schedule(delay = 0) {
    stop();
    if (
      !autoplay ||
      !period ||
      !visible ||
      doc.hidden ||
      motion.matches ||
      press ||
      keyboardFocused
    )
      return;
    timer = win.setTimeout(
      () => {
        position = rail.scrollLeft;
        lastTime = win.performance.now();
        frame = win.requestAnimationFrame(tick);
      },
      Math.max(delay, resumeAt - win.performance.now()),
    );
  }
  function manualRest() {
    resumeAt = win.performance.now() + INTERACTION_HOLD;
    schedule();
  }
  function measure() {
    if (!autoplay) return;
    const width = rail.getBoundingClientRect().width;
    if (!width || !rail.clientWidth) {
      stop();
      return;
    }
    // Use logical phone pixels, even when the desktop phone frame is scaled.
    const start = rail.children[0].getBoundingClientRect().left;
    const next = rail.children[count].getBoundingClientRect().left;
    const nextPeriod = ((next - start) * rail.clientWidth) / width;
    if (!nextPeriod || Math.abs(nextPeriod - period) < 0.01) return;
    const fraction = period
      ? phase(rail.scrollLeft) / period
      : (rail.scrollLeft % nextPeriod) / nextPeriod;
    period = nextPeriod;
    write(period * (1 + fraction));
    schedule(initialHold);
  }
  listen(
    rail,
    "scroll",
    () => {
      if (Math.abs(rail.scrollLeft - lastWritten) > 0.75) manualRest();
    },
    { passive: true },
  );
  listen(rail, "wheel", manualRest, { passive: true });
  listen(rail, "pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    stop();
    swiped = false;
    keyboardFocused = false;
    press = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      start: rail.scrollLeft,
    };
  });
  listen(
    win,
    "pointermove",
    (e) => {
      if (press?.id !== e.pointerId) return;
      const dx = e.clientX - press.x,
        dy = e.clientY - press.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 6) swiped = true;
      if (swiped && e.pointerType === "mouse" && Math.abs(dx) > Math.abs(dy)) {
        rail.scrollLeft =
          press.start -
          (dx * rail.clientWidth) / rail.getBoundingClientRect().width;
      }
    },
    { passive: true },
  );
  function release(e) {
    if (press?.id !== e.pointerId) return;
    if (e.type === "pointercancel") swiped = true;
    press = null;
    manualRest();
  }
  listen(win, "pointerup", release);
  listen(win, "pointercancel", release);
  listen(
    rail,
    "click",
    (e) => {
      if (swiped && e.detail !== 0) e.preventDefault();
    },
    { capture: true },
  );
  listen(rail, "focusin", (e) => {
    keyboardFocused = e.target.matches(":focus-visible");
    if (keyboardFocused) stop();
  });
  listen(rail, "focusout", (e) => {
    if (rail.contains(e.relatedTarget)) return;
    keyboardFocused = false;
    manualRest();
  });
  listen(doc, "visibilitychange", () => {
    if (doc.hidden) press = null;
    schedule(initialHold);
  });
  listen(motion, "change", () => schedule(initialHold));
  const observer =
    autoplay &&
    win.IntersectionObserver &&
    new win.IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule(initialHold);
    });
  if (observer) observer.observe(rail);
  const resize = autoplay ? new win.ResizeObserver(measure) : null;
  resize?.observe(rail);
  measure();
  return () => {
    stop();
    listeners.abort();
    if (observer) observer.disconnect();
    resize?.disconnect();
  };
}
