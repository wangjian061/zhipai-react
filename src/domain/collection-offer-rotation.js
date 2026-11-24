export function nextOfferIndex(index, step, count) {
  return (index + step + count) % count;
}

export function offerSwipeStep(dx, dy) {
  if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy) * 1.25) return 0;
  return dx < 0 ? 1 : -1;
}

// Give each offer a full reading interval again after an interaction or interruption.
export function startOfferRotation(root, advance) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const motion = win.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let timer;
  let pressed = false;
  let hovered = win.matchMedia("(hover: hover)").matches && root.matches(":hover");
  let visible = !win.IntersectionObserver;

  function schedule() {
    win.clearTimeout(timer);
    if (pressed || hovered || !visible || doc.hidden || motion.matches || root.contains(doc.activeElement)) return;
    timer = win.setTimeout(() => {
      advance();
      schedule();
    }, 6000);
  }

  function listen(target, event, handler) {
    target.addEventListener(event, handler, { signal: events.signal });
  }
  listen(root, "pointerenter", event => { hovered = event.pointerType === "mouse"; schedule(); });
  listen(root, "pointerleave", () => { hovered = false; schedule(); });
  listen(root, "pointerdown", () => { pressed = true; schedule(); });
  function release() {
    if (pressed) { pressed = false; schedule(); }
  }
  listen(win, "pointerup", release);
  listen(win, "pointercancel", release);
  listen(root, "focusin", () => win.clearTimeout(timer));
  listen(root, "focusout", event => {
    if (!root.contains(event.relatedTarget)) {
      win.clearTimeout(timer);
      timer = win.setTimeout(schedule, 0);
    }
  });
  listen(doc, "visibilitychange", () => { if (doc.hidden) pressed = false; schedule(); });
  listen(motion, "change", schedule);
  const observer = win.IntersectionObserver && new win.IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= 0.5;
    schedule();
  }, { threshold: 0.5 });
  observer?.observe(root);
  schedule();
  return () => {
    events.abort();
    observer?.disconnect();
    win.clearTimeout(timer);
  };
}
