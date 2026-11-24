const cardHold = 3200;
const cardSlide = 650;
const idleResume = 5000;
let hasEntered = false;

function scrollIndex(node, { centers, step }) {
  const offset = node.scrollLeft;
  const estimated = Math.round((offset - centers[0]) / step);
  const index = Math.max(0, Math.min(centers.length - 1, estimated));
  return index + (offset - centers[index]) / step;
}
function slideEase(progress) {
  // Solve the time coordinate of cubic-bezier(.22, 1, .36, 1) before reading its distance.
  let low = 0;
  let high = 1;
  for (let i = 0; i < 12; i++) {
    const t = (low + high) / 2;
    const rest = 1 - t;
    const x = 3 * rest * rest * t * .22 + 3 * rest * t * t * .36 + t ** 3;
    if (x < progress) low = t;
    else high = t;
  }
  return 1 - (1 - (low + high) / 2) ** 3;
}

export function mountGraduateRail(node, { count, initialIndex = 0, afterSwitch = false }) {
  const middleStart = count > 1 ? count : 0;
  let layout;
  const doc = node.ownerDocument;
  const win = doc.defaultView;
  const page = node.closest(".university-page--landing");
  const cards = Array.from(node.children);
  const motion = win.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  const listen = (target, name, callback) =>
    target.addEventListener(name, callback, { signal: listeners.signal, passive: true });
  const pointers = new Set();
  const entranceCards = [];
  let depthFrame = 0;
  let slideFrame = 0;
  let autoplayTimer;
  let entranceTimer;
  let settleTimer;
  let resumeAt = afterSwitch ? win.performance.now() + idleResume : 0;
  let lastWritten = node.scrollLeft;
  let touchActive = false;
  let keyboardFocused = false;
  let layerOpen = false;
  let visible = true;
  let position = Number.isInteger(initialIndex) ? Math.max(0, Math.min(initialIndex, count - 1)) : 0;
  const hasScrollEnd = "onscrollend" in node;

  function updateDepth() {
    const current = scrollIndex(node, layout);
    const index = Math.max(0, Math.min(cards.length - 1, Math.round(current)));
    position = index % count;
    cards.forEach((card, index) => {
      const difference = index - current;
      const signed = Math.abs(difference) < 0.01 ? 0 : Math.max(-2, Math.min(2, difference));
      const distance = Math.abs(signed);
      card.style.setProperty("--card-signed", signed);
      card.style.setProperty("--card-offset", distance);
      card.style.setProperty("--card-layer", distance < 0.5 ? 4 : distance < 1.5 ? 2 : 1);
      card.toggleAttribute("data-centered", distance <= 0.35);
    });
  }
  function writeScroll(offset) {
    node.scrollLeft = offset;
    lastWritten = node.scrollLeft;
    win.cancelAnimationFrame(depthFrame);
    depthFrame = 0;
    updateDepth();
  }
  function stopSlide() {
    if (!slideFrame) return;
    win.cancelAnimationFrame(slideFrame);
    slideFrame = 0;
    delete node.dataset.railSliding;
  }
  function canAutoplay() {
    return count > 1 && visible && !doc.hidden && !motion.matches &&
      !layerOpen && !keyboardFocused && !touchActive && !pointers.size;
  }
  function schedule(delay = cardHold) {
    win.clearTimeout(autoplayTimer);
    if (!canAutoplay() || slideFrame) return;
    autoplayTimer = win.setTimeout(advance, Math.max(delay, resumeAt - win.performance.now()));
  }
  function rest() {
    resumeAt = win.performance.now() + idleResume;
    clearEntrance();
    stopSlide();
    schedule(0);
  }
  function measure() {
    const step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;
    const centers = cards.map((card) => card.offsetLeft + (card.offsetWidth - node.clientWidth) / 2);
    const previous = layout;
    if (previous?.step === step && previous.centers[0] === centers[0]) return;
    stopSlide();
    layout = { step: step || 1, centers };
    writeScroll(centers[middleStart + position]);
    if (previous) schedule();
  }
  function settle() {
    win.clearTimeout(settleTimer);
    if (slideFrame || touchActive || pointers.size) return;
    const index = Math.round(scrollIndex(node, layout));
    if (count < 2 || (index >= middleStart && index < middleStart + count)) return;
    // The three groups have identical spacing, so the same centered view survives the reset.
    const centered = Math.max(0, Math.min(cards.length - 1, index));
    writeScroll(layout.centers[middleStart + centered % count]);
  }
  function slideTo(index, afterSlide) {
    win.clearTimeout(autoplayTimer);
    stopSlide();
    const from = node.scrollLeft;
    const to = layout.centers[index];
    if (motion.matches || Math.abs(from - to) < 0.5) {
      writeScroll(to);
      settle();
      afterSlide();
      return;
    }
    // Native snapping resumes once the destination (including a loop reset) is centered.
    node.dataset.railSliding = "";
    const startedAt = win.performance.now();
    function step(now) {
      const progress = Math.min(1, (now - startedAt) / cardSlide);
      if (progress < 1) {
        writeScroll(from + (to - from) * slideEase(progress));
        slideFrame = win.requestAnimationFrame(step);
        return;
      }
      slideFrame = 0;
      writeScroll(to);
      settle();
      delete node.dataset.railSliding;
      afterSlide();
    }
    slideFrame = win.requestAnimationFrame(step);
  }
  function advance() {
    if (!canAutoplay()) return;
    settle();
    slideTo(Math.round(scrollIndex(node, layout)) + 1, schedule);
  }
  function scroll() {
    const manual = Math.abs(node.scrollLeft - lastWritten) >= 0.5;
    if (manual) rest();
    if (!depthFrame && !slideFrame) {
      depthFrame = win.requestAnimationFrame(() => {
        depthFrame = 0;
        updateDepth();
      });
    }
    if (manual && !hasScrollEnd) {
      win.clearTimeout(settleTimer);
      settleTimer = win.setTimeout(settle, 160);
    }
  }
  function clearEntrance() {
    win.clearTimeout(entranceTimer);
    for (const card of entranceCards) delete card.dataset.railEntry;
    entranceCards.length = 0;
  }
  function enter() {
    if (hasEntered) return false;
    hasEntered = true;
    if (motion.matches || doc.hidden) return false;
    const index = middleStart + position;
    for (const [offset, role] of [[0, "center"], [-1, "left"], [1, "right"]]) {
      const card = cards[index + offset];
      if (!card) continue;
      card.dataset.railEntry = role;
      entranceCards.push(card);
    }
    entranceTimer = win.setTimeout(() => {
      clearEntrance();
      schedule();
    }, 520);
    return true;
  }
  function releasePointer(event) {
    if (pointers.delete(event.pointerId)) rest();
  }
  function releaseTouch(event) {
    if (touchActive && !event.touches.length) {
      touchActive = false;
      rest();
    }
  }

  const observer = new win.ResizeObserver(measure);
  measure();
  if (!enter()) schedule();
  observer.observe(node);
  const visibility = typeof win.IntersectionObserver === "function"
    ? new win.IntersectionObserver(([entry]) => {
        const next = entry.intersectionRatio >= 0.5;
        if (visible === next) return;
        visible = next;
        rest();
      }, { threshold: 0.5 })
    : null;
  visibility?.observe(node);
  listen(node, "scroll", scroll);
  listen(node, "scrollend", settle);
  listen(page, "pointerdown", (event) => {
    pointers.add(event.pointerId);
    rest();
  });
  listen(win, "pointerup", releasePointer);
  listen(win, "pointercancel", releasePointer);
  listen(page, "touchstart", () => {
    touchActive = true;
    rest();
  });
  listen(win, "touchend", releaseTouch);
  listen(win, "touchcancel", releaseTouch);
  listen(page, "wheel", rest);
  listen(page, "focusin", (event) => {
    keyboardFocused = node.contains(event.target) && event.target.matches(":focus-visible");
    rest();
  });
  listen(node, "focusout", (event) => {
    if (node.contains(event.relatedTarget)) return;
    keyboardFocused = false;
    rest();
  });
  listen(doc, "visibilitychange", () => {
    if (doc.hidden) {
      pointers.clear();
      touchActive = false;
    }
    rest();
  });
  listen(motion, "change", rest);
  return {
    get index() { return position; },
    centerSide(index) {
      if (Math.abs(index - scrollIndex(node, layout)) <= 0.35) return false;
      slideTo(index, rest);
      return true;
    },
    move(direction) {
      settle();
      const index = Math.round(scrollIndex(node, layout));
      slideTo(Math.max(0, Math.min(cards.length - 1, index + direction)), rest);
    },
    setPaused(next) {
      if (layerOpen === next) return;
      layerOpen = next;
      rest();
    },
    destroy() {
      listeners.abort();
      observer.disconnect();
      visibility?.disconnect();
      clearEntrance();
      stopSlide();
      win.cancelAnimationFrame(depthFrame);
      win.clearTimeout(autoplayTimer);
      win.clearTimeout(settleTimer);
    },
  };
}
