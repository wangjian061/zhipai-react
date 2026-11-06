import React, { useEffect, useRef, useState } from "react";
import { actualPhotoURL } from "../domain/album.js";

export default function MyPhotoLine({ photos, ready, paused, onOpen }) {
  const mouseDrag = useRef(null);
  const suppressClick = useRef(false);
  const scrollEnd = useRef(null);
  const [scrolling, setScrolling] = useState(false);
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(scrollEnd.current);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  function startDrag(event) {
    suppressClick.current = false;
    mouseDrag.current =
      event.pointerType === "mouse" && event.button === 0
        ? { x: event.clientX, offset: event.currentTarget.scrollLeft }
        : null;
  }
  function drag(event) {
    const start = mouseDrag.current,
      strip = event.currentTarget;
    if (!start || !(event.buttons & 1)) return;
    const dx = event.clientX - start.x;
    if (!suppressClick.current && Math.abs(dx) < 6) return;
    if (!strip.hasPointerCapture(event.pointerId))
      strip.setPointerCapture(event.pointerId);
    suppressClick.current = true;
    strip.scrollLeft =
      start.offset -
      (dx * strip.clientWidth) / strip.getBoundingClientRect().width;
  }
  if (!photos.length)
    return (
      <p className="my-photos-empty">
        {ready ? "暂无照片，制作后可在这里查看" : "正在读取照片…"}
      </p>
    );
  const angles = [-3, 2, -1.5, 2.5, -2, 1.4];
  return (
    <div
      className="my-photos-strip"
      data-paused={!!(paused || hidden || scrolling)}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={() => {
        mouseDrag.current = null;
      }}
      onPointerCancel={() => {
        mouseDrag.current = null;
      }}
      onScroll={() => {
        setScrolling(true);
        clearTimeout(scrollEnd.current);
        scrollEnd.current = setTimeout(() => setScrolling(false), 160);
      }}
    >
      <div
        className="my-photo-line"
        style={{
          width: photos.length * 88,
          gridTemplateColumns: `repeat(${photos.length},1fr)`,
        }}
      >
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 7 Q50 32 100 7" vectorEffect="non-scaling-stroke" />
        </svg>
        {photos.map((photo, i) => {
          const t = (i + 0.5) / photos.length;
          return (
            <button
              key={photo.id}
              onClick={(e) => {
                if (!suppressClick.current || e.detail === 0) onOpen(photo);
              }}
              type="button"
              aria-label={`查看第${i + 1}张照片与处理操作`}
              style={{
                "--pin-top": 7 + 50 * t * (1 - t) + "px",
                "--tilt": angles[i] + "deg",
                "--phase": -3.4 + i * 0.47 + "s",
              }}
            >
              <span className="my-photo-hanger">
                <span className="my-photo-paper">
                  <img
                    src={actualPhotoURL(photo)}
                    alt=""
                    draggable={false}
                    loading="lazy"
                  />
                </span>
                <i className="my-photo-peg" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
