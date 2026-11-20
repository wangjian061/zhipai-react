import React, { useEffect, useId, useRef } from "react";
import { getControllerScopes } from "../runtime/state.js";
import { accountRoute } from "../domain/account.js";
import SharedSheet from "./SharedSheet.jsx";
import { ModuleFeedback } from "./Feedback.jsx";
import {
  checkoutFeedback,
  checkoutMethod,
  checkoutMethods,
  paymentChannels,
  paymentScenarios,
  wasInterrupted,
  wasPresented,
} from "../domain/payment-handoff.js";

export function PaymentChoices({
  kind,
  method,
  setMethod,
  outcome,
  setOutcome,
  disabled,
}) {
  const group = useId();
  const methods = checkoutMethods(kind);
  const channel = checkoutMethod(kind, method);
  return (
    <>
      {methods.length > 1 ? (
        <fieldset className="checkout-methods" disabled={disabled}>
          <legend>支付方式</legend>
          {methods.map((value) => (
            <label key={value}>
              <span>{paymentChannels[value].label}</span>
              <input
                type="radio"
                name={group}
                checked={channel === value}
                onChange={() => setMethod(value)}
              />
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="checkout-destination">{paymentChannels[channel].label}</p>
      )}
      <p className="checkout-hint">支付后回到知拍查看结果。</p>
      <label className="checkout-demo-field">
        <span>支付演示场景</span>
        <select
          value={outcome}
          disabled={disabled}
          onChange={(event) => setOutcome(event.target.value)}
        >
          {paymentScenarios.map(([value, title]) => (
            <option key={value} value={value}>
              {title}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function PaymentRecovery({
  order,
  resolution,
  setResolution,
  busy = false,
}) {
  const feedback = checkoutFeedback(order);
  if (!feedback) return null;
  return (
    <div className="checkout-recovery">
      <ModuleFeedback
        title={busy ? "正在查询支付结果…" : feedback.title}
        tone={order.status === "verifying" ? "warning" : "info"}
      >
        {feedback.detail}
      </ModuleFeedback>
      {order.status === "verifying" &&
        order.handoff?.outcome === "unknown" &&
        setResolution && (
          <label className="checkout-demo-field">
            <span>原型查款结果</span>
            <select
              value={resolution}
              disabled={busy}
              onChange={(event) => setResolution(event.target.value)}
            >
              <option value="unknown">仍未确认</option>
              <option value="paid">已支付</option>
              <option value="unpaid">未支付</option>
            </select>
          </label>
        )}
    </div>
  );
}

export function PaymentHandoffScreen({ checkout }) {
  if (!checkout) return null;
  const attempt = checkout.attempt;
  const missing = attempt.outcome === "missing-return";
  return (
    <SharedSheet
      target="#payment-handoff-layer"
      id="handoff-cashier-title"
      title={paymentChannels[attempt.method].cashier}
      opened
      onClose={() => checkout.returnToApp(true)}
      footer={
        <button
          type="button"
          className="tool-primary"
          onClick={() => checkout.returnToApp()}
        >
          {missing ? "手动返回知拍" : "返回知拍"}
        </button>
      }
    >
      <p className="checkout-hint">原型演示，本次不会实际扣款。</p>
      <p className="checkout-cashier-amount">
        <span className="ui-price">¥{(checkout.amount / 100).toFixed(2)}</span>
      </p>
      <p className="checkout-cashier-status">
        {paymentScenarios.find(([value]) => value === attempt.outcome)?.[1]}
      </p>
    </SharedSheet>
  );
}

function navigatePaymentReturn(path, replace = false) {
  history[replace ? "replaceState" : "pushState"]({}, "", path);
  window.dispatchEvent(new Event("zhipai-route"));
}

export function PaymentAccountPrompt({ access, path }) {
  if (!access || access === "restore") return null;
  const different = access === "different-account";
  const leave = () =>
    navigatePaymentReturn(location.pathname + "?page=home", true);
  return (
    <SharedSheet
      target="#payment-handoff-layer"
      id="handoff-account-title"
      title={different ? "请切回原付款账号" : "请重新登录"}
      opened
      onClose={leave}
      footer={
        <button
          type="button"
          className="tool-primary"
          onClick={() => accountRoute(different ? "phone" : "welcome", path)}
        >
          {different ? "切换账号" : "重新登录"}
        </button>
      }
    >
      <ModuleFeedback
        title={different ? "当前账号与该笔订单不一致" : "登录状态已失效"}
      >
        该笔订单已保留。登录原付款账号后会自动查询支付结果。
      </ModuleFeedback>
    </SharedSheet>
  );
}

function paymentAtCurrentPage(page) {
  const {
    printStudio,
    keepsakeStudio,
    cameraStudio,
    toolStudio,
    collectionFlow,
  } = getControllerScopes();
  if (page === "print" && printStudio?.view === "confirm")
    return [
      printStudio.order,
      printStudio.processing,
      printStudio.resolvePayment,
    ];
  if (page === "keepsake" && keepsakeStudio?.view === "confirm")
    return [
      keepsakeStudio.order,
      keepsakeStudio.locked,
      keepsakeStudio.resolvePayment,
    ];
  if (page === "camera" && cameraStudio?.step === "editor")
    return [
      cameraStudio.draft?.order,
      cameraStudio.busy,
      cameraStudio.queryPayment,
    ];
  if (page === "tool" && toolStudio?.view === "work")
    return [
      toolStudio.currentOrder,
      toolStudio.busy,
      toolStudio.restoreExistingPayment,
    ];
  if (page === "collection" && collectionFlow?.isRecordView)
    return [
      collectionFlow.current?.payment,
      collectionFlow.busy,
      collectionFlow.payCollection,
      collectionFlow.current?.owner,
    ];
  return [];
}

export function PaymentReturnWatcher({
  page,
  owner,
  checkout,
  pending,
  access,
}) {
  const [order, busy, recover, recordOwner] = paymentAtCurrentPage(page);
  const lastInitial = useRef(null);
  const initialPage = useRef(true);
  const id = order?.handoff?.id;
  const eligible =
    !!owner &&
    owner === (recordOwner || order?.owner) &&
    !!id &&
    order.status === "verifying" &&
    !busy &&
    !checkout &&
    (!access ||
      (access === "restore" &&
        pending.id === order.id &&
        pending.attemptId === id));

  useEffect(() => {
    if (!initialPage.current) return;
    initialPage.current = false;
    const start = new URLSearchParams(location.search);
    if (
      pending &&
      start.size <= 1 &&
      (!start.size || start.get("page") === "home")
    )
      navigatePaymentReturn(pending.path, true);
  }, [pending]);

  useEffect(() => {
    if (checkout && checkout.owner !== owner) checkout.returnToApp(true);
  }, [checkout, owner]);

  useEffect(() => {
    if (!eligible) return;
    const onReturn = () => {
      if (document.visibilityState !== "hidden")
        void recover({ automatic: true });
    };
    // Restoring the original page after closing the app should query once.
    // A live simulation with a lost callback remains visible until the next return or query.
    if (
      (!wasPresented(order.handoff) || wasInterrupted(order.handoff)) &&
      lastInitial.current !== id
    ) {
      lastInitial.current = id;
      onReturn();
    }
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("online", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("online", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [eligible, id, order?.handoff, recover]);
  return null;
}
