import React, { useState } from "react";
import "../styles/portrait-photo-check.css";

export default function PortraitCheckStatus({ check, onReasons, onRetry }) {
  if (check.status === "passed") return null;
  const title = {
    idle: "待检查照片",
    checking: "正在检查照片",
    awaiting: "待确认检查结果",
    rejected: "照片不符合证件照要求",
    error: "照片检查未完成",
  }[check.status];
  return (
    <section
      className={"portrait-check-status " + check.status}
      role="status"
      aria-live="polite"
    >
      <span className="portrait-check-mark" aria-hidden="true">
        !
      </span>
      <div>
        <strong>{title}</strong>
        <p>仅支持单人正面人像证件照</p>
      </div>
      {check.status === "rejected" && (
        <button onClick={onReasons}>查看原因</button>
      )}
      {check.status === "error" && <button onClick={onRetry}>重新检查</button>}
    </section>
  );
}

export function PortraitCheckPanel({ panel, check, onChoose, onClose }) {
  const [reason, setReason] = useState("not_id");
  if (panel === "portraitOutcome")
    return (
      <div className="ui-sheet-panel portrait-check-panel">
        <div className="ui-sheet-body">
          <span className="portrait-demo-label">原型演示</span>
          <h3>选择照片检查结果</h3>
          <p>本原型不执行真实识别，请选择一种结果预览后续流程。</p>
          <div className="portrait-demo-choices">
            <button onClick={() => onChoose("passed")}>
              <strong>符合要求 · 通过</strong>
              <span>单人正面证件照，可继续当前操作</span>
            </button>
            <label>
              未通过原因
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="not_id">不是人像证件照</option>
                <option value="no_face">未识别到人脸</option>
                <option value="multiple_faces">照片中包含多人</option>
                <option value="background">照片背景复杂</option>
              </select>
            </label>
            <button onClick={() => onChoose("rejected", reason)}>
              <strong>不符合要求 · 不通过</strong>
              <span>停止当前操作，可查看原因并重新选图</span>
            </button>
          </div>
          <button
            className="portrait-demo-error"
            onClick={() => onChoose("error")}
          >
            模拟检查异常
          </button>
        </div>
      </div>
    );
  if (panel !== "portrait") return null;
  return (
    <div className="ui-sheet-panel portrait-check-panel">
      <div className="ui-sheet-body">
        <h3>请重新选择人像证件照</h3>
        <ul>
          {check.reasons.map((r) => (
            <li key={r.code}>{r.message}</li>
          ))}
        </ul>
        <p>请选择单人、正面、背景简洁的证件照，通过检查后继续操作。</p>
      </div>
      <footer className="ui-sheet-footer">
        <button className="tool-primary" onClick={onClose}>
          返回选照片
        </button>
      </footer>
    </div>
  );
}

export { PortraitCheckStatus };
