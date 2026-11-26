import SharedSheet from "../components/SharedSheet.jsx";
import { CodeGuide, SampleViewer } from "../components/ChsiCodeGuide.jsx";
import ToolNavigation from "../components/ToolNavigation.jsx";
import { collectionCodeHelp as guideContent } from "../domain/collection-code-help.js";
import React from "react";
import { FeedbackToast } from "../components/Feedback.jsx";
import { Controller, View } from "../runtime/components.jsx";
import "../styles/scan.css";

function Icon({ name, ...props }) {
  return (
    <svg aria-hidden="true" {...props}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
function Guide({ s }) {
  const sampleOpen = s.guidePage === "sample";
  const chsi = s.guidePage === "chsi" || sampleOpen;
  const content = guideContent[chsi ? "chsi" : s.guidePage];
  return <>
    <SharedSheet opened target="#scan-modal-layer" id="scan-guide-title" suspended={sampleOpen}
      className={chsi ? "university-sheet university-guide-sheet" : "scan-sheet scan-guide-sheet"}
      title={chsi ? "3 步获取图像采集码" : content?.title || "如何获取采集码"}
      closeLabel="关闭帮助" onClose={() => s.closeGuide()}
      dialogRef={node => { s.$refs.scanGuide = node; }}
      bodyRef={node => { s.$refs.scanGuideBody = node; }}
      leading={content && <button type="button" className="scan-sheet-back"
        onClick={() => s.showDirectory()} aria-label="返回帮助目录"><Icon name="chevron-left" /></button>}
      footer={<button type="button" className={chsi ? "primary-button" : "scan-primary"}
        onClick={() => s.guideBack()}>{content ? "返回帮助目录" : "返回扫码"}</button>}>
        {!content ? (
          <>
            <p className="scan-help-intro">
              根据你需要识别的二维码，查看获取方式。
            </p>
            <div className="scan-guide-directory">
              <button type="button" data-guide="institution" onClick={() => s.showGuide("institution")}>
                <Icon name="collection-school" />
                <span>
                  <strong>机构／院校二维码</strong>
                  <small>查看采集通知，向负责人获取</small>
                </span>
                <Icon name="chevron" />
              </button>
              <button type="button" data-guide="chsi" onClick={() => s.showGuide("chsi")}>
                <Icon name="collection-id" />
                <span>
                  <strong>学信网图像采集码</strong>
                  <small>查看样图与三步获取方法</small>
                </span>
                <Icon name="chevron" />
              </button>
            </div>
          </>
        ) : chsi ? (
          <CodeGuide onOpenSample={event => s.openGuideSample(event.currentTarget)}
            albumHint="保存完整图片，返回扫码页后点「从相册识别」。" />
        ) : (
          <>
            <p className="scan-help-intro">{content.intro}</p>
            <ol className="scan-guide-steps">
              {content.steps.map((step, i) => (
                <li key={step}>
                  <span aria-hidden="true">{i + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <p className="scan-guide-note">{content.note}</p>
          </>
        )}
    </SharedSheet>
    {sampleOpen && <SampleViewer target="#scan-modal-layer" onClose={() => s.closeGuideSample()} />}
  </>;
}
function Failure({ s }) {
  return (
    <SharedSheet opened target="#scan-modal-layer" id="scan-failure-title" className="scan-sheet scan-failure-sheet"
      title={s.failure.title} closeLabel="关闭识别结果" onClose={() => s.dismissFailure()}
      dialogRef={(node) => { s.$refs.scanResult = node; }}
      sectionProps={{ "aria-describedby": "scan-failure-message" }}
      footer={<>
        {s.failure.projectId ? (
          <button
            className="scan-primary"
            onClick={() => {
              const id = s.failure.projectId;
              s.failure = null;
              s.navigateProject(id);
            }}
          >
            查看项目
          </button>
        ) : (
          <button
            className="scan-primary"
            onClick={() =>
              s.source === "album" ? s.retryPhoto() : s.dismissFailure()
            }
          >
            {s.source === "album" ? "重新选择图片" : "重新扫描"}
          </button>
        )}
        <button className="scan-secondary" onClick={() => s.dismissFailure()}>
          返回扫码
        </button>
      </>}>
      <p id="scan-failure-message" role="alert">{s.failure.message}</p>
    </SharedSheet>
  );
}
export default function ScanPage({ args = [] }) {
  return (
    <Controller name="collectionScanner" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page collection-scan-page ui-task-page"
          id="scan-page"
          show={s.page === "scan"}
          aria-label="扫码采集"
        >
          <ToolNavigation title="扫码采集" inert={!!(s.result || s.guideOpen)} onBack={() => s.back()} />
          <div
            className="collection-scan-scroll"
            inert={s.result || s.guideOpen}
          >
            <p className="scan-supported">支持机构／院校码、学信网图像采集码</p>
            <div
              className="collection-scan-window"
              aria-label="二维码取景区域"
              aria-busy={s.starting || s.reading}
            >
              <View
                as="video"
                scope={s}
                refName="scanVideo"
                autoPlay
                muted
                playsInline
                show={s.ready}
              />
              <div
                className={`scan-frame${s.ready && !s.reading ? " scanning" : ""}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
                <i />
                <span className="scan-line" />
              </div>
              {!s.ready && (
                <div className="scan-camera-access">
                  <Icon name="scan" />
                  <p role="status">
                    {s.starting
                      ? "正在开启相机…"
                      : s.reading
                        ? s.uploading
                          ? "正在识别图片…"
                          : "正在关联采集项目…"
                        : s.cameraError ||
                          (s.source === "album"
                            ? "可继续选择采集码图片"
                            : "将二维码完整放入框内")}
                  </p>
                  {!s.starting && !s.reading && (
                    <button onClick={() => s.start()}>
                      {s.cameraError ? "重试开启相机" : "使用相机扫描"}
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="scan-position-hint">
              保持二维码完整、清晰，识别后进入对应项目
            </p>
            <div className="collection-scan-actions">
              <button
                className="scan-primary"
                disabled={s.reading || s.picking}
                onClick={() => s.pickPhoto()}
              >
                <Icon name="album" />
                {s.uploading ? "识别中…" : "从相册识别"}
              </button>
              {s.ready && s.torchSupported && (
                <button
                  className="scan-torch"
                  aria-pressed={s.torch}
                  onClick={() => s.toggleTorch()}
                >
                  <Icon name={s.torch ? "torch-on" : "torch"} />
                  {s.torch ? "关闭手电筒" : "手电筒"}
                </button>
              )}
            </div>
            <button
              className="scan-help-link"
              onClick={event => s.openGuide(event.currentTarget)}
              disabled={s.reading}
              aria-haspopup="dialog"
            >
              <Icon name="bulb" />
              如何获取采集码
              <Icon name="chevron" />
            </button>
            <View
              as="input"
              scope={s}
              refName="qrInput"
              className="sr-only"
              tabIndex={-1}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="选择采集码图片"
              onChange={(event) => s.upload(event)}
              onCancel={() => s.cancelPick()}
            />
          </div>
          {s.page === "scan" && (s.guideOpen ? <Guide s={s} /> : s.failure ? <Failure s={s} /> : null)}
          <FeedbackToast message={s.page === "scan" && !s.guideOpen && !s.failure && s.notice} />
        </View>
      )}
    </Controller>
  );
}
