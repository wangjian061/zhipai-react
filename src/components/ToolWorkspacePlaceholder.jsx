import React from "react";
import "../styles/photo-selection.css";

// A selection affordance only: never supply this asset to the photo controller.
export default function ToolWorkspacePlaceholder({ disabled, onSelect }) {
  return (
    <section className="photo-selection-preview tool-workspace-empty">
      <button
        type="button"
        className="photo-selection-current tool-workspace-placeholder"
        aria-label="选取照片"
        disabled={disabled}
        onClick={onSelect}
      >
        <img src="/assets/photo-placeholder-silhouette-20261106.webp" alt="" />
      </button>
      <div className="photo-selection-caption">
        <span>请选择您的照片</span>
      </div>
    </section>
  );
}
