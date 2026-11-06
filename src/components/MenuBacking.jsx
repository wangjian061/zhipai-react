import React, { useLayoutEffect, useRef } from "react";

const contents = {
  my: ".my-personal-content > section,.my-personal-content > div,.my-personal-content > h2",
  album: ".album-library-card,.album-actions,.album-hero",
  collection:
    ".collection-home-hero,.collection-project-row,.collection-shortcuts,.collection-record-card,.collection-services-inner > *,.collection-record-statistics,.collection-record-filters,.collection-login-card",
  support: ".faq-item,.support-contact,.support-result,.support-categories",
};

export default function MenuBacking({ page, section }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current,
      nav = node?.parentElement;
    const root = nav?.closest(".screen")?.querySelector("#" + page + "-page");
    if (!root || !contents[page]) return;
    let frame = 0,
      targets = [];
    const measure = () => {
      frame = 0;
      const barrier = nav.getBoundingClientRect(),
        screen = nav.closest(".screen").getBoundingClientRect();
      const scale = nav.offsetWidth ? barrier.width / nav.offsetWidth : 0;
      let overlap = 0;
      if (scale)
        for (const el of targets) {
          const r = el.getBoundingClientRect();
          let top = r.top,
            bottom = r.bottom;
          for (
            let parent = el.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            if (getComputedStyle(parent).overflowY !== "visible") {
              const box = parent.getBoundingClientRect();
              top = Math.max(top, box.top);
              bottom = Math.min(bottom, box.bottom);
            }
            if (parent === root) break;
          }
          overlap = Math.max(
            overlap,
            Math.min(screen.bottom, bottom) - Math.max(barrier.top, top),
          );
        }
      node.style.opacity = scale
        ? String(Math.min(1, overlap / (24 * scale)))
        : "0";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    const refresh = () => {
      resize.disconnect();
      resize.observe(root);
      resize.observe(nav);
      targets = Array.from(root.querySelectorAll(contents[page]));
      targets.forEach((el) => resize.observe(el));
      schedule();
    };
    const changes = new MutationObserver(refresh);
    changes.observe(root, { subtree: true, childList: true });
    root.addEventListener("scroll", schedule, { capture: true, passive: true });
    refresh();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      changes.disconnect();
      root.removeEventListener("scroll", schedule, true);
      node.style.removeProperty("opacity");
    };
  }, [page, section]);
  return (
    <span ref={ref} className="floating-menu-backing" aria-hidden="true" />
  );
}
