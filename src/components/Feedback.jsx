import React, { useLayoutEffect, useRef } from "react";
import { Portal } from "../runtime/components.jsx";

const actionBars = [
  ".tabbar",
  ".camera-stage-actions",
  ".collection-scan-actions",
  ".print-footer",
  ".tool-footer",
  ".album-actions.manage-actions",
  ".ui-sheet-footer",
  ".collection-support-actions",
].join(",");

function ToastMessage({ message, sheet }) {
  const toast = useRef(null);
  useLayoutEffect(() => {
    const node = toast.current;
    const frame = node.offsetParent;
    if (!frame) return;
    const viewport = window.visualViewport;
    const scope = sheet
      ? node.closest(".ui-sheet") || frame
      : frame.closest(".app-viewport") || frame;
    const anchors = [...scope.querySelectorAll(actionBars)];
    const update = () => {
      const bounds = frame.getBoundingClientRect();
      const scale =
        (frame.offsetHeight && bounds.height / frame.offsetHeight) || 1;
      const viewportEnd = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      let end = Math.min(bounds.bottom, viewportEnd);
      for (const bar of anchors) {
        if (!bar.getClientRects().length || bar.closest("[inert],[hidden]"))
          continue;
        const rect = bar.getBoundingClientRect();
        if (rect.top >= bounds.top && rect.bottom <= bounds.bottom + 1)
          end = Math.min(end, rect.top);
      }
      node.style.setProperty(
        "--toast-reserved",
        Math.max(0, (bounds.bottom - end) / scale) + "px",
      );
    };
    node.hidden = false;
    update();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(frame);
    for (const anchor of anchors) observer?.observe(anchor);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    const duration = node.firstElementChild.offsetHeight > 22 ? 3000 : 2000;
    const timeout = setTimeout(() => {
      node.hidden = true;
    }, duration);
    return () => {
      clearTimeout(timeout);
      observer?.disconnect();
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [message, sheet]);
  return (
    <div
      className="feedback-toast"
      ref={toast}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{message}</span>
    </div>
  );
}

export function FeedbackToast({ message, sheet = false }) {
  if (!message) return null;
  if (sheet) return <ToastMessage message={message} sheet />;
  return (
    <Portal target="#toast-layer">
      <ToastMessage message={message} />
    </Portal>
  );
}
