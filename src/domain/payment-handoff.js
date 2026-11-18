import { getStore, registerStore } from "../runtime/state.js";

export const paymentScenarios = [
  ["success", "正常支付并返回"],
  ["cancel", "取消支付并返回"],
  ["failure", "支付失败并返回"],
  ["unknown", "暂未确认（模拟弱网）"],
  ["missing-return", "已扣款，回跳丢失"],
  ["login-expired", "返回时登录已失效"],
  ["unavailable", "收银台无法打开"],
];

export const paymentChannels = {
  wechat: { label: "微信支付", cashier: "微信收银台" },
  alipay: { label: "支付宝支付", cashier: "支付宝收银台" },
  apple: { label: "Apple 内购", cashier: "Apple 内购" },
};

const digital = new Set(["electronic", "repair", "outfit"]);
export function checkoutMethods(kind, platform) {
  // The default phone frame depicts iOS. Mobile Android and Harmony browser runs
  // can exercise their existing external methods on the same business pages.
  const agent =
    typeof navigator === "undefined" ? "" : navigator.userAgent || "";
  const system =
    platform ||
    (/Android|HarmonyOS|OpenHarmony/i.test(agent) ? "external" : "ios");
  return digital.has(kind) && system === "ios"
    ? ["apple"]
    : ["wechat", "alipay"];
}

export function checkoutMethod(kind, selected, platform) {
  const choices = checkoutMethods(kind, platform);
  return choices.includes(selected) ? selected : choices[0];
}

export function createHandoff(kind, method, outcome) {
  return {
    id: crypto.randomUUID(),
    kind,
    method: checkoutMethod(kind, method),
    outcome: paymentScenarios.some(([value]) => value === outcome)
      ? outcome
      : "success",
  };
}

export function handoffStatus(
  handoff,
  { query = false, resolution = "unknown" } = {},
) {
  if (["missing-return", "login-expired"].includes(handoff.outcome))
    return query ? "paid" : "verifying";
  if (handoff.outcome === "unknown") {
    if (query && resolution === "paid") return "paid";
    if (query && resolution === "unpaid") return "pending";
    return "verifying";
  }
  return handoff.outcome === "success" ? "paid" : "pending";
}

export function checkoutLabel(kind, method, order) {
  if (order?.status === "verifying") return "查询支付结果";
  if (order?.handoff?.outcome === "unavailable") return "重试打开收银台";
  if (order?.handoff) return "继续支付";
  const channel = checkoutMethod(kind, method);
  return channel === "apple" ? "使用 Apple 内购" : "去" + paymentChannels[channel].label;
}

export function checkoutFeedback(order) {
  if (order?.status === "verifying")
    return {
      title: "暂未确认支付结果",
      detail: "请先查询这笔订单，照片与本次设置已保留。",
    };
  if (order?.status !== "pending" || !order.handoff) return null;
  if (order.handoff.outcome === "unavailable")
    return {
      title: "暂时无法打开收银台",
      detail: "原订单已保留，可以重试。",
    };
  return {
    title: order.handoff.outcome === "failure" ? "支付失败" : "本次尚未支付",
    detail: "原订单已保留，可以继续支付。",
  };
}

const returnKey = "zhipai-payment-return-v1";
const businessPages = {
  print: "print",
  postcard: "keepsake",
  stamp: "keepsake",
  electronic: "camera",
  repair: "tool",
  outfit: "tool",
  collection: "collection",
};

function validReturn(pointer) {
  if (
    !pointer?.id ||
    !pointer.attemptId ||
    !pointer.owner ||
    !pointer.path?.startsWith("/")
  )
    return false;
  const url = new URL(pointer.path, location.origin);
  return (
    url.origin === location.origin &&
    businessPages[pointer.kind] === url.searchParams.get("page") &&
    url.pathname + url.search === pointer.path
  );
}

registerStore("paymentHandoff", {
  current: null,
  pending: null,
  init() {
    try {
      const saved = JSON.parse(localStorage.getItem(returnKey) || "null");
      if (validReturn(saved)) this.pending = saved;
    } catch (_) {
      // Each original order independently keeps its durable payment state.
    }
  },
});

function updateReturn(pointer) {
  getStore("paymentHandoff").pending = pointer;
  try {
    if (pointer) localStorage.setItem(returnKey, JSON.stringify(pointer));
    else localStorage.removeItem(returnKey);
  } catch (_) {}
}

export function paymentReturnAccess(pointer, path, owner) {
  if (!pointer || pointer.path !== path) return null;
  if (!owner) return "sign-in";
  return owner === pointer.owner ? "restore" : "different-account";
}

export function activePaymentReturn() {
  const pointer = getStore("paymentHandoff").pending;
  const path = location.pathname + location.search;
  const access = paymentReturnAccess(
    pointer,
    path,
    getStore("account")?.session?.phone,
  );
  return access ? { pointer, access } : null;
}

export function paymentReturnBlocked() {
  const active = activePaymentReturn();
  return !!active && active.access !== "restore";
}

export function finishHandoff(id, handoff) {
  const pending = getStore("paymentHandoff").pending;
  if (handoff && pending?.id === id && pending.attemptId === handoff.id)
    updateReturn(null);
}

const activePayments = new Set();
export function lockPayment(key) {
  if (activePayments.has(key)) throw Error("付款正在确认，请勿重复操作。");
  activePayments.add(key);
  return () => activePayments.delete(key);
}

const presented = new Set();
const interrupted = new Set();
export function wasPresented(handoff) {
  return !!handoff && presented.has(handoff.id);
}
export function wasInterrupted(handoff) {
  return !!handoff && interrupted.has(handoff.id);
}

export function presentHandoff(handoff, { id, owner, amount }) {
  if (handoff.outcome === "unavailable") return Promise.resolve("pending");
  const ui = getStore("paymentHandoff");
  if (ui.current || !owner || owner !== getStore("account")?.session?.phone)
    return Promise.resolve("verifying");
  const pointer = {
    id,
    owner,
    kind: handoff.kind,
    attemptId: handoff.id,
    path: location.pathname + location.search,
  };
  if (!validReturn(pointer)) return Promise.resolve("verifying");
  updateReturn(pointer);
  if (presented.size >= 30) {
    const oldest = presented.values().next().value;
    presented.delete(oldest);
    interrupted.delete(oldest);
  }
  presented.add(handoff.id);
  return new Promise((resolve) => {
    let leftForeground = false;
    const returnToApp = (byInterruption = false) => {
      if (ui.current?.attempt.id !== handoff.id) return;
      ui.current = null;
      window.removeEventListener("popstate", onLeave);
      window.removeEventListener("zhipai-route", onLeave);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      const needsRecovery =
        byInterruption ||
        ["missing-return", "login-expired"].includes(handoff.outcome);
      if (needsRecovery) interrupted.add(handoff.id);
      if (!byInterruption && handoff.outcome === "login-expired") {
        try {
          const account = getStore("account");
          if (account.session?.phone === owner) account.logout();
        } catch (_) {}
      }
      resolve(
        needsRecovery ? "verifying" : handoffStatus(handoff, { query: true }),
      );
    };
    function onLeave() {
      returnToApp(true);
    }
    function onFocus() {
      if (leftForeground && document.visibilityState !== "hidden") onLeave();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") leftForeground = true;
      else onFocus();
    }
    ui.current = { attempt: handoff, id, owner, amount, returnToApp };
    window.addEventListener("popstate", onLeave);
    window.addEventListener("zhipai-route", onLeave);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
  });
}
