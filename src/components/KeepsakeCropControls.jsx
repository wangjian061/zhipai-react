import React from "react";
import KeepsakePreview from "./KeepsakePreview.jsx";

export default function KeepsakeCropControls({ s }) {
  const transform = s.activeTransform;
  return (
    <div className="keepsake-crop-controls">
      <div className="keepsake-crop-stage">
        <KeepsakePreview
          template={s.template}
          image={s.image}
          transform={s.kind === "stamp" ? s.cropDraft : transform}
          activeSlot={s.activeSlot}
          interactive={!s.locked}
          onPointerDown={(e) => s.pointerDown(e)}
          onPointerMove={(e) => s.pointerMove(e)}
          onPointerUp={(e) => s.pointerUp(e)}
        />
      </div>
      {s.kind === "stamp" && (
        <div
          className="stamp-crop-tabs"
          role="group"
          aria-label="选择要调整的照片位"
        >
          {[
            ["center", "中央大图"],
            ["corners", "四角小图"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={s.activeSlot === key}
              disabled={s.locked}
              onClick={() => {
                s.activeSlot = key;
                s.gesture = null;
                s.pointers.clear();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {[
        ["scale", "缩放", 1, 3, 0.01],
        ["offsetX", "左右", -100, 100, 1],
        ["offsetY", "上下", -100, 100, 1],
      ].map(([key, label, min, max, step]) => {
        const value =
          key === "scale"
            ? transform[key].toFixed(2).replace(/0$/, "") + "×"
            : Math.round(transform[key]) + "%";
        return (
          <label key={key} className="keepsake-crop-slider">
            <span>{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              aria-label={label}
              aria-valuetext={value}
              value={transform[key]}
              disabled={s.locked}
              onChange={(e) =>
                s.setTransform({ ...transform, [key]: e.target.value })
              }
            />
            <span aria-hidden="true">{value}</span>
          </label>
        );
      })}
      {s.kind === "postcard" && (
        <div className="keepsake-crop-slider" role="group" aria-label="旋转照片">
          <span>旋转</span>
          <div className="keepsake-turn-actions">
            <button type="button" disabled={s.locked} onClick={() => s.turnPostcard(false)}>左转 90°</button>
            <button type="button" disabled={s.locked} onClick={() => s.turnPostcard(true)}>右转 90°</button>
          </div>
          <output aria-live="polite">{transform.rotation || 0}°</output>
        </div>
      )}
      <button
        type="button"
        className="keepsake-crop-reset"
        disabled={s.locked}
        onClick={() => s.resetTransform()}
      >
        重置当前构图
      </button>
    </div>
  );
}
