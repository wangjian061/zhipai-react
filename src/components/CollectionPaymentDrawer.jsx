import React, { useCallback, useLayoutEffect } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
import { PaymentChoices, PaymentRecovery } from "./PaymentHandoff.jsx";
import { checkoutLabel } from "../domain/payment-handoff.js";

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
            <b><span className="ui-price">¥{s.collectionPrice}</span></b>
          </div>
        </section>
        {verifying ? (
          <PaymentRecovery order={s.current.payment} busy={s.busy}
            resolution={s.checkoutResolution} setResolution={(value) => { s.checkoutResolution = value; }}
          />
        ) : (
          <PaymentChoices kind="collection" method={s.paymentMethod}
            setMethod={(value) => { s.paymentMethod = value; }}
            outcome={s.paymentOutcome} setOutcome={(value) => { s.paymentOutcome = value; }}
            disabled={s.busy}
          />
        )}
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
          onClick={() => s.payCollection({ handoff: true })}
        >
          {s.busy ? "正在确认…" : checkoutLabel("collection", s.paymentMethod, s.current.payment)}
        </button>
      </footer>
    </section>
  );
}
