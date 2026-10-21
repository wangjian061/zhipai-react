import React from "react";
import { View } from "../runtime/components.jsx";
import CameraConfirmationSettings from "./CameraConfirmationSettings.jsx";
import CameraResultVersions from "./CameraResultVersions.jsx";
import "../styles/camera-dual-results.css";
import "../styles/camera-workflow.css";

function Header({ scope: s }) {
  return (
    <header className="camera-stage-header">
      <button
        type="button"
        aria-label={s.step === "editor" ? "返回" : s.confirmationBackLabel}
        disabled={s.busy}
        onClick={() => s.back()}
      >
        <svg aria-hidden="true">
          <use href="#i-chevron" />
        </svg>
      </button>
      <View
        as="h1"
        scope={s}
        refName={
          s.step === "editor" ? "cameraResultTitle" : "cameraConfirmTitle"
        }
        tabIndex={-1}
      >
        证件照制作
      </View>
      <span />
    </header>
  );
}

export function CameraConfirmationPage({ scope: s }) {
  if (s.step !== "confirm") return null;
  return (
    <div
      className="camera-confirm"
      data-configurable={!s.collectionCapture}
      aria-busy={s.processing}
    >
      <Header scope={s} />
      <div className="camera-stage-scroll camera-confirm-scroll">
        <figure className="capture-confirm-photo" aria-label="照片预览区域">
          <img src={s.sourceURL || undefined} alt="待制作的原照片" />
        </figure>
        <p className="camera-stage-hint">请确认人像清晰、正面无遮挡</p>
        {s.error && !s.workflowModal && !s.taskSheet && (
          <p className="camera-error" role="alert">
            {s.error}
          </p>
        )}
        <CameraConfirmationSettings
          specs={s.quickSpecs}
          colors={s.colors}
          selectedSpec={s.draft?.specId}
          sizeLabel={s.confirmationSizeLabel}
          background={s.draft?.background}
          disabled={!s.canConfigureConfirmation}
          locked={s.collectionCapture}
          onSpec={(id) => s.setConfirmationSpec(id)}
          onMoreSpec={() => s.openPanel("spec")}
          onBackground={(value) => s.setConfirmationBackground(value)}
        />
      </div>
      <footer className="camera-stage-actions camera-confirm-actions">
        <button
          type="button"
          className="camera-outline-button"
          disabled={s.busy}
          onClick={() => s.replaceConfirmationPhoto()}
        >
          {s.confirmationReplaceLabel}
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={s.busy || !s.sourcePhoto?.blob}
          onClick={() => s.processDraft()}
        >
          开始制作
        </button>
      </footer>
    </div>
  );
}

export function CameraResultPage({ scope: s }) {
  if (s.step !== "editor") return null;
  return (
    <div
      className={
        "camera-editor camera-readonly-result" +
        (s.dualResults ? " camera-dual-results" : "")
      }
    >
      <Header scope={s} />
      <div className="camera-stage-scroll">
        <div className="camera-result-heading">
          <h2>
            {s.dualResults
              ? s.unlocked
                ? "照片已解锁"
                : "选择照片版本"
              : "制作成功"}
          </h2>
          <p>
            {s.spec.name} · {s.spec.mm}
            {s.dualResults && " · " + s.backgroundLabel}
          </p>
          {s.dualResults && !s.unlocked && (
            <p className="camera-result-instruction">
              选择一张解锁，付款后保存到知拍相册。
            </p>
          )}
        </div>
        {s.dualResults ? (
          <CameraResultVersions scope={s} />
        ) : (
          <figure className="camera-result-photo">
            <img
              src={s.previewURL || undefined}
              alt="已制作的证件照"
              draggable="false"
            />
            {!s.unlocked && (
              <div
                className="photo-watermark"
                aria-label="预览水印：知拍证件照"
              >
                <span>知拍证件照</span>
                <span>知拍证件照</span>
                <span>知拍证件照</span>
              </div>
            )}
          </figure>
        )}
        {s.error && !s.workflowModal && !s.taskSheet && (
          <p className="camera-error" role="alert">
            {s.error}
          </p>
        )}
        {s.$store.photoLibrary.error && (
          <div className="camera-result-storage-error">
            <p className="camera-error" role="alert">
              {s.$store.photoLibrary.error}
            </p>
            <button
              type="button"
              className="camera-text-action"
              disabled={s.busy}
              onClick={() => s.$store.photoLibrary.load()}
            >
              重新加载相册
            </button>
          </div>
        )}
      </div>
      <footer className="camera-stage-actions camera-result-actions">
        <button
          type="button"
          className="primary-button"
          disabled={
            s.busy ||
            !s.outputBlob ||
            !s.canPurchaseVersion ||
            s.draft?.status !== "ready" ||
            (s.unlocked && !s.canSave && !s.draft?.savedId)
          }
          onClick={() => s.primary()}
        >
          {s.primaryLabel}
        </button>
      </footer>
    </div>
  );
}

export function CameraWorkflowModal({ scope: s }) {
  if (s.page !== "camera" || !s.workflowModal) return null;
  const making = s.panel === "making",
    choosing = s.panel === "makingResult",
    selecting = s.panel === "detectionScenario";
  return (
    <div
      className="camera-workflow-overlay"
      onKeyDown={(e) => s.trapFocus(e)}
      onClick={(event) => {
        if (selecting && event.target === event.currentTarget) s.closePanel();
      }}
    >
      <View
        as="section"
        scope={s}
        refName="cameraWorkflowDialog"
        className={"camera-workflow-dialog" + (making ? " is-making" : "")}
        role={making || choosing || selecting ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby="camera-workflow-title"
        aria-describedby="camera-workflow-description"
        tabIndex={-1}
      >
        <div className="camera-workflow-message">
          {making && (
            <span className="camera-making-indicator" aria-hidden="true" />
          )}
          <h2 id="camera-workflow-title">
            {selecting
              ? "选择演示场景"
              : making
                ? "正在制作"
                : choosing
                  ? "选择制作结果"
                  : "返回并重新制作？"}
          </h2>
          <div
            id="camera-workflow-description"
            className="camera-workflow-description"
          >
            {selecting ? (
              <p>原型演示，请选择本次照片检测情况。</p>
            ) : making ? (
              <p role="status">请稍候，正在制作证件照</p>
            ) : choosing ? (
              <p>原型演示，请选择本次制作结果。</p>
            ) : (
              <>
                <p>返回后将丢弃本次制作结果，原照片和设置会保留。</p>
                {s.error && (
                  <p className="camera-error" role="alert">
                    {s.error}
                  </p>
                )}
              </>
            )}
          </div>
          {selecting && (
            <div
              className="camera-scenario-options"
              aria-label="照片检测演示场景"
            >
              {s.detectionScenarios.map((scenario) => (
                <button
                  type="button"
                  key={scenario.id}
                  onClick={() => s.chooseDetectionScenario(scenario.id)}
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {!making && (
          <footer
            className={
              "camera-workflow-dialog-actions" +
              (choosing ? " is-result-choice" : "")
            }
          >
            {selecting ? (
              <button
                type="button"
                className="camera-scenario-cancel"
                onClick={() => s.closePanel()}
              >
                取消
              </button>
            ) : choosing ? (
              <>
                <button
                  type="button"
                  onClick={() => s.chooseMakingResult("success")}
                >
                  {s.draft?.retryVersionId
                    ? "重试成功"
                    : s.collectionCapture
                      ? "制作成功"
                      : "两版均成功"}
                </button>
                {!s.collectionCapture && !s.draft?.retryVersionId && (
                  <>
                    <button
                      type="button"
                      onClick={() => s.chooseMakingResult("ordinary_only")}
                    >
                      仅普通版成功
                    </button>
                    <button
                      type="button"
                      onClick={() => s.chooseMakingResult("retouched_only")}
                    >
                      仅精修版成功
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="camera-destructive-action"
                  onClick={() => s.chooseMakingResult("failure")}
                >
                  {s.draft?.retryVersionId ? "重试失败" : "照片制作失败"}
                </button>
                <button
                  type="button"
                  className="camera-service-action"
                  onClick={() => s.chooseMakingResult("service_unavailable")}
                >
                  服务不可用
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={s.saving}
                  onClick={() => s.closePanel()}
                >
                  继续查看
                </button>
                <button
                  type="button"
                  className="camera-destructive-action"
                  disabled={s.saving}
                  onClick={() => s.discardResult()}
                >
                  {s.saving ? "正在返回…" : "丢弃并返回"}
                </button>
              </>
            )}
          </footer>
        )}
      </View>
    </div>
  );
}
