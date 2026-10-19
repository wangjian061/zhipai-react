import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function CameraPage({ scope, args = [] }) {
  return (
    <Controller name="cameraStudio" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page camera-page"
          id="camera-page"
          show={s.page === "camera"}
          data-step={s.step}
          aria-label="拍摄证件照"
        >
          <View
            as="input"
            scope={s}
            refName="sourceInput"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex="-1"
            aria-label="选择照片"
            events={[
              {
                type: "change",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.phoneSelected($event);
                },
              },
            ]}
          ></View>
          <View
            as="input"
            scope={s}
            refName="captureInput"
            className="sr-only"
            type="file"
            accept="image/*"
            capture={s.lens === "front" ? "user" : "environment"}
            tabIndex="-1"
            aria-label="使用设备拍照"
            events={[
              {
                type: "change",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.phoneSelected($event);
                },
              },
            ]}
          ></View>
          <View as="div" scope={s} className="camera-body" inert={!!s.panel}>
            <View
              as="div"
              scope={s}
              className="capture-layout"
              show={s.step === "capture"}
            >
              <View
                as="video"
                scope={s}
                refName="liveVideo"
                className="live-camera-video"
                dynamicClass={{
                  "front-lens": s.lens === "front",
                }}
                autoPlay={true}
                muted={true}
                playsInline={true}
                show={s.cameraReady}
                aria-label="相机取景"
              ></View>
              <View
                as="button"
                scope={s}
                className="camera-floating-back"
                aria-label="返回"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.back();
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-chevron"></View>
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="resume-draft"
                show={s.draft && !s.draft.savedId}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.continueEditing();
                    },
                  },
                ]}
              >
                {"继续制作"}
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-chevron"></View>
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="camera-access"
                show={!s.cameraReady}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-camera"></View>
                </View>
                <View
                  as="h1"
                  scope={s}
                  text={s.cameraStarting ? "正在开启相机" : "拍摄证件照"}
                ></View>
                <View
                  as="p"
                  scope={s}
                  text={s.cameraError || "面向镜头，保持头部与肩部完整。"}
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="primary-button"
                  disabled={s.cameraStarting}
                  text={s.cameraStarting ? "等待相机权限…" : "开启相机"}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.startCamera();
                      },
                    },
                  ]}
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="device-camera-button"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.deviceCapture();
                      },
                    },
                  ]}
                >
                  {"使用设备拍照"}
                </View>
              </View>
              <View as="div" scope={s} className="capture-toolbar">
                <View
                  as="button"
                  scope={s}
                  className="capture-side"
                  disabled={s.cameraStarting || s.captureBusy}
                  aria-label="翻转相机"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.switchLens();
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-camera-flip"></View>
                  </View>
                  <View as="span" scope={s}>
                    {"翻转"}
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  className="shutter"
                  disabled={!s.cameraReady || s.busy || s.cameraStarting}
                  aria-label="拍摄照片"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.capture();
                      },
                    },
                  ]}
                >
                  <View as="span" scope={s}></View>
                </View>
                <View
                  as="button"
                  scope={s}
                  className="capture-side"
                  disabled={s.captureBusy}
                  aria-label="打开手机相册"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openPicker();
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-album"></View>
                  </View>
                  <View as="span" scope={s}>
                    {"相册"}
                  </View>
                </View>
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="camera-confirm"
              show={s.step === "confirm"}
              aria-busy={s.processing || s.previewing}
            >
              <header className="camera-stage-header">
                <button
                  aria-label="返回拍摄"
                  disabled={s.busy}
                  onClick={() => s.back()}
                >
                  <svg aria-hidden="true">
                    <use href="#i-chevron" />
                  </svg>
                </button>
                <h1>
                  {s.processing || s.previewing
                    ? "正在制作证件照"
                    : s.draft?.status === "failed"
                      ? "照片制作"
                      : "确认拍摄效果"}
                </h1>
                <span />
              </header>
              <div className="camera-stage-scroll camera-confirm-scroll">
                <div className="capture-confirm-photo">
                  <img src={s.sourceURL || undefined} alt="本次拍摄的照片" />
                  {(s.processing || s.previewing) && (
                    <div
                      className="camera-confirm-processing"
                      aria-hidden="true"
                    >
                      <span className="camera-confirm-scan" />
                      <span className="camera-confirm-progress">
                        <i className="camera-spinner" />
                        照片制作中
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className={
                    "camera-confirm-message" +
                    (s.draft?.status === "failed" ? " is-failed" : "")
                  }
                  role="status"
                  aria-live="polite"
                >
                  <div className="camera-confirm-status-heading">
                    {s.draft?.status === "failed" && (
                      <svg
                        className="camera-failure-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="m9 9 6 6m0-6-6 6" />
                      </svg>
                    )}
                    <h2>
                      {s.processing || s.previewing
                        ? "正在制作标准证件照"
                        : s.draft?.status === "failed"
                          ? "证件照制作失败"
                          : "满意这次拍摄效果吗？"}
                    </h2>
                  </div>
                  <p className="camera-stage-hint">
                    {s.processing || s.previewing
                      ? "请稍候，正在处理您的照片"
                      : s.draft?.status === "failed"
                        ? "原照片已保留，请查看原因后重新制作"
                        : "使用照片，开始制作证件照"}
                  </p>
                </div>
                {s.draft?.status === "failed" ? (
                  <button
                    className="camera-failure-link"
                    onClick={() => s.openFailureReason()}
                  >
                    查看失败原因
                    <svg aria-hidden="true">
                      <use href="#i-chevron" />
                    </svg>
                  </button>
                ) : (
                  s.error && (
                    <p className="camera-error" role="alert">
                      {s.error}
                    </p>
                  )
                )}
              </div>
              <footer className="camera-stage-actions">
                <button
                  className="camera-secondary"
                  disabled={s.busy}
                  onClick={() => s.retake()}
                >
                  重新拍摄
                </button>
                <button
                  className="primary-button"
                  disabled={s.busy || !s.sourcePhoto}
                  onClick={() => s.processDraft()}
                >
                  {s.processing || s.previewing
                    ? "制作中…"
                    : s.draft?.status === "failed"
                      ? "重新制作"
                      : "使用照片"}
                </button>
              </footer>
            </View>
            <View
              as="div"
              scope={s}
              className="camera-editor"
              show={s.step === "editor"}
            >
              <View as="header" scope={s} className="camera-stage-header">
                <View
                  as="button"
                  scope={s}
                  disabled={s.paying || s.saving}
                  aria-label="返回确认照片"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.back();
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-chevron"></View>
                  </View>
                </View>
                <View as="h1" scope={s}>
                  {"制作证件照"}
                </View>
                <View as="span" scope={s}></View>
              </View>
              <View as="div" scope={s} className="camera-stage-scroll">
                <View as="div" scope={s} className="camera-result-photo">
                  <View
                    as="img"
                    scope={s}
                    src={s.previewURL || s.sourceURL || undefined}
                    alt="制作后的证件照预览"
                    draggable="false"
                  />
                  <View
                    as="div"
                    scope={s}
                    className="photo-watermark"
                    show={!s.unlocked}
                    aria-label="预览水印：知拍证件照"
                  >
                    <View as="span" scope={s}>
                      {"知拍证件照"}
                    </View>
                    <View as="span" scope={s}>
                      {"知拍证件照"}
                    </View>
                    <View as="span" scope={s}>
                      {"知拍证件照"}
                    </View>
                  </View>
                </View>
                <View as="div" scope={s} className="camera-result-meta">
                  <View
                    as="strong"
                    scope={s}
                    text={s.spec.name + " · " + s.spec.mm}
                  ></View>
                  <View as="span" scope={s}>
                    {"通过「选择尺寸」调整裁剪范围"}
                  </View>
                </View>
                <View as="div" scope={s} className="camera-edit-actions">
                  <View
                    as="button"
                    scope={s}
                    disabled={s.busy}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.openPanel("spec");
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-crop-frame"></View>
                    </View>
                    <View as="strong" scope={s}>
                      {"选择尺寸"}
                    </View>
                  </View>
                  <View
                    as="button"
                    scope={s}
                    disabled={s.busy}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.openPanel("background");
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-background"></View>
                    </View>
                    <View as="strong" scope={s}>
                      {"选择背景色"}
                    </View>
                  </View>
                </View>
                <View
                  as="p"
                  scope={s}
                  className="camera-render-status"
                  show={s.previewing}
                  role="status"
                >
                  {"正在更新照片…"}
                </View>
                <View
                  as="p"
                  scope={s}
                  className="camera-error"
                  show={s.error}
                  text={s.error}
                  role="alert"
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="camera-text-action"
                  show={s.error && s.standardBlob}
                  disabled={s.busy}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.renderResult();
                      },
                    },
                  ]}
                >
                  {"重新生成预览"}
                </View>
                <View
                  as="p"
                  scope={s}
                  className="camera-error"
                  show={s.$store.photoLibrary.error}
                  text={s.$store.photoLibrary.error}
                  role="alert"
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="camera-text-action"
                  show={s.$store.photoLibrary.error}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.$store.photoLibrary.load();
                      },
                    },
                  ]}
                >
                  {"重新加载相册"}
                </View>
              </View>
              <View
                as="footer"
                scope={s}
                className="camera-stage-actions camera-result-actions"
              >
                <View
                  as="button"
                  scope={s}
                  className="camera-secondary"
                  disabled={s.busy}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openPanel("discard");
                      },
                    },
                  ]}
                >
                  {"丢弃照片"}
                </View>
                <View
                  as="button"
                  scope={s}
                  className="primary-button"
                  disabled={
                    s.busy ||
                    s.draft?.status !== "ready" ||
                    s.draft?.renderRevision !== s.editRevision ||
                    (s.unlocked && !s.canSave && !s.draft?.savedId)
                  }
                  text={s.primaryLabel}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.primary();
                      },
                    },
                  ]}
                ></View>
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="camera-saved"
              show={s.step === "saved"}
            >
              <View as="header" scope={s} className="camera-stage-header">
                <View
                  as="button"
                  scope={s}
                  aria-label="返回"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.finish();
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-chevron"></View>
                  </View>
                </View>
                <View as="h1" scope={s}>
                  {"保存照片"}
                </View>
                <View as="span" scope={s}></View>
              </View>
              <View as="div" scope={s} className="camera-stage-scroll">
                <View as="div" scope={s} className="camera-saved-status">
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-check"></View>
                  </View>
                  <View as="h2" scope={s}>
                    {"保存成功"}
                  </View>
                  <View as="p" scope={s}>
                    {"照片已保存到知拍相册"}
                  </View>
                </View>
                <View
                  as="img"
                  scope={s}
                  className="camera-saved-photo"
                  src={s.previewURL || undefined}
                  alt="已保存的无水印照片"
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="camera-text-action"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.download();
                      },
                    },
                  ]}
                >
                  {"保存到设备"}
                </View>
              </View>
              <View as="footer" scope={s} className="camera-stage-actions">
                <View
                  as="button"
                  scope={s}
                  className="camera-secondary"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.viewSaved();
                      },
                    },
                  ]}
                >
                  {"查看照片"}
                </View>
                <View
                  as="button"
                  scope={s}
                  className="primary-button"
                  text={
                    ["print", "tool-create"].includes(s.editingFrom)
                      ? "继续使用"
                      : "返回相册"
                  }
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.finish();
                      },
                    },
                  ]}
                ></View>
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="camera-restoring"
              show={s.restoring}
              role="status"
            >
              {"正在恢复照片…"}
            </View>
          </View>
          <View
            as="p"
            scope={s}
            className="camera-toast"
            show={s.notice && s.page === "camera"}
            text={s.notice}
            role="status"
            transition={{
              opacity: true,
              duration: 150,
            }}
          ></View>
          <Portal target="#camera-modal-layer">
            <View
              as="div"
              scope={s}
              className="camera-overlay"
              dynamicClass={{
                "camera-result-overlay": s.panel === "makingResult",
              }}
              show={s.page === "camera" && !!s.panel}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: true,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.closePanel();
                  },
                },
                {
                  type: "keydown",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.trapFocus($event);
                  },
                },
              ]}
              transition={{
                opacity: true,
                duration: 150,
              }}
            >
              <View
                as="section"
                scope={s}
                className="camera-dialog ui-sheet"
                dynamicClass={{
                  "camera-size-drawer": s.panel === "spec",
                  "camera-result-dialog": s.panel === "makingResult",
                }}
                refName="cameraDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="camera-drawer-title"
              >
                <View
                  as="span"
                  scope={s}
                  className="sheet-handle"
                  aria-hidden="true"
                ></View>
                <View as="header" scope={s} className="ui-sheet-header">
                  <View
                    as="h2"
                    scope={s}
                    id="camera-drawer-title"
                    text={
                      {
                        makingResult: "模拟制作结果",
                        failureReason: "失败原因",
                        payment: "解锁电子照片",
                        spec: "尺寸与裁剪",
                        background: "选择背景色",
                        discard: "丢弃本次照片？",
                      }[s.panel]
                    }
                  ></View>
                  <View
                    as="button"
                    scope={s}
                    disabled={s.paying || s.saving}
                    aria-label="关闭弹窗"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.closePanel();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-close"></View>
                    </View>
                  </View>
                </View>
                {s.panel === "makingResult" && (
                  <div className="ui-sheet-panel">
                    <div className="ui-sheet-body">
                      <p className="camera-result-choice-note">
                        请选择本次演示的制作结果
                      </p>
                    </div>
                    <footer className="ui-sheet-footer camera-result-choice-actions">
                      <button
                        className="camera-secondary"
                        onClick={() => s.chooseMakingResult("failure")}
                      >
                        制作失败
                      </button>
                      <button
                        className="primary-button"
                        onClick={() => s.chooseMakingResult("success")}
                      >
                        制作成功
                      </button>
                    </footer>
                  </div>
                )}
                {s.panel === "failureReason" && (
                  <div className="ui-sheet-panel">
                    <div className="ui-sheet-body camera-failure-body">
                      <p>{s.draft?.failureReason || s.error}</p>
                    </div>
                    <footer className="ui-sheet-footer">
                      <button
                        className="primary-button camera-reason-close"
                        onClick={() => s.closePanel()}
                      >
                        我知道了
                      </button>
                    </footer>
                  </div>
                )}
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "spec"}
                  className="ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View as="div" scope={s} className="camera-size-options">
                      <Repeat
                        scope={s}
                        items={s.specs}
                        names={["item"]}
                        keyFor={function (scope, $event, $el) {
                          return scope.item.id;
                        }}
                      >
                        {(s) => (
                          <>
                            <>
                              <View
                                as="button"
                                scope={s}
                                dynamicClass={{
                                  selected: s.fields.specId === s.item.id,
                                }}
                                aria-pressed={s.fields.specId === s.item.id}
                                events={[
                                  {
                                    type: "click",
                                    prevent: false,
                                    stop: false,
                                    self: false,
                                    passive: false,
                                    run: function (scope, $event, $el) {
                                      scope.setPanelSpec(scope.item.id);
                                    },
                                  },
                                ]}
                              >
                                <View
                                  as="strong"
                                  scope={s}
                                  text={s.item.name}
                                ></View>
                                <View
                                  as="span"
                                  scope={s}
                                  text={s.item.mm}
                                ></View>
                              </View>
                            </>
                          </>
                        )}
                      </Repeat>
                      <View
                        as="button"
                        scope={s}
                        dynamicClass={{
                          selected: s.fields.specId === "custom",
                        }}
                        aria-pressed={s.fields.specId === "custom"}
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.setPanelSpec("custom");
                            },
                          },
                        ]}
                      >
                        <View as="strong" scope={s}>
                          {"自定义比例"}
                        </View>
                        <View as="span" scope={s}>
                          {"按比例裁剪"}
                        </View>
                      </View>
                    </View>
                    <View
                      as="div"
                      scope={s}
                      className="camera-custom-ratio"
                      show={s.fields.specId === "custom"}
                    >
                      <View as="label" scope={s}>
                        {"宽"}
                        <View
                          as="input"
                          scope={s}
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          inputMode="decimal"
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.fields.ratioWidth;
                            },
                            write: function (scope, $event, $el) {
                              scope.fields.ratioWidth = $event;
                            },
                            number: true,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                      <View as="span" scope={s}>
                        {":"}
                      </View>
                      <View as="label" scope={s}>
                        {"高"}
                        <View
                          as="input"
                          scope={s}
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          inputMode="decimal"
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.fields.ratioHeight;
                            },
                            write: function (scope, $event, $el) {
                              scope.fields.ratioHeight = $event;
                            },
                            number: true,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                    </View>
                    <View
                      as="div"
                      scope={s}
                      className="camera-size-preview camera-edit-frame"
                      dynamicClass={{
                        "transparent-frame":
                          s.fields.background === "transparent",
                      }}
                      dynamicStyle={
                        "--frame-ratio:" +
                        s.panelSpec.width +
                        "/" +
                        s.panelSpec.height +
                        ";aspect-ratio:" +
                        s.panelSpec.width +
                        "/" +
                        s.panelSpec.height +
                        ";background-color:" +
                        (s.fields.background === "transparent"
                          ? "transparent"
                          : s.fields.background || "#438bc6")
                      }
                      events={[
                        {
                          type: "pointerdown",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.startCropGesture($event);
                          },
                        },
                        {
                          type: "pointermove",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.moveCropGesture($event);
                          },
                        },
                        {
                          type: "pointerup",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.endCropGesture($event);
                          },
                        },
                        {
                          type: "pointercancel",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.endCropGesture($event);
                          },
                        },
                      ]}
                    >
                      <View
                        as="img"
                        scope={s}
                        src={s.standardURL || undefined}
                        dynamicStyle={s.panelPhotoStyle}
                        alt="按所选比例裁剪照片"
                        draggable="false"
                      ></View>
                      <View
                        as="span"
                        scope={s}
                        className="camera-crop-grid"
                        aria-hidden="true"
                      ></View>
                    </View>
                    <View as="p" scope={s} className="camera-crop-hint">
                      {"拖动位置 · 双指缩放"}
                    </View>
                    <View as="label" scope={s} className="camera-zoom-control">
                      {"缩放"}
                      <View
                        as="input"
                        scope={s}
                        type="range"
                        min="0.5"
                        max="4"
                        step="0.01"
                        model={{
                          read: function (scope, $event, $el) {
                            return scope.fields.scale;
                          },
                          write: function (scope, $event, $el) {
                            scope.fields.scale = $event;
                          },
                          number: true,
                          lazy: false,
                        }}
                      ></View>
                      <View
                        as="span"
                        scope={s}
                        text={Number(s.fields.scale || 1).toFixed(2) + "×"}
                      ></View>
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="camera-text-action"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.resetCrop();
                          },
                        },
                      ]}
                    >
                      {"重置位置"}
                    </View>
                    <View
                      as="p"
                      scope={s}
                      className="camera-error"
                      show={s.error}
                      text={s.error}
                      role="alert"
                    ></View>
                  </View>
                  <View as="footer" scope={s} className="ui-sheet-footer">
                    <View
                      as="button"
                      scope={s}
                      className="primary-button camera-pay-button"
                      disabled={s.busy}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.applyPanel();
                          },
                        },
                      ]}
                    >
                      {"确认尺寸与裁剪"}
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "background"}
                  className="ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View as="div" scope={s} className="camera-color-options">
                      <Repeat
                        scope={s}
                        items={s.colors}
                        names={["item"]}
                        keyFor={function (scope, $event, $el) {
                          return scope.item.value;
                        }}
                      >
                        {(s) => (
                          <>
                            <>
                              <View
                                as="button"
                                scope={s}
                                aria-pressed={
                                  s.fields.background === s.item.value
                                }
                                dynamicClass={{
                                  selected:
                                    s.fields.background === s.item.value,
                                }}
                                events={[
                                  {
                                    type: "click",
                                    prevent: false,
                                    stop: false,
                                    self: false,
                                    passive: false,
                                    run: function (scope, $event, $el) {
                                      scope.fields.background =
                                        scope.item.value;
                                    },
                                  },
                                ]}
                              >
                                <View
                                  as="span"
                                  scope={s}
                                  dynamicClass={{
                                    "transparent-frame":
                                      s.item.value === "transparent",
                                  }}
                                  dynamicStyle={
                                    "background-color:" + s.item.value
                                  }
                                ></View>
                                <View
                                  as="strong"
                                  scope={s}
                                  text={s.item.name}
                                ></View>
                              </View>
                            </>
                          </>
                        )}
                      </Repeat>
                    </View>
                    <View as="label" scope={s} className="camera-custom-color">
                      {"自定义颜色"}
                      <View
                        as="input"
                        scope={s}
                        type="color"
                        value={
                          s.fields.background === "transparent"
                            ? "#438bc6"
                            : s.fields.background || "#438bc6"
                        }
                        events={[
                          {
                            type: "input",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.fields.background = $event.target.value;
                            },
                          },
                        ]}
                      ></View>
                    </View>
                    <View
                      as="div"
                      scope={s}
                      className="camera-background-mini camera-edit-frame"
                      dynamicClass={{
                        "transparent-frame":
                          s.fields.background === "transparent",
                      }}
                      dynamicStyle={
                        "--frame-ratio:" +
                        s.spec.width +
                        "/" +
                        s.spec.height +
                        ";aspect-ratio:" +
                        s.spec.width +
                        "/" +
                        s.spec.height +
                        ";background-color:" +
                        (s.fields.background === "transparent"
                          ? "transparent"
                          : s.fields.background || "#438bc6")
                      }
                    >
                      <View
                        as="img"
                        scope={s}
                        src={s.standardURL || undefined}
                        dynamicStyle={s.panelPhotoStyle}
                        alt="所选背景色预览"
                      ></View>
                    </View>
                  </View>
                  <View as="footer" scope={s} className="ui-sheet-footer">
                    <View
                      as="button"
                      scope={s}
                      className="primary-button camera-pay-button"
                      disabled={s.busy}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.applyPanel();
                          },
                        },
                      ]}
                    >
                      {"使用此背景色"}
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "payment"}
                  className="ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View as="div" scope={s} className="camera-payment-summary">
                      <View
                        as="img"
                        scope={s}
                        src={s.previewURL || undefined}
                        alt="本次电子照片"
                      ></View>
                      <View as="div" scope={s}>
                        <View as="strong" scope={s}>
                          {"无水印电子照片"}
                        </View>
                        <View
                          as="span"
                          scope={s}
                          text={s.spec.name + " · " + s.spec.mm}
                        ></View>
                      </View>
                      <View as="b" scope={s}>
                        {"¥" + s.electronicPrice}
                      </View>
                    </View>
                    <View
                      as="fieldset"
                      scope={s}
                      className="camera-payment-methods"
                    >
                      <View as="legend" scope={s}>
                        {"支付方式"}
                      </View>
                      <View as="label" scope={s}>
                        <View as="span" scope={s}>
                          {"微信支付"}
                        </View>
                        <View
                          as="input"
                          scope={s}
                          type="radio"
                          name="camera-payment"
                          value="wechat"
                          disabled={
                            s.paying || s.draft?.order?.status === "verifying"
                          }
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.paymentMethod;
                            },
                            write: function (scope, $event, $el) {
                              scope.paymentMethod = $event;
                            },
                            number: false,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                      <View as="label" scope={s}>
                        <View as="span" scope={s}>
                          {"支付宝支付"}
                        </View>
                        <View
                          as="input"
                          scope={s}
                          type="radio"
                          name="camera-payment"
                          value="alipay"
                          disabled={
                            s.paying || s.draft?.order?.status === "verifying"
                          }
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.paymentMethod;
                            },
                            write: function (scope, $event, $el) {
                              scope.paymentMethod = $event;
                            },
                            number: false,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                    </View>
                    <View
                      as="p"
                      scope={s}
                      className="camera-error"
                      show={s.error}
                      text={s.error}
                      role="alert"
                    ></View>
                  </View>
                  <View as="footer" scope={s} className="ui-sheet-footer">
                    <View
                      as="button"
                      scope={s}
                      className="primary-button camera-pay-button"
                      disabled={s.paying}
                      text={s.paymentLabel}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.draft?.order?.status === "verifying"
                              ? scope.queryPayment()
                              : scope.pay();
                          },
                        },
                      ]}
                    ></View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "discard"}
                  className="ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View
                      as="p"
                      scope={s}
                      className="camera-discard-description"
                    >
                      {"丢弃后，本次拍摄与制作结果将被清除。"}
                    </View>
                    <View
                      as="p"
                      scope={s}
                      className="camera-error"
                      show={s.error}
                      text={s.error}
                      role="alert"
                    ></View>
                  </View>
                  <View as="footer" scope={s} className="ui-sheet-footer">
                    <View as="div" scope={s} className="camera-discard-actions">
                      <View
                        as="button"
                        scope={s}
                        className="camera-secondary"
                        disabled={s.saving}
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.closePanel();
                            },
                          },
                        ]}
                      >
                        {"继续编辑"}
                      </View>
                      <View
                        as="button"
                        scope={s}
                        disabled={s.saving}
                        text={s.saving ? "正在丢弃…" : "丢弃照片"}
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.discardPhoto();
                            },
                          },
                        ]}
                      ></View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
