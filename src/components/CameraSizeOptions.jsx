import React from "react";
import "../styles/camera-size-selection.css";

export default function CameraSizeOptions({
  specs,
  fields,
  disabled,
  error,
  onSelect,
  onWidth,
  onHeight,
}) {
  return (
    <div className="camera-size-selection">
      <fieldset disabled={disabled}>
        <legend>预设尺寸</legend>
        <div className="camera-size-list">
          {specs.map((spec) => (
            <button
              type="button"
              key={spec.id}
              aria-pressed={fields.specId === spec.id}
              onClick={() => onSelect(spec.id)}
            >
              <span>
                <strong>{spec.name}</strong>
                <small>
                  {spec.mm} · {spec.width} × {spec.height} px
                </small>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {fields.specId === spec.id && <path d="m5 12 4 4L19 6" />}
              </svg>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={disabled} className="camera-pixel-settings">
        <legend className="sr-only">自定义像素尺寸</legend>
        <button
          type="button"
          className="camera-custom-size-toggle"
          aria-pressed={fields.specId === "custom"}
          aria-expanded={fields.specId === "custom"}
          onClick={() => onSelect("custom")}
        >
          <span>
            自定义尺寸<small>输入照片的实际像素宽高</small>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {fields.specId === "custom" && <path d="m5 12 4 4L19 6" />}
          </svg>
        </button>
        {fields.specId === "custom" && (
          <div className="camera-pixel-inputs">
            <label>
              宽度（px）
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="6000"
                step="1"
                aria-invalid={!!error}
                aria-describedby={error ? "camera-pixel-size-error" : undefined}
                value={fields.customWidth ?? ""}
                onChange={(event) => onWidth(event.target.value)}
              />
            </label>
            <span aria-hidden="true">×</span>
            <label>
              高度（px）
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="6000"
                step="1"
                aria-invalid={!!error}
                aria-describedby={error ? "camera-pixel-size-error" : undefined}
                value={fields.customHeight ?? ""}
                onChange={(event) => onHeight(event.target.value)}
              />
            </label>
          </div>
        )}
      </fieldset>
      {error && (
        <p
          id="camera-pixel-size-error"
          className="camera-size-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
