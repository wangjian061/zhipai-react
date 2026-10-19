import React from "react";
import { View } from "./runtime/components.jsx";
import AppShell from "./components/AppShell.jsx";
import DevicePreview from "./components/DevicePreview.jsx";
export default function App() {
  const s = {};
  return (
    <>
      <View
        as="svg"
        scope={s}
        className="svg-defs"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <View as="defs" scope={s}>
          <View as="symbol" scope={s} id="i-eye" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"
            ></View>
            <View as="circle" scope={s} cx="12" cy="12" r="3"></View>
          </View>
          <View as="symbol" scope={s} id="i-wechat-account" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M13 14a7 7 0 1 1 2-8M4 14l-1 4 4-2M21 19l1 3-4-1"
            ></View>
            <View as="ellipse" scope={s} cx="16" cy="15" rx="7" ry="5"></View>
            <View
              as="path"
              scope={s}
              d="M7 7h.1M11 7h.1M14 14h.1M18 14h.1"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-apple-account" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M12 7c-6-5-12 2-8 9 3 7 5 4 8 4s5 3 8-4c-4-2-4-5 0-8-3-3-6-2-8-1M12 5c0-3 3-4 5-4 0 3-2 5-5 5"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-account-huawei" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="m12 16-3-13M12 16 15 3M12 16 5 5M12 16l7-11M12 16 2 10M12 16l10-6M3 20h18"
            ></View>
          </View>
          <View
            as="symbol"
            scope={s}
            id="i-collection-school"
            viewBox="0 0 24 24"
          >
            <View
              as="path"
              scope={s}
              d="m2 8 10-5 10 5M4 9h16M5 9v10m5-10v10m4-10v10m5-10v10M3 20h18"
            ></View>
          </View>
          <View
            as="symbol"
            scope={s}
            id="i-collection-graduate"
            viewBox="0 0 24 24"
          >
            <View
              as="path"
              scope={s}
              d="m2 8 10-5 10 5-10 5-10-5M5 10v7q7 5 14 0v-7M22 8v10"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-collection-org" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M4 21V3h10v18M14 9h6v12M2 21h20M7 7h4M7 11h4M7 15h4M17 13h1M17 17h1"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-collection-id" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="2"
              y="4"
              width="20"
              height="16"
              rx="3"
            ></View>
            <View as="circle" scope={s} cx="8" cy="10" r="2"></View>
            <View
              as="path"
              scope={s}
              d="M4 17v-1c0-4 8-4 8 0v1M15 9h4M15 13h4M15 17h2"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-link" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-nav-home" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="m3 10 9-7 9 7M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-nav-album" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="3"
              y="6"
              width="18"
              height="15"
              rx="3"
            ></View>
            <View as="path" scope={s} d="M7 3h10M4 17l5-5 4 4 3-3 5 4"></View>
            <View as="circle" scope={s} cx="16.5" cy="10.5" r="1.2"></View>
          </View>
          <View as="symbol" scope={s} id="i-nav-service" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M4 13v-2a8 8 0 0 1 16 0v2M20 16v1a4 4 0 0 1-4 4h-3"
            ></View>
            <View
              as="rect"
              scope={s}
              x="2"
              y="10"
              width="4"
              height="7"
              rx="2"
            ></View>
            <View
              as="rect"
              scope={s}
              x="18"
              y="10"
              width="4"
              height="7"
              rx="2"
            ></View>
            <View as="path" scope={s} d="M10 21h3"></View>
          </View>
          <View as="symbol" scope={s} id="i-nav-user" viewBox="0 0 24 24">
            <View as="circle" scope={s} cx="12" cy="7.5" r="4"></View>
            <View
              as="path"
              scope={s}
              d="M4.5 21v-1.5a7.5 7.5 0 0 1 15 0V21"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-home" viewBox="0 0 24 24">
            <View as="path" scope={s} d="m3 10 9-7 9 7v10h-6v-7H9v7H3z"></View>
          </View>
          <View as="symbol" scope={s} id="i-album" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M18 10v10H4V6h9M8 16l3-4 3 3 2-2M16 5h6M19 2v6"
            ></View>
            <View as="circle" scope={s} cx="8" cy="9" r="1"></View>
          </View>
          <View as="symbol" scope={s} id="i-camera" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            ></View>
            <View as="circle" scope={s} cx="12" cy="12.5" r="4.5"></View>
          </View>
          <View as="symbol" scope={s} id="i-service" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="2"
              y="5"
              width="20"
              height="15"
              rx="3"
            ></View>
            <View as="path" scope={s} d="m3 7 9 7 9-7"></View>
          </View>
          <View as="symbol" scope={s} id="i-user" viewBox="0 0 24 24">
            <View as="circle" scope={s} cx="12" cy="7" r="4"></View>
            <View as="path" scope={s} d="M4 22v-3a8 8 0 0 1 16 0v3"></View>
          </View>
          <View as="symbol" scope={s} id="i-search" viewBox="0 0 24 24">
            <View as="circle" scope={s} cx="10" cy="10" r="6.5"></View>
            <View as="path" scope={s} d="m15 15 5 5"></View>
          </View>
          <View as="symbol" scope={s} id="i-arrow" viewBox="0 0 24 24">
            <View as="path" scope={s} d="M4 12h16m-6-6 6 6-6 6"></View>
          </View>
          <View as="symbol" scope={s} id="i-chevron-left" viewBox="0 0 24 24">
            <View as="path" scope={s} d="m15 5-7 7 7 7"></View>
          </View>
          <View as="symbol" scope={s} id="i-chevron" viewBox="0 0 24 24">
            <View as="path" scope={s} d="m9 5 7 7-7 7"></View>
          </View>
          <View as="symbol" scope={s} id="i-print" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M6 8V3h12v5M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6zM18 11h1"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-repair" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M12 4H3v17h18v-9M5 17l4-5 4 4 4-5M17 2v6m-3-3h6M20 7v4m-2-2h4"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-shirt" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="m8 3-6 5 4 5 2-2v10h8V11l2 2 4-5-6-5c-1 4-7 4-8 0z"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-id" viewBox="0 0 24 24">
            <View as="path" scope={s} d="M8 3h13v16h-4M3 7h14v15H3z"></View>
            <View as="circle" scope={s} cx="10" cy="12" r="2"></View>
            <View as="path" scope={s} d="M6 19c0-5 8-5 8 0"></View>
          </View>
          <View as="symbol" scope={s} id="i-crop" viewBox="0 0 24 24">
            <View as="circle" scope={s} cx="5" cy="18" r="3"></View>
            <View as="circle" scope={s} cx="5" cy="6" r="3"></View>
            <View as="path" scope={s} d="m7 8 14 12M7 16 21 3M11 12l3 3"></View>
          </View>
          <View as="symbol" scope={s} id="i-ai" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M11 3H5a3 3 0 0 0-3 3v13a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-7M18 1v7m-3-3.5h6M5 18l3-9h2l3 9m-7-3h6M17 12v6"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-file" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M6 3h10l5 5v13H6zM16 3v5h5M1 9h14v10H1z"
            ></View>
            <View as="path" scope={s} d="M4 12h2v4M9 12h3m-3 0v4m0-2h2"></View>
          </View>
          <View as="symbol" scope={s} id="i-size" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="2"
              y="6"
              width="20"
              height="14"
              rx="3"
            ></View>
            <View
              as="path"
              scope={s}
              d="M6 11v5m0-2 4-3m-4 3 4 2M14 11v5h3c3 0 3-3 0-3h-3m0-2h3c2 0 2 2 0 2M7 3h10"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-more" viewBox="0 0 24 24">
            <View as="circle" scope={s} cx="5" cy="12" r="1"></View>
            <View as="circle" scope={s} cx="12" cy="12" r="1"></View>
            <View as="circle" scope={s} cx="19" cy="12" r="1"></View>
          </View>
          <View as="symbol" scope={s} id="i-notification" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            />
          </View>
          <View as="symbol" scope={s} id="i-document" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M5 2h10l5 5v15H5zM15 2v6h5M8 12h6M8 16h6"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-book" viewBox="0 0 24 24">
            <View as="path" scope={s} d="M5 3h14v18H5zM9 3v9l3-2 3 2V3"></View>
          </View>
          <View as="symbol" scope={s} id="i-feedback" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M12 4H4v17h17v-9M8 10h5M8 15h6m0-8 7-6 2 2-7 7-3 1z"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-settings" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="m9 3-1 3-3 1-2 3 2 3-1 3 3 2 3-1 2 3 3-1 1-3 3-1 2-3-2-3 1-3-3-2-3 1-2-3z"
            ></View>
            <View as="circle" scope={s} cx="12" cy="12" r="3"></View>
          </View>
          <View as="symbol" scope={s} id="i-plus" viewBox="0 0 24 24">
            <View as="path" scope={s} d="M12 4v16M4 12h16"></View>
          </View>
          <View as="symbol" scope={s} id="i-check" viewBox="0 0 24 24">
            <View as="path" scope={s} d="m5 12 5 5L20 7"></View>
          </View>
          <View as="symbol" scope={s} id="i-close" viewBox="0 0 24 24">
            <View as="path" scope={s} d="m6 6 12 12M18 6 6 18"></View>
          </View>
          <View as="symbol" scope={s} id="i-trash" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-download" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-crop-frame" viewBox="0 0 24 24">
            <View as="path" scope={s} d="M6 2v16h16M2 6h16v16M9 6h9v9"></View>
          </View>
          <View as="symbol" scope={s} id="i-resize" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
            ></View>
            <View
              as="path"
              scope={s}
              d="m13 11 4-4m-4 0h4v4M11 13l-4 4m0-4v4h4"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-chat" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M21 11c0 5-5 8-10 7l-5 3 1-4C-1 12 3 3 12 3c5 0 9 3 9 8z"
            ></View>
            <View as="path" scope={s} d="M8 10h.01M16 10h.01"></View>
          </View>
          <View as="symbol" scope={s} id="i-alert" viewBox="0 0 24 24">
            <View as="circle" scope={s} cx="12" cy="12" r="9"></View>
            <View as="path" scope={s} d="M12 7v6M12 17h.01"></View>
          </View>
          <View as="symbol" scope={s} id="i-camera-flip" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M5 8 3 6m0 0v5m0-5h5M19 16l2 2m0 0v-5m0 5h-5M4 6a9 9 0 0 1 16 3M20 18A9 9 0 0 1 4 15"
            ></View>
            <View as="circle" scope={s} cx="12" cy="12" r="3"></View>
          </View>
          <View as="symbol" scope={s} id="i-flash" viewBox="0 0 24 24">
            <View as="path" scope={s} d="m13 2-8 12h6l-1 8 9-13h-6z"></View>
          </View>
          <View as="symbol" scope={s} id="i-flash-off" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="m13 2-3 5m-3 5-2 2h6l-1 8 5-7m3-3 1-3h-6M3 3l18 18"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-grid" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="3"
              y="3"
              width="18"
              height="18"
              rx="1"
            ></View>
            <View as="path" scope={s} d="M9 3v18M15 3v18M3 9h18M3 15h18"></View>
          </View>
          <View as="symbol" scope={s} id="i-bulb" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 .9-1 2-1 3H9c0-1 0-2-1-3"
            ></View>
            <View
              as="path"
              scope={s}
              d="M12 1v1M3 4l1 1m16-1-1 1M1 10h1m20 0h1"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-scan" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M3 12h18"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-stop" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="6"
              y="6"
              width="12"
              height="12"
              rx="1"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-qr" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v4h-3v3M20 21h1M6 6h1M17 6h1M6 17h1"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-landscape" viewBox="0 0 24 24">
            <View
              as="rect"
              scope={s}
              x="2"
              y="3"
              width="20"
              height="18"
              rx="2"
            ></View>
            <View as="circle" scope={s} cx="7" cy="8" r="1"></View>
            <View as="path" scope={s} d="m3 18 6-6 4 4 4-7 5 9"></View>
          </View>
          <View as="symbol" scope={s} id="i-background" viewBox="0 0 24 24">
            <View as="path" scope={s} d="m12 3-7 11h14zM4 20h16M8 17h8"></View>
          </View>
          <View as="symbol" scope={s} id="i-torch" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M6 4h12v4l-3 4v8a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-8L6 8zM6 8h12M11 14h2v3h-2z"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-torch-on" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M6 7h12v3l-3 4v7H9v-7l-3-4zM6 10h12M11 16h2v3h-2zM12 1v3M5 2l2 2M19 2l-2 2"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-upload" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7"
            ></View>
          </View>
          <View as="symbol" scope={s} id="i-language" viewBox="0 0 24 24">
            <View as="circle" scope={s} cx="12" cy="12" r="9"></View>
            <View as="ellipse" scope={s} cx="12" cy="12" rx="4" ry="9"></View>
            <View as="path" scope={s} d="M3 12h18M5 7h14M5 17h14"></View>
          </View>
          <View as="symbol" scope={s} id="i-share" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M18 8a8 8 0 1 0 2 9M13 3h7v7M20 3l-8 9"
            ></View>
          </View>
          <View
            as="symbol"
            scope={s}
            id="i-tool-background"
            viewBox="0 0 24 24"
          >
            <View
              as="rect"
              scope={s}
              x="3"
              y="3"
              width="14"
              height="14"
              rx="2"
            ></View>
            <View
              as="path"
              scope={s}
              d="M8 21h11a2 2 0 0 0 2-2V8M4 14l4-4 4 4 4-3"
            ></View>
            <View as="circle" scope={s} cx="12.5" cy="7.5" r="1"></View>
          </View>
          <View as="symbol" scope={s} id="i-tool-convert" viewBox="0 0 24 24">
            <View
              as="path"
              scope={s}
              d="M5 12V3h9l5 5v4M14 3v5h5M3 16h16m-3-3 3 3-3 3M21 20H5m3-3-3 3 3 3"
            ></View>
          </View>
        </View>
      </View>
      <View as="main" scope={s} className="stage" aria-label="知拍 App">
        <DevicePreview>
          <AppShell scope={s} args={[]} />
        </DevicePreview>
      </View>
    </>
  );
}
