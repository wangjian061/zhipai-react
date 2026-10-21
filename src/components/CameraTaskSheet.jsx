import React from "react";
import { View } from "../runtime/components.jsx";
import PhotoProcessingEffect from "./PhotoProcessingEffect.jsx";
import "../styles/camera-task-sheet.css";

function TaskPhoto({ scope: s, checking = false }) {
  return (
    <figure className="camera-task-thumbnail">
      <img src={s.sourceURL || undefined} alt="本次制作的原照片" />
      <PhotoProcessingEffect active={checking} imageSrc={s.sourceURL} />
    </figure>
  );
}

function TaskChecks({ checks }) {
  if (!checks?.length) return null;
  return (
    <ul className="camera-check-items" aria-label="照片检测项">
      {checks.map((item) => (
        <li key={item.id} data-status={item.status}>
          <span>{item.label}</span>
          <span className="camera-check-status">
            {item.status === "passed"
              ? "符合要求"
              : item.status === "failed"
                ? "未通过"
                : item.status === "unknown"
                  ? "未完成"
                  : "检测中"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function CameraTaskSheet({ scope: s }) {
  if (s.page !== "camera" || !s.taskSheet) return null;
  const makingFailed = s.panel === "makingFailure";
  const knownMakingFailure = ["photo", "service"].includes(
    s.draft?.failureKind,
  );
  const serviceUnavailable = makingFailed && s.draft?.failureKind !== "photo";
  const checking = !makingFailed && s.detection?.status === "checking";
  const passed = !makingFailed && s.detection?.status === "passed";
  const error = !makingFailed && s.detection?.status === "error";
  const failure = makingFailed || s.detection?.status === "failed";
  const title = makingFailed
    ? serviceUnavailable
      ? "暂时无法制作"
      : "制作失败"
    : checking || passed
      ? "照片检测"
      : error
        ? "检测暂未完成"
        : "检测未通过";
  const reasons = makingFailed
    ? [
        (!knownMakingFailure
          ? "本次制作未完成，请稍后再试。"
          : s.draft?.failureReason) ||
          (serviceUnavailable
            ? "制作服务暂时不可用，请稍后再试。"
            : "本次制作未完成，请返回后调整照片。"),
      ]
    : error
      ? s.detection?.reasons || []
      : [];
  const retainedInReason = reasons.some((reason) =>
    reason.includes("原照片和设置已保留"),
  );
  return (
    <div
      className="camera-task-overlay"
      onKeyDown={(event) => s.trapFocus(event)}
      onClick={(event) => {
        if (event.target === event.currentTarget) s.closeTaskSheet();
      }}
    >
      <View
        as="section"
        scope={s}
        refName="cameraTaskDialog"
        className="camera-task-sheet ui-sheet"
        data-failure={failure ? "true" : undefined}
        role={checking || passed ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="camera-task-title"
        aria-describedby={
          makingFailed
            ? "camera-task-description camera-task-failure-reasons"
            : "camera-task-description"
        }
        tabIndex={-1}
      >
        <span className="sheet-handle" aria-hidden="true" />
        <header className="ui-sheet-header">
          {failure && (
            <svg
              className="camera-task-status-icon"
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" />
              {makingFailed ? (
                <path d="m9 9 6 6m0-6-6 6" />
              ) : (
                <>
                  <path d="M12 7.5v5" />
                  <circle
                    cx="12"
                    cy="16"
                    r="0.7"
                    fill="currentColor"
                    stroke="none"
                  />
                </>
              )}
            </svg>
          )}
          <h2 id="camera-task-title">{title}</h2>
          <button
            type="button"
            aria-label={checking ? "取消检测" : "关闭提示"}
            onClick={() => s.closeTaskSheet()}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="ui-sheet-body">
          {failure ? (
            <>
              <div className="camera-task-failure-result">
                <p id="camera-task-description">
                  {makingFailed
                    ? serviceUnavailable
                      ? "请稍后重新开始，无需更换照片。"
                      : "本次未能完成证件照制作。"
                    : "当前照片不符合制作要求，暂时无法开始制作。"}
                </p>
                {makingFailed && (
                  <div id="camera-task-failure-reasons">
                    {reasons.map((reason, index) => (
                      <p key={index}>{reason}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="camera-task-failure-support">
                <div className="camera-task-overview">
                  <TaskPhoto scope={s} />
                  <div>
                    <h3>本次照片</h3>
                    <p>
                      {retainedInReason
                        ? serviceUnavailable
                          ? "返回后可重新开始。"
                          : "返回后可调整或重新开始。"
                        : "原照片和设置已保留。"}
                    </p>
                  </div>
                </div>
                {!makingFailed && !!s.detection?.checks?.length && (
                  <section
                    className="camera-task-failure-checks"
                    aria-label="检测明细"
                  >
                    <h3>检测明细</h3>
                    <TaskChecks checks={s.detection.checks} />
                  </section>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="camera-task-overview">
                <TaskPhoto scope={s} checking={checking} />
                <p
                  id="camera-task-description"
                  role={checking ? "status" : undefined}
                >
                  {passed
                    ? "照片符合要求，正在开始制作。"
                    : checking
                      ? "正在检查照片是否符合制作要求，通过后将自动开始制作。"
                      : error
                        ? "检测未完成，暂时不能开始制作。原照片和设置已保留。"
                        : "请查看本次检测结果。"}
                </p>
              </div>
              <TaskChecks checks={s.detection?.checks} />
              {!!reasons.length && (
                <div className="camera-task-reasons" role="alert">
                  <h3>{error ? "暂未完成的原因" : "原因"}</h3>
                  {reasons.map((reason, index) => (
                    <p key={index}>{reason}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <footer className="ui-sheet-footer camera-task-actions">
          {checking || passed ? (
            <button
              type="button"
              className="camera-task-secondary"
              onClick={() => s.closeTaskSheet()}
            >
              取消检测
            </button>
          ) : (
            <>
              {error && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => s.processDraft()}
                >
                  重新检测
                </button>
              )}
              <button
                type="button"
                className={error ? "camera-task-secondary" : "primary-button"}
                onClick={() => s.closeTaskSheet()}
              >
                {serviceUnavailable ? "返回" : "返回调整"}
              </button>
            </>
          )}
        </footer>
      </View>
    </div>
  );
}
