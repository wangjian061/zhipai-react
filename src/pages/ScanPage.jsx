import React from "react";
import { Controller, View, Portal } from "../runtime/components.jsx";
import "../styles/scan.css";

function Icon({ name, ...props }) {
  return (
    <svg aria-hidden="true" {...props}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
const guideContent = {
  institution: {
    title: "机构／院校二维码",
    intro: "由组织本次采集的机构或院校提供。",
    steps: [
      "查看机构或院校发布的采集通知，找到负责人／老师发送的二维码。",
      "二维码在手机里时，先保存图片，再返回知拍从相册识别；现场提供的二维码可直接扫描。",
      "尚未收到二维码时，请联系本次采集负责人获取。",
    ],
    note: "机构码用于进入采集项目，身份认证按项目要求继续办理。",
  },
  chsi: {
    title: "学信网图像采集码",
    intro: "使用本人账号，在学信档案中获取。",
    steps: [
      "登录本人学信网账号，进入「学信档案」。",
      "查看本人学籍；有多条学籍时，选择本次采集对应的学籍。",
      "打开该学籍的「图像采集码」，保存清晰完整的原图。",
      "返回知拍，选择「从相册识别」，核对本次采集的身份信息。",
    ],
    note: "请使用本人学籍对应的采集码。知拍不会索取学信网账号密码，具体入口以学信网当前界面为准。",
  },
};
function Guide({ s }) {
  const content = guideContent[s.guidePage];
  return (
    <View
      as="section"
      scope={s}
      refName="scanGuide"
      className="scan-sheet scan-guide-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-guide-title"
    >
      <span className="sheet-handle" aria-hidden="true" />
      <header>
        {content && (
          <button
            className="scan-sheet-back"
            onClick={() => s.showDirectory()}
            aria-label="返回帮助目录"
          >
            <Icon name="chevron-left" />
          </button>
        )}
        <h2 id="scan-guide-title">{content?.title || "如何获取采集码"}</h2>
        <button
          className="scan-sheet-close"
          onClick={() => s.closeGuide()}
          aria-label="关闭帮助"
        >
          <Icon name="close" />
        </button>
      </header>
      <View
        as="div"
        scope={s}
        refName="scanGuideBody"
        className="scan-sheet-body"
      >
        {!content ? (
          <>
            <p className="scan-help-intro">
              根据你需要识别的二维码，查看获取方式。
            </p>
            <div className="scan-guide-directory">
              <button onClick={() => s.showGuide("institution")}>
                <Icon name="collection-school" />
                <span>
                  <strong>机构／院校二维码</strong>
                  <small>查看采集通知，向负责人获取</small>
                </span>
                <Icon name="chevron" />
              </button>
              <button onClick={() => s.showGuide("chsi")}>
                <Icon name="collection-id" />
                <span>
                  <strong>学信网图像采集码</strong>
                  <small>进入本人学信档案获取</small>
                </span>
                <Icon name="chevron" />
              </button>
            </div>
          </>
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
      </View>
      <footer>
        {s.guidePage === "chsi" && (
          <a
            className="scan-primary"
            href="https://my.chsi.com.cn/archive/index.jsp"
            target="_blank"
            rel="noopener noreferrer"
          >
            打开学信档案
            <Icon name="arrow" />
          </a>
        )}
        <button
          className={s.guidePage === "chsi" ? "scan-secondary" : "scan-primary"}
          onClick={() => s.guideBack()}
        >
          {content ? "返回帮助目录" : "返回扫码"}
        </button>
      </footer>
    </View>
  );
}
function Failure({ s }) {
  return (
    <View
      as="section"
      scope={s}
      refName="scanResult"
      className="scan-sheet scan-failure-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-failure-title"
      aria-describedby="scan-failure-message"
    >
      <span className="sheet-handle" aria-hidden="true" />
      <header>
        <h2 id="scan-failure-title">{s.failure.title}</h2>
        <button
          className="scan-sheet-close"
          onClick={() => s.dismissFailure()}
          aria-label="关闭识别结果"
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="scan-sheet-body">
        <p id="scan-failure-message" role="alert">
          {s.failure.message}
        </p>
      </div>
      <footer>
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
      </footer>
    </View>
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
          className="page collection-scan-page"
          id="scan-page"
          show={s.page === "scan"}
          aria-label="扫码采集"
        >
          <div
            className="collection-scan-scroll"
            inert={s.result || s.guideOpen}
          >
            <header className="collection-scan-header">
              <button
                className="scan-back"
                onClick={() => s.back()}
                aria-label="返回"
              >
                <Icon name="chevron-left" />
              </button>
              <h1>扫码采集</h1>
              <span aria-hidden="true" />
            </header>
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
              onClick={() => s.openGuide()}
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
          <Portal target="#scan-modal-layer">
            {(s.guideOpen || s.failure) && s.page === "scan" && (
              <div
                className="camera-overlay scan-overlay"
                onClick={(event) => {
                  if (event.target === event.currentTarget)
                    s.guideOpen ? s.closeGuide() : s.dismissFailure();
                }}
                onKeyDown={(event) => s.trap(event)}
              >
                {s.guideOpen ? <Guide s={s} /> : <Failure s={s} />}
              </div>
            )}
          </Portal>
          {s.notice && (
            <div className="camera-toast" role="status">
              {s.notice}
            </div>
          )}
        </View>
      )}
    </Controller>
  );
}
