import React from "react";
import KeepsakePreview from "./KeepsakePreview.jsx";
import SegmentedControl from "./SegmentedControl.jsx";

const stampSlots = [
  { value: "center", label: "中央大图" },
  { value: "corners", label: "四角小图" },
];

function PhotoTurnButton({ clockwise, disabled, onTurn }) {
  const label = clockwise ? "右转" : "左转";
  return (
    <button type="button" className="keepsake-turn" aria-label={label + " 90°"}
      disabled={disabled} onClick={() => onTurn(clockwise)}>
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 6.75A5.5 5.5 0 1 1 3.7 11.5M2.5 3.5v3.25h3.25"
          transform={clockwise ? "translate(16 0) scale(-1 1)" : undefined} />
      </svg>
      {label}
    </button>
  );
}

const adjustments = [
  { key: "scale", label: "缩放", min: 1, max: 3, step: 0.01 },
  { key: "offsetX", label: "左右", min: -100, max: 100, step: 1 },
  { key: "offsetY", label: "上下", min: -100, max: 100, step: 1 },
];

function CompositionAdjustments({ transform, disabled, onChange }) {
  return (
    <div className="keepsake-adjustments" role="group" aria-label="照片构图微调">
      {adjustments.map(({ key, label, min, max, step }) => {
        const zoom = key === "scale";
        const value = zoom ? transform[key] : -Math.round(transform[key]);
        const readout = zoom ? value.toFixed(2) + "×" : value + "%";
        return (
          <label key={key}>
            <span>{label}</span>
            <input type="range" min={min} max={max} step={step} value={value}
              aria-label={label} aria-valuetext={zoom ? value.toFixed(2) + " 倍" : readout}
              disabled={disabled} onChange={(event) => {
                const position = Number(event.target.value);
                // Moving the photo to the right shifts its source crop to the left.
                onChange({ ...transform, [key]: zoom ? position : -position });
              }} />
            <output aria-hidden="true">{readout}</output>
          </label>
        );
      })}
    </div>
  );
}

export default function KeepsakeCropControls({ s }) {
  const stamp = s.kind === "stamp";
  const transform = s.activeTransform;
  const hasEdits = transform.scale !== 1 || transform.offsetX !== 0 || transform.offsetY !== 0 || !!transform.rotation;
  const gestureDisabled = !s.previewReady || s.locked;
  return (
    <div className="keepsake-crop-controls">
      <div className="keepsake-crop-stage" data-kind={s.kind}>
        {s.image && s.previewFrame && <KeepsakePreview s={s} />}
        {s.previewError ? (
          <div className="keepsake-preview-status" data-with-preview={!!(s.image && s.previewFrame)}>
            <p role="alert">{s.previewError}</p>
            <div className="keepsake-preview-micro">
              <button type="button" disabled={s.locked} onClick={() => s.loadPreview()}>重试</button>
              <button type="button" disabled={s.locked} onClick={() => s.pick()}>重新选图</button>
            </div>
          </div>
        ) : s.previewLoading && !s.image && (
          <div className="keepsake-preview-status" role="status">
            <span className="keepsake-preview-skeleton" aria-hidden="true" />
            <p>正在生成定制效果…</p>
          </div>
        )}
      </div>
      {stamp && (
        <SegmentedControl label="选择要调整的照片位" options={stampSlots}
          value={s.activeSlot} disabled={gestureDisabled} onChange={(slot) => s.selectCropSlot(slot)} />
      )}
      <div className="keepsake-crop-toolbar">
        <p>拖动或滑杆调整构图</p>
        <div className="keepsake-preview-micro" role="group" aria-label="调整构图操作">
          <PhotoTurnButton clockwise={false} disabled={gestureDisabled}
            onTurn={(clockwise) => s.turnPhoto(clockwise)} />
          <PhotoTurnButton clockwise disabled={gestureDisabled}
            onTurn={(clockwise) => s.turnPhoto(clockwise)} />
          <button type="button" disabled={gestureDisabled || !hasEdits} onClick={() => s.resetTransform()}>复位</button>
        </div>
      </div>
      <CompositionAdjustments transform={transform} disabled={gestureDisabled}
        onChange={(value) => s.setTransform(value)} />
      {!stamp && (
        <div className="keepsake-preview-micro keepsake-preview-templates" role="group" aria-label="明信片模板">
          {s.templates.map((template) => (
            <button key={template.id} type="button" disabled={s.locked}
              aria-pressed={s.templateId === template.id} onClick={() => s.chooseTemplate(template.id)}>
              {template.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
