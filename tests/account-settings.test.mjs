// Domain navigation checks only; isolated storage, no browser or real account operations.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const code = fs
  .readFileSync("src/domain/account.js", "utf8")
  .replace(/^import[\s\S]*?from "\.\.\/runtime\/state.js";/, "")
  .replace(/^export \{[^}]+\};/m, "");
function setup(loggedIn = false) {
  let factory;
  const location = {
    origin: "http://localhost:4180",
    href: "http://localhost:4180/?page=my",
    search: "?page=my",
  };
  const nav = (path) => {
    const u = new URL(path, location.origin);
    location.href = u.href;
    location.search = u.search;
  };
  const account = {
    loggedIn,
    session: loggedIn ? { phone: "13800008000" } : null,
  };
  vm.runInNewContext(code, {
    registerStore() {},
    registerController(name, f) {
      factory = f;
    },
    location,
    URL,
    URLSearchParams,
    clearInterval() {},
    history: {
      pushState(a, b, path) {
        nav(path);
      },
    },
    window: { dispatchEvent() {} },
    Event: class {},
  });
  const s = factory();
  s.$store = { account };
  return { s, nav, location };
}
test("privacy and old settings links are public; security and password pages stay protected", () => {
  const { s, nav } = setup();
  for (const route of ["privacy", "settings"]) {
    nav("/?page=account&account=" + route);
    s.sync();
    assert.equal(s.view, "privacy");
    assert.equal(s.title, "隐私协议");
  }
  for (const route of ["security", "set", "change"]) {
    nav("/?page=account&account=" + route);
    s.sync();
    assert.equal(s.view, "welcome");
  }
});
test("independent account pages return to My, password editing returns to account security", () => {
  const { s, nav, location } = setup(true);
  for (const route of ["security", "privacy"]) {
    nav("/?page=account&account=" + route + "&back=%2F%3Fpage%3Dmy");
    s.sync();
    assert.equal(s.view, route);
    s.back();
    assert.equal(location.search, "?page=my");
  }
  for (const route of ["set", "change"]) {
    nav("/?page=account&account=" + route);
    s.sync();
    s.back();
    assert.equal(
      new URLSearchParams(location.search).get("account"),
      "security",
    );
  }
});
