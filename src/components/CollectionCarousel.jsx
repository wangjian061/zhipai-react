import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function CollectionCarousel({ scope, args = [] }) {
  return (
    <Controller name="imageCarousel" args={args}>
      {(s) => (
        <View
          as="div"
          scope={s}
          scopeRoot
          className="graduation-banner carousel"
          tabIndex="0"
          role="region"
          aria-roledescription="轮播"
          aria-label="专项采集宣传图，可使用左右方向键切换"
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
                      className={
                        "carousel-slide collection-promo-slide " + s.slide.theme
                      }
                      dynamicClass={{
                        "is-active": s.i === s.index,
                      }}
                      role="group"
                      aria-roledescription="幻灯片"
                      aria-label={s.i + 1 + " / " + s.slides.length}
                      aria-hidden={s.i !== s.index}
                      inert={s.i !== s.index}
                    >
                      <div className="collection-promo-copy">
                        <strong>{s.slide.title}</strong>
                        <span>{s.slide.subtitle}</span>
                      </div>
                      <img
                        className="collection-promo-bear"
                        src={s.slide.image}
                        alt=""
                        width="180"
                        height="180"
                        draggable="false"
                      />
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
