import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
import HomePage from "../pages/HomePage.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import CollectionPage from "../pages/CollectionPage.jsx";
import SearchPage from "../pages/SearchPage.jsx";
import AlbumPage from "../pages/AlbumPage.jsx";
import CameraPage from "../pages/CameraPage.jsx";
import ScanPage from "../pages/ScanPage.jsx";
import ToolsPage from "../pages/ToolsPage.jsx";
import SupportPage from "../pages/SupportPage.jsx";
import PrintPage from "../pages/PrintPage.jsx";
import OrdersPage from "../pages/OrdersPage.jsx";
import MyPage from "../pages/MyPage.jsx";
import LiquidTabs from "../components/LiquidTabs.jsx";
import PhotoPicker from "../components/PhotoPicker.jsx";
import NativePhoneChrome from "./NativePhoneChrome.jsx";
export default function AppShell({ scope, args = [] }) {
  return (
    <Controller name="phoneDemo" args={args}>
      {(s) => (
        <View
          as="div"
          scope={s}
          scopeRoot
          className="phone"
          data-page={s.page}
          data-album-view={s.albumView}
          data-album-managing={s.albumManaging}
          data-camera-step={s.cameraStep}
          data-my-view={s.myView}
        >
          <View as="div" scope={s} className="screen">
            <NativePhoneChrome />
            <View as="div" scope={s} className="app-viewport">
              <View
                as="div"
                scope={s}
                className="pages"
                inert={
                  s.$store.photoChoice.opened ||
                  s.$store.myUi.opened ||
                  s.$store.printUi.opened ||
                  s.albumModal
                }
              >
                <HomePage scope={s} />
                <AccountPage scope={s} args={[]} />
                <CollectionPage scope={s} args={[]} />
                <SearchPage scope={s} args={[]} />
                <AlbumPage scope={s} args={[]} />
                <CameraPage scope={s} args={[]} />
                <ScanPage scope={s} args={[]} />
                <ToolsPage scope={s} args={[]} />
                <SupportPage scope={s} args={[]} />
                <PrintPage scope={s} args={[]} />
                <MyPage scope={s} args={[]} />
                <OrdersPage scope={s} />
              </View>
              <View
                as="nav"
                scope={s}
                className="tabbar"
                refName="bottomNav"
                dynamicStyle={{
                  "--home-nav-scrim": s.page === "home" ? s.homeNavScrim : 0,
                }}
                inert={
                  s.$store.photoChoice.opened ||
                  s.$store.myUi.opened ||
                  s.$store.printUi.opened ||
                  s.albumModal
                }
                show={
                  s.page !== "account" &&
                  s.page !== "orders" &&
                  s.page !== "collection" &&
                  s.page !== "search" &&
                  s.page !== "camera" &&
                  s.page !== "scan" &&
                  s.page !== "print" &&
                  s.page !== "tool" &&
                  (s.page !== "album" ||
                    (s.albumView !== "detail" && !s.albumManaging)) &&
                  (s.page !== "my" || s.myView === "overview")
                }
                aria-label="底部导航"
              >
                <LiquidTabs scope={s} args={[]} />
                <View
                  as="button"
                  scope={s}
                  className="camera-tab"
                  aria-label="打开相机"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openCamera();
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-camera"></View>
                  </View>
                  <View as="span" scope={s}>
                    {"相机"}
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  className="scan-tab"
                  aria-label="打开扫码"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openCamera("scan");
                      },
                    },
                  ]}
                >
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-scan"></View>
                  </View>
                  <View as="span" scope={s}>
                    {"扫码"}
                  </View>
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="home-toast"
                show={s.homeNotice && s.page === "home"}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                text={s.homeNotice}
              ></View>
              <View as="div" scope={s} id="album-modal-layer"></View>
              <View as="div" scope={s} id="camera-modal-layer"></View>
              <View as="div" scope={s} id="scan-modal-layer"></View>
              <View as="div" scope={s} id="my-modal-layer"></View>
              <View as="div" scope={s} id="print-modal-layer"></View>
              <View as="div" scope={s} id="tool-modal-layer"></View>
              <View as="div" scope={s} id="account-modal-layer"></View>
              <View as="div" scope={s} id="collection-modal-layer"></View>
              <PhotoPicker scope={s} args={[]} />
            </View>
          </View>
        </View>
      )}
    </Controller>
  );
}
