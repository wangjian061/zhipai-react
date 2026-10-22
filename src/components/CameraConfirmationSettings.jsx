import React from "react";
import "../styles/photo-selection.css";
import "../styles/camera-confirmation.css";

export default function CameraConfirmationSettings({
  specs,
  colors,
  selectedSpec,
  sizeLabel,
  background,
  backgroundMessage,
  disabled,
  locked,
  onSpec,
  onMoreSpec,
  onBackground,
}) {
  if (locked)
    return <p className="camera-confirm-locked">采集规格由项目统一设置</p>;
  const settings = (
    <section className="camera-confirm-settings" aria-label="制作规格设置">
      <fieldset disabled={disabled}>
        <legend className="sr-only">照片规格</legend>
        <div className="camera-confirm-setting-heading">
          <span aria-hidden="true">照片规格</span>
          <span className="camera-confirm-current-size">{sizeLabel}</span>
        </div>
        <div className="camera-confirm-specs">
          {specs.map((spec) => (
            <button
              key={spec.id}
              type="button"
              aria-pressed={selectedSpec === spec.id}
              onClick={() => onSpec(spec.id)}
            >
              <span>{spec.name}</span>
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-pressed={
              !!selectedSpec && !specs.some((spec) => spec.id === selectedSpec)
            }
            onClick={onMoreSpec}
          >
            <span>更多规格</span>
          </button>
        </div>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend>背景颜色</legend>
        <div className="camera-confirm-colors">
          {colors.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-pressed={background === color.value}
              onClick={() => onBackground(color.value)}
            >
              <span
                className={
                  "camera-confirm-swatch" +
                  (color.value === "transparent" ? " transparent-frame" : "")
                }
                style={{
                  backgroundColor: color.value,
                  color: ["#ffffff", "#d5d9e0", "transparent"].includes(
                    color.value,
                  )
                    ? "var(--brand-blue)"
                    : "#fff",
                }}
              >
                {background === color.value && (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m4 8 2.5 2.5L12 5" />
                  </svg>
                )}
              </span>
              <span>{color.name}</span>
            </button>
          ))}
        </div>
        {backgroundMessage && (
          <p className="camera-confirm-color-note" role="status">
            {backgroundMessage}
          </p>
        )}
      </fieldset>
    </section>
  );
  return settings;
}
