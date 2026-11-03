// Source/state and server-render checks only. No browser automation or real SMS/OAuth.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const code = fs
  .readFileSync("src/domain/account.js", "utf8")
  .replace(/^import[\s\S]*?from "\.\.\/runtime\/state.js";/, "")
  .replace(/^export \{[^}]+\};/m, "");
const keys = {
  accounts: "zhipai-accounts-v1",
  session: "zhipai-session-v1",
  last: "zhipai-last-login-phone-v1",
};
const aPhone = "13800008000",
  bPhone = "13900009000";
function setup(initial = {}, ua = "iPhone") {
  const storage = new Map(Object.entries(initial)),
    stores = {},
    events = new Map();
  let factory,
    focused = false;
  const location = {
    origin: "http://localhost:4180",
    href: "http://localhost:4180/?page=my",
    search: "?page=my",
  };
  const window = {
    addEventListener(name, fn) {
      if (!events.has(name)) events.set(name, new Set());
      events.get(name).add(fn);
    },
    removeEventListener(name, fn) {
      events.get(name)?.delete(fn);
    },
    dispatchEvent(event) {
      for (const fn of events.get(event.type) || []) fn(event);
    },
  };
  function navigate(path, notify = true) {
    const url = new URL(path, location.origin);
    location.href = url.href;
    location.search = url.search;
    if (notify) window.dispatchEvent({ type: "zhipai-route" });
  }
  vm.runInNewContext(code, {
    registerStore(name, state) {
      stores[name] = state;
    },
    registerController(name, f) {
      factory = f;
    },
    location,
    window,
    URL,
    URLSearchParams,
    TextEncoder,
    crypto: webcrypto,
    history: {
      pushState(a, b, path) {
        navigate(path, false);
      },
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    navigator: { userAgent: ua },
    document: { activeElement: null },
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    setInterval() {
      return 1;
    },
    clearInterval() {},
  });
  const account = stores.account;
  account.init();
  const s = factory();
  s.$store = stores;
  s.$refs = {
    accountPhone: {
      focus() {
        focused = true;
      },
    },
  };
  s.$nextTick = (fn) => fn();
  s.init();
  return { s, account, storage, location, navigate, focused: () => focused };
}
const enter = (env) =>
  env.navigate(
    "/?page=account&account=welcome&back=%2F%3Fpage%3Dcollection%26view%3Drecords",
  );
async function login(s, phone) {
  s.updatePhone(phone);
  s.agreed = true;
  s.sendCode();
  s.code = "123456";
  s.verifyCode();
  await new Promise((resolve) => setImmediate(resolve));
}

test("remember only successful login; logout retains number but never authenticates it", async () => {
  const e = setup();
  enter(e);
  await login(e.s, aPhone);
  assert.equal(e.account.loggedIn, true);
  assert.equal(e.storage.get(keys.last), aPhone);
  assert.equal(e.location.search, "?page=collection&view=records");
  e.account.logout();
  enter(e);
  assert.equal(e.s.phone, aPhone);
  assert.equal(e.s.displayRecentPhone, true);
  assert.equal(e.account.loggedIn, false);
  assert.equal(e.s.agreed, false);
  e.s.changePhone();
  assert.equal(e.s.phone, "");
  assert.equal(e.focused(), true);
  e.s.updatePhone(bPhone);
  e.s.agreed = true;
  e.s.sendCode();
  e.s.code = "000000";
  e.s.verifyCode();
  assert.match(e.s.error, /不正确/);
  assert.equal(e.storage.get(keys.last), aPhone);
  await login(e.s, bPhone);
  assert.equal(e.storage.get(keys.last), bPhone);
});
test("legacy migration trusts only valid session, not arbitrary saved account order", () => {
  const items = JSON.stringify([{ phone: aPhone }, { phone: bPhone }]);
  const signedOut = setup({ [keys.accounts]: items });
  enter(signedOut);
  assert.equal(signedOut.s.phone, "");
  const signedIn = setup({ [keys.accounts]: items, [keys.session]: aPhone });
  assert.equal(signedIn.storage.get(keys.last), aPhone);
  enter(signedIn);
  assert.equal(signedIn.location.search, "?page=collection&view=records");
  const stale = setup({ [keys.accounts]: items, [keys.last]: "13700007000" });
  enter(stale);
  assert.equal(stale.s.phone, "");
});
test("agreement, challenge expiry and changing number protect SMS login", () => {
  const e = setup();
  enter(e);
  const s = e.s;
  s.updatePhone(aPhone);
  s.sendCode();
  assert.equal(s.challenge, null);
  assert.match(s.error, /同意/);
  s.agreed = true;
  s.sendCode();
  assert.equal(s.view, "code");
  assert.match(s.notice, /原型演示/);
  s.code = "123456";
  s.challenge.expires = Date.now() - 1;
  s.verifyCode();
  assert.match(s.error, /过期/);
  assert.equal(e.account.loggedIn, false);
  s.changePhone();
  assert.equal(s.challenge, null);
  assert.equal(s.code, "");
  assert.equal(s.seconds, 0);
  assert.equal(s.view, "phone");
});
test("back returns to source without welcome loop; code back and resend keep challenge purpose", () => {
  const e = setup();
  enter(e);
  const s = e.s;
  s.updatePhone(aPhone);
  s.agreed = true;
  s.sendCode();
  const expires = s.challenge.expires;
  s.back();
  assert.equal(s.view, "phone");
  assert.equal(s.phone, aPhone);
  assert.equal(s.agreed, true);
  s.sendCode();
  assert.equal(s.challenge.expires, expires);
  s.back();
  s.back();
  assert.equal(e.location.search, "?page=collection&view=records");
  enter(e);
  assert.equal(s.phone, "");
  assert.equal(s.agreed, false);
});
test("password reset does not sign in, wrong password does not overwrite remembered number", async () => {
  const e = setup();
  enter(e);
  const s = e.s;
  await login(s, aPhone);
  e.account.logout();
  enter(e);
  s.route("password");
  s.route("forgot");
  s.agreed = true;
  s.sendCode();
  assert.equal(s.codePurpose, "reset");
  s.code = "123456";
  s.verifyCode();
  assert.equal(s.view, "reset");
  s.password = "Password123";
  s.confirmPassword = "Password123";
  await s.savePassword();
  assert.equal(s.view, "password");
  assert.equal(e.account.loggedIn, false);
  assert.ok(!e.storage.get(keys.accounts).includes("Password123"));
  s.password = "wrong";
  await s.passwordLogin();
  assert.match(s.error, /不正确/);
  assert.equal(
    s.notice,
    "",
    "new login attempt replaces the old password-reset confirmation",
  );
  assert.equal(e.account.loggedIn, false);
  assert.equal(e.storage.get(keys.last), aPhone);
  s.password = "Password123";
  await s.passwordLogin();
  assert.equal(e.account.loggedIn, true);
  assert.equal(e.location.search, "?page=collection&view=records");
});
test("OAuth still requires consent and verified phone; cancellation removes provider context", async () => {
  const e = setup();
  enter(e);
  const s = e.s;
  s.thirdParty("wechat");
  assert.equal(s.panel, null);
  assert.match(s.error, /同意/);
  s.agreed = true;
  s.thirdParty("wechat");
  assert.equal(s.panel, "oauth");
  s.confirmProvider();
  assert.equal(s.view, "bind");
  s.updatePhone(bPhone);
  s.sendCode();
  assert.equal(s.challenge.purpose, "bind");
  assert.equal(s.challenge.provider, "wechat");
  s.back();
  s.back();
  assert.equal(s.provider, "");
  assert.equal(s.challenge, null);
  s.thirdParty("wechat");
  s.confirmProvider();
  await login(s, bPhone);
  assert.equal(e.account.session.providers.includes("wechat"), true);
});

test("leaving during asynchronous password verification discards the late result", async () => {
  const e = setup();
  enter(e);
  const s = e.s;
  await login(s, aPhone);
  e.account.logout();
  enter(e);
  s.route("forgot");
  s.agreed = true;
  s.sendCode();
  s.code = "123456";
  s.verifyCode();
  s.password = "Password123";
  s.confirmPassword = "Password123";
  await s.savePassword();
  s.password = "Password123";
  const pending = s.passwordLogin();
  assert.equal(s.busy, true);
  e.navigate("/?page=my");
  await pending;
  assert.equal(e.account.loggedIn, false);
  assert.equal(s.password, "");
  assert.equal(s.busy, false);
  assert.equal(e.location.search, "?page=my");
});
test("deleting account removes its remembered phone; no carrier method or panel remains", async () => {
  const e = setup();
  enter(e);
  await login(e.s, aPhone);
  e.navigate("/?page=account&account=security");
  e.s.openPanel("delete");
  e.s.code = "123456";
  e.s.deleteAccount();
  assert.equal(e.account.loggedIn, false);
  assert.equal(e.account.lastPhone, "");
  assert.equal(e.storage.has(keys.last), false);
  assert.equal(e.s.oneTap, undefined);
  e.s.openPanel("carrier");
  assert.equal(e.s.panel, null);
  e.s.openPolicy("carrier");
  assert.equal(e.s.panel, null);
});
test("platform providers and return-path guard remain deterministic", () => {
  for (const [ua, expected] of [
    ["iPhone", ["apple", "wechat"]],
    ["HarmonyOS", ["huawei", "wechat"]],
    ["Android", ["wechat"]],
  ]) {
    const e = setup({}, ua);
    assert.deepEqual(Array.from(e.s.providers), expected);
    e.navigate("/?page=account&account=phone&back=https%3A%2F%2Fexample.com");
    e.s.back();
    assert.equal(e.location.search, "?page=my");
  }
});

const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "zhipai-account-ssr-"));
const server = await createServer({
  cacheDir,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
after(async () => {
  await server.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
});
const { default: Flow } = await server.ssrLoadModule(
  "/src/components/AccountLoginFlow.jsx",
);
const render = (s) =>
  renderToStaticMarkup(React.createElement(Flow, { scope: s }));
test("approved login structure renders correct primary and secondary actions, without a welcome card", () => {
  const e = setup();
  enter(e);
  const s = e.s;
  let html = render(s);
  assert.match(html, /手机号登录/);
  assert.match(html, /获取验证码/);
  assert.match(html, /密码登录/);
  assert.match(html, /其他登录方式/);
  assert.ok(!html.includes("一键登录"));
  assert.ok(!html.includes("account-login-card"));
  assert.ok(!/type="checkbox"[^>]*checked/.test(html));
  e.account.signIn(aPhone);
  e.account.logout();
  e.navigate("/?page=my");
  enter(e);
  html = render(s);
  assert.match(html, /上次登录号码/);
  assert.match(html, /138 \*\*\*\* 8000/);
  assert.match(html, /readOnly/);
  s.agreed = true;
  s.sendCode();
  html = render(s);
  assert.match(html, /one-time-code/);
  assert.match(html, /重新发送/);
  assert.ok(!html.includes("其他登录方式"));
  s.back();
  s.route("password");
  html = render(s);
  assert.match(html, /忘记密码/);
  assert.match(html, /current-password/);
  s.route("privacy");
  assert.equal(render(s), "");
});
