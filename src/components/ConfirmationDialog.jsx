import React, { useEffect, useId, useRef } from "react";
import { Portal } from "../runtime/components.jsx";

export default function ConfirmationDialog({
  target = "#shared-modal-layer",
  ...props
}) {
  return (
    <Portal target={target}>
      <ConfirmationContent {...props} />
    </Portal>
  );
}

function ConfirmationContent({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  busyLabel = "正在处理…",
  dismissLabel = "取消",
  busy = false,
  unavailable = false,
  error,
  danger = false,
  hideClose = false,
  overSheet = false,
  returnFocusRef,
  returnFocusSelector,
}) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const previous = returnFocusRef?.current || document.activeElement;
    dialog.current?.focus();
    return () =>
      queueMicrotask(() => {
        const target =
          previous?.isConnected &&
          previous.getClientRects().length &&
          !previous.closest("[inert]")
            ? previous
            : returnFocusSelector &&
              document.querySelector(returnFocusSelector);
        if (target?.getClientRects().length && !target.closest("[inert]"))
          target.focus({ preventScroll: true });
      });
  }, [returnFocusRef, returnFocusSelector]);
  function trap(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onClose();
    }
    if (event.key !== "Tab") return;
    const buttons = [
      ...dialog.current.querySelectorAll("button:not(:disabled)"),
    ];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!buttons.length) event.preventDefault();
    else if (
      event.shiftKey &&
      [first, dialog.current].includes(document.activeElement)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      [last, dialog.current].includes(document.activeElement)
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div
      className={
        overSheet ? "album-overlay confirmation-overlay confirmation-over-sheet" : "album-overlay confirmation-overlay"
      }
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className="album-dialog confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
        onKeyDown={trap}
      >
        {!hideClose && (
          <button
            type="button"
            className="dialog-close"
            aria-label="关闭"
            disabled={busy}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId} className="dialog-description">
          {description}
        </p>
        {error && (
          <p role="alert" className="album-error">
            {error}
          </p>
        )}
        <div className="delete-confirm-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            {dismissLabel}
          </button>
          <button
            type="button"
            className={danger ? "danger" : "is-primary"}
            disabled={busy || unavailable}
            onClick={onConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
