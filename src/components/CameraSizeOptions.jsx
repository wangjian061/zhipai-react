import React from "react";
import "../styles/camera-size-selection.css";

export default function CameraSizeOptions({
  specs,
  fields,
  disabled,
  error,
  onSelect,
}) {
  return (
    <div className="camera-size-selection">
      <fieldset disabled={disabled}>
        <legend>预设规格</legend>
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
      {error && (
        <p id="camera-size-error" className="camera-size-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
