import React, { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "../runtime/state.js";
import { useWorkspace } from "./WorkspaceContext.jsx";
import CollectionNotifications from "../components/CollectionNotifications.jsx";
import CollectionTaskDetail, {
  CollectionTaskHeader,
  CollectionTaskFooter,
} from "../components/CollectionTaskDetail.jsx";
import CollectionTaskDrawer from "../components/CollectionTaskDrawer.jsx";
import AccountLoginFlow from "../components/AccountLoginFlow.jsx";

function Back({ onClick }) {
  return (
    <button type="button" aria-label="返回" onClick={onClick}>
      <svg aria-hidden="true">
        <use href="#i-chevron-left" />
      </svg>
    </button>
  );
}
function Announcement({ scope: s }) {
  const n = s.sourceMessage;
  return (
    <>
      <header className="account-nav">
        <Back onClick={() => s.back()} />
        <h1>通知详情</h1>
      </header>
      <article className="workbench-announcement">
        <p className="workbench-notice-meta">
          {n.type === "system" ? "系统通知" : "项目通知"} · {n.time}
        </p>
        <h2>{n.title}</h2>
        {n.projectName && (
          <p className="workbench-notice-meta">{n.projectName}</p>
        )}
        {n.body.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {s.error && (
          <p role="status" className="account-entry-notice">
            {s.error}
          </p>
        )}
      </article>
      {n.projectId && (
        <footer className="workbench-phone-footer">
          <button
            className="collection-primary"
            onClick={() => s.openProject()}
          >
            查看项目
          </button>
        </footer>
      )}
    </>
  );
}
function NotificationScene({ scope: s }) {
  return (
    <section
      className="page collection-page workbench-demo-collection"
      data-view={s.view}
      data-task-tone={s.status.tone}
    >
      <CollectionNotifications scope={s} />
      {s.view === "announcement" && <Announcement scope={s} />}
      {s.view === "detail" && (
        <>
          <CollectionTaskHeader scope={s} />
          <div className="collection-scroll" inert={!!s.panel}>
            <CollectionTaskDetail scope={s} idPrefix="workbench-task" />
          </div>
          <CollectionTaskFooter scope={s} />
        </>
      )}
      {s.panel && (
        <div
          className="collection-overlay workbench-demo-overlay"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              s.closePanel();
            }
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) s.closePanel();
          }}
        >
          <CollectionTaskDrawer
            scope={s}
            modal={false}
            idPrefix="workbench-task"
          />
        </div>
      )}
    </section>
  );
}
function PasswordReset({ scope: s }) {
  return (
    <div className="account-scroll">
      <div className="account-task-page">
        <div className="account-heading">
          <h2>重置密码</h2>
          <p>请设置8–32位、包含字母和数字的密码</p>
        </div>
        <form
          className="account-form"
          onSubmit={(e) => {
            e.preventDefault();
            s.savePassword();
          }}
        >
          {[
            ["新密码", "password"],
            ["确认新密码", "confirmPassword"],
          ].map(([label, field]) => (
            <label key={field} className="account-field">
              <span>{label}</span>
              <span className="account-input">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={s[field]}
                  onChange={(e) => {
                    s[field] = e.target.value;
                  }}
                />
              </span>
            </label>
          ))}
          {s.error && (
            <p role="alert" className="account-entry-error">
              {s.error}
            </p>
          )}
          <button className="account-primary" disabled={s.busy}>
            确认重置
          </button>
        </form>
      </div>
    </div>
  );
}
function LoginScene({ scope: s }) {
  const dialog = useRef(null);
  useLayoutEffect(() => {
    if (s.panel && dialog.current) {
      s.$refs.accountDialog = dialog.current;
      dialog.current.querySelector("button")?.focus({ preventScroll: true });
    }
  }, [s, s.panel]);
  return (
    <section
      className={
        "page account-page" + (s.isLoginSurface ? " account-entry" : "")
      }
      data-view={s.view}
    >
      <header className="account-nav" inert={!!s.panel}>
        <Back onClick={() => s.back()} />
      </header>
      {s.view === "reset" ? (
        <PasswordReset scope={s} />
      ) : (
        <div className="account-scroll" inert={!!s.panel}>
          <AccountLoginFlow scope={s} idPrefix="workbench-account" />
        </div>
      )}
      {s.panel && (
        <div
          className="account-overlay workbench-demo-overlay"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              s.closePanel();
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) s.closePanel();
          }}
        >
          <section
            className="account-drawer"
            ref={dialog}
            role="dialog"
            aria-modal={false}
            aria-label={s.panel === "oauth" ? "授权流程示意" : "协议阅读示意"}
          >
            <header>
              <h2>
                {s.panel === "oauth"
                  ? "授权流程示意"
                  : s.policy === "privacy"
                    ? "隐私政策阅读示意"
                    : "用户协议阅读示意"}
              </h2>
              <button aria-label="关闭" onClick={() => s.closePanel()}>
                <svg aria-hidden="true">
                  <use href="#i-close" />
                </svg>
              </button>
            </header>
            <div className="account-drawer-body">
              {s.panel === "oauth" ? (
                <>
                  <p>
                    模拟第三方授权，随后通过验证码绑定手机号；不会调用真实平台SDK。
                  </p>
                  <button
                    className="account-primary"
                    onClick={() => s.confirmProvider()}
                  >
                    同意授权并继续
                  </button>
                </>
              ) : (
                <>
                  <p>
                    {s.policy === "privacy"
                      ? "照片与采集信息用于完成用户发起的制作、核验和提交任务。请勿提交与任务无关的个人信息。"
                      : "请使用本人照片与真实身份信息，遵守采集项目的拍摄和提交要求。"}
                  </p>
                  <p>此处沿用账号原型的协议阅读示意，不代表正式协议已接入。</p>
                  <button
                    className="account-primary"
                    onClick={() => s.closePanel()}
                  >
                    返回
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
function UpdateScene({ session }) {
  const state = session.state,
    error = state.outcome === "error",
    old = state.outcome === "old";
  return (
    <div className="workbench-update-overlay">
      <section
        className="workbench-update-dialog"
        role="dialog"
        aria-label="强制更新演示"
      >
        <svg aria-hidden="true">
          <use href="#i-download" />
        </svg>
        <h2>{error ? "暂时无法打开更新入口" : "发现新版本"}</h2>
        <p>
          {error
            ? "更新尚未完成，请重试打开更新入口。"
            : old
              ? "尚未检测到已安装的新版本，请完成更新后继续。"
              : "请更新至最新版本后继续使用知拍。"}
        </p>
        <div className="workbench-update-copy">
          <span>更新内容</span>
          <p>以当前平台、当前渠道的正式发布说明为准。</p>
        </div>
        <button
          className="account-primary"
          onClick={() => {
            state.opened = true;
          }}
        >
          {error ? "重试打开" : "去更新"}
        </button>
        <p className="workbench-update-caption" role="status">
          {state.opened
            ? "原型演示：请在左侧选择升级结果。"
            : "从更新渠道返回后重新检查版本"}
        </p>
      </section>
    </div>
  );
}
export default function ScenarioHost() {
  const workspace = useWorkspace();
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const session = workspace?.session;
  if (!session) return null;
  return (
    <div className="workbench-scenario-host" aria-label="隔离演示原型">
      {session.kind === "notification" ? (
        <NotificationScene scope={session.scope} />
      ) : session.kind === "login" ? (
        <LoginScene scope={session.scope} />
      ) : (
        <UpdateScene session={session} />
      )}
    </div>
  );
}
