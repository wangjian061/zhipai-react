import React from "react";
import { Controller, View, Repeat } from "../runtime/components.jsx";
import HomeHeroSlide from "./HomeHeroSlide.jsx";
export default function ImageCarousel({ scope, args = [] }) {
  return (
    <Controller name="imageCarousel" args={args}>
      {(s) => (
        <View
          as="div"
          scope={s}
          scopeRoot
          className="hero carousel"
          role="region"
          aria-roledescription="轮播"
          aria-label="首页推荐，可左右滑动或使用方向键切换"
          events={[
            {
              type: "pointerdown",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.startSwipe($event);
              },
            },
            {
              type: "pointerup",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.endSwipe($event);
              },
            },
            {
              type: "pointercancel",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.startX = null;
              },
            },
            {
              type: "pointerenter",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.hovered = $event.pointerType === "mouse";
              },
            },
            {
              type: "pointerleave",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.hovered = false;
              },
            },
            {
              type: "focusin",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.focused = true;
              },
            },
            {
              type: "focusout",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.focused = $el.contains($event.relatedTarget);
              },
            },
            {
              type: "keydown",
              prevent: true,
              stop: false,
              self: false,
              passive: false,
              key: "ArrowLeft",
              run: function (scope, $event, $el) {
                scope.select(scope.index - 1);
              },
            },
            {
              type: "keydown",
              prevent: true,
              stop: false,
              self: false,
              passive: false,
              key: "ArrowRight",
              run: function (scope, $event, $el) {
                scope.select(scope.index + 1);
              },
            },
          ]}
        >
          <View as="div" scope={s} className="carousel-track">
            <Repeat
              scope={s}
              items={s.slides}
              names={["slide", "i"]}
              keyFor={function (scope, $event, $el) {
                return scope.slide.id;
              }}
            >
              {(s) => (
                <HomeHeroSlide
                  scope={s}
                  slide={s.slide}
                  index={s.i}
                  active={s.i === s.index}
                  loaded={s.loadedSlides.includes(s.i)}
                />
              )}
            </Repeat>
          </View>
        </View>
      )}
    </Controller>
  );
}
