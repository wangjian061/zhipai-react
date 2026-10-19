import React, { useLayoutEffect, useRef, useState } from "react";
import {
  fitPhonePreview,
  IPHONE_PREVIEW as device,
} from "../domain/device-preview.js";
export default function DevicePreview({ children }) {
  const fit = useRef(null);
  const [geometry, setGeometry] = useState(() =>
    fitPhonePreview(window.innerWidth, window.innerHeight),
  );
  useLayoutEffect(() => {
    const stage = fit.current?.parentElement;
    const update = () => {
      const next = fitPhonePreview(
        stage?.clientWidth || window.innerWidth,
        stage?.clientHeight || window.innerHeight,
      );
      setGeometry((old) => (old.scale === next.scale ? old : next));
    };
    const observer = new ResizeObserver(update);
    if (stage) observer.observe(stage);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  useLayoutEffect(() => {
    window.dispatchEvent(new Event("zhipai-device-resize"));
  }, [geometry.scale]);
  return (
    <div
      className="device-fit"
      id="device-fit"
      ref={fit}
      data-device={device.model}
      style={{
        width: geometry.width,
        height: geometry.height,
        "--device-scale": geometry.scale,
        "--device-screen-width": device.screenWidth + "px",
        "--device-screen-height": device.screenHeight + "px",
        "--device-inset-x": device.insetX + "px",
        "--device-inset-y": device.insetY + "px",
        "--device-status-height": device.statusHeight + "px",
        "--device-home-height": device.homeHeight + "px",
        "--device-home-indicator-bottom": device.homeIndicatorBottom + "px",
        "--device-home-indicator-height": device.homeIndicatorHeight + "px",
        "--device-nav-bottom":
          device.homeIndicatorBottom +
          device.homeIndicatorHeight +
          device.navigationGap +
          "px",
      }}
    >
      <div
        className="device-entry"
        style={{ width: device.bodyWidth, height: device.bodyHeight }}
      >
        <div className="device-side-keys" aria-hidden="true">
          <span className="device-action-key" />
          <span className="device-volume-up" />
          <span className="device-volume-down" />
          <span className="device-power-key" />
        </div>
        {children}
      </div>
    </div>
  );
}
