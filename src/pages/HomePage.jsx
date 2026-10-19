import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
import ImageCarousel from "../components/ImageCarousel.jsx";
import CollectionCarousel from "../components/CollectionCarousel.jsx";
export default function HomePage({ scope: s }) {
  return (
    <View
      as="section"
      scope={s}
      className="page home-page"
      id="home-page"
      refName="homePage"
      show={s.page === "home"}
      aria-label="首页"
      events={[
        {
          type: "scroll",
          prevent: false,
          stop: false,
          self: false,
          passive: true,
          run: function (scope, $event, $el) {
            scope.scheduleHomeNavScrim();
          },
        },
      ]}
      transition={{
        enter: "page-enter",
        start: "page-start",
        end: "page-end",
      }}
    >
      <ImageCarousel scope={s} args={["hero"]} />
      <View as="div" scope={s} className="home-main-card">
        <View as="div" scope={s} className="home-search">
          <View
            as="button"
            scope={s}
            className="search-form home-search-entry"
            type="button"
            aria-label="进入搜索页面，查找证照规格和照片工具"
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.go("search");
                },
              },
            ]}
          >
            <View as="svg" scope={s} aria-hidden="true">
              <View as="use" scope={s} href="#i-search"></View>
            </View>
            <View as="span" scope={s} className="home-search-placeholder">
              {"请输入搜索内容"}
            </View>
            <View as="span" scope={s} className="home-search-label">
              {"搜索"}
            </View>
          </View>
        </View>
        <View as="div" scope={s} className="home-content">
          <View as="div" scope={s} className="collection-card">
            <CollectionCarousel scope={s} args={["collection"]} />
            <View
              as="button"
              scope={s}
              className="collection-footer"
              aria-label="进入专项采集"
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.go("collection");
                  },
                },
              ]}
            >
              <View as="span" scope={s} className="collection-label">
                <View as="strong" scope={s}>
                  {"专项采集"}
                </View>
                <View as="small" scope={s}>
                  {"毕业生 · 新生入学 · 会员证书"}
                </View>
              </View>
              <View as="span" scope={s} className="round-arrow">
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-arrow"></View>
                </View>
              </View>
            </View>
          </View>
          <View as="div" scope={s} className="tools-card" refName="homeTools">
            <View as="div" scope={s} className="tools-heading">
              <View as="h2" scope={s}>
                {"常用工具"}
              </View>
            </View>
            <View as="div" scope={s} className="tools-grid">
              <View
                as="button"
                scope={s}
                className="tool"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPrint();
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-print"></View>
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"冲印服务"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="tool"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPhotoTool("repair");
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-repair"></View>
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"照片精修"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="tool"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPhotoTool("outfit");
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-shirt"></View>
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"照片换装"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="tool unavailable-tool"
                aria-disabled="true"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPhotoTool("spec");
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-id"></View>
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"证照规格"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="tool"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPhotoTool("crop");
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-crop-frame"></View>
                  </View>
                  <View
                    as="small"
                    scope={s}
                    className="free-corner"
                    aria-label="免费"
                  >
                    {"免"}
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"照片裁剪"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="tool"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPhotoTool("background");
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-tool-background"></View>
                  </View>
                  <View
                    as="small"
                    scope={s}
                    className="free-corner"
                    aria-label="免费"
                  >
                    {"免"}
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"更换背景"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="tool"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPhotoTool("format");
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-tool-convert"></View>
                  </View>
                  <View
                    as="small"
                    scope={s}
                    className="free-corner"
                    aria-label="免费"
                  >
                    {"免"}
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"格式转换"}
                </View>
              </View>
              <View
                as="button"
                scope={s}
                className="tool"
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openPhotoTool("resize");
                    },
                  },
                ]}
              >
                <View as="span" scope={s} className="tool-icon">
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-size"></View>
                  </View>
                  <View
                    as="small"
                    scope={s}
                    className="free-corner"
                    aria-label="免费"
                  >
                    {"免"}
                  </View>
                </View>
                <View as="span" scope={s}>
                  {"修改体积"}
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
