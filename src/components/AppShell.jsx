import CollectionMessageReminder from "./CollectionMessageReminder.jsx";
import React from "react";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
import HomePage from "../pages/HomePage.jsx";
import SpecificationsPage from "../pages/SpecificationsPage.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import CollectionPage from "../pages/CollectionPage.jsx";
import AlbumPage from "../pages/AlbumPage.jsx";
import CameraPage from "../pages/CameraPage.jsx";
import ScanPage from "../pages/ScanPage.jsx";
import ToolsPage from "../pages/ToolsPage.jsx";
import SupportPage from "../pages/SupportPage.jsx";
import PrintPage from "../pages/PrintPage.jsx";
import OrdersPage from "../pages/OrdersPage.jsx";
import MyPage from "../pages/MyPage.jsx";
import KeepsakesPage from "../pages/KeepsakesPage.jsx";
import MenuBacking from "./MenuBacking.jsx";
import PhotoActionSheet from "./PhotoActionSheet.jsx";
import LiquidTabs from "../components/LiquidTabs.jsx";
import PhotoPicker from "../components/PhotoPicker.jsx";
import NativePhoneChrome from "./NativePhoneChrome.jsx";
import ScenarioHost from "../workbench/ScenarioHost.jsx";
import { FeedbackToast } from "./Feedback.jsx";
import { PaymentAccountPrompt, PaymentHandoffScreen, PaymentReturnWatcher } from "./PaymentHandoff.jsx";
import { paymentReturnAccess } from "../domain/payment-handoff.js";
export default function AppShell({ scope, args = [] }) {
  return (
    <Controller name="phoneDemo" args={args}>
      {(s) => {
        const owner = s.$store.account.session?.phone;
        const checkout = s.$store.paymentHandoff?.current;
        const externalPreview = checkout?.owner === owner ? checkout : null;
        const pending = s.$store.paymentHandoff?.pending;
        const path = typeof location === "undefined" ? "" : location.pathname + location.search;
        const paymentAccess = paymentReturnAccess(pending, path, owner);
        const paymentAccountBlocked = !!paymentAccess && paymentAccess !== "restore";
        const paymentOverlay = !!externalPreview || paymentAccountBlocked;
        return (
        <View
          as="div"
          scope={s}
          scopeRoot
          className="phone"
          data-page={s.page}
          data-album-view={s.albumView}
          data-album-managing={s.albumManaging}
          data-album-preview={s.albumPreview}
          data-camera-compare={s.cameraCompare}
          data-camera-step={s.cameraStep}
          data-my-view={s.myView}
          data-help-search={s.supportSearching || undefined}
          data-print-preview={s.$store.printUi.preview}
        >
          <View as="div" scope={s} className="screen">
            <NativePhoneChrome />
            <CollectionMessageReminder />
            <View
              as="div"
              scope={s}
              className="app-viewport"
              inert={!!s.$store.prototypeWorkspace?.active}
            >
              <View
                as="div"
                scope={s}
                className="pages"
                hidden={paymentAccountBlocked}
                show={!paymentAccountBlocked}
                inert={
                  paymentOverlay ||
                  s.$store.photoChoice.opened ||
                  s.$store.myUi.opened ||
                  s.$store.printUi.opened ||
                  s.$store.orderUi.opened ||
                  s.$store.keepsakeUi.opened ||
                  s.$store.photoActions.opened || (s.page==="album" && s.albumView==="detail") ||
                  s.$store.albumSpacesUi?.opened ||
                  s.albumModal
                }
              >
                <HomePage scope={s} />
                <SpecificationsPage scope={s} />
                <AccountPage scope={s} args={[]} />
                <CollectionPage scope={s} args={[]} />
                <AlbumPage scope={s} args={[]} />
                <CameraPage scope={s} args={[]} />
                <ScanPage scope={s} args={[]} />
                <ToolsPage scope={s} args={[]} />
                <SupportPage scope={s} args={[]} />
                <Controller name="printStudio">
                  {(print) => (
                    <>
                      <PrintPage scope={print} />
                      <OrdersPage print={print} />
                    </>
                  )}
                </Controller>
                <MyPage scope={s} args={[]} />
                <KeepsakesPage scope={s} />
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
                  paymentOverlay ||
                  s.$store.photoChoice.opened ||
                  s.$store.myUi.opened ||
                  s.$store.printUi.opened ||
                  s.$store.orderUi.opened ||
                  s.$store.keepsakeUi.opened ||
                  s.$store.photoActions.opened || (s.page==="album" && s.albumView==="detail") ||
                  s.$store.albumSpacesUi?.opened ||
                  s.albumModal
                }
                show={
                  !s.supportSearching &&
                  s.page !== "account" &&
                  s.page !== "orders" &&
                  s.page !== "collection" &&
                  s.page !== "camera" &&
                  s.page !== "scan" &&
                  s.page !== "print" &&
                  s.page !== "tool" &&
                  s.page !== "specifications" &&
                  s.page !== "keepsake" &&
                  (s.page !== "album" ||
                    !s.albumManaging) &&
                  (s.page !== "my" || s.myView === "overview")
                }
                aria-label="底部导航"
              >
                <MenuBacking page={s.page} section={s.myView}/>
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
              <div id="toast-layer" hidden={paymentAccountBlocked} inert={paymentOverlay} />
              <FeedbackToast message={s.page === "home" && !s.$store.photoChoice.opened && s.homeNotice} />
              <div hidden={paymentAccountBlocked} inert={paymentOverlay}>
                <div id="album-modal-layer" />
                <div id="camera-modal-layer" />
                <div id="scan-modal-layer" />
                <div id="my-modal-layer" />
                <div id="print-modal-layer" />
                <div id="orders-modal-layer" />
                <div id="tool-modal-layer" />
                <div id="account-modal-layer" />
                <div id="collection-modal-layer" />
                <div id="shared-modal-layer" />
              </div>
              <div id="payment-handoff-layer" />
              <PaymentReturnWatcher page={s.page} owner={owner} checkout={checkout}
                pending={pending} access={paymentAccess} />
              <PaymentHandoffScreen checkout={externalPreview} />
              <PaymentAccountPrompt access={paymentAccess} path={path} />
              <PhotoActionSheet scope={s} />
              <PhotoPicker scope={s} args={[]} />
            </View>
            <ScenarioHost />
          </View>
        </View>
      );}}
    </Controller>
  );
}
