import React, { useEffect, useRef } from "react";
import { Portal } from "../runtime/components.jsx";

// The same confirmation and destructive-button treatment in all album spaces.
export default function PhotoDeleteDialog({ title = "删除这张照片？", description,
  confirmLabel = "确认删除", busy = false, unavailable = false, error, hideClose = false,
  onClose, onDelete, returnFocusRef, returnFocusSelector = "[data-photo-delete]" }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = returnFocusRef?.current || document.activeElement;
    ref.current?.focus();
    return () => queueMicrotask(() => {
      const target = previous?.isConnected ? previous : document.querySelector(returnFocusSelector);
      if (target?.getClientRects().length && !target.closest("[inert]")) target.focus({ preventScroll: true });
    });
  }, [returnFocusRef, returnFocusSelector]);
  function trap(event) {
    if (event.key === "Escape") { event.preventDefault(); if (!busy) onClose(); }
    if (event.key !== "Tab") return;
    const nodes = [...ref.current.querySelectorAll("button:not(:disabled)")];
    if (!nodes.length) { event.preventDefault(); return; }
    if (event.shiftKey && [nodes[0], ref.current].includes(document.activeElement)) {
      event.preventDefault(); nodes.at(-1).focus();
    } else if (!event.shiftKey && [nodes.at(-1), ref.current].includes(document.activeElement)) {
      event.preventDefault(); nodes[0].focus();
    }
  }
  return <Portal target="#shared-modal-layer">
    <div className="album-overlay" onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }}>
      <section ref={ref} tabIndex={-1} className="album-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="photo-delete-title" aria-describedby="photo-delete-description" aria-busy={busy} onKeyDown={trap}>
        {!hideClose && <button type="button" className="dialog-close" aria-label="关闭" disabled={busy} onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>}
        <h2 id="photo-delete-title">{title}</h2>
        <p id="photo-delete-description" className="dialog-description">{description}</p>
        {error && <div role="alert" className="album-error">{error}</div>}
        <div className="delete-confirm-actions">
          <button type="button" disabled={busy} onClick={onClose}>取消</button>
          <button type="button" className="danger" disabled={busy || unavailable} onClick={onDelete}>
            {busy ? "正在删除…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  </Portal>;
}
