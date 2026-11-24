import React, { useEffect, useRef } from "react";
import { Portal } from "../runtime/components.jsx";
import { FeedbackToast } from "./Feedback.jsx";

export function SheetFrame({
  id,
  opened,
  onClose,
  busy = false,
  suspended = false,
  children,
  className = "",
  returnFocusRef,
  initialFocusRef,
  focusDialogOnOpen = false,
  target = "#shared-modal-layer",
  embedded = false,
  modal = true,
  dialogRef,
  sectionProps,
}) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!opened || !modal) return;
    const previous = document.activeElement;
    queueMicrotask(() => {
      const initial = initialFocusRef?.current || (focusDialogOnOpen ? dialog.current : null);
      if (initial) initial.focus({ preventScroll: true });
      else dialog.current?.querySelector("button:not(:disabled),input:not(:disabled)")?.focus();
    });
    return () => queueMicrotask(() => {
      const trigger = returnFocusRef?.current || previous;
      if (trigger?.isConnected && trigger.getClientRects().length && !trigger.closest("[inert]"))
        trigger.focus({ preventScroll: true });
    });
  }, [opened, modal, returnFocusRef, initialFocusRef, focusDialogOnOpen]);
  if (!opened) return null;

  function key(event) {
    if (!modal || event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...dialog.current.querySelectorAll(
      "button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],textarea:not(:disabled),[tabindex='0']",
    )].filter((node) => node.getClientRects().length && !node.closest("[inert]"));
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && [first, dialog.current].includes(document.activeElement)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && [last, dialog.current].includes(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  const sheet = (
    <section {...sectionProps}
      ref={(node) => { dialog.current = node; dialogRef?.(node); }}
      className={`ui-sheet shared-sheet ${className}`.trim()}
      role={modal ? "dialog" : sectionProps?.role || "dialog"}
      aria-modal={modal}
      aria-labelledby={id}
      aria-busy={busy}
      tabIndex={-1}
      inert={embedded && suspended}
      onKeyDown={key}
    >
      <span className="sheet-handle" aria-hidden="true" />
      {children}
    </section>
  );
  if (embedded) return sheet;
  const overlay = (
    <div className="shared-sheet-overlay" inert={suspended}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}>
      {sheet}
    </div>
  );
  return target ? <Portal target={target}>{overlay}</Portal> : overlay;
}

export function SheetHeader({ id, title, subtitle, leading, onClose, busy, closeLabel = "关闭", closeClassName }) {
  return (
    <header className="ui-sheet-header">
      {leading}
      {subtitle ? (
        <div className="shared-sheet-heading"><h2 id={id}>{title}</h2><p id={id + "-description"}>{subtitle}</p></div>
      ) : <h2 id={id}>{title}</h2>}
      <button type="button" className={closeClassName} aria-label={closeLabel} disabled={busy} onClick={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </header>
  );
}

export default function SharedSheet({ title, subtitle, leading, closeLabel, footer, children, bodyRef, toast, ...props }) {
  const { id, onClose, busy } = props;
  return (
    <SheetFrame {...props}>
      <SheetHeader id={id} title={title} subtitle={subtitle} leading={leading} closeLabel={closeLabel}
        onClose={onClose} busy={busy} />
      <div className="ui-sheet-panel">
        <div className="ui-sheet-body" ref={bodyRef}>{children}</div>
        {footer && <footer className="ui-sheet-footer shared-sheet-actions">{footer}</footer>}
      </div>
      <FeedbackToast message={toast} sheet />
    </SheetFrame>
  );
}
