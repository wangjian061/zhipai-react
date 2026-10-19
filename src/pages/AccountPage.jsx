import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function AccountPage({ scope, args = [] }) {
  return (
    <Controller name="accountFlow" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page account-page"
          id="account-page"
          data-view={s.view}
          show={s.page === "account"}
          dynamicClass={{
            "account-security": ["privacy", "security"].includes(s.view),
          }}
          aria-label="知拍账号"
        >
          <View as="header" scope={s} className="account-nav" inert={!!s.panel}>
            <View
              as="button"
              scope={s}
              disabled={s.busy}
              aria-label="返回"
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.back();
                  },
                },
              ]}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-chevron-left"></View>
              </View>
            </View>
            <View
              as="h1"
              scope={s}
              text={["privacy", "security"].includes(s.view) ? s.title : ""}
            ></View>
          </View>
          <View as="div" scope={s} className="account-scroll" inert={!!s.panel}>
            <View
              as="div"
              scope={s}
              className="account-welcome"
              show={s.view === "welcome"}
            >
              <View as="div" scope={s} className="account-welcome-hero">
                <View as="div" scope={s} className="account-brand-lockup">
                  <View
                    as="img"
                    scope={s}
                    src="assets/account-brand.webp"
                    width="54"
                    height="63"
                    alt="知拍标志"
                  ></View>
                  <View as="strong" scope={s}>
                    {"知拍"}
                  </View>
                </View>
                <View as="div" scope={s} className="account-welcome-copy">
                  <View as="h2" scope={s}>
                    {"欢迎使用知拍"}
                  </View>
                  <View as="p" scope={s}>
                    {"你的证件照与采集记录"}
                    <View as="br" scope={s}></View>
                    {"从这里开始管理"}
                  </View>
                </View>
                <View
                  as="img"
                  scope={s}
                  className="account-welcome-art"
                  src="assets/collection-credentials-v2.webp"
                  width="768"
                  height="768"
                  alt="蓝白证件卡与照片夹"
                ></View>
              </View>
              <View
                as="section"
                scope={s}
                className="account-login-card"
                aria-label="本机号码登录"
              >
                <View as="span" scope={s} className="account-number-label">
                  {"本机号码"}
                </View>
                <View as="p" scope={s} className="account-number">
                  {"138 "}
                  <View as="span" scope={s}>
                    {"****"}
                  </View>
                  {" 8000"}
                </View>
                <View
                  as="button"
                  scope={s}
                  className="account-primary"
                  disabled={s.busy}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.oneTap();
                      },
                    },
                  ]}
                >
                  {"本机号码一键登录"}
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-arrow"></View>
                  </View>
                </View>
                <View as="div" scope={s} className="account-login-alternatives">
                  <View
                    as="button"
                    scope={s}
                    className="account-text"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.route("phone");
                        },
                      },
                    ]}
                  >
                    {"其他手机号登录"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    className="account-text account-subtle"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.route("password");
                        },
                      },
                    ]}
                  >
                    {"密码登录"}
                  </View>
                </View>
              </View>
              <View as="div" scope={s} className="account-other">
                <View as="p" scope={s}>
                  {"其他登录方式"}
                </View>
                <View as="div" scope={s} className="account-providers">
                  <Repeat
                    scope={s}
                    items={s.providers}
                    names={["kind"]}
                    keyFor={function (scope, $event, $el) {
                      return scope.kind;
                    }}
                  >
                    {(s) => (
                      <>
                        <>
                          <View
                            as="button"
                            scope={s}
                            disabled={s.busy}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.thirdParty(scope.kind);
                                },
                              },
                            ]}
                          >
                            <View
                              as="span"
                              scope={s}
                              className="provider-mark"
                              dynamicClass={s.kind}
                            >
                              <View as="svg" scope={s} aria-hidden="true">
                                <View
                                  as="use"
                                  scope={s}
                                  href={
                                    s.kind === "wechat"
                                      ? "#i-wechat-account"
                                      : s.kind === "apple"
                                        ? "#i-apple-account"
                                        : "#i-account-huawei"
                                  }
                                ></View>
                              </View>
                            </View>
                            <View
                              as="span"
                              scope={s}
                              text={
                                {
                                  apple: "Apple 登录",
                                  huawei: "华为登录",
                                  wechat: "微信登录",
                                }[s.kind]
                              }
                            ></View>
                          </View>
                        </>
                      </>
                    )}
                  </Repeat>
                </View>
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="account-task-page"
              show={["phone", "bind", "forgot"].includes(s.view)}
            >
              <View as="div" scope={s} className="account-heading">
                <View as="h2" scope={s} text={s.title}></View>
                <View
                  as="p"
                  scope={s}
                  text={
                    s.view === "bind"
                      ? "绑定手机号，完成账号关联"
                      : s.view === "forgot"
                        ? "验证绑定手机号后，可重新设置密码"
                        : "未注册的手机号验证后将自动注册"
                  }
                ></View>
              </View>
              <View
                as="form"
                scope={s}
                className="account-form"
                events={[
                  {
                    type: "submit",
                    prevent: true,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.sendCode();
                    },
                  },
                ]}
              >
                <View as="label" scope={s} className="account-field">
                  <View as="span" scope={s}>
                    {"手机号"}
                  </View>
                  <View as="div" scope={s} className="account-input">
                    <View as="b" scope={s} className="account-prefix">
                      {"+86"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength="11"
                      placeholder="请输入手机号"
                      disabled={s.busy}
                      required={true}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.phone;
                        },
                        write: function (scope, $event, $el) {
                          scope.phone = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  className="account-primary"
                  type="submit"
                  disabled={s.busy || !s.validPhone}
                >
                  {"获取验证码"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="account-text"
                show={s.view === "phone"}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.route("password");
                    },
                  },
                ]}
              >
                {"密码登录"}
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="account-task-page"
              show={s.view === "code"}
            >
              <View as="div" scope={s} className="account-heading">
                <View as="h2" scope={s}>
                  {"输入验证码"}
                </View>
                <View as="p" scope={s}>
                  {"验证手机号 "}
                  <View as="strong" scope={s} text={s.maskedPhone}></View>
                </View>
                <View
                  as="button"
                  scope={s}
                  className="account-text"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.route(
                          scope.codePurpose === "bind"
                            ? "bind"
                            : scope.codePurpose === "reset"
                              ? "forgot"
                              : "phone",
                        );
                      },
                    },
                  ]}
                >
                  {"修改手机号"}
                </View>
              </View>
              <View
                as="form"
                scope={s}
                className="account-form"
                events={[
                  {
                    type: "submit",
                    prevent: true,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.verifyCode();
                    },
                  },
                ]}
              >
                <View as="label" scope={s} className="account-field">
                  <View as="span" scope={s}>
                    {"6位验证码"}
                  </View>
                  <View as="div" scope={s} className="account-code-stage">
                    <View
                      as="div"
                      scope={s}
                      className="account-code-slots"
                      aria-hidden="true"
                    >
                      <Repeat
                        scope={s}
                        items={6}
                        names={["slot"]}
                        keyFor={function (scope, $event, $el) {
                          return scope.slot;
                        }}
                      >
                        {(s) => (
                          <>
                            <>
                              <View
                                as="span"
                                scope={s}
                                dynamicClass={{
                                  active:
                                    s.code.length === s.slot - 1 ||
                                    (s.slot === 6 && s.code.length === 6),
                                  filled: s.code.length >= s.slot,
                                }}
                                text={s.code[s.slot - 1] || ""}
                              ></View>
                            </>
                          </>
                        )}
                      </Repeat>
                    </View>
                    <View
                      as="input"
                      scope={s}
                      className="account-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength="6"
                      aria-label="6位验证码"
                      disabled={s.busy}
                      required={true}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.code;
                        },
                        write: function (scope, $event, $el) {
                          scope.code = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  type="button"
                  className="account-text"
                  disabled={s.seconds > 0 || s.busy}
                  text={
                    s.seconds > 0
                      ? s.seconds + "秒后重新获取"
                      : "重新获取验证码"
                  }
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.resend();
                      },
                    },
                  ]}
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="account-primary"
                  type="submit"
                  disabled={s.busy || s.code.length !== 6}
                  text={s.busy ? "正在验证…" : "验证并继续"}
                ></View>
              </View>
              <View as="p" scope={s} className="account-help">
                {"请勿向他人透露验证码"}
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="account-task-page"
              show={s.view === "password"}
            >
              <View as="div" scope={s} className="account-heading">
                <View as="h2" scope={s}>
                  {"密码登录"}
                </View>
                <View as="p" scope={s}>
                  {"使用手机号和密码登录知拍"}
                </View>
              </View>
              <View
                as="form"
                scope={s}
                className="account-form"
                events={[
                  {
                    type: "submit",
                    prevent: true,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.passwordLogin();
                    },
                  },
                ]}
              >
                <View as="label" scope={s} className="account-field">
                  <View as="span" scope={s}>
                    {"手机号"}
                  </View>
                  <View as="div" scope={s} className="account-input">
                    <View as="b" scope={s} className="account-prefix">
                      {"+86"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      type="tel"
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength="11"
                      placeholder="请输入手机号"
                      required={true}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.phone;
                        },
                        write: function (scope, $event, $el) {
                          scope.phone = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                </View>
                <View as="label" scope={s} className="account-field">
                  <View as="span" scope={s}>
                    {"密码"}
                  </View>
                  <View as="div" scope={s} className="account-input">
                    <View
                      as="input"
                      scope={s}
                      type={s.showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="请输入密码"
                      required={true}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.password;
                        },
                        write: function (scope, $event, $el) {
                          scope.password = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                    <View
                      as="button"
                      scope={s}
                      type="button"
                      aria-label={s.showPassword ? "隐藏密码" : "显示密码"}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.showPassword = !scope.showPassword;
                          },
                        },
                      ]}
                    >
                      <View as="svg" scope={s} aria-hidden="true">
                        <View as="use" scope={s} href="#i-eye"></View>
                      </View>
                    </View>
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  type="button"
                  className="account-text"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.route("forgot");
                      },
                    },
                  ]}
                >
                  {"忘记密码？"}
                </View>
                <View
                  as="button"
                  scope={s}
                  className="account-primary"
                  type="submit"
                  disabled={s.busy || !s.validPhone || !s.password}
                  text={s.busy ? "登录中…" : "登录"}
                ></View>
              </View>
              <View
                as="button"
                scope={s}
                className="account-text"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.route("phone");
                    },
                  },
                ]}
              >
                {"验证码登录"}
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="account-task-page"
              show={["set", "change", "reset"].includes(s.view)}
            >
              <View as="div" scope={s} className="account-heading">
                <View as="h2" scope={s} text={s.title}></View>
                <View as="p" scope={s}>
                  {"密码为8–32位，须包含字母和数字"}
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="account-verified"
                show={s.view !== "change"}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-check"></View>
                </View>
                <View
                  as="span"
                  scope={s}
                  text={
                    "手机号 " +
                    (s.view === "reset" ? s.maskedPhone : s.account.masked)
                  }
                ></View>
              </View>
              <View
                as="form"
                scope={s}
                className="account-form"
                events={[
                  {
                    type: "submit",
                    prevent: true,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.savePassword();
                    },
                  },
                ]}
              >
                <View
                  as="label"
                  scope={s}
                  className="account-field"
                  show={s.view === "change"}
                >
                  <View as="span" scope={s}>
                    {"原密码"}
                  </View>
                  <View as="div" scope={s} className="account-input">
                    <View
                      as="input"
                      scope={s}
                      type="password"
                      autoComplete="current-password"
                      placeholder="请输入原密码"
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.oldPassword;
                        },
                        write: function (scope, $event, $el) {
                          scope.oldPassword = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  type="button"
                  className="account-text"
                  show={s.view === "change"}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.phone = scope.account.session.phone;
                        scope.route("forgot");
                      },
                    },
                  ]}
                >
                  {"忘记原密码？验证手机号修改"}
                </View>
                <View as="label" scope={s} className="account-field">
                  <View as="span" scope={s}>
                    {"新密码"}
                  </View>
                  <View as="div" scope={s} className="account-input">
                    <View
                      as="input"
                      scope={s}
                      type={s.showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      maxLength="32"
                      placeholder="请输入新密码"
                      required={true}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.password;
                        },
                        write: function (scope, $event, $el) {
                          scope.password = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                    <View
                      as="button"
                      scope={s}
                      type="button"
                      aria-label={s.showPassword ? "隐藏密码" : "显示密码"}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.showPassword = !scope.showPassword;
                          },
                        },
                      ]}
                    >
                      <View as="svg" scope={s} aria-hidden="true">
                        <View as="use" scope={s} href="#i-eye"></View>
                      </View>
                    </View>
                  </View>
                </View>
                <View as="label" scope={s} className="account-field">
                  <View as="span" scope={s}>
                    {"确认新密码"}
                  </View>
                  <View as="div" scope={s} className="account-input">
                    <View
                      as="input"
                      scope={s}
                      type={s.showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      maxLength="32"
                      placeholder="请再次输入新密码"
                      required={true}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.confirmPassword;
                        },
                        write: function (scope, $event, $el) {
                          scope.confirmPassword = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  type="submit"
                  className="account-primary"
                  disabled={s.busy || !s.password || !s.confirmPassword}
                  text={
                    s.busy
                      ? "保存中…"
                      : s.view === "reset"
                        ? "确认重置"
                        : s.view === "change"
                          ? "确认修改"
                          : "完成设置"
                  }
                ></View>
              </View>
            </View>
            <View as="div" scope={s} show={s.view === "privacy"}>
              <div className="account-security-intro">
                <span>
                  <svg aria-hidden="true">
                    <use href="#i-document" />
                  </svg>
                </span>
                <div>
                  <h2>隐私与协议</h2>
                  <p>了解个人信息保护与服务条款</p>
                </div>
              </div>
              <h2 className="account-section-title">协议文件</h2>
              <View as="div" scope={s} className="account-list">
                <View
                  as="button"
                  scope={s}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openPolicy("service");
                      },
                    },
                  ]}
                >
                  <View as="span" scope={s}>
                    {"用户协议"}
                  </View>
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-chevron"></View>
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openPolicy("carrier");
                      },
                    },
                  ]}
                >
                  <View as="span" scope={s}>
                    {"本机号码一键登录服务协议"}
                  </View>
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-chevron"></View>
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openPolicy("privacy");
                      },
                    },
                  ]}
                >
                  <View as="span" scope={s}>
                    {"隐私政策"}
                  </View>
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-chevron"></View>
                  </View>
                </View>
              </View>
            </View>
            <View as="div" scope={s} show={s.view === "security"}>
              <View as="div" scope={s} className="account-security-intro">
                <View as="span" scope={s}>
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-link"></View>
                  </View>
                </View>
                <View as="div" scope={s}>
                  <View as="h2" scope={s}>
                    {"保护你的账号"}
                  </View>
                  <View as="p" scope={s}>
                    {"管理登录密码与授权方式"}
                  </View>
                </View>
              </View>
              <View as="h2" scope={s} className="account-section-title">
                {"账号信息"}
              </View>
              <View as="div" scope={s} className="account-list">
                <View as="div" scope={s}>
                  <View as="span" scope={s}>
                    {"手机号"}
                  </View>
                  <View as="small" scope={s} text={s.account.masked}></View>
                </View>
                <View
                  as="button"
                  scope={s}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.route(
                          scope.account.session?.passwordHash
                            ? "change"
                            : "set",
                        );
                      },
                    },
                  ]}
                >
                  <View as="span" scope={s}>
                    {"登录密码"}
                  </View>
                  <View as="span" scope={s} className="account-row-end">
                    <View
                      as="small"
                      scope={s}
                      text={
                        s.account.session?.passwordHash
                          ? "已设置 · 修改"
                          : "未设置 · 设置"
                      }
                    ></View>
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-chevron"></View>
                    </View>
                  </View>
                </View>
              </View>
              <View as="h2" scope={s} className="account-section-title">
                {"第三方账号"}
              </View>
              <View as="div" scope={s} className="account-list">
                <Repeat
                  scope={s}
                  items={["wechat", "apple", "huawei"]}
                  names={["kind"]}
                  keyFor={function (scope, $event, $el) {
                    return scope.kind;
                  }}
                >
                  {(s) => (
                    <>
                      <>
                        <View
                          as="button"
                          scope={s}
                          events={[
                            {
                              type: "click",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.manageProvider(scope.kind);
                              },
                            },
                          ]}
                        >
                          <View
                            as="span"
                            scope={s}
                            text={
                              {
                                wechat: "微信",
                                apple: "Apple 账号",
                                huawei: "华为账号",
                              }[s.kind]
                            }
                          ></View>
                          <View as="span" scope={s} className="account-row-end">
                            <View
                              as="small"
                              scope={s}
                              text={
                                s.account.session?.providers?.includes(s.kind)
                                  ? "已绑定 · 管理"
                                  : "未绑定 · 去绑定"
                              }
                            ></View>
                            <View as="svg" scope={s} aria-hidden="true">
                              <View as="use" scope={s} href="#i-chevron"></View>
                            </View>
                          </View>
                        </View>
                      </>
                    </>
                  )}
                </Repeat>
              </View>
              <h2 className="account-section-title">账号管理</h2>
              <View as="div" scope={s} className="account-list">
                <View
                  as="button"
                  scope={s}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.code = "";
                        scope.openPanel("delete");
                      },
                    },
                  ]}
                >
                  <View as="span" scope={s}>
                    {"注销账号"}
                  </View>
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-chevron"></View>
                  </View>
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="account-danger"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPanel("logout");
                    },
                  },
                ]}
              >
                {"退出登录"}
              </View>
            </View>
            <View
              as="label"
              scope={s}
              className="account-consent"
              show={["welcome", "phone", "password", "bind", "forgot"].includes(
                s.view,
              )}
            >
              <View
                as="input"
                scope={s}
                type="checkbox"
                model={{
                  read: function (scope, $event, $el) {
                    return scope.agreed;
                  },
                  write: function (scope, $event, $el) {
                    scope.agreed = $event;
                  },
                  number: false,
                  lazy: false,
                }}
              ></View>
              <View as="span" scope={s}>
                {"我已阅读并同意 "}
                <View
                  as="button"
                  scope={s}
                  type="button"
                  events={[
                    {
                      type: "click",
                      prevent: true,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openPolicy("service");
                      },
                    },
                  ]}
                >
                  {"用户协议"}
                </View>
                {"、"}
                <View
                  as="button"
                  scope={s}
                  type="button"
                  events={[
                    {
                      type: "click",
                      prevent: true,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openPolicy("privacy");
                      },
                    },
                  ]}
                >
                  {"隐私政策"}
                </View>
                <View as="span" scope={s} show={s.view === "welcome"}>
                  {"及"}
                  <View
                    as="button"
                    scope={s}
                    type="button"
                    events={[
                      {
                        type: "click",
                        prevent: true,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.openPolicy("carrier");
                        },
                      },
                    ]}
                  >
                    {"本机号码认证服务协议"}
                  </View>
                </View>
              </View>
            </View>
            <View
              as="p"
              scope={s}
              className="account-message"
              show={s.notice}
              text={s.notice}
              role="status"
            ></View>
            <View
              as="p"
              scope={s}
              className="account-message error"
              show={s.error || s.account.error}
              text={s.error || s.account.error}
              role="alert"
            ></View>
          </View>
          <Portal target="#account-modal-layer">
            <View
              as="div"
              scope={s}
              className="account-overlay"
              show={s.page === "account" && s.panel}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: true,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.closePanel();
                  },
                },
                {
                  type: "keydown",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.trap($event);
                  },
                },
              ]}
            >
              <View
                as="section"
                scope={s}
                className="account-drawer"
                refName="accountDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-drawer-title"
              >
                <View as="header" scope={s}>
                  <View
                    as="h2"
                    scope={s}
                    id="account-drawer-title"
                    text={
                      {
                        carrier: "本机号码登录示意",
                        oauth: "授权流程示意",
                        policy:
                          s.policy === "privacy"
                            ? "隐私政策阅读示意"
                            : s.policy === "carrier"
                              ? "号码认证协议阅读示意"
                              : "用户协议阅读示意",
                        unbind: "验证账号",
                        logout: "退出登录？",
                        delete: "注销账号",
                      }[s.panel]
                    }
                  ></View>
                  <View
                    as="button"
                    scope={s}
                    disabled={s.busy}
                    aria-label="关闭"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.closePanel();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-close"></View>
                    </View>
                  </View>
                </View>
                <View as="div" scope={s} className="account-drawer-body">
                  <View as="div" scope={s} show={s.panel === "carrier"}>
                    <View as="p" scope={s}>
                      {"确认使用手机号 138 **** 8000 登录知拍。"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="account-primary"
                      disabled={s.busy}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.confirmCarrier();
                          },
                        },
                      ]}
                    >
                      {"确认登录"}
                    </View>
                  </View>
                  <View as="div" scope={s} show={s.panel === "oauth"}>
                    <View
                      as="p"
                      scope={s}
                      text={
                        "使用" +
                        {
                          apple: "Apple",
                          wechat: "微信",
                          huawei: "华为",
                        }[s.provider] +
                        "账号授权，随后绑定手机号完成登录。"
                      }
                    ></View>
                    <View
                      as="button"
                      scope={s}
                      className="account-primary"
                      disabled={s.busy}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.confirmProvider();
                          },
                        },
                      ]}
                    >
                      {"同意并继续"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="account-text"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.closePanel();
                          },
                        },
                      ]}
                    >
                      {"取消"}
                    </View>
                  </View>
                  <View as="div" scope={s} show={s.panel === "unbind"}>
                    <View as="p" scope={s}>
                      {"验证当前登录手机号后，可解除第三方账号绑定。"}
                    </View>
                    <View
                      as="div"
                      scope={s}
                      className="account-verified"
                      text={s.account.masked}
                    ></View>
                    <View as="label" scope={s} className="account-field">
                      <View as="span" scope={s}>
                        {"验证码"}
                      </View>
                      <View as="div" scope={s} className="account-input">
                        <View
                          as="input"
                          scope={s}
                          type="text"
                          inputMode="numeric"
                          maxLength="6"
                          autoComplete="one-time-code"
                          placeholder="请输入验证码"
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.code;
                            },
                            write: function (scope, $event, $el) {
                              scope.code = $event;
                            },
                            number: false,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                    </View>
                    <View as="p" scope={s} className="account-help">
                      {"本次验证码：123456 · 有效期5分钟"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="account-primary"
                      disabled={s.busy || s.code.length !== 6}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.unbind();
                          },
                        },
                      ]}
                    >
                      {"验证并解绑"}
                    </View>
                  </View>
                  <View as="div" scope={s} show={s.panel === "logout"}>
                    <View as="p" scope={s}>
                      {"退出后，当前浏览器中的照片和采集记录会保留。"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="account-primary"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.logout();
                          },
                        },
                      ]}
                    >
                      {"确认退出"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="account-text"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.closePanel();
                          },
                        },
                      ]}
                    >
                      {"取消"}
                    </View>
                  </View>
                  <View as="div" scope={s} show={s.panel === "delete"}>
                    <View as="p" scope={s}>
                      {
                        "注销当前账号及登录方式。照片和采集记录不会随此操作删除。"
                      }
                    </View>
                    <View as="label" scope={s} className="account-field">
                      <View as="span" scope={s}>
                        {"验证当前账号 "}
                        <View as="b" scope={s} text={s.account.masked}></View>
                      </View>
                      <View as="div" scope={s} className="account-input">
                        <View
                          as="input"
                          scope={s}
                          type="text"
                          inputMode="numeric"
                          maxLength="6"
                          placeholder="请输入验证码"
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.code;
                            },
                            write: function (scope, $event, $el) {
                              scope.code = $event;
                            },
                            number: false,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                    </View>
                    <View as="p" scope={s} className="account-help">
                      {"本次验证码：123456"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="account-primary"
                      disabled={s.code.length !== 6 || s.busy}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.deleteAccount();
                          },
                        },
                      ]}
                    >
                      {"验证并注销"}
                    </View>
                  </View>
                  <View
                    as="article"
                    scope={s}
                    className="account-policy"
                    show={s.panel === "policy"}
                  >
                    <View
                      as="h3"
                      scope={s}
                      text={
                        s.policy === "privacy"
                          ? "信息使用"
                          : s.policy === "carrier"
                            ? "号码认证"
                            : "服务使用"
                      }
                    ></View>
                    <View
                      as="p"
                      scope={s}
                      text={
                        s.policy === "privacy"
                          ? "照片与采集信息用于完成用户发起的制作、核验和提交任务。请勿提交与任务无关的个人信息。"
                          : s.policy === "carrier"
                            ? "使用一键登录前，请核对当前号码并确认授权。也可以选择验证码或其他登录方式。"
                            : "请使用本人照片与真实身份信息，遵守采集项目的拍摄和提交要求。"
                      }
                    ></View>
                    <View as="h3" scope={s}>
                      {"账号管理"}
                    </View>
                    <View as="p" scope={s}>
                      {"可在账号安全中管理登录密码、第三方账号绑定和退出登录。"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="account-primary"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.closePanel();
                          },
                        },
                      ]}
                    >
                      {"返回"}
                    </View>
                  </View>
                  <View
                    as="p"
                    scope={s}
                    className="account-message error"
                    show={s.error}
                    text={s.error}
                    role="alert"
                  ></View>
                </View>
              </View>
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
