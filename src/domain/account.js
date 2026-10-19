import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";

// Local functional-prototype adapter. Replace SMS/carrier/OAuth and identity checks with server APIs before production.
const ACCOUNT_KEY = "zhipai-accounts-v1",
  SESSION_KEY = "zhipai-session-v1";
function accountRoute(view = "welcome", back = "/?page=my") {
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("page", "account");
  u.searchParams.set("account", view);
  u.searchParams.set("back", back);
  history.pushState({}, "", u);
  window.dispatchEvent(new Event("zhipai-route"));
}
function accountSafeBack(path) {
  try {
    const u = new URL(path, location.origin);
    return u.origin === location.origin &&
      u.searchParams.get("page") !== "account"
      ? u.pathname + u.search
      : "/?page=my";
  } catch (_) {
    return "/?page=my";
  }
}
async function accountHash(password, salt) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(salt + ":" + password),
  );
  return Array.from(new Uint8Array(bytes), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
registerStore("account", {
  accounts: [],
  session: null,
  error: "",
  init() {
    try {
      this.accounts = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "[]");
      const phone = localStorage.getItem(SESSION_KEY);
      this.session = this.accounts.find((a) => a.phone === phone) || null;
    } catch (_) {
      this.error = "账号记录未能读取，请重试。";
    }
  },
  get loggedIn() {
    return !!this.session;
  },
  get masked() {
    return this.session
      ? this.session.phone.slice(0, 3) + " **** " + this.session.phone.slice(-4)
      : "";
  },
  save(items, phone) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(items));
    if (phone) localStorage.setItem(SESSION_KEY, phone);
    else localStorage.removeItem(SESSION_KEY);
    this.accounts = items;
    this.session = items.find((a) => a.phone === phone) || null;
  },
  signIn(phone, provider = "") {
    const items = this.accounts.map((a) => ({
      ...a,
      providers: [...(a.providers || [])],
    }));
    let account = items.find((a) => a.phone === phone);
    if (!account) {
      account = {
        phone,
        providers: [],
        salt: "",
        passwordHash: "",
      };
      items.push(account);
    }
    if (provider && !account.providers.includes(provider))
      account.providers.push(provider);
    this.save(items, phone);
  },
  update(change) {
    if (!this.session) throw Error("login");
    const items = this.accounts.map((a) =>
      a.phone === this.session.phone
        ? {
            ...a,
            ...change,
          }
        : a,
    );
    this.save(items, this.session.phone);
  },
  logout() {
    this.save(this.accounts, null);
  },
});
registerController("accountFlow", () => ({
  view: "welcome",
  returnTo: "/?page=my",
  phone: "",
  code: "",
  password: "",
  confirmPassword: "",
  oldPassword: "",
  agreed: false,
  showPassword: false,
  busy: false,
  error: "",
  notice: "",
  panel: null,
  policy: "",
  provider: "",
  codePurpose: "login",
  challenge: null,
  seconds: 0,
  clock: null,
  epoch: 0,
  verifiedPhone: "",
  previousFocus: null,
  get account() {
    return this.$store.account;
  },
  get title() {
    return (
      {
        phone: "手机号登录",
        code: "输入验证码",
        bind: "绑定手机号",
        password: "密码登录",
        forgot: "找回密码",
        set: "设置密码",
        change: "修改密码",
        reset: "重置密码",
        privacy: "隐私协议",
        security: "账号安全",
      }[this.view] || ""
    );
  },
  get providers() {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|Macintosh/.test(ua)
      ? ["apple", "wechat"]
      : /Huawei|HUAWEI|Harmony/.test(ua)
        ? ["huawei", "wechat"]
        : ["wechat"];
  },
  get validPhone() {
    return /^1[3-9]\d{9}$/.test(this.phone);
  },
  get maskedPhone() {
    return this.phone.slice(0, 3) + " **** " + this.phone.slice(-4);
  },
  init() {
    this.handler = () => this.sync();
    window.addEventListener("zhipai-route", this.handler);
    window.addEventListener("popstate", this.handler);
    this.sync();
  },
  destroy() {
    window.removeEventListener("zhipai-route", this.handler);
    window.removeEventListener("popstate", this.handler);
    clearInterval(this.clock);
    this.epoch++;
  },
  sync() {
    const q = new URLSearchParams(location.search);
    if (q.get("page") !== "account") {
      this.epoch++;
      this.busy = false;
      this.panel = null;
      this.verifiedPhone = "";
      this.challenge = null;
      this.code = "";
      this.password = "";
      this.oldPassword = "";
      this.confirmPassword = "";
      clearInterval(this.clock);
      return;
    }
    if (this.view === "reset" && q.get("account") !== "reset")
      this.verifiedPhone = "";
    this.returnTo = accountSafeBack(q.get("back") || this.returnTo);
    const allowed = [
      "welcome",
      "phone",
      "code",
      "bind",
      "password",
      "forgot",
      "set",
      "change",
      "reset",
      "settings", // Compatibility for saved links to the old settings page.
      "privacy",
      "security",
    ];
    this.view = allowed.includes(q.get("account"))
      ? q.get("account")
      : "welcome";
    if (this.view === "settings") this.view = "privacy";
    this.error = "";
    this.notice = "";
    if (
      ["security", "set", "change"].includes(this.view) &&
      !this.account.loggedIn
    ) {
      this.view = "welcome";
    }
    if (
      ["set", "reset"].includes(this.view) &&
      !this.verifiedPhone &&
      this.view === "reset"
    )
      this.view = "forgot";
    if (this.view === "set" && this.account.session?.passwordHash)
      this.view = "change";
    if (this.view === "code" && !this.challenge) this.view = "phone";
    if (this.view === "code" && this.challenge) this.startClock();
    if (this.view === "bind" && !this.provider) this.view = "welcome";
  },
  route(view) {
    if (this.busy) return;
    if (this.view === "reset" && view !== "reset") this.verifiedPhone = "";
    this.password = "";
    this.confirmPassword = "";
    this.oldPassword = "";
    this.showPassword = false;
    this.error = "";
    this.notice = "";
    accountRoute(view, this.returnTo);
  },
  back() {
    if (this.busy) return;
    if (this.panel) {
      this.closePanel();
      return;
    }
    if (["code"].includes(this.view)) {
      this.route(
        this.codePurpose === "bind"
          ? "bind"
          : this.codePurpose === "reset"
            ? "forgot"
            : "phone",
      );
      return;
    }
    if (["set", "change"].includes(this.view)) {
      this.route("security");
      return;
    }
    if (["phone", "password", "forgot", "bind", "reset"].includes(this.view)) {
      if (this.view === "reset") this.verifiedPhone = "";
      this.route(this.view === "reset" ? "password" : "welcome");
      return;
    }
    this.leave();
  },
  leave() {
    const u = new URL(accountSafeBack(this.returnTo), location.origin);
    history.pushState({}, "", u);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  consent() {
    if (this.agreed) return true;
    this.error = "请阅读并同意用户协议和隐私政策";
    return false;
  },
  async operation(fn) {
    if (this.busy) return;
    const token = ++this.epoch;
    this.busy = true;
    this.error = "";
    try {
      await fn(token);
    } catch (_) {
      if (token === this.epoch)
        this.error = "操作未完成，填写内容已保留，请重试。";
    } finally {
      if (token === this.epoch) this.busy = false;
    }
  },
  async finish(phone, provider = "") {
    await this.operation(async (token) => {
      this.account.signIn(phone, provider);
      if (token !== this.epoch) return;
      this.password = "";
      this.code = "";
      this.provider = "";
      this.challenge = null;
      clearInterval(this.clock);
      this.leave();
    });
  },
  oneTap() {
    if (!this.consent()) return;
    this.openPanel("carrier");
  },
  confirmCarrier() {
    this.panel = null;
    this.finish("13800008000");
  },
  thirdParty(kind) {
    if (!this.consent()) return;
    this.provider = kind;
    this.openPanel("oauth");
  },
  confirmProvider() {
    if (this.busy) return;
    this.panel = null;
    if (this.account.loggedIn) {
      this.account.update({
        providers: [
          ...new Set([
            ...(this.account.session.providers || []),
            this.provider,
          ]),
        ],
      });
      this.notice = "绑定完成";
      this.provider = "";
      return;
    }
    this.route("bind");
  },
  sendCode() {
    if (this.busy) return;
    if (!this.validPhone) {
      this.error = "请输入有效的11位手机号";
      return;
    }
    if (!this.consent()) return;
    const purpose =
      this.view === "bind"
        ? "bind"
        : this.view === "forgot"
          ? "reset"
          : "login";
    if (
      this.challenge &&
      this.challenge.phone === this.phone &&
      this.challenge.purpose === purpose &&
      this.challenge.provider === this.provider &&
      this.seconds > 0
    ) {
      this.codePurpose = purpose;
      this.route("code");
      this.notice = "本次验证码：123456";
      return;
    }
    this.codePurpose = purpose;
    this.challenge = {
      phone: this.phone,
      code: "123456",
      expires: Date.now() + 300000,
      resendAt: Date.now() + 60000,
      purpose: this.codePurpose,
      provider: this.provider,
    };
    this.code = "";
    this.startClock();
    this.route("code");
    this.notice = "本次验证码：123456";
  },
  startClock() {
    clearInterval(this.clock);
    const tick = () => {
      this.seconds = Math.max(
        0,
        Math.ceil(((this.challenge?.resendAt || 0) - Date.now()) / 1000),
      );
      if (!this.seconds) clearInterval(this.clock);
    };
    tick();
    if (this.seconds) this.clock = setInterval(tick, 1000);
  },
  resend() {
    if (this.seconds || this.busy) return;
    this.view =
      this.codePurpose === "bind"
        ? "bind"
        : this.codePurpose === "reset"
          ? "forgot"
          : "phone";
    this.sendCode();
  },
  verifyCode() {
    if (this.busy) return;
    if (
      !this.challenge ||
      this.challenge.phone !== this.phone ||
      Date.now() > this.challenge.expires
    ) {
      this.error = "验证码已过期，请重新获取";
      return;
    }
    if (this.code.replace(/\s/g, "") !== this.challenge.code) {
      this.error = "验证码不正确，请重新输入";
      return;
    }
    this.verifiedPhone = this.phone;
    const purpose = this.challenge.purpose,
      provider = this.challenge.provider;
    this.challenge = null;
    if (purpose === "reset") {
      this.route("reset");
      return;
    }
    this.finish(this.phone, purpose === "bind" ? provider : "");
  },
  async passwordLogin() {
    if (!this.consent() || !this.validPhone) {
      if (!this.validPhone) this.error = "请输入有效的手机号";
      return;
    }
    const record = this.account.accounts.find((a) => a.phone === this.phone);
    if (!record?.passwordHash) {
      this.error = "该手机号尚未设置密码，请使用验证码登录";
      return;
    }
    await this.operation(async (token) => {
      const hash = await accountHash(this.password, record.salt);
      if (token !== this.epoch) return;
      if (hash !== record.passwordHash) {
        this.error = "手机号或密码不正确";
        return;
      }
      this.account.signIn(this.phone);
      this.password = "";
      this.leave();
    });
  },
  async savePassword() {
    if (this.busy) return;
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(this.password)) {
      this.error = "密码须为8–32位，包含字母和数字";
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = "两次输入的密码不一致";
      return;
    }
    if (this.view === "reset" && !this.verifiedPhone) {
      this.error = "请先验证手机号";
      return;
    }
    await this.operation(async (token) => {
      const phone =
        this.view === "reset"
          ? this.verifiedPhone
          : this.account.session?.phone;
      if (!phone) throw Error("login");
      const record = this.account.accounts.find((a) => a.phone === phone);
      if (
        ["change", "set"].includes(this.view) &&
        record?.passwordHash &&
        (await accountHash(this.oldPassword, record.salt)) !==
          record.passwordHash
      ) {
        this.error = "原密码不正确";
        return;
      }
      if (token !== this.epoch) return;
      const salt = crypto.randomUUID(),
        hash = await accountHash(this.password, salt);
      if (token !== this.epoch) return;
      const items = this.account.accounts.map((a) =>
        a.phone === phone
          ? {
              ...a,
              salt,
              passwordHash: hash,
            }
          : a,
      );
      if (!items.some((a) => a.phone === phone))
        items.push({
          phone,
          providers: [],
          salt,
          passwordHash: hash,
        });
      const reset = this.view === "reset";
      this.account.save(items, reset ? null : phone);
      this.password = "";
      this.oldPassword = "";
      this.confirmPassword = "";
      this.verifiedPhone = "";
      this.busy = false;
      this.route(reset ? "password" : "security");
      this.notice = reset ? "密码已重置，请重新登录" : "密码设置完成";
    });
  },
  openPanel(panel) {
    this.previousFocus = document.activeElement;
    this.error = "";
    this.panel = panel;
    if (panel === "delete") {
      this.challenge = {
        phone: this.account.session?.phone,
        code: "123456",
        expires: Date.now() + 300000,
        purpose: "delete",
      };
      this.code = "";
    }
    this.$nextTick(() =>
      this.$refs.accountDialog?.querySelector("button,input")?.focus({
        preventScroll: true,
      }),
    );
  },
  closePanel() {
    if (this.busy) return;
    this.panel = null;
    this.$nextTick(() =>
      this.previousFocus?.focus({
        preventScroll: true,
      }),
    );
  },
  openPolicy(kind) {
    this.policy = kind;
    this.openPanel("policy");
  },
  manageProvider(kind) {
    if (!this.account.loggedIn) return;
    this.provider = kind;
    if ((this.account.session.providers || []).includes(kind)) {
      this.challenge = {
        phone: this.account.session.phone,
        code: "123456",
        expires: Date.now() + 300000,
        purpose: "unbind",
        provider: kind,
      };
      this.code = "";
      this.openPanel("unbind");
    } else this.openPanel("oauth");
  },
  unbind() {
    if (
      this.busy ||
      !this.account.session ||
      this.challenge?.purpose !== "unbind" ||
      this.challenge.phone !== this.account.session.phone ||
      Date.now() > this.challenge.expires ||
      this.code !== this.challenge.code
    ) {
      this.error = "验证码不正确或已过期";
      return;
    }
    try {
      this.account.update({
        providers: this.account.session.providers.filter(
          (p) => p !== this.provider,
        ),
      });
      this.challenge = null;
      this.code = "";
      this.closePanel();
      this.notice = "已解除第三方账号绑定";
    } catch (_) {
      this.error = "解绑未完成，请重试";
    }
  },
  logout() {
    try {
      this.account.logout();
      this.panel = null;
      this.leave();
    } catch (_) {
      this.error = "退出未完成，请重试";
    }
  },
  deleteAccount() {
    if (
      this.busy ||
      !this.account.session ||
      this.challenge?.purpose !== "delete" ||
      this.challenge.phone !== this.account.session.phone ||
      Date.now() > this.challenge.expires ||
      this.code !== this.challenge.code
    ) {
      this.error = "请输入本次验证码123456";
      return;
    }
    try {
      const phone = this.account.session.phone;
      this.account.save(
        this.account.accounts.filter((a) => a.phone !== phone),
        null,
      );
      this.code = "";
      this.panel = null;
      this.leave();
    } catch (_) {
      this.error = "注销未完成，请重试";
    }
  },
  trap(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = [
        ...this.$refs.accountDialog.querySelectorAll(
          "button:not([disabled]),input,a[href]",
        ),
      ].filter((n) => n.getClientRects().length),
      first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  },
}));
export { ACCOUNT_KEY, SESSION_KEY, accountRoute, accountSafeBack, accountHash };
