import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function SearchPage({ scope, args = [] }) {
  return (
    <Controller name="searchPage" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page search-page"
          id="search-page"
          show={s.page === "search"}
          aria-label="搜索"
        >
          <View as="header" scope={s} className="search-header">
            <View
              as="button"
              scope={s}
              className="search-back"
              type="button"
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
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-chevron"></View>
              </View>
            </View>
            <View
              as="form"
              scope={s}
              className="search-form"
              role="search"
              events={[
                {
                  type: "submit",
                  prevent: true,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.search();
                  },
                },
              ]}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-search"></View>
              </View>
              <View
                as="input"
                scope={s}
                refName="searchInput"
                type="search"
                placeholder="搜索证照规格、照片工具"
                aria-label="搜索证照规格和照片工具"
                maxLength="60"
                autoComplete="off"
                enterkeyhint="search"
                events={[
                  {
                    type: "input",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.edit();
                    },
                  },
                ]}
                model={{
                  read: function (scope, $event, $el) {
                    return scope.keyword;
                  },
                  write: function (scope, $event, $el) {
                    scope.keyword = $event;
                  },
                  number: false,
                  lazy: false,
                }}
              ></View>
              <View as="button" scope={s} type="submit">
                {"搜索"}
              </View>
            </View>
          </View>
          <View
            as="div"
            scope={s}
            className="search-content"
            aria-live="polite"
          >
            <View
              as="div"
              scope={s}
              className="search-empty"
              show={!s.searched || !s.keyword.trim()}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-search"></View>
              </View>
              <View as="h1" scope={s}>
                {"查找你需要的照片工具"}
              </View>
              <View as="p" scope={s}>
                {"输入证照规格或工具名称"}
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="search-empty"
              show={s.searched && s.keyword.trim() && !s.matches.length}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-search"></View>
              </View>
              <View as="h2" scope={s}>
                {"没有找到相关结果"}
              </View>
              <View as="p" scope={s}>
                {"换个关键词试试，例如“一寸”或“换背景”"}
              </View>
            </View>
            <View
              as="div"
              scope={s}
              className="search-results"
              show={s.searched && s.keyword.trim() && s.matches.length}
            >
              <View as="h2" scope={s}>
                {"搜索结果 "}
                <View
                  as="span"
                  scope={s}
                  text={s.matches.length + " 项"}
                ></View>
              </View>
              <View as="div" scope={s} className="search-result-list">
                <Repeat
                  scope={s}
                  items={s.matches}
                  names={["item"]}
                  keyFor={function (scope, $event, $el) {
                    return scope.item.label;
                  }}
                >
                  {(s) => (
                    <>
                      <>
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
                                scope.item.action === "print"
                                  ? scope.openPrint()
                                  : scope.openPhotoTool(scope.item.action);
                              },
                            },
                          ]}
                        >
                          <View as="span" scope={s} text={s.item.label}></View>
                          <View as="svg" scope={s} aria-hidden="true">
                            <View as="use" scope={s} href="#i-arrow"></View>
                          </View>
                        </View>
                      </>
                    </>
                  )}
                </Repeat>
              </View>
            </View>
          </View>
        </View>
      )}
    </Controller>
  );
}
