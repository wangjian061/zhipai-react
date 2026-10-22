import React, { useCallback, useEffect, useRef } from "react";
import { Portal } from "../runtime/components.jsx";

export default function OrderPaymentSheet({ s }) {
  const dialog = useRef(null);
  const opened = !!s.sheet && s.page === "orders";
  const order = s.current;
  const assignDialog = useCallback((node) => {
    if (node && !dialog.current) node.focus();
    dialog.current = node;
  }, []);
  useEffect(() => {
    if (
      s.sheet &&
      !s.paymentBusy &&
      (!order || !s.owner || s.page !== "orders")
    )
      s.closePayment();
  }, [order?.key, s.owner, s.page, s.paymentBusy, s.sheet]);
  if (!opened || !order || !s.owner) return null;
  const cancel = s.sheet === "cancel";
  const query = s.queryMode;
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
        className={`order-payment-overlay${cancel ? " is-confirmation" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) s.closePayment();
        }}
      >
        <section
          ref={assignDialog}
          tabIndex={-1}
          className={
            cancel ? "order-cancel-dialog" : "ui-sheet order-payment-sheet"
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-payment-title"
          aria-busy={s.paymentBusy}
          onKeyDown={trap}
        >
          <header className="ui-sheet-header">
            <h2 id="order-payment-title">
              {cancel ? "取消这笔订单？" : query ? "查询付款结果" : "确认付款"}
            </h2>
            <button
              className="order-payment-close"
              aria-label={cancel ? "关闭取消确认" : "关闭付款窗口"}
              disabled={s.paymentBusy}
              onClick={() => s.closePayment()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </header>
          <div className="ui-sheet-body">
            {cancel ? (
              <p className="order-cancel-copy">
                取消后本订单将关闭，尚未付款。
              </p>
            ) : (
              <>
                <div className="order-payment-summary">
                  <p>{order.title}</p>
                  <strong>{s.money(order.amount)}</strong>
                </div>
                {query ? (
                  <p className="orders-notice">
                    付款结果待确认，查询期间无需再次付款。
                  </p>
                ) : (
                  [
                    ["wechat", "微信支付"],
                    ["alipay", "支付宝"],
                  ].map(([id, name]) => (
                    <label className="order-payment-option" key={id}>
                      {name}
                      <input
                        type="radio"
                        name="order-payment-method"
                        checked={s.paymentMethod === id}
                        disabled={s.paymentBusy}
                        onChange={() => {
                          s.paymentMethod = id;
                        }}
                      />
                    </label>
                  ))
                )}
                <details className="order-payment-demo">
                  <summary
                    onClick={(event) => {
                      if (s.paymentBusy) event.preventDefault();
                    }}
                  >
                    原型演示
                  </summary>
                  <label>
                    模拟付款结果
                    <select
                      aria-label="模拟付款结果"
                      value={s.paymentOutcome}
                      disabled={s.paymentBusy}
                      onChange={(event) => {
                        s.paymentOutcome = event.target.value;
                      }}
                    >
                      <option value="success">付款成功</option>
                      <option value="failure">未付款</option>
                      <option value="unknown">结果待确认</option>
                    </select>
                  </label>
                </details>
              </>
            )}
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
          <footer
            className={cancel ? "order-cancel-actions" : "ui-sheet-footer"}
          >
            {cancel && (
              <button
                className="orders-secondary"
                disabled={s.paymentBusy}
                onClick={() => s.closePayment()}
              >
                暂不取消
              </button>
            )}
            <button
              className="orders-primary"
              disabled={s.paymentBusy || !s.online}
              onClick={() => (cancel ? s.cancel() : s.pay())}
            >
              {s.paymentBusy
                ? "正在确认…"
                : cancel
                  ? "确认取消"
                  : query
                    ? "查询付款结果"
                    : `确认付款 ${s.money(order.amount)}`}
            </button>
          </footer>
        </section>
      </div>
    </Portal>
  );
}
