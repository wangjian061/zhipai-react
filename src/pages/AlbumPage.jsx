import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
import PendingPhotoResults from "../components/PendingPhotoResults.jsx";
import AlbumPhotoViewer from "../components/AlbumPhotoViewer.jsx";
export default function AlbumPage({ scope, args = [] }) {
  return (
    <Controller name="albumCenter" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page album-page"
          id="album-page"
          show={s.page === "album"}
          data-view={s.view}
          data-managing={s.managing}
          data-preview={s.modal === "preview"}
          aria-label="知拍相册"
        >
          <View as="div" scope={s} className="album-body" inert={!!s.modal}>
            <View
              as="section"
              scope={s}
              className="album-hero"
              show={s.view === "library"}
            >
              <View as="div" scope={s} className="album-hero-copy">
                <View as="h1" scope={s}>
                  {"知拍相册"}
                </View>
                <View
                  as="p"
                  scope={s}
                  text={
                    s.store.ready
                      ? "已保存 " + s.photos.length + " 张照片"
                      : "照片库"
                  }
                ></View>
              </View>
              <View
                as="img"
                scope={s}
                src="assets/bear-album.webp"
                width="1254"
                height="1254"
                alt="白熊展示证件照与排版照相册"
                className="album-hero-bear"
                decoding="async"
              ></View>
            </View>
            <View
              as="header"
              scope={s}
              className="page-header album-header"
              show={s.view === "detail"}
            >
              <View
                as="button"
                scope={s}
                className="back"
                disabled={s.working || s.downloading}
                aria-label="返回相册"
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
                {"照片详情"}
              </View>
              <View
                as="button"
                scope={s}
                className="header-more"
                show={s.photo}
                aria-label="照片信息"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.showModal("info");
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-more"></View>
                </View>
              </View>
            </View>
            <View
              as="button"
              scope={s}
              className="album-return-print"
              show={s.$store.photoChoice.printReturnContext && !s.managing}
              disabled={s.disabled || s.downloading}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.$store.photoChoice.resumePrint();
                  },
                },
              ]}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-chevron"></View>
              </View>
              {"返回冲印选图"}
            </View>
            <View
              as="div"
              scope={s}
              className="album-scroll"
              refName="albumScroll"
            >
              <View
                as="div"
                scope={s}
                className="album-error"
                show={s.store.error}
                role="alert"
              >
                <View as="p" scope={s} text={s.store.error}></View>
                <View
                  as="button"
                  scope={s}
                  disabled={s.store.busy}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.store.load();
                      },
                    },
                  ]}
                >
                  {"重新读取相册"}
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="album-error"
                show={s.message && !s.modal}
                role="alert"
                text={s.message}
              ></View>
              {s.page === "album" && s.view === "library" && !s.managing && (
                <PendingPhotoResults />
              )}
              <View
                as="section"
                scope={s}
                className="album-library-card"
                show={s.view === "library"}
              >
                <View as="div" scope={s} className="album-library-toolbar">
                  <View
                    as="strong"
                    scope={s}
                    text={
                      s.managing
                        ? "已选择 " + s.selected.length + " 张"
                        : "我的照片"
                    }
                  ></View>
                  <View as="div" scope={s}>
                    <View
                      as="button"
                      scope={s}
                      show={!s.managing && s.photos.length}
                      disabled={s.disabled || s.downloading}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.startManage();
                          },
                        },
                      ]}
                    >
                      {"管理"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      show={s.managing}
                      disabled={s.disabled || s.downloading}
                      text={
                        s.selected.length === s.photos.length && s.photos.length
                          ? "取消全选"
                          : "全选"
                      }
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.selectAll();
                          },
                        },
                      ]}
                    ></View>
                    <View
                      as="button"
                      scope={s}
                      show={s.managing}
                      disabled={s.disabled || s.downloading}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.endManage();
                          },
                        },
                      ]}
                    >
                      {"取消"}
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="album-loading"
                  show={!s.store.ready && !s.store.error}
                  role="status"
                >
                  <View as="span" scope={s} className="camera-spinner"></View>
                  <View as="p" scope={s}>
                    {"正在读取照片…"}
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="album-empty-card"
                  show={s.store.ready && !s.photos.length}
                >
                  <View
                    as="span"
                    scope={s}
                    className="album-empty-icon"
                    aria-hidden="true"
                  >
                    <View as="svg" scope={s}>
                      <View as="use" scope={s} href="#i-nav-album"></View>
                    </View>
                  </View>
                  <View as="h2" scope={s}>
                    {"还没有照片"}
                  </View>
                  <View as="p" scope={s}>
                    {"拍摄制作后，照片会保存在这里"}
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="photo-grid album-full-grid"
                  refName="finishedLibraryGrid"
                  show={s.store.ready && s.photos.length}
                  dynamicClass={{
                    "manage-grid": s.managing,
                  }}
                >
                  <Repeat
                    scope={s}
                    items={s.photos}
                    names={["item"]}
                    keyFor={function (scope, $event, $el) {
                      return scope.item.id;
                    }}
                  >
                    {(s) => (
                      <>
                        <>
                          <View as="div" scope={s} className="album-photo-cell">
                            <View
                              as="button"
                              scope={s}
                              className="photo photo-thumb"
                              dynamicClass={{
                                selected: s.selected.includes(s.item.id),
                                "photo-added": s.store.addedIds.includes(
                                  s.item.id,
                                ),
                              }}
                              disabled={s.disabled || s.downloading}
                              aria-label={
                                (s.managing
                                  ? s.selected.includes(s.item.id)
                                    ? "取消选择 "
                                    : "选择 "
                                  : "查看 ") + s.item.name
                              }
                              aria-pressed={
                                s.managing
                                  ? s.selected.includes(s.item.id)
                                  : null
                              }
                              events={[
                                {
                                  type: "click",
                                  prevent: false,
                                  stop: false,
                                  self: false,
                                  passive: false,
                                  run: function (scope, $event, $el) {
                                    scope.openPhoto("finished", scope.item.id);
                                  },
                                },
                              ]}
                            >
                              <View
                                as="img"
                                scope={s}
                                show={s.item.blob}
                                src={s.store.url(s.item.id) || undefined}
                                alt={s.item.name}
                                loading="lazy"
                              ></View>
                              <View
                                as="span"
                                scope={s}
                                className="album-file-missing"
                                show={!s.item.blob}
                              >
                                <View as="svg" scope={s} aria-hidden="true">
                                  <View
                                    as="use"
                                    scope={s}
                                    href="#i-alert"
                                  ></View>
                                </View>
                                {"文件不可用"}
                              </View>
                              <View
                                as="span"
                                scope={s}
                                className="photo-check"
                                show={s.managing}
                              >
                                <View
                                  as="svg"
                                  scope={s}
                                  show={s.selected.includes(s.item.id)}
                                  aria-hidden="true"
                                >
                                  <View
                                    as="use"
                                    scope={s}
                                    href="#i-check"
                                  ></View>
                                </View>
                              </View>
                            </View>
                          </View>
                        </>
                      </>
                    )}
                  </Repeat>
                </View>
                <View
                  as="footer"
                  scope={s}
                  className="album-create-footer"
                  show={s.store.ready && !s.managing && !s.photos.length}
                >
                  <View
                    as="button"
                    scope={s}
                    disabled={s.disabled || s.downloading}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.capturePhoto();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-camera"></View>
                    </View>
                    {"立即拍摄"}
                  </View>
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="album-loading"
                show={s.view === "detail" && !s.store.ready && !s.store.error}
                role="status"
              >
                <View as="span" scope={s} className="camera-spinner"></View>
                <View as="p" scope={s}>
                  {"正在读取照片…"}
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="photo-detail"
                show={s.store.ready && s.view === "detail"}
              >
                {s.photo ? (
                  <>
                    <>
                      <View as="div" scope={s}>
                        <View
                          as="button"
                          scope={s}
                          className="detail-preview"
                          show={s.photo.blob}
                          dynamicStyle={
                            "--photo-ratio:" +
                            s.photo.width +
                            "/" +
                            s.photo.height
                          }
                          aria-label="放大照片"
                          aria-haspopup="dialog"
                          aria-expanded={s.modal === "preview"}
                          events={[
                            {
                              type: "click",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.openPreview();
                              },
                            },
                          ]}
                        >
                          <View
                            as="img"
                            scope={s}
                            src={s.store.url(s.photo.id) || undefined}
                            alt={s.photo.name}
                          ></View>
                        </View>
                        <View
                          as="div"
                          scope={s}
                          className="detail-unavailable"
                          show={!s.photo.blob}
                        >
                          <View as="svg" scope={s} aria-hidden="true">
                            <View as="use" scope={s} href="#i-alert"></View>
                          </View>
                          <View as="p" scope={s}>
                            {"照片文件不可用"}
                          </View>
                          <View
                            as="button"
                            scope={s}
                            disabled={s.disabled || s.downloading}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.deleteCurrent();
                                },
                              },
                            ]}
                          >
                            {"删除此记录"}
                          </View>
                        </View>
                        <View
                          as="button"
                          scope={s}
                          className="zoom-hint"
                          show={s.photo.blob}
                          type="button"
                          aria-haspopup="dialog"
                          aria-expanded={s.modal === "preview"}
                          events={[
                            {
                              type: "click",
                              run: (scope) => scope.openPreview(),
                            },
                          ]}
                        >
                          <View as="svg" scope={s} aria-hidden="true">
                            <View as="use" scope={s} href="#i-search"></View>
                          </View>
                          <View as="span" scope={s} text="点击放大查看"></View>
                        </View>
                        <View as="div" scope={s} className="photo-metadata">
                          <View
                            as="p"
                            scope={s}
                            show={s.photo.spec}
                            text={s.photo.spec}
                          ></View>
                          <View
                            as="p"
                            scope={s}
                            text={s.photoInfo(s.photo)}
                          ></View>
                        </View>
                        <View
                          as="div"
                          scope={s}
                          className="photo-tools"
                          show={s.photo.blob}
                        >
                          <Repeat
                            scope={s}
                            items={s.tools}
                            names={["tool"]}
                            keyFor={function (scope, $event, $el) {
                              return scope.tool.action;
                            }}
                          >
                            {(s) => (
                              <>
                                <>
                                  <View
                                    as="button"
                                    scope={s}
                                    disabled={s.disabled || s.downloading}
                                    events={[
                                      {
                                        type: "click",
                                        prevent: false,
                                        stop: false,
                                        self: false,
                                        passive: false,
                                        run: function (scope, $event, $el) {
                                          scope.openPhotoTool(
                                            scope.tool.action,
                                            scope.photo,
                                            "finished",
                                          );
                                        },
                                      },
                                    ]}
                                  >
                                    <View as="svg" scope={s} aria-hidden="true">
                                      <View
                                        as="use"
                                        scope={s}
                                        href={"#i-" + s.tool.icon}
                                      ></View>
                                    </View>
                                    <View
                                      as="span"
                                      scope={s}
                                      text={s.tool.name}
                                    ></View>
                                  </View>
                                </>
                              </>
                            )}
                          </Repeat>
                        </View>
                      </View>
                    </>
                  </>
                ) : null}
                <View
                  as="div"
                  scope={s}
                  className="detail-unavailable"
                  show={!s.photo}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-nav-album"></View>
                  </View>
                  <View as="p" scope={s}>
                    {"这张照片已不存在"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.route("library");
                        },
                      },
                    ]}
                  >
                    {"返回相册"}
                  </View>
                </View>
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="album-actions manage-actions"
              show={s.view === "library" && s.managing}
            >
              <View
                as="button"
                scope={s}
                disabled={
                  !s.downloadableSelection || s.disabled || s.downloading
                }
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.savePhotos();
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-download"></View>
                </View>
                <View
                  as="span"
                  scope={s}
                  text={s.downloading ? "正在准备…" : "保存到设备"}
                ></View>
              </View>
              <View
                as="button"
                scope={s}
                className="delete-action"
                disabled={!s.selected.length || s.disabled || s.downloading}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.showModal("delete");
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-trash"></View>
                </View>
                <View
                  as="span"
                  scope={s}
                  text={s.working ? "正在删除…" : "删除"}
                ></View>
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="album-actions detail-actions"
              show={s.view === "detail" && s.photo?.blob}
            >
              <View
                as="button"
                scope={s}
                className="print-photo"
                disabled={s.disabled || s.downloading}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPrint(scope.photo, "finished", "album");
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-print"></View>
                </View>
                {"冲印照片"}
              </View>
              <View
                as="button"
                scope={s}
                className="primary-button"
                disabled={s.disabled || s.downloading}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.savePhotos(true);
                    },
                  },
                ]}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-download"></View>
                </View>
                <View
                  as="span"
                  scope={s}
                  text={s.downloading ? "正在准备…" : "下载照片"}
                ></View>
              </View>
            </View>
          </View>
          <View
            as="div"
            scope={s}
            className="album-toast"
            show={s.page === "album" && s.notice && !s.modal}
            role="status"
            transition={{
              opacity: true,
              duration: 150,
            }}
          >
            <View as="svg" scope={s} aria-hidden="true">
              <View as="use" scope={s} href="#i-check"></View>
            </View>
            <View as="span" scope={s} text={s.notice}></View>
          </View>
          <Portal target="#album-modal-layer">
            <AlbumPhotoViewer scope={s} />
            <View
              as="div"
              scope={s}
              className="album-overlay"
              show={s.page === "album" && s.modal && s.modal !== "preview"}
              events={[
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
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: true,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.closeModal();
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
                className="album-dialog"
                refName="albumDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="album-dialog-title"
              >
                <View
                  as="button"
                  scope={s}
                  className="dialog-close"
                  disabled={s.working || s.store.busy}
                  aria-label="关闭"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.closeModal();
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-close"></View>
                  </View>
                </View>
                <View
                  as="h2"
                  scope={s}
                  id="album-dialog-title"
                  text={
                    {
                      delete: "删除 " + s.selected.length + " 张照片？",
                      info: "照片信息",
                    }[s.modal]
                  }
                ></View>
                <View as="div" scope={s} show={s.modal === "delete"}>
                  <View as="p" scope={s} className="dialog-description">
                    {"删除后无法恢复"}
                  </View>
                  <View as="div" scope={s} className="delete-confirm-actions">
                    <View
                      as="button"
                      scope={s}
                      disabled={s.working || s.store.busy}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.closeModal();
                          },
                        },
                      ]}
                    >
                      {"取消"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="danger"
                      disabled={s.disabled}
                      text={s.working ? "正在删除…" : "确认删除"}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.confirmDelete();
                          },
                        },
                      ]}
                    ></View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="photo-info-list"
                  show={s.modal === "info"}
                >
                  <View as="p" scope={s}>
                    <View as="span" scope={s}>
                      {"照片名称"}
                    </View>
                    <View as="strong" scope={s} text={s.photo?.name}></View>
                  </View>
                  <View as="p" scope={s}>
                    <View as="span" scope={s}>
                      {"规格与文件"}
                    </View>
                    <View
                      as="strong"
                      scope={s}
                      text={s.photoInfo(s.photo)}
                    ></View>
                  </View>
                  <View
                    as="button"
                    scope={s}
                    className="text-button"
                    show={s.photo?.rawBlob}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.downloadRaw();
                        },
                      },
                    ]}
                  >
                    {"下载原始文件"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    className="text-button album-info-delete"
                    disabled={s.disabled || s.downloading}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.deleteCurrent();
                        },
                      },
                    ]}
                  >
                    {"删除此照片"}
                  </View>
                </View>
                <View
                  as="p"
                  scope={s}
                  className="dialog-error"
                  show={s.message}
                  text={s.message}
                  role="alert"
                ></View>
              </View>
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
