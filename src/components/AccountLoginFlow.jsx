import React, { useEffect, useRef } from "react";

function Consent({ scope: s }) {
  return (
    <div className="account-entry-consent">
      <label>
        <input
          type="checkbox"
          checked={s.agreed}
          disabled={s.busy}
          onChange={(event) => {
            s.agreed = event.target.checked;
          }}
        />
        <span>我已阅读并同意</span>
      </label>
      <span className="account-entry-policies">
        <button type="button" onClick={() => s.openPolicy("service")}>
          《用户协议》
        </button>
        <button type="button" onClick={() => s.openPolicy("privacy")}>
          《隐私政策》
        </button>
      </span>
    </div>
  );
}

function PhoneField({ scope: s, idPrefix }) {
  return (
    <div className="account-field">
      <label htmlFor={`${idPrefix}-phone-input`}>
        {s.displayRecentPhone ? "上次登录号码" : "手机号"}
      </label>
      <div className="account-input">
        <b className="account-prefix" aria-hidden="true">
          +86
        </b>
        <input
          id={`${idPrefix}-phone-input`}
          ref={(node) => {
            s.$refs.accountPhone = node;
          }}
          type="tel"
          inputMode="numeric"
          autoComplete={s.displayRecentPhone ? "off" : "tel-national"}
          value={s.displayRecentPhone ? s.maskedPhone : s.phone}
          maxLength={11}
          readOnly={s.displayRecentPhone}
          placeholder="请输入手机号"
          disabled={s.busy}
          aria-describedby={s.error ? `${idPrefix}-entry-error` : undefined}
          onChange={(event) => s.updatePhone(event.target.value)}
        />
        {s.displayRecentPhone && (
          <button
            type="button"
            className="account-change-phone"
            disabled={s.busy}
            onClick={() => s.changePhone()}
          >
            更换
          </button>
        )}
      </div>
    </div>
  );
}

function Feedback({ scope: s, idPrefix }) {
  return (
    <>
      {(s.error || s.account.error) && (
        <p
          id={`${idPrefix}-entry-error`}
          className="account-entry-error"
          role="alert"
        >
          {s.error || s.account.error}
        </p>
      )}
      {s.notice && (
        <p className="account-entry-notice" role="status">
          {s.notice}
        </p>
      )}
    </>
  );
}

function Providers({ scope: s }) {
  const labels = {
    apple: "Apple 登录",
    huawei: "华为登录",
    wechat: "微信登录",
  };
  return (
    <div className="account-other" aria-label="其他登录方式">
      <p>其他登录方式</p>
      <div className="account-providers">
        {s.providers.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={s.busy}
            onClick={() => s.thirdParty(kind)}
            aria-label={labels[kind]}
          >
            <span className={`provider-mark ${kind}`}>
              <svg aria-hidden="true">
                <use
                  href={
                    kind === "wechat"
                      ? "#i-wechat-account"
                      : kind === "apple"
                        ? "#i-apple-account"
                        : "#i-account-huawei"
                  }
                />
              </svg>
            </span>
            <span>{labels[kind]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AccountLoginFlow({ scope: s, idPrefix = "account" }) {
  const codeInput = useRef(null);
  useEffect(() => {
    if (s.view === "code") codeInput.current?.focus({ preventScroll: true });
  }, [s.view]);
  if (!s.isLoginSurface) return null;

  const phoneStep = ["welcome", "phone", "bind", "forgot"].includes(s.view);
  const title = s.view === "welcome" ? "手机号登录" : s.title;
  const subtitle =
    s.view === "code"
      ? `验证码已发送至 ${s.maskedPhone}`
      : s.view === "password"
        ? "使用手机号和已设置的密码登录"
        : s.view === "bind"
          ? "验证手机号，完成账号关联"
          : s.view === "forgot"
            ? "验证绑定手机号后重新设置密码"
            : "未注册的手机号验证后将自动注册";

  return (
    <div className="account-entry-flow">
      <div className="account-entry-main">
        <div className="account-entry-intro">
          <div className="account-entry-brand">
            <img
              src="assets/account-brand.webp"
              width="25"
              height="29"
              alt=""
            />
            <span>知拍</span>
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {phoneStep && (
          <>
            <form
              className="account-form account-entry-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                s.sendCode();
              }}
            >
              <PhoneField scope={s} idPrefix={idPrefix} />
              <Feedback scope={s} idPrefix={idPrefix} />
              <Consent scope={s} />
              <button
                type="submit"
                className="account-primary"
                disabled={s.busy || !s.validPhone || !s.agreed}
              >
                {s.busy ? "正在发送…" : "获取验证码"}
              </button>
            </form>
            {["welcome", "phone"].includes(s.view) && (
              <button
                className="account-text account-entry-alternative"
                type="button"
                disabled={s.busy}
                onClick={() => s.route("password")}
              >
                密码登录
              </button>
            )}
          </>
        )}

        {s.view === "code" && (
          <form
            className="account-form account-entry-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              s.verifyCode();
            }}
          >
            <label className="account-field">
              <span className="account-code-label">6位验证码</span>
              <div className="account-code-stage">
                <div className="account-code-slots" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span
                      key={index}
                      className={`${s.code.length === index || (index === 5 && s.code.length === 6) ? "active " : ""}${s.code[index] ? "filled" : ""}`}
                    >
                      {s.code[index] || ""}
                    </span>
                  ))}
                </div>
                <input
                  ref={codeInput}
                  type="text"
                  className="account-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={s.code}
                  aria-label="6位验证码"
                  aria-describedby={
                    s.error ? `${idPrefix}-entry-error` : undefined
                  }
                  disabled={s.busy}
                  onChange={(event) => {
                    s.code = event.target.value.replace(/\D/g, "").slice(0, 6);
                    s.error = "";
                  }}
                />
              </div>
            </label>
            <Feedback scope={s} idPrefix={idPrefix} />
            <button
              type="button"
              className="account-text account-entry-resend"
              disabled={s.seconds > 0 || s.busy}
              onClick={() => s.resend()}
            >
              {s.seconds > 0 ? `${s.seconds}秒后可重新发送` : "重新发送验证码"}
            </button>
            <button
              type="submit"
              className="account-primary"
              disabled={s.busy || s.code.length !== 6}
            >
              {s.busy
                ? "正在验证…"
                : s.codePurpose === "reset"
                  ? "验证并继续"
                  : "登录"}
            </button>
            <button
              type="button"
              className="account-text account-entry-alternative"
              disabled={s.busy}
              onClick={() => s.changePhone()}
            >
              更换手机号
            </button>
          </form>
        )}

        {s.view === "password" && (
          <>
            <form
              className="account-form account-entry-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                s.passwordLogin();
              }}
            >
              <PhoneField scope={s} idPrefix={idPrefix} />
              <label className="account-field">
                <span>密码</span>
                <div className="account-input">
                  <input
                    type={s.showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    value={s.password}
                    disabled={s.busy}
                    aria-describedby={
                      s.error ? `${idPrefix}-entry-error` : undefined
                    }
                    onChange={(event) => {
                      s.password = event.target.value;
                      s.error = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={s.busy}
                    onClick={() => {
                      s.showPassword = !s.showPassword;
                    }}
                    aria-label={s.showPassword ? "隐藏密码" : "显示密码"}
                    aria-pressed={s.showPassword}
                  >
                    <svg aria-hidden="true">
                      <use href="#i-eye" />
                    </svg>
                  </button>
                </div>
              </label>
              <button
                type="button"
                className="account-text account-entry-forgot"
                disabled={s.busy}
                onClick={() => s.route("forgot")}
              >
                忘记密码
              </button>
              <Feedback scope={s} idPrefix={idPrefix} />
              <Consent scope={s} />
              <button
                type="submit"
                className="account-primary"
                disabled={s.busy || !s.validPhone || !s.password || !s.agreed}
              >
                {s.busy ? "登录中…" : "登录"}
              </button>
            </form>
            <button
              type="button"
              className="account-text account-entry-alternative"
              disabled={s.busy}
              onClick={() => s.route("phone")}
            >
              验证码登录
            </button>
          </>
        )}
      </div>
      {["welcome", "phone", "password"].includes(s.view) && (
        <Providers scope={s} />
      )}
    </div>
  );
}
