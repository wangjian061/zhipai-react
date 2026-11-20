import React from "react";
import { Controller, View, Repeat } from "../runtime/components.jsx";
import SharedSheet from "./SharedSheet.jsx";

function PhotoSource({ icon, children, ...props }) {
  return (
    <button type="button" {...props}>
      <svg aria-hidden="true"><use href={icon} /></svg>
      <span>{children}</span>
    </button>
  );
}

function PhotoSources({ scope: s }) {
  return (
    <div className="choice-sources">
      {s.allowCamera && (
        <PhotoSource icon="#i-camera" onClick={() => s.camera()}>
          {s.isPrint ? "制作一张" : s.sources.includes("camera") ? "拍摄照片" : "去制作"}
        </PhotoSource>
      )}
      {s.isPrint && (
        <PhotoSource icon="#i-album" disabled={!s.library.ready || s.library.busy}
          onClick={() => s.album()}>
          进入相册
        </PhotoSource>
      )}
      {s.allowPhone && (
        <PhotoSource icon="#i-landscape" onClick={() => s.phone()}>
          从手机选图
        </PhotoSource>
      )}
    </div>
  );
}

export default function PhotoPicker({ args = [] }) {
  return (
    <Controller name="photoChooser" args={args}>
      {(s) => (
        <div id="photo-choice-layer">
          <SharedSheet opened={s.choice.opened} target={null}
            id="photo-choice-title"
            title={s.isPrint ? "选取冲印照片" : "选择照片"}
            closeLabel="关闭选图"
            className="photo-choice-sheet"
            onClose={() => s.choice.close()}
            footer={s.allowCamera || s.allowPhone ? <PhotoSources scope={s} /> : null}>
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
          </SharedSheet>
        </div>
      )}
    </Controller>
  );
}
