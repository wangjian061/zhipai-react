import React from "react";
import HomeKeepsakes from "../components/HomeKeepsakes.jsx";
import { View } from "../runtime/components.jsx";
// import ImageCarousel from "../components/ImageCarousel.jsx";
import HomeBrandHeader from "../components/HomeBrandHeader.jsx";
import HomeCollectionCard from "../components/HomeCollectionCard.jsx";
import HomeToolIcon from "../components/HomeToolIcon.jsx";
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
          self: true,
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
      {/* <ImageCarousel scope={s} args={["hero"]} /> */}
      <HomeBrandHeader
        overContent={s.homeHeaderOverContent}
        unread={s.homeHasUnread}
        onOpenNotifications={s.openHomeNotifications}
      />
      <View as="div" scope={s} className="home-content" refName="homeContent">
        <HomeCollectionCard active={s.page === "home"} />
        <View
          as="div"
          scope={s}
          className="tools-card utility-card"
        >
          <View as="div" scope={s} className="tools-heading">
            <View as="h2" scope={s}>
              {"常用工具"}
            </View>
          </View>
          <View as="div" scope={s} className="tools-grid utility-grid">
            <View
              as="button"
              scope={s}
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="print" />
              </View>
              <View as="span" scope={s}>
                {"照片冲印"}
              </View>
            </View>
            <View
              as="button"
              scope={s}
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="repair" />
                <span className="home-recommend">推荐</span>
              </View>
              <View as="span" scope={s}>
                {"照片精修"}
              </View>
            </View>
            <View
              as="button"
              scope={s}
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="outfit" />
              </View>
              <View as="span" scope={s}>
                {"照片换装"}
              </View>
            </View>
            <View
              as="button"
              scope={s}
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="spec" />
              </View>
              <View as="span" scope={s}>
                {"照片规格"}
              </View>
            </View>
            <View
              as="button"
              scope={s}
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="crop" />
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
                {"修改尺寸"}
              </View>
            </View>
            <View
              as="button"
              scope={s}
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="background" />
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
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="format" />
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
              className="tool utility-grid-item"
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
              <View as="span" scope={s} className="tool-icon utility-item-icon">
                <HomeToolIcon name="resize" />
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
                {"修改大小(kb)"}
              </View>
            </View>
          </View>
        </View>
        <HomeKeepsakes />
      </View>
    </View>
  );
}
