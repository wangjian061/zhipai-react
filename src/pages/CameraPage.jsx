import React from "react";
import {
  CameraConfirmationPage,
  CameraResultPage,
  CameraWorkflowModal,
} from "../components/CameraWorkflow.jsx";
import CameraSizeOptions from "../components/CameraSizeOptions.jsx";
import CameraTaskSheet from "../components/CameraTaskSheet.jsx";
import CameraVersionComparison from "../components/CameraVersionComparison.jsx";
import { Controller, View, Portal } from "../runtime/components.jsx";
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
          data-task-tone={s.draft?.status === "failed" ? "red" : "blue"}
          aria-label="证件照制作"
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
                refName="captureBack"
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
            <CameraConfirmationPage scope={s} />
            <CameraResultPage scope={s} />
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
                {s.draft?.order?.versionName && (
                  <p className="camera-stage-hint">
                    {s.draft.order.versionName} · {s.spec.name}
                  </p>
                )}
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
            <CameraWorkflowModal scope={s} />
            <CameraTaskSheet scope={s} />
            <CameraVersionComparison scope={s} />
            <View
              as="div"
              scope={s}
              className="camera-overlay"
              show={
                s.page === "camera" &&
                !!s.panel &&
                s.panel !== "compare" &&
                !s.workflowModal &&
                !s.taskSheet
              }
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
                  "camera-size-picker":
                    s.panel === "spec" && s.step === "confirm",
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
                        payment: "解锁电子照片",
                        spec: "选择规格",
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

                <View
                  as="div"
                  scope={s}
                  show={s.panel === "spec"}
                  className="ui-sheet-panel"
                >
                  <div className="ui-sheet-body">
                    <CameraSizeOptions
                      specs={s.specs}
                      fields={s.fields}
                      onSelect={(id) => s.setPanelSpec(id)}
                    />
                    {s.sizePanelError && (
                      <p className="camera-error" role="alert">
                        {s.sizePanelError}
                      </p>
                    )}
                  </div>
                  <footer className="ui-sheet-footer">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={s.busy || !!s.sizePanelError}
                      onClick={() => s.applyPanel()}
                    >
                      使用此规格
                    </button>
                  </footer>
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
                          {s.purchasedVersionName}
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
              </View>
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
