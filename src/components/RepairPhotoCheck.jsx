import React, { useState } from "react";
import "../styles/repair-photo-check.css";

export default function RepairCheckStatus({ check, onReasons, onRetry }) {
  const title = {
    idle: "待检查照片",
    checking: "正在检查照片",
    awaiting: "待确认检查结果",
    passed: "照片检查通过",
    rejected: "照片不符合精修要求",
    error: "照片检查未完成",
  }[check.status];
  return (
    <section
      className={"repair-check-status " + check.status}
      role="status"
      aria-live="polite"
    >
      <span className="repair-check-mark" aria-hidden="true">
        {check.status === "passed" ? "✓" : "!"}
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

export function RepairCheckPanel({ panel, check, onChoose, onSelect }) {
  const [reason, setReason] = useState("not_id");
  if (panel === "portraitOutcome")
    return (
      <div className="ui-sheet-panel repair-check-panel">
        <div className="ui-sheet-body">
          <span className="repair-demo-label">原型演示</span>
          <h3>选择照片检查结果</h3>
          <p>本原型不执行真实识别，请选择一种结果预览后续流程。</p>
          <div className="repair-demo-choices">
            <button onClick={() => onChoose("passed")}>
              <strong>符合要求 · 通过</strong>
              <span>单人正面证件照，可继续付款精修</span>
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
              <span>禁止付款与精修，可查看原因并重新选图</span>
            </button>
          </div>
          <button
            className="repair-demo-error"
            onClick={() => onChoose("error")}
          >
            模拟检查异常
          </button>
        </div>
      </div>
    );
  if (panel !== "portrait") return null;
  return (
    <div className="ui-sheet-panel repair-check-panel">
      <div className="ui-sheet-body">
        <h3>请重新选择人像证件照</h3>
        <ul>
          {check.reasons.map((r) => (
            <li key={r.code}>{r.message}</li>
          ))}
        </ul>
        <p>选择单人、正面、背景简洁的证件照，通过检查后再进行精修。</p>
      </div>
      <footer className="ui-sheet-footer">
        <button className="tool-primary" onClick={onSelect}>
          重新选择照片
        </button>
      </footer>
    </div>
  );
}

export { RepairCheckStatus };
