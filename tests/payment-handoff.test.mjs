import test from "node:test";
import assert from "node:assert/strict";
import { getStore, registerStore } from "../src/runtime/state.js";
import {
  checkoutMethods,
  createHandoff,
  finishHandoff,
  handoffStatus,
  lockPayment,
  paymentReturnAccess,
  presentHandoff,
  wasInterrupted,
} from "../src/domain/payment-handoff.js";

test("digital iOS orders and physical checkout use the correct channels", () => {
  for (const kind of ["electronic", "repair", "outfit"])
    assert.deepEqual(checkoutMethods(kind, "ios"), ["apple"]);
  for (const kind of ["print", "postcard", "stamp"])
    assert.deepEqual(checkoutMethods(kind, "ios"), ["wechat", "alipay"]);
  assert.deepEqual(checkoutMethods("electronic", "external"), [
    "wechat",
    "alipay",
  ]);
});

test("unknown and missed callback states do not permit another charge before querying", () => {
  const unknown = createHandoff("print", "wechat", "unknown");
  assert.equal(handoffStatus(unknown), "verifying");
  assert.equal(handoffStatus(unknown, { query: true }), "verifying");
  assert.equal(
    handoffStatus(unknown, { query: true, resolution: "unpaid" }),
    "pending",
  );
  const missing = createHandoff("repair", "apple", "missing-return");
  assert.equal(handoffStatus(missing), "verifying");
  assert.equal(handoffStatus(missing, { query: true }), "paid");
});

test("return after login expiry retains the original order and requires the original account", async (t) => {
  const keys = ["location", "window", "document", "localStorage"];
  const previous = keys.map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]);
  t.after(() => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const address = new URL(
    "https://prototype.test/zhipai-react/?page=tool&tool=repair&view=work&resume=original",
  );
  const saved = new Map();
  Object.assign(globalThis, {
    location: address,
    window: new EventTarget(),
    document: new EventTarget(),
    localStorage: {
      getItem: (key) => saved.get(key),
      setItem: (key, value) => saved.set(key, value),
      removeItem: (key) => saved.delete(key),
    },
  });
  registerStore("account", {
    session: { phone: "actor-a" },
    logout() {
      this.session = null;
    },
  });
  const route = address.pathname + address.search;
  const data = { id: "original", amount: 200, owner: "actor-a" };
  const checkout = createHandoff("repair", "apple", "login-expired");
  const ui = getStore("paymentHandoff");
  const returned = presentHandoff(checkout, data);
  assert.equal(ui.current.id, data.id);
  ui.current.returnToApp();
  assert.equal(await returned, "verifying");
  assert.equal(getStore("account").session, null);
  assert.ok(wasInterrupted(checkout));

  ui.pending = null;
  ui.init(); // cold start with the saved return pointer
  assert.equal(ui.pending.id, data.id);
  assert.equal(paymentReturnAccess(ui.pending, route, null), "sign-in");
  assert.equal(
    paymentReturnAccess(ui.pending, route, "actor-b"),
    "different-account",
  );
  assert.equal(paymentReturnAccess(ui.pending, route, "actor-a"), "restore");
  assert.equal(
    paymentReturnAccess(ui.pending, address.pathname, "actor-a"),
    null,
  );
  assert.equal(handoffStatus(checkout, { query: true }), "paid");

  finishHandoff("wrong-order", checkout);
  assert.equal(ui.pending.id, data.id);
  finishHandoff(data.id, checkout);
  assert.equal(ui.pending, null);
  assert.equal(saved.size, 0);
});

test("checkout and query share a lock for an original order", () => {
  const unlock = lockPayment("repair:original");
  assert.throws(() => lockPayment("repair:original"), /付款正在确认/);
  unlock();
  lockPayment("repair:original")();
});
