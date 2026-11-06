import React, { useEffect, useRef, useState } from "react";
import { visiblePhotoBounds } from "./photo-processing.js";
import { Portal } from "../runtime/components.jsx";

export function useArchiveZoom(identity) {
  const [side, setSide] = useState("");
  const previous = useRef("");
  useEffect(() => {
    const last = previous.current;
    previous.current = side;
    if (!last || side || !identity) return;
    const frame = requestAnimationFrame(() =>
      document
        .querySelector('[data-zoom-source="' + last + '"]')
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [identity, side]);
  useEffect(() => {
    const sync = () =>
      setSide(
        history.state?.archiveZoom?.identity === identity
          ? history.state.archiveZoom.side
          : "",
      );
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [identity]);
  return {
    side,
    open(side = "photo") {
      if (!identity) return;
      history.pushState(
        { ...history.state, archiveZoom: { identity, side } },
        "",
        location.href,
      );
      setSide(side);
    },
    close() {
      if (history.state?.archiveZoom?.identity === identity) history.back();
      else setSide("");
    },
  };
}

export function ArchiveZoom({ onClose, children }) {
  const close = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    close.current?.focus();
  }, []);
  return (
    <Portal target="#shared-modal-layer">
      <div
        className="album-photo-viewer archive-zoom"
        role="dialog"
        aria-modal="true"
        aria-label="照片大图"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            close.current?.focus();
          }
        }}
      >
        <div className="album-photo-viewer-toolbar">
          <button
            className="album-photo-viewer-close"
            ref={close}
            aria-label="关闭照片大图"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div
          className="album-photo-viewer-stage"
          onErrorCapture={() => setFailed(true)}
          onClick={(e) => {
            const frame = e.currentTarget.getBoundingClientRect(),
              image = e.currentTarget.querySelector("img");
            const bounds =
              image &&
              visiblePhotoBounds({
                frame,
                image: image.getBoundingClientRect(),
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
              });
            const x = ((e.clientX - frame.left) / frame.width) * 100,
              y = ((e.clientY - frame.top) / frame.height) * 100;
            if (
              !bounds ||
              x < bounds.left ||
              x > bounds.left + bounds.width ||
              y < bounds.top ||
              y > bounds.top + bounds.height
            )
              onClose();
          }}
        >
          {failed ? (
            <p className="album-photo-viewer-error" role="status">
              照片暂时无法显示
            </p>
          ) : (
            children
          )}
        </div>
      </div>
    </Portal>
  );
}
