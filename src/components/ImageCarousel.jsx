import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
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
          aria-label="首页宣传图"
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
                return scope.i;
              }}
            >
              {(s) => (
                <>
                  <>
                    <View
                      as="div"
                      scope={s}
                      className="carousel-slide"
                      dynamicClass={{
                        "is-active": s.i === s.index,
                      }}
                      role="group"
                      aria-roledescription="幻灯片"
                      aria-label={s.i + 1 + " / " + s.slides.length}
                      aria-hidden={s.i !== s.index}
                      inert={s.i !== s.index}
                    >
                      <View
                        as="img"
                        scope={s}
                        className="carousel-image"
                        src={
                          s.loadedSlides.includes(s.i)
                            ? s.slide.image
                            : undefined
                        }
                        alt={s.slide.title + "宣传图"}
                        width="1610"
                        height="977"
                        decoding="async"
                        fetchPriority={s.i === 1 ? "high" : "auto"}
                        draggable="false"
                      ></View>
                      <View as="div" scope={s} className="hero-copy">
                        <View as="h1" scope={s} text={s.slide.title}></View>
                        <View as="p" scope={s} text={s.slide.subtitle}></View>
                        <View
                          as="button"
                          scope={s}
                          className="hero-cta"
                          aria-label={s.slide.actionLabel}
                          events={[
                            {
                              type: "click",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.activate(
                                  $event,
                                  scope.i === 0
                                    ? "background"
                                    : scope.i === 1
                                      ? "spec"
                                      : "crop",
                                );
                              },
                            },
                          ]}
                        >
                          <View as="span" scope={s}>
                            <View
                              as="span"
                              scope={s}
                              text={s.slide.actionLabel}
                            ></View>
                            <View as="svg" scope={s} aria-hidden="true">
                              <View as="use" scope={s} href="#i-arrow"></View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </>
                </>
              )}
            </Repeat>
          </View>
        </View>
      )}
    </Controller>
  );
}
