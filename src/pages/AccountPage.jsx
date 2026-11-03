import React from "react";
import AccountLoginFlow from "../components/AccountLoginFlow.jsx";
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
            "account-entry": s.isLoginSurface || s.view === "reset",
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
              show={["privacy", "security"].includes(s.view)}
              text={s.title}
            ></View>
          </View>
          <View as="div" scope={s} className="account-scroll" inert={!!s.panel}>
            <AccountLoginFlow scope={s} />
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
              as="p"
              scope={s}
              className="account-message"
              show={!s.isLoginSurface && s.notice}
              text={s.notice}
              role="status"
            ></View>
            <View
              as="p"
              scope={s}
              className="account-message error"
              show={!s.isLoginSurface && (s.error || s.account.error)}
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
                        oauth: "授权流程示意",
                        policy:
                          s.policy === "privacy"
                            ? "隐私政策阅读示意"
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
                      text={s.policy === "privacy" ? "信息使用" : "服务使用"}
                    ></View>
                    <View
                      as="p"
                      scope={s}
                      text={
                        s.policy === "privacy"
                          ? "照片与采集信息用于完成用户发起的制作、核验和提交任务。请勿提交与任务无关的个人信息。"
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
