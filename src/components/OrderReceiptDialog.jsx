import React, { useCallback, useEffect, useRef } from "react";
import { Portal } from "../runtime/components.jsx";

export default function OrderReceiptDialog({ s }) {
  const dialog = useRef(null);
  const opened = s.sheet === "receipt" && s.page === "orders";
  const order = s.current;
  const assignDialog = useCallback((node) => {
    if (node && !dialog.current) node.focus();
    dialog.current = node;
  }, []);
  useEffect(() => {
    if (
      s.sheet &&
      !s.paymentBusy &&
      (!order || !s.owner || s.page !== "orders" || !s.canConfirmReceipt)
    )
      s.closePayment();
  }, [
    order?.key,
    s.owner,
    s.page,
    s.paymentBusy,
    s.sheet,
    s.canConfirmReceipt,
  ]);
  if (!opened || !order || !s.owner) return null;
  const trap = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      s.closePayment();
    }
    if (event.key !== "Tab") return;
    const nodes = [
      ...dialog.current.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), summary",
      ),
    ].filter((node) => node.getClientRects().length);
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
    <Portal target="#orders-modal-layer">
      <div
        className="order-payment-overlay is-confirmation"
        onClick={(event) => {
          if (event.target === event.currentTarget) s.closePayment();
        }}
      >
        <section
          ref={assignDialog}
          tabIndex={-1}
          className="order-cancel-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-receipt-title"
          aria-describedby="order-receipt-copy"
          aria-busy={s.paymentBusy}
          onKeyDown={trap}
        >
          <header className="ui-sheet-header">
            <h2 id="order-receipt-title">确认已收到照片？</h2>
            <button
              className="order-payment-close"
              aria-label="关闭收货确认"
              disabled={s.paymentBusy}
              onClick={() => s.closePayment()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </header>
          <div className="ui-sheet-body">
            <p id="order-receipt-copy" className="order-cancel-copy">
              确认后，本订单将标记为已签收。
            </p>
            {!s.online && (
              <p className="orders-error" role="status">
                网络不可用，请恢复连接后重试。
              </p>
            )}
            {s.paymentError && (
              <p className="orders-error" role="alert">
                {s.paymentError}
              </p>
            )}
          </div>
          <footer className="order-cancel-actions">
            <button
              className="orders-secondary"
              disabled={s.paymentBusy}
              onClick={() => s.closePayment()}
            >
              暂不确认
            </button>
            <button
              className="orders-primary"
              disabled={s.paymentBusy || !s.online}
              onClick={() => s.confirmReceipt()}
            >
              {s.paymentBusy ? "正在确认…" : "确认收货"}
            </button>
          </footer>
        </section>
      </div>
    </Portal>
  );
}
