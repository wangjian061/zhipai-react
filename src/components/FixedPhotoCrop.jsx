import React, { useEffect, useRef } from "react";
import PhotoProcessingEffect, {
  PhotoProcessingStatus,
} from "./PhotoProcessingEffect.jsx";
import { photoCropBounds } from "../domain/album.js";

export default function FixedPhotoCrop({
  photo,
  src,
  value,
  disabled,
  processing = false,
  ratio,
  onChange,
}) {
  const frame = useRef(null);
  const gestureState = useRef(null);
  gestureState.current = { value, disabled, onChange };
  useEffect(() => {
    const area = frame.current;
    function zoom(event) {
      const { value, disabled, onChange } = gestureState.current;
      if (disabled) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode ? 16 : 1);
      onChange({ ...value, scale: value.scale * Math.exp(-delta * 0.003) });
    }
    area.addEventListener("wheel", zoom, { passive: false });
    return () => area.removeEventListener("wheel", zoom);
  }, []);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const bounds = photoCropBounds(photo.width, photo.height, ...(ratio || [5, 7]), value);
  const begin = () => {
    const points = [...pointers.current.values()];
    gesture.current = points.length
      ? {
          ...value,
          ...points[0],
          distance:
            points.length > 1
              ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
              : 0,
        }
      : null;
  };
  const end = (event) => {
    pointers.current.delete(event.pointerId);
    begin();
  };
  return (
    <>
      <div className="print-crop-stage">
        <div
          className="print-crop-frame"
          ref={frame}
          aria-label={ratio ? "六寸裁剪区域，拖动照片调整位置" : "一寸固定比例裁剪区域，拖动照片调整位置"}
          style={ratio ? { aspectRatio: ratio.join(" / ") } : undefined}
          onPointerDown={(event) => {
            if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            pointers.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
            begin();
          }}
          onPointerMove={(event) => {
            if (
              disabled ||
              !pointers.current.has(event.pointerId) ||
              !gesture.current
            )
              return;
            event.preventDefault();
            pointers.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
            const points = [...pointers.current.values()],
              start = gesture.current;
            if (points.length > 1 && start.distance) {
              onChange({
                ...value,
                scale:
                  (start.scale *
                    Math.hypot(
                      points[0].x - points[1].x,
                      points[0].y - points[1].y,
                    )) /
                  start.distance,
              });
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const halfX = (photo.width - bounds.w) / 2;
            const halfY = (photo.height - bounds.h) / 2;
            onChange({
              ...value,
              offsetX:
                start.offsetX -
                (halfX
                  ? ((((event.clientX - start.x) / rect.width) * bounds.w) /
                      halfX) *
                    100
                  : 0),
              offsetY:
                start.offsetY -
                (halfY
                  ? ((((event.clientY - start.y) / rect.height) * bounds.h) /
                      halfY) *
                    100
                  : 0),
            });
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        >
          <img
            src={src}
            alt="正在裁剪的冲印照片"
            draggable={false}
            style={{
              width: `${(photo.width / bounds.w) * 100}%`,
              height: `${(photo.height / bounds.h) * 100}%`,
              left: `${(-bounds.x / bounds.w) * 100}%`,
              top: `${(-bounds.y / bounds.h) * 100}%`,
            }}
          />
          <span className="print-crop-grid" aria-hidden="true" />
          <PhotoProcessingEffect active={processing} imageSrc={src} />
        </div>
      </div>
      <PhotoProcessingStatus label={processing ? "正在裁剪照片" : ""} />
      <div className="print-crop-controls">
        <div className="print-crop-tools">
          <p>{ratio ? "拖动或滑杆微调六寸构图" : "拖动或滑杆微调 5∶7 构图"}</p>
          <button
            type="button"
            className="print-crop-reset"
            disabled={disabled || (value.scale === 1 && !value.offsetX && !value.offsetY)}
            onClick={() => onChange({ scale: 1, offsetX: 0, offsetY: 0 })}
          >
            复位
          </button>
        </div>
        {[
          { key: "scale", title: "缩放", label: "照片缩放", min: 1, max: 3, step: 0.01 },
          { key: "offsetX", title: "水平", label: "照片水平位置", min: -100, max: 100, step: 1 },
          { key: "offsetY", title: "垂直", label: "照片垂直位置", min: -100, max: 100, step: 1 },
        ].map(({ key, title, label, min, max, step }) => (
          <label key={key}>
            <span>{title}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              aria-label={label}
              value={value[key]}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })}
            />
            <output>{key === "scale" ? value[key].toFixed(1) + "×" : Math.round(value[key]) + "%"}</output>
          </label>
        ))}
      </div>
    </>
  );
}
