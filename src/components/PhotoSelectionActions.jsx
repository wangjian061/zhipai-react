import React from "react";
import "../styles/photo-selection.css";

// Shared actions; each workflow controls what selecting a photo does next.
export default function PhotoSelectionActions({
  hasPhoto,
  disabled = false,
  nextEnabled = true,
  nextLabel = "下一步",
  replaceLabel = "更换照片",
  selectLabel = "选取照片",
  label = "照片选择操作",
  onSelect,
  onNext,
}) {
  return (
    <div
      className="photo-selection-actions"
      data-selected={!!hasPhoto}
      role="group"
      aria-label={label}
    >
      {hasPhoto && (
        <button
          type="button"
          className="photo-selection-replace"
          disabled={disabled}
          onClick={onSelect}
        >
          {replaceLabel}
        </button>
      )}
      <button
        type="button"
        className="photo-selection-next"
        disabled={disabled || (!!hasPhoto && !nextEnabled)}
        onClick={hasPhoto ? onNext : onSelect}
      >
        {hasPhoto ? nextLabel : selectLabel}
      </button>
    </div>
  );
}
