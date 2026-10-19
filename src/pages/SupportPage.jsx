import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function SupportPage({ scope, args = [] }) {
  return (
    <Controller name="supportCenter" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page support-page"
          id="support-page"
          show={s.page === "support"}
          aria-label="客服中心"
          transition={{
            enter: "page-enter",
            start: "page-start",
            end: "page-end",
          }}
        >
          <View as="div" scope={s} className="support-scroll">
            <View as="header" scope={s} className="page-header">
              <View
                as="button"
                scope={s}
                className="back"
                aria-label="返回首页"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.go("home");
                    },
                  },
                ]}
              >
                <View as="svg" scope={s}>
                  <View as="use" scope={s} href="#i-chevron"></View>
                </View>
              </View>
              <View as="h1" scope={s}>
                {"客服中心"}
              </View>
            </View>
            <View as="div" scope={s} className="support-intro">
              <View as="h2" scope={s}>
                {"遇到问题了？"}
              </View>
              <View as="p" scope={s}>
                {"查找答案，或通过邮件联系我们。"}
              </View>
            </View>
            <View as="label" scope={s} className="support-search">
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-search"></View>
              </View>
              <View
                as="input"
                scope={s}
                id="support-search"
                type="search"
                placeholder="搜索问题，如照片尺寸、采集码"
                aria-label="搜索常见问题"
                autoComplete="off"
                events={[
                  {
                    type: "input",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openId = null;
                    },
                  },
                ]}
                model={{
                  read: function (scope, $event, $el) {
                    return scope.query;
                  },
                  write: function (scope, $event, $el) {
                    scope.query = $event;
                  },
                  number: false,
                  lazy: false,
                }}
              ></View>
            </View>
            <View
              as="div"
              scope={s}
              className="support-categories"
              aria-label="问题分类"
            >
              <Repeat
                scope={s}
                items={s.categories}
                names={["item"]}
                keyFor={function (scope, $event, $el) {
                  return scope.item;
                }}
              >
                {(s) => (
                  <>
                    <>
                      <View
                        as="button"
                        scope={s}
                        type="button"
                        dynamicClass={{
                          active: s.category === s.item,
                        }}
                        aria-pressed={s.category === s.item}
                        text={s.item}
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.category = scope.item;
                              scope.openId = null;
                            },
                          },
                        ]}
                      ></View>
                    </>
                  </>
                )}
              </Repeat>
            </View>
            <View
              as="div"
              scope={s}
              className="faq-list"
              show={s.filtered.length}
            >
              <Repeat
                scope={s}
                items={s.filtered}
                names={["faq"]}
                keyFor={function (scope, $event, $el) {
                  return scope.faq.id;
                }}
              >
                {(s) => (
                  <>
                    <>
                      <View as="article" scope={s} className="faq-item">
                        <View
                          as="button"
                          scope={s}
                          type="button"
                          className="faq-question"
                          aria-expanded={s.openId === s.faq.id}
                          aria-controls={"faq-answer-" + s.faq.id}
                          events={[
                            {
                              type: "click",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.openId =
                                  scope.openId === scope.faq.id
                                    ? null
                                    : scope.faq.id;
                              },
                            },
                          ]}
                        >
                          <View
                            as="span"
                            scope={s}
                            text={s.faq.question}
                          ></View>
                          <View
                            as="svg"
                            scope={s}
                            dynamicClass={{
                              expanded: s.openId === s.faq.id,
                            }}
                            aria-hidden="true"
                          >
                            <View as="use" scope={s} href="#i-chevron"></View>
                          </View>
                        </View>
                        <View
                          as="div"
                          scope={s}
                          className="faq-answer"
                          dynamicClass={{
                            expanded: s.openId === s.faq.id,
                          }}
                          id={"faq-answer-" + s.faq.id}
                          aria-hidden={s.openId !== s.faq.id}
                          inert={s.openId !== s.faq.id}
                        >
                          <View as="div" scope={s}>
                            <View as="p" scope={s} text={s.faq.answer}></View>
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
              className="support-empty"
              show={!s.filtered.length}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-search"></View>
              </View>
              <View as="strong" scope={s}>
                {"没有找到相关问题"}
              </View>
              <View as="p" scope={s}>
                {"你可以通过邮件联系我们。"}
              </View>
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
                      scope.query = "";
                      scope.category = "全部";
                    },
                  },
                ]}
              >
                {"查看全部问题"}
              </View>
            </View>
          </View>
          <View as="div" scope={s} className="support-contact">
            <View as="a" scope={s} className="send-email" href={s.emailHref}>
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-service"></View>
              </View>
              <View as="span" scope={s}>
                {"发送邮件"}
              </View>
            </View>
            <View as="div" scope={s} className="email-address">
              <View as="span" scope={s} text={s.email}></View>
              <View
                as="button"
                scope={s}
                type="button"
                className="copy-email"
                dynamicClass={{
                  copied: s.copyState === "copied",
                }}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.copyEmail();
                    },
                  },
                ]}
              >
                <View
                  as="span"
                  scope={s}
                  text={s.copyState === "copied" ? "已复制" : "复制"}
                ></View>
              </View>
            </View>
            <View
              as="p"
              scope={s}
              className="copy-message"
              show={s.copyState === "failed"}
              role="status"
            >
              {"未能复制，请长按邮箱地址复制。"}
            </View>
            <View
              as="span"
              scope={s}
              className="sr-only"
              aria-live="polite"
              text={s.copyState === "copied" ? "邮箱已复制" : ""}
            ></View>
          </View>
        </View>
      )}
    </Controller>
  );
}
