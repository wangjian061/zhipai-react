import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function PhotoPicker({ scope, args = [] }) {
  return (
    <Controller name="photoChooser" args={args}>
      {(s) => (
        <View as="div" scope={s} scopeRoot id="photo-choice-layer">
          <View
            as="div"
            scope={s}
            className="photo-choice-overlay"
            show={s.choice.opened}
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: true,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.choice.close();
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
              as="div"
              scope={s}
              className="photo-choice-sheet ui-sheet"
              refName="choiceDialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="photo-choice-title"
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
                  id="photo-choice-title"
                  className="choice-title"
                  text={s.isPrint ? "选取冲印照片" : "选择照片"}
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="choice-close"
                  aria-label="关闭选图"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.choice.close();
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-close"></View>
                  </View>
                </View>
              </View>
              <View as="div" scope={s} className="ui-sheet-body">
                <View
                  as="div"
                  scope={s}
                  className="choice-library"
                  show={s.allowFinished}
                >
                  <View as="h3" scope={s}>
                    {"知拍相册 "}
                    <View as="small" scope={s}>
                      {"照片库"}
                    </View>
                  </View>
                  <View
                    as="div"
                    scope={s}
                    className="choice-photo-row"
                    aria-label="选择照片"
                  >
                    <Repeat
                      scope={s}
                      items={s.library.finished}
                      names={["photo"]}
                      keyFor={function (scope, $event, $el) {
                        return scope.photo.id;
                      }}
                    >
                      {(s) => (
                        <>
                          <>
                            <View
                              as="button"
                              scope={s}
                              className="choice-photo"
                              disabled={!s.library.ready || s.library.busy}
                              aria-label={"选择 " + s.photo.name}
                              events={[
                                {
                                  type: "click",
                                  prevent: false,
                                  stop: false,
                                  self: false,
                                  passive: false,
                                  run: function (scope, $event, $el) {
                                    scope.select("finished", scope.photo.id);
                                  },
                                },
                              ]}
                            >
                              <View
                                as="img"
                                scope={s}
                                src={s.library.url(s.photo.id) || undefined}
                                alt={s.photo.name}
                                loading="lazy"
                              ></View>
                            </View>
                          </>
                        </>
                      )}
                    </Repeat>
                    <View
                      as="p"
                      scope={s}
                      className="choice-empty"
                      show={s.library.ready && !s.library.finished.length}
                    >
                      {"还没有照片，先拍摄制作一张证件照"}
                    </View>
                  </View>
                </View>
                <View
                  as="p"
                  scope={s}
                  className="choice-loading"
                  show={!s.library.ready && !s.library.error}
                >
                  {"正在读取照片…"}
                </View>
                <View
                  as="p"
                  scope={s}
                  className="choice-error"
                  show={s.library.error}
                  text={s.library.error}
                  role="alert"
                ></View>
                <View
                  as="button"
                  scope={s}
                  className="choice-retry"
                  show={s.library.error}
                  disabled={s.library.busy}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.library.load();
                      },
                    },
                  ]}
                >
                  {"重新加载照片"}
                </View>
              </View>
              <View
                as="footer"
                scope={s}
                className="ui-sheet-footer"
                show={s.allowCamera || s.allowPhone}
              >
                <View
                  as="div"
                  scope={s}
                  className="choice-sources"
                  dynamicClass={{
                    "single-source":
                      !s.isPrint && !(s.allowPhone && s.allowCamera),
                  }}
                  show={s.allowCamera || s.allowPhone}
                >
                  <View
                    as="button"
                    scope={s}
                    show={s.allowCamera}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.camera();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s}>
                      <View as="use" scope={s} href="#i-camera"></View>
                    </View>
                    <View
                      as="span"
                      scope={s}
                      text={
                        s.isPrint
                          ? "制作一张"
                          : s.sources.includes("camera")
                            ? "拍摄照片"
                            : "去制作"
                      }
                    ></View>
                  </View>
                  <View
                    as="button"
                    scope={s}
                    show={s.isPrint}
                    disabled={!s.library.ready || s.library.busy}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.album();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s}>
                      <View as="use" scope={s} href="#i-album"></View>
                    </View>
                    <View as="span" scope={s}>
                      {"进入相册"}
                    </View>
                  </View>
                  <View
                    as="button"
                    scope={s}
                    show={s.allowPhone}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.phone();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s}>
                      <View as="use" scope={s} href="#i-landscape"></View>
                    </View>
                    <View as="span" scope={s}>
                      {"从手机选图"}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </Controller>
  );
}
