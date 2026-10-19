import React, { useCallback, useLayoutEffect } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";

export default function CollectionPaymentDrawer({ scope: s }) {
  const attach = useCallback(
    (node) => {
      if (node) s.$refs.collectionDialog = node;
    },
    [s],
  );
  useLayoutEffect(() => {
    if (s.panel === "payment")
      s.$refs.collectionDialog
        ?.querySelector("button")
        ?.focus({ preventScroll: true });
  }, [s, s.panel]);
  if (s.panel !== "payment" || !s.current) return null;
  const verifying = s.current.payment?.status === "verifying";
  return (
    <section
      className="collection-drawer collection-auth-drawer collection-payment-drawer"
      ref={attach}
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-payment-title"
    >
      <header className="collection-auth-header">
        <div>
          <h2 id="collection-payment-title">支付采集费用</h2>
          <p>本次任务支付一次，重拍无需重复付费</p>
        </div>
        <button
          type="button"
          disabled={s.busy}
          onClick={() => s.closePanel()}
          aria-label="关闭"
        >
          <CollectionIcon name="close" />
        </button>
      </header>
      <div className="collection-auth-body">
        <section className="collection-payment-summary" aria-label="费用明细">
          <span>专项采集服务</span>
          <strong>{s.project.name}</strong>
          <div>
            <span>应付金额</span>
            <b>¥{s.collectionPrice}</b>
          </div>
        </section>
        <fieldset
          className="collection-payment-methods"
          disabled={s.busy || verifying}
        >
          <legend>支付方式</legend>
          {[
            ["wechat", "微信支付"],
            ["alipay", "支付宝"],
          ].map(([value, label]) => (
            <label key={value}>
              <span>{label}</span>
              <input
                type="radio"
                name="collection-payment-method"
                value={value}
                checked={s.paymentMethod === value}
                onChange={() => {
                  s.paymentMethod = value;
                }}
              />
            </label>
          ))}
        </fieldset>
        {s.error && (
          <p className="collection-auth-error" role="alert">
            {s.error}
          </p>
        )}
      </div>
      <footer className="collection-auth-footer">
        <button
          type="button"
          className="collection-primary"
          disabled={s.disabled}
          onClick={() => s.payCollection()}
        >
          {s.collectionPaymentLabel}
        </button>
      </footer>
    </section>
  );
}
