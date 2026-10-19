import React, { useLayoutEffect, useRef, useState } from "react";
import { visiblePhotoBounds } from "./photo-processing.js";
import "../styles/photo-processing.css";

export default function PhotoProcessingEffect({ active, imageSrc }) {
  const host = useRef(null);
  const [bounds, setBounds] = useState(null);
  useLayoutEffect(() => {
    if (!active) return;
    const frame = host.current?.parentElement;
    const image = frame?.querySelector(":scope > img");
    if (!image) {
      setBounds(null);
      return;
    }
    const update = () => {
      const style = getComputedStyle(image);
      const position = style.objectPosition.split(" ");
      const percentage = (value) =>
        value?.endsWith("%") ? parseFloat(value) / 100 : 0.5;
      setBounds(
        image.complete
          ? visiblePhotoBounds({
              frame: frame.getBoundingClientRect(),
              image: image.getBoundingClientRect(),
              naturalWidth: image.naturalWidth,
              naturalHeight: image.naturalHeight,
              fit: style.objectFit,
              positionX: percentage(position[0]),
              positionY: percentage(position[1]),
            })
          : null,
      );
    };
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(frame);
    observer?.observe(image);
    image.addEventListener("load", update);
    image.addEventListener("error", update);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer?.disconnect();
      image.removeEventListener("load", update);
      image.removeEventListener("error", update);
      window.removeEventListener("resize", update);
    };
  }, [active, imageSrc]);
  if (!active) return null;
  return (
    <span
      ref={host}
      className="photo-processing-effect"
      aria-hidden="true"
      style={
        bounds
          ? Object.fromEntries(
              Object.entries(bounds).map(([key, value]) => [key, value + "%"]),
            )
          : { display: "none" }
      }
    />
  );
}

export function PhotoProcessingStatus({ label }) {
  if (!label) return null;
  return (
    <p className="photo-processing-status" role="status" aria-live="polite">
      {label}
    </p>
  );
}
