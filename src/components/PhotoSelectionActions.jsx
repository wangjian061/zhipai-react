import React from "react";
import "../styles/photo-selection.css";

// Shared by printing and all six tools; selection never starts work implicitly.
export default function PhotoSelectionActions({
  hasPhoto,
  disabled = false,
  nextEnabled = true,
  nextLabel = "下一步",
  onSelect,
  onNext,
}) {
  return (
    <div
      className="photo-selection-actions"
      data-selected={!!hasPhoto}
      role="group"
      aria-label="照片选择操作"
    >
      {hasPhoto && (
        <button
          type="button"
          className="photo-selection-replace"
          disabled={disabled}
          onClick={onSelect}
        >
          更换照片
        </button>
      )}
      <button
        type="button"
        className="photo-selection-next"
        disabled={disabled || (!!hasPhoto && !nextEnabled)}
        onClick={hasPhoto ? onNext : onSelect}
      >
        {hasPhoto ? nextLabel : "选取照片"}
      </button>
    </div>
  );
}
