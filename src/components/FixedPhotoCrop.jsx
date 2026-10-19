import React, { useRef } from "react";
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
  onChange,
}) {
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const bounds = photoCropBounds(photo.width, photo.height, 5, 7, value);
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
          aria-label="一寸固定比例裁剪区域，拖动照片调整位置"
          onPointerDown={(event) => {
            if (disabled) return;
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
        <label>
          <span>缩放</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            aria-label="照片缩放"
            value={value.scale}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, scale: Number(event.target.value) })
            }
          />
          <output>{value.scale.toFixed(1)}×</output>
        </label>
        <div className="print-crop-position">
          <label>
            水平
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={value.offsetX}
              aria-label="照片水平位置"
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...value, offsetX: Number(event.target.value) })
              }
            />
          </label>
          <label>
            垂直
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={value.offsetY}
              aria-label="照片垂直位置"
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...value, offsetY: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <p>拖动照片或双指缩放，裁剪比例固定为 5∶7</p>
      </div>
    </>
  );
}
