import React, { useCallback, useLayoutEffect, useRef } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";

function InformationRows({ rows }) {
  return (
    <dl className="collection-material-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "未填写"}</dd>
        </div>
      ))}
    </dl>
  );
}
function Materials({ scope: s }) {
  const record = s.current;
  return (
    <>
      <section className="collection-auth-block">
        <header className="collection-auth-block-heading">
          <h3>身份信息</h3>
        </header>
        <InformationRows
          rows={[
            ["姓名", record.name],
            [s.identifierLabel, record.number],
            ...(record.lastFour ? [["证件号后四位", record.lastFour]] : []),
          ]}
        />
      </section>
      <section className="collection-auth-block">
        <header className="collection-auth-block-heading">
          <h3>采集项目</h3>
        </header>
        <InformationRows
          rows={[
            ["项目名称", s.project.name],
            ["所属机构", s.project.organization],
          ]}
        />
      </section>
    </>
  );
}
function TaskSupport({ scope: s }) {
  return (
    <>
      <section className="collection-auth-block">
        <header className="collection-auth-block-heading">
          <h3>本次采集</h3>
        </header>
        <InformationRows
          rows={[
            ["姓名", s.current.name],
            ["采集项目", s.project.name],
          ]}
        />
        <div className="collection-support-reference">
          <span>客服号</span>
          <strong>{s.current.customer || "未生成"}</strong>
          {s.current.customer && (
            <button type="button" onClick={() => s.copyCustomer()}>
              复制
            </button>
          )}
        </div>
      </section>
      <section className="collection-auth-block">
        <header className="collection-auth-block-heading">
          <h3>联系客服</h3>
          <span>咨询时请提供客服号</span>
        </header>
        <button
          type="button"
          className="collection-task-email-entry"
          onClick={() => s.openEmailContact()}
        >
          <CollectionIcon name="nav-service" />
          <span>
            <strong>客服邮箱</strong>
            <small>zpai_service@163.com</small>
          </span>
          <CollectionIcon name="chevron" />
        </button>
      </section>
    </>
  );
}
function Supplement({ scope: s }) {
  return (
    <section className="collection-auth-block">
      <header className="collection-auth-block-heading">
        <h3>补充资料</h3>
        <span>{s.canEditSupplement ? "选填" : "已提交，仅供查看"}</span>
      </header>
      {s.canEditSupplement ? (
        <form
          id="collection-supplement-form"
          onSubmit={(event) => {
            event.preventDefault();
            s.saveSupplement();
          }}
        >
          <label className="collection-auth-field">
            <span>推荐人</span>
            <div className="collection-auth-input">
              <input
                name="collection-referrer"
                maxLength={30}
                placeholder="请输入推荐人姓名"
                value={s.supplement.referrer}
                disabled={s.disabled}
                onChange={(event) => {
                  s.supplement.referrer = event.target.value;
                }}
              />
            </div>
          </label>
          <label className="collection-auth-field">
            <span>年龄</span>
            <div className="collection-auth-input">
              <input
                name="collection-age"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                placeholder="请输入年龄"
                value={s.supplement.age}
                disabled={s.disabled}
                onChange={(event) => {
                  s.supplement.age = event.target.value;
                }}
              />
            </div>
          </label>
        </form>
      ) : (
        <InformationRows
          rows={[
            ["推荐人", s.current.supplement?.referrer],
            ["年龄", s.current.supplement?.age],
          ]}
        />
      )}
    </section>
  );
}

export default function CollectionTaskDrawer({ scope: s }) {
  const dialog = useRef(null),
    body = useRef(null);
  const attach = useCallback(
    (node) => {
      dialog.current = node;
      if (node) s.$refs.collectionDialog = node;
    },
    [s],
  );
  useLayoutEffect(() => {
    if (!s.isTaskPanel || !s.current) return;
    const node = dialog.current;
    if (node) s.$refs.collectionDialog = node;
    node?.querySelector("button")?.focus({ preventScroll: true });
    if (body.current) body.current.scrollTop = 0;
    return () => {
      if (s.$refs.collectionDialog === node) delete s.$refs.collectionDialog;
    };
  }, [s, s.panel, s.current?.id]);
  useLayoutEffect(() => {
    if (s.error && body.current) body.current.scrollTop = 0;
  }, [s.error]);
  if (!s.isTaskPanel || !s.current) return null;
  const confirm = s.panel === "confirm";
  return (
    <section
      className="collection-drawer collection-auth-drawer collection-task-drawer"
      data-panel={s.panel}
      ref={attach}
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-task-drawer-title"
    >
      <header className="collection-auth-header">
        <span className="collection-drawer-symbol">
          <CollectionIcon
            name={
              confirm
                ? "check"
                : ["email", "taskSupport"].includes(s.panel)
                  ? "nav-service"
                  : "document"
            }
          />
        </span>
        <div>
          <h2 id="collection-task-drawer-title">{s.panelTitle}</h2>
          <p>
            {confirm
              ? "核对照片及本人信息后提交审核"
              : s.panel === "materials"
                ? "本次采集登记的信息"
                : s.panel === "reviewReason"
                  ? s.failureReasonHint
                  : s.panel === "taskSupport"
                    ? "为本次采集提供帮助"
                    : s.panel === "email"
                      ? "将离开知拍并打开邮箱应用"
                      : s.canEditSupplement
                        ? "完善本次采集的补充资料"
                        : "查看本次提交的补充资料"}
          </p>
        </div>
        <button
          type="button"
          disabled={s.busy}
          onClick={() => s.closePanel()}
          aria-label="关闭"
        >
          <CollectionIcon name="close" />
        </button>
      </header>
      <div className="collection-auth-body" ref={body}>
        {(s.error || s.recordsStore.error) && (
          <p className="collection-auth-error" role="alert">
            {s.error || s.recordsStore.error}
          </p>
        )}
        {s.panel === "materials" && <Materials scope={s} />}
        {s.panel === "supplement" && <Supplement scope={s} />}
        {s.panel === "taskSupport" && <TaskSupport scope={s} />}
        {s.panel === "reviewReason" && (
          <section className="collection-auth-block collection-review-content">
            <p className="collection-review-project">{s.project.name}</p>
            <h3>{s.failureReasonTitle}</h3>
            <p className="collection-review-text">
              {s.current.reason || "暂无详细原因，请联系客服核实"}
            </p>
          </section>
        )}
        {s.panel === "email" && (
          <section className="collection-auth-block">
            <p className="collection-email-question">
              是否打开邮箱联系知拍客服？
            </p>
            <p className="collection-email-address">zpai_service@163.com</p>
          </section>
        )}
        {confirm && (
          <section className="collection-auth-block collection-submit-summary">
            {s.photoSrc && <img src={s.photoSrc} alt="待提交审核的本人照片" />}
            <InformationRows
              rows={[
                ["姓名", s.current.name],
                ["采集项目", s.project.name],
                [s.identifierLabel, s.current.number],
              ]}
            />
          </section>
        )}
      </div>
      {s.panel === "email" && (
        <footer className="collection-auth-footer collection-task-email-footer">
          <button
            type="button"
            className="collection-task-email-cancel"
            onClick={() => s.closePanel()}
          >
            取消
          </button>
          <a
            className="collection-primary"
            href={s.emailLink}
            onClick={(event) => {
              if (!s.confirmEmailContact()) event.preventDefault();
            }}
          >
            打开邮箱
          </a>
        </footer>
      )}
      {(confirm || (s.panel === "supplement" && s.canEditSupplement)) && (
        <footer className="collection-auth-footer">
          <button
            type={confirm ? "button" : "submit"}
            form={confirm ? undefined : "collection-supplement-form"}
            className="collection-primary"
            disabled={
              s.disabled ||
              (confirm && (!s.canCollect || s.statusKey !== "draft"))
            }
            onClick={confirm ? () => s.confirmSubmit() : undefined}
          >
            {s.busy || s.recordsStore.busy
              ? "正在处理…"
              : confirm
                ? "确认提交审核"
                : "保存信息"}
          </button>
        </footer>
      )}
    </section>
  );
}
