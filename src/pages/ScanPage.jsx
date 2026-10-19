import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function ScanPage({ scope, args = [] }) {
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
          aria-label="扫描图像采集码"
        >
          <View
            as="div"
            scope={s}
            className="collection-scan-scroll"
            inert={s.result || s.guideOpen}
          >
            <View as="header" scope={s} className="collection-scan-header">
              <View
                as="button"
                scope={s}
                className="scan-back"
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
              <View as="h1" scope={s}>
                {"扫码采集"}
              </View>
              <View
                as="button"
                scope={s}
                className="scan-guide-icon"
                aria-label="在哪里获取图像采集码？"
                aria-haspopup="dialog"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openGuide();
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-bulb"></View>
                </View>
              </View>
            </View>
            <View
              as="section"
              scope={s}
              className="collection-scan-intro scan-instruction-card"
            >
              <View
                as="img"
                scope={s}
                src="assets/scan-collection-guide.webp"
                width="1000"
                height="400"
                alt="小白熊展示图像采集码，将学生学籍与毕业证件照关联"
              ></View>
              <View as="p" scope={s}>
                {"仅支持学信网图像采集码或者采集机构二维码"}
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="collection-scan-window"
              aria-label="将图像采集码放入扫码区域"
            >
              <View
                as="video"
                scope={s}
                refName="scanVideo"
                autoPlay={true}
                muted={true}
                playsInline={true}
                show={s.ready}
              ></View>
              <View
                as="div"
                scope={s}
                className="scan-frame"
                dynamicClass={{
                  scanning: s.ready && !s.result,
                }}
                aria-hidden="true"
              >
                <View as="i" scope={s}></View>
                <View as="i" scope={s}></View>
                <View as="i" scope={s}></View>
                <View as="i" scope={s}></View>
                <View as="span" scope={s} className="scan-line"></View>
              </View>
              <View
                as="div"
                scope={s}
                className="scan-camera-access"
                show={!s.ready}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-scan"></View>
                </View>
                <View
                  as="p"
                  scope={s}
                  text={
                    s.starting
                      ? "正在开启相机…"
                      : s.cameraError || "将采集码放入框内"
                  }
                ></View>
                <View
                  as="button"
                  scope={s}
                  disabled={s.starting}
                  show={!s.starting}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.start();
                      },
                    },
                  ]}
                >
                  {"开启扫码相机"}
                </View>
              </View>
            </View>
            <View as="p" scope={s} className="scan-position-hint">
              {"将二维码完整放入框内，自动识别"}
            </View>
            <View as="div" scope={s} className="collection-scan-actions">
              <View
                as="button"
                scope={s}
                disabled={s.reading}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.$refs.qrInput.click();
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-album"></View>
                </View>
                <View
                  as="span"
                  scope={s}
                  text={s.reading ? "识别中…" : "上传采集码"}
                ></View>
              </View>
              <View
                as="button"
                scope={s}
                aria-pressed={s.torch}
                dynamicClass={{
                  enabled: s.torch,
                }}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.toggleTorch();
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View
                    as="use"
                    scope={s}
                    href={s.torch ? "#i-torch-on" : "#i-torch"}
                  ></View>
                </View>
                <View
                  as="span"
                  scope={s}
                  text={s.torch ? "关闭手电筒" : "手电筒"}
                ></View>
              </View>
            </View>
            <View
              as="input"
              scope={s}
              refName="qrInput"
              className="sr-only"
              tabIndex="-1"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="上传图像采集码图片"
              events={[
                {
                  type: "change",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.upload($event);
                  },
                },
              ]}
            ></View>
          </View>
          <Portal target="#scan-modal-layer">
            <View
              as="div"
              scope={s}
              className="camera-overlay"
              show={s.page === "scan" && s.guideOpen}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: true,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.closeGuide();
                  },
                },
                {
                  type: "keydown",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.trap($event);
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
                className="camera-dialog scan-guide-drawer"
                refName="scanGuide"
                role="dialog"
                aria-modal="true"
                aria-labelledby="scan-guide-title"
              >
                <View
                  as="span"
                  scope={s}
                  className="sheet-handle"
                  aria-hidden="true"
                ></View>
                <View as="header" scope={s}>
                  <View as="h2" scope={s} id="scan-guide-title">
                    {"获取图像采集码"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    aria-label="关闭说明页"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.closeGuide();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-close"></View>
                    </View>
                  </View>
                </View>
                {s.guideOpen ? (
                  <>
                    <>
                      <View
                        as="iframe"
                        scope={s}
                        src="collection-code-guide.html"
                        title="图像采集码获取说明 H5"
                        sandbox=""
                        tabIndex="-1"
                      ></View>
                    </>
                  </>
                ) : null}
              </View>
            </View>
          </Portal>
          <Portal target="#scan-modal-layer">
            <View
              as="div"
              scope={s}
              className="camera-overlay"
              show={s.page === "scan" && s.result}
              events={[
                {
                  type: "keydown",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.trap($event);
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
                className="camera-dialog scan-result-dialog"
                refName="scanResult"
                role="dialog"
                aria-modal="true"
                aria-labelledby="scan-result-title"
              >
                <View
                  as="span"
                  scope={s}
                  className="sheet-handle"
                  aria-hidden="true"
                ></View>
                <View as="header" scope={s}>
                  <View as="h2" scope={s} id="scan-result-title">
                    {"二维码已读取"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    aria-label="关闭识别结果"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.retry();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-close"></View>
                    </View>
                  </View>
                </View>
                <View as="p" scope={s}>
                  {"请确认上传的是本人学信网图像采集码"}
                </View>
                <View
                  as="button"
                  scope={s}
                  className="primary-button"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.verify();
                      },
                    },
                  ]}
                >
                  {"验证采集码"}
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
                        scope.retry();
                      },
                    },
                  ]}
                >
                  {"重新扫描"}
                </View>
              </View>
            </View>
          </Portal>
          <View
            as="p"
            scope={s}
            className="camera-toast"
            show={s.notice && s.page === "scan"}
            text={s.notice}
            role="status"
            transition={{
              opacity: true,
              duration: 150,
            }}
          ></View>
        </View>
      )}
    </Controller>
  );
}
