import React, { useEffect, useRef } from "react";
import { Portal } from "../runtime/components.jsx";

// Shared fixed heading/footer, scrollable body and focus restoration for new sheets.
export function SheetFrame({
  id,
  opened,
  onClose,
  busy = false,
  children,
  className = "",
  returnFocusRef,
}) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!opened) return;
    const previous = document.activeElement;
    queueMicrotask(() =>
      dialog.current
        ?.querySelector("button:not(:disabled),input:not(:disabled)")
        ?.focus(),
    );
    return () =>
      queueMicrotask(() => {
        const target = returnFocusRef?.current || previous;
        if (
          target?.isConnected &&
          target.getClientRects().length &&
          !target.closest("[inert]")
        )
          target.focus({ preventScroll: true });
      });
  }, [opened, returnFocusRef]);
  if (!opened) return null;
  const key = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onClose();
    }
    if (event.key !== "Tab") return;
    const nodes = [
      ...dialog.current.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],textarea:not(:disabled)",
      ),
    ].filter((n) => n.getClientRects().length);
    if (!nodes.length) {
      event.preventDefault();
      return;
    }
    const first = nodes[0],
      last = nodes.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialog.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === dialog.current)
    ) {
      event.preventDefault();
      first.focus();
    }
  };
  return (
    <Portal target="#shared-modal-layer">
      <div
        className="shared-sheet-overlay"
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) onClose();
        }}
      >
        <section
          ref={dialog}
          className={`ui-sheet shared-sheet ${className}`.trim()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={id}
          aria-busy={busy}
          tabIndex={-1}
          onKeyDown={key}
        >
          <span className="sheet-handle" aria-hidden="true" />
          {children}
        </section>
      </div>
    </Portal>
  );
}

export default function SharedSheet({ title, footer, children, bodyRef, ...props }) {
  const { id, onClose, busy } = props;
  return (
    <SheetFrame {...props}>
      <header className="ui-sheet-header">
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          aria-label="关闭"
          disabled={busy}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="ui-sheet-panel">
        <div className="ui-sheet-body" ref={bodyRef}>{children}</div>
        {footer && (
          <footer className="ui-sheet-footer shared-sheet-actions">
            {footer}
          </footer>
        )}
      </div>
    </SheetFrame>
  );
}
