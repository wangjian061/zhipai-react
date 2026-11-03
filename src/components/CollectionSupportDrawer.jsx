import React, { useLayoutEffect, useRef } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
export default function CollectionSupportDrawer({
  scope: s,
  modal = true,
  idPrefix = "collection-support",
}) {
  const dialog = useRef(null);
  const help = s.panel === "serviceHelp";
  const visible = ["serviceHelp", "email", "taskSupport"].includes(s.panel);
  useLayoutEffect(() => {
    if (!visible || !dialog.current) return;
    const node = dialog.current;
    s.$refs.collectionDialog = node;
    node.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      if (s.$refs.collectionDialog === node) delete s.$refs.collectionDialog;
    };
  }, [s, s.panel, visible]);
  if (!visible) return null;
  const task = s.isRecordView ? s.current : null;
  return (
    <section
      ref={dialog}
      className="collection-drawer collection-auth-drawer collection-support-drawer"
      role="dialog"
      aria-modal={modal}
      aria-labelledby={`${idPrefix}-title`}
    >
      <header className="collection-auth-header">
        <span className="collection-drawer-symbol">
          <CollectionIcon name={help ? "document" : "nav-service"} />
        </span>
        <div>
          <h2 id={`${idPrefix}-title`}>
            {help ? s.helpArticle?.title || "采集帮助" : "联系知拍客服"}
          </h2>
          {!help && <p>由知拍客服统一受理并协调机构</p>}
        </div>
        <button type="button" aria-label="关闭" onClick={() => s.closePanel()}>
          <CollectionIcon name="close" />
        </button>
      </header>
      <div className="collection-auth-body collection-support-body">
        {help ? (
          <>
            {s.helpArticle?.url ? (
              <p>
                <a
                  href={s.helpArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看获取教程
                </a>
              </p>
            ) : (
              <p>
                {s.helpArticle?.body || "帮助内容暂时无法读取，请关闭后重试。"}
              </p>
            )}
            {!!s.helpArticle?.steps?.length && (
              <ol>
                {s.helpArticle.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <>
            {task && (
              <dl className="collection-material-rows">
                <div>
                  <dt>采集项目</dt>
                  <dd>{s.project.name}</dd>
                </div>
                <div>
                  <dt>客服号</dt>
                  <dd>{task.customer || "尚未生成"}</dd>
                </div>
              </dl>
            )}
            {!task && (
              <p>
                没有采集任务也可以咨询，请在邮件中说明项目名称和遇到的问题。
              </p>
            )}
            <div className="collection-support-address">
              <span>客服邮箱</span>
              {s.supportEmail ? (
                <p>{s.supportEmail}</p>
              ) : (
                <p role="alert">暂时无法获取有效客服邮箱，请重新读取。</p>
              )}
            </div>
            <p>点击「打开邮箱」将离开知拍。请在邮箱应用中编辑并发送邮件。</p>
            {s.contactNotice && (
              <p className="collection-support-feedback" role="status">
                {s.contactNotice}
              </p>
            )}
          </>
        )}
      </div>
      <footer className="collection-auth-footer collection-support-actions">
        {help ? (
          <button className="collection-primary" onClick={() => s.closePanel()}>
            我知道了
          </button>
        ) : s.supportEmail ? (
          <>
            <button
              className="collection-secondary"
              onClick={() => s.copySupportEmail()}
            >
              复制邮箱
            </button>
            <a
              className="collection-primary"
              href={s.emailLink}
              onClick={(e) => {
                if (!s.confirmEmailContact()) e.preventDefault();
              }}
            >
              打开邮箱
            </a>
          </>
        ) : (
          <button
            className="collection-primary"
            onClick={() => s.retryServiceContent()}
          >
            重新读取
          </button>
        )}
      </footer>
    </section>
  );
}
