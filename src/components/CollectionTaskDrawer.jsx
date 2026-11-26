import React, { useCallback, useLayoutEffect, useRef } from "react";
import CollectionRecordCard from "./CollectionRecordCard.jsx";
import SharedSheet from "./SharedSheet.jsx";

export function ProjectRecordsDrawer({ scope: s }) {
  return <SharedSheet opened embedded id="project-records-title" className="collection-drawer"
    title={s.panelTitle} busy={s.busy} onClose={() => s.closePanel()}
    dialogRef={node => { s.$refs.collectionDialog = node; }}>
    <div className="collection-project-records-list">
      {s.projectRecords.map(record => <CollectionRecordCard key={record.id} scope={s} record={record} />)}
      {!s.projectRecords.length && <p className="collection-empty">
        {s.project.type === "association" ? "该机构还没有采集记录" : "该院校还没有采集记录"}
      </p>}
    </div>
  </SharedSheet>;
}

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
export default function CollectionTaskDrawer({
  scope: s,
  modal = true,
  idPrefix = "collection-task",
}) {
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
  if (
    !s.isTaskPanel ||
    !s.current ||
    ["serviceHelp", "email", "taskSupport"].includes(s.panel)
  )
    return null;
  const confirm = s.panel === "confirm";
  return (
    <SharedSheet opened embedded modal={modal} id={`${idPrefix}-drawer-title`}
      className="collection-drawer collection-auth-drawer collection-task-drawer"
      sectionProps={{ "data-panel": s.panel }} dialogRef={attach} bodyRef={body}
      title={s.panelTitle} subtitle={confirm ? `确认照片与身份无误，提交给${s.project.organization || "所属机构"}审核` : s.failureReasonHint}
      busy={s.busy} onClose={() => s.closePanel()} footer={confirm && (
        <button type="button" className="collection-primary"
          disabled={s.disabled || !s.canCollect || s.statusKey !== "draft"}
          onClick={() => s.confirmSubmit()}>
          {s.busy || s.recordsStore.busy ? "正在处理…" : "确认提交审核"}
        </button>
      )}>
        {(s.error || s.recordsStore.error) && (
          <p className="collection-auth-error" role="alert">
            {s.error || s.recordsStore.error}
          </p>
        )}
        {s.panel === "reviewReason" && (
          <section className="collection-auth-block collection-review-content">
            <p className="collection-review-project">{s.project.name}</p>
            <h3>{s.failureReasonTitle}</h3>
            <p className="collection-review-text">
              {s.current.reason || "暂无详细原因，请联系客服核实"}
            </p>
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
    </SharedSheet>
  );
}
