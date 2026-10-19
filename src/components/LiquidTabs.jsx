import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function LiquidTabs({ scope, args = [] }) {
  return (
    <Controller name="liquidTabs" args={args}>
      {(s) => (
        <View as="div" scope={s} scopeRoot className="tab-menu">
          <View
            as="button"
            scope={s}
            className="tab"
            dynamicClass={{
              active: s.page === "home",
            }}
            aria-current={s.page === "home" ? "page" : null}
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
              <View as="use" scope={s} href="#i-nav-home"></View>
            </View>
            <View as="span" scope={s}>
              {"首页"}
            </View>
          </View>
          <View
            as="button"
            scope={s}
            className="tab"
            dynamicClass={{
              active: s.page === "album",
            }}
            aria-current={s.page === "album" ? "page" : null}
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.go("album");
                },
              },
            ]}
          >
            <View as="svg" scope={s} aria-hidden="true">
              <View as="use" scope={s} href="#i-nav-album"></View>
            </View>
            <View as="span" scope={s}>
              {"相册"}
            </View>
          </View>
          <View
            as="button"
            scope={s}
            className="tab"
            dynamicClass={{
              active: s.page === "my",
            }}
            aria-current={s.page === "my" ? "page" : null}
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.go("my");
                },
              },
            ]}
          >
            <View as="svg" scope={s} aria-hidden="true">
              <View as="use" scope={s} href="#i-nav-user"></View>
            </View>
            <View as="span" scope={s}>
              {"我的"}
            </View>
          </View>
        </View>
      )}
    </Controller>
  );
}
