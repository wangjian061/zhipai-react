import React from "react";
import MySupportSheet from "../components/MySupportSheet.jsx";
import SharePage from "../components/SharePage.jsx";
import MyOverview from "../components/MyOverview.jsx";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function MyPage({ scope, args = [] }) {
  return (
    <Controller name="myCenter" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page my-page"
          id="my-page"
          show={s.page === "my"}
          aria-label="我的"
          transition={{
            enter: "page-enter",
            start: "page-start",
            end: "page-end",
          }}
        >
          <MyOverview scope={s} />
          <SharePage scope={s} />
          <Portal target="#my-modal-layer">
            <View
              as="div"
              scope={s}
              className="my-overlay"
              show={s.$store.myUi.opened}
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
                    scope.dialogKeys($event);
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
                className="my-sheet ui-sheet"
                dynamicClass={{
                  "feedback-sheet": s.panel === "feedback",
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="my-dialog-title"
                refName="dialog"
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
                    id="my-dialog-title"
                    text={s.panelTitle}
                  ></View>
                  <View
                    as="button"
                    scope={s}
                    className="my-close"
                    aria-label="关闭"
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
                    <View as="svg" scope={s}>
                      <View as="use" scope={s} href="#i-close"></View>
                    </View>
                  </View>
                </View>
                <MySupportSheet scope={s} />
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "account"}
                  className="my-empty ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View as="span" scope={s} className="my-empty-icon">
                      <View as="svg" scope={s}>
                        <View as="use" scope={s} href="#i-user"></View>
                      </View>
                    </View>
                    <View as="h3" scope={s}>
                      {"账号登录暂未开放"}
                    </View>
                    <View as="p" scope={s}>
                      {"当前照片保存在此浏览器，可继续制作和管理相册。"}
                    </View>
                  </View>
                  <View as="footer" scope={s} className="ui-sheet-footer">
                    <View
                      as="button"
                      scope={s}
                      className="my-primary"
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
                      {"继续使用"}
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "guide"}
                  className="my-guide ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View as="article" scope={s}>
                      <View as="span" scope={s}>
                        {"01"}
                      </View>
                      <View as="div" scope={s}>
                        <View as="h3" scope={s}>
                          {"找一处明亮的位置"}
                        </View>
                        <View as="p" scope={s}>
                          {"面向光源，避开逆光和脸部阴影。"}
                        </View>
                      </View>
                    </View>
                    <View as="article" scope={s}>
                      <View as="span" scope={s}>
                        {"02"}
                      </View>
                      <View as="div" scope={s}>
                        <View as="h3" scope={s}>
                          {"保持正面，露出五官"}
                        </View>
                        <View as="p" scope={s}>
                          {"镜头与眼睛齐平，头部摆正，肩膀自然放松。"}
                        </View>
                      </View>
                    </View>
                    <View as="article" scope={s}>
                      <View as="span" scope={s}>
                        {"03"}
                      </View>
                      <View as="div" scope={s}>
                        <View as="h3" scope={s}>
                          {"留出头顶与肩部空间"}
                        </View>
                        <View as="p" scope={s}>
                          {"使用简单背景，拍摄后按证照规格裁剪。"}
                        </View>
                      </View>
                    </View>
                  </View>
                  <View as="footer" scope={s} className="ui-sheet-footer">
                    <View
                      as="button"
                      scope={s}
                      className="my-primary"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.closePanel();
                            scope.openCamera();
                          },
                        },
                      ]}
                    >
                      {"开始拍摄"}
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "feedback"}
                  className="ui-sheet-panel"
                >
                  <View
                    as="input"
                    scope={s}
                    refName="feedbackFiles"
                    className="sr-only"
                    tabIndex="-1"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple={true}
                    aria-label="上传反馈截图"
                    events={[
                      {
                        type: "change",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.addFeedbackAttachments($event);
                        },
                      },
                    ]}
                  ></View>
                  <View
                    as="input"
                    scope={s}
                    refName="feedbackCamera"
                    className="sr-only"
                    tabIndex="-1"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label="拍摄反馈照片"
                    events={[
                      {
                        type: "change",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.addFeedbackAttachments($event);
                        },
                      },
                    ]}
                  ></View>
                  <View
                    as="form"
                    scope={s}
                    show={!s.feedbackResult}
                    className="my-feedback ui-sheet-panel"
                    events={[
                      {
                        type: "submit",
                        prevent: true,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.sendFeedback();
                        },
                      },
                    ]}
                  >
                    <View as="div" scope={s} className="ui-sheet-body">
                      <View as="div" scope={s} className="feedback-label-row">
                        <View as="label" scope={s} htmlFor="feedback-message">
                          {"问题或建议"}
                        </View>
                        <View
                          as="span"
                          scope={s}
                          text={s.feedback.length + "/600"}
                        ></View>
                      </View>
                      <View
                        as="textarea"
                        scope={s}
                        id="feedback-message"
                        maxLength="600"
                        placeholder="描述遇到的问题、操作步骤，或写下你的建议"
                        required={true}
                        model={{
                          read: function (scope, $event, $el) {
                            return scope.feedback;
                          },
                          write: function (scope, $event, $el) {
                            scope.feedback = $event;
                          },
                          number: false,
                          lazy: false,
                        }}
                      ></View>
                      <View
                        as="div"
                        scope={s}
                        className="feedback-label-row attachment-label"
                      >
                        <View as="strong" scope={s}>
                          {"照片与截图"}
                        </View>
                        <View
                          as="span"
                          scope={s}
                          text={s.feedbackAttachments.length + "/6 · 选填"}
                        ></View>
                      </View>
                      <View
                        as="div"
                        scope={s}
                        className="feedback-attachment-grid"
                      >
                        <Repeat
                          scope={s}
                          items={s.feedbackAttachments}
                          names={["item"]}
                          keyFor={function (scope, $event, $el) {
                            return scope.item.id;
                          }}
                        >
                          {(s) => (
                            <>
                              <>
                                <View
                                  as="div"
                                  scope={s}
                                  className="feedback-attachment"
                                >
                                  <View
                                    as="button"
                                    scope={s}
                                    type="button"
                                    className="feedback-thumb"
                                    aria-label={"预览 " + s.item.name}
                                    aria-pressed={
                                      s.feedbackPreview === s.item.id
                                    }
                                    events={[
                                      {
                                        type: "click",
                                        prevent: false,
                                        stop: false,
                                        self: false,
                                        passive: false,
                                        run: function (scope, $event, $el) {
                                          scope.feedbackPreview =
                                            scope.feedbackPreview ===
                                            scope.item.id
                                              ? null
                                              : scope.item.id;
                                        },
                                      },
                                    ]}
                                  >
                                    <View
                                      as="img"
                                      scope={s}
                                      src={s.item.url}
                                      alt={s.item.name}
                                    ></View>
                                  </View>
                                  <View
                                    as="button"
                                    scope={s}
                                    type="button"
                                    className="feedback-remove"
                                    disabled={s.feedbackReading}
                                    aria-label={"移除 " + s.item.name}
                                    events={[
                                      {
                                        type: "click",
                                        prevent: false,
                                        stop: false,
                                        self: false,
                                        passive: false,
                                        run: function (scope, $event, $el) {
                                          scope.removeFeedbackAttachment(
                                            scope.item.id,
                                          );
                                        },
                                      },
                                    ]}
                                  >
                                    <View as="svg" scope={s}>
                                      <View
                                        as="use"
                                        scope={s}
                                        href="#i-close"
                                      ></View>
                                    </View>
                                  </View>
                                </View>
                              </>
                            </>
                          )}
                        </Repeat>
                      </View>
                      <View
                        as="div"
                        scope={s}
                        className="feedback-source-actions"
                      >
                        <View
                          as="button"
                          scope={s}
                          type="button"
                          disabled={
                            s.feedbackReading ||
                            s.feedbackAttachments.length >= 6
                          }
                          events={[
                            {
                              type: "click",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.$refs.feedbackCamera.click();
                              },
                            },
                          ]}
                        >
                          <View as="svg" scope={s}>
                            <View as="use" scope={s} href="#i-camera"></View>
                          </View>
                          {"拍照"}
                        </View>
                        <View
                          as="button"
                          scope={s}
                          type="button"
                          disabled={
                            s.feedbackReading ||
                            s.feedbackAttachments.length >= 6
                          }
                          events={[
                            {
                              type: "click",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.$refs.feedbackFiles.click();
                              },
                            },
                          ]}
                        >
                          <View as="svg" scope={s}>
                            <View as="use" scope={s} href="#i-upload"></View>
                          </View>
                          {"上传截图"}
                        </View>
                      </View>
                      <View as="p" scope={s} className="feedback-file-help">
                        {"支持 JPG、PNG、WebP，每张不超过10 MB"}
                      </View>
                      <View
                        as="div"
                        scope={s}
                        className="feedback-expanded-photo"
                        show={s.feedbackPreview}
                      >
                        <Repeat
                          scope={s}
                          items={s.feedbackAttachments.filter(
                            (p) => p.id === s.feedbackPreview,
                          )}
                          names={["item"]}
                          keyFor={function (scope, $event, $el) {
                            return scope.item.id;
                          }}
                        >
                          {(s) => (
                            <>
                              <>
                                <View as="div" scope={s}>
                                  <View
                                    as="img"
                                    scope={s}
                                    src={s.item.url}
                                    alt={s.item.name}
                                  ></View>
                                  <View
                                    as="button"
                                    scope={s}
                                    type="button"
                                    events={[
                                      {
                                        type: "click",
                                        prevent: false,
                                        stop: false,
                                        self: false,
                                        passive: false,
                                        run: function (scope, $event, $el) {
                                          scope.feedbackPreview = null;
                                        },
                                      },
                                    ]}
                                  >
                                    {"收起预览"}
                                  </View>
                                </View>
                              </>
                            </>
                          )}
                        </Repeat>
                      </View>
                      <View
                        as="p"
                        scope={s}
                        className="feedback-attachment-error"
                        show={s.feedbackAttachmentError}
                        text={s.feedbackAttachmentError}
                        role="alert"
                      ></View>
                    </View>
                    <View as="footer" scope={s} className="ui-sheet-footer">
                      <View
                        as="button"
                        scope={s}
                        type="submit"
                        className="my-primary feedback-submit"
                        disabled={s.feedbackReading || !s.feedback.trim()}
                        text={s.feedbackReading ? "正在读取图片…" : "提交反馈"}
                      ></View>
                    </View>
                  </View>
                  <View
                    as="div"
                    scope={s}
                    className="feedback-result ui-sheet-panel"
                    show={s.feedbackResult}
                    role="status"
                  >
                    <View as="div" scope={s} className="ui-sheet-body">
                      <View
                        as="span"
                        scope={s}
                        className="feedback-result-icon"
                      >
                        <View as="svg" scope={s}>
                          <View as="use" scope={s} href="#i-check"></View>
                        </View>
                      </View>
                      <View as="h3" scope={s}>
                        {"反馈内容"}
                      </View>
                      <View
                        as="div"
                        scope={s}
                        className="feedback-result-content"
                      >
                        <View as="strong" scope={s}>
                          {"问题或建议"}
                        </View>
                        <View
                          as="p"
                          scope={s}
                          text={s.feedbackResult?.message}
                        ></View>
                        <View
                          as="div"
                          scope={s}
                          className="feedback-result-images"
                        >
                          <Repeat
                            scope={s}
                            items={s.feedbackAttachments}
                            names={["item"]}
                            keyFor={function (scope, $event, $el) {
                              return scope.item.id;
                            }}
                          >
                            {(s) => (
                              <>
                                <>
                                  <View
                                    as="img"
                                    scope={s}
                                    src={s.item.url}
                                    alt={s.item.name}
                                  ></View>
                                </>
                              </>
                            )}
                          </Repeat>
                        </View>
                        <View
                          as="small"
                          scope={s}
                          show={s.feedbackAttachments.length}
                          text={
                            "已整理 " + s.feedbackAttachments.length + " 张附件"
                          }
                        ></View>
                      </View>
                    </View>
                    <View as="footer" scope={s} className="ui-sheet-footer">
                      <View
                        as="button"
                        scope={s}
                        className="my-primary"
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.feedbackResult = null;
                            },
                          },
                        ]}
                      >
                        {"返回修改"}
                      </View>
                      <View
                        as="button"
                        scope={s}
                        className="my-secondary"
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.resetFeedback();
                            },
                          },
                        ]}
                      >
                        {"再写一条"}
                      </View>
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "language"}
                  className="my-language ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
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
                            scope.closePanel();
                          },
                        },
                      ]}
                    >
                      <View as="span" scope={s}>
                        {"简体中文"}
                      </View>
                      <View as="svg" scope={s}>
                        <View as="use" scope={s} href="#i-check"></View>
                      </View>
                    </View>
                    <View as="button" scope={s} disabled={true}>
                      <View as="span" scope={s}>
                        {"English"}
                      </View>
                      <View as="small" scope={s}>
                        {"暂不可选"}
                      </View>
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "settings"}
                  className="my-settings ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View as="div" scope={s}>
                      <View as="span" scope={s}>
                        {"相册存储"}
                      </View>
                      <View as="strong" scope={s}>
                        {"当前浏览器"}
                      </View>
                    </View>
                    <View as="div" scope={s}>
                      <View as="span" scope={s}>
                        {"语言"}
                      </View>
                      <View as="strong" scope={s}>
                        {"简体中文"}
                      </View>
                    </View>
                    <View as="div" scope={s}>
                      <View as="span" scope={s}>
                        {"客服邮箱"}
                      </View>
                      <View as="a" scope={s} href="mailto:zpai_service@163.com">
                        {"zpai_service@163.com"}
                      </View>
                    </View>
                    <View as="p" scope={s}>
                      {"知拍 · 个人证件照与照片工具"}
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  show={s.panel === "share"}
                  className="share-instructions ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View as="div" scope={s} className="share-link-card">
                      <View as="span" scope={s} className="link-brand">
                        {"知拍"}
                      </View>
                      <View
                        as="strong"
                        scope={s}
                        text={
                          s.shareEntry?.title || "随手拍一张，轻松搞定证件照"
                        }
                      ></View>
                      <View
                        as="p"
                        scope={s}
                        text={
                          s.shareEntry?.subtitle ||
                          "换装、精修、换背景，冲印也方便"
                        }
                      ></View>
                    </View>
                    <View as="p" scope={s} text={s.channelInstructions}></View>
                    <View
                      as="a"
                      scope={s}
                      className="selectable-link"
                      href={s.shareUrl}
                      text={s.shareUrl}
                      target="_blank"
                      rel="noopener"
                    ></View>
                  </View>
                  <View as="footer" scope={s} className="ui-sheet-footer">
                    <View
                      as="button"
                      scope={s}
                      className="my-primary"
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.copyLink();
                          },
                        },
                      ]}
                    >
                      {"复制分享链接"}
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="my-secondary"
                      disabled={s.saving || s.posterLoading || !s.posterMarkup}
                      text={s.saving ? "正在生成图片…" : "保存分享图片"}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.savePoster();
                          },
                        },
                      ]}
                    ></View>
                  </View>
                </View>
                <View
                  as="p"
                  scope={s}
                  className="my-panel-message"
                  show={s.panelNotice}
                  text={s.panelNotice}
                  role="status"
                ></View>
              </View>
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
