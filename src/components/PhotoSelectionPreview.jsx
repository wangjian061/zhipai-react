import React from "react";
import PhotoProcessingEffect, {
  PhotoProcessingStatus,
} from "./PhotoProcessingEffect.jsx";
import "../styles/photo-selection.css";

export default function PhotoSelectionPreview({
  photo,
  src,
  disabled,
  onChange,
  processingLabel = "",
}) {
  return (
    <section className="photo-selection-preview" aria-label="当前所选照片">
      <div className="photo-selection-current">
        <img src={src} alt="当前所选照片" />
        <PhotoProcessingEffect active={!!processingLabel} imageSrc={src} />
      </div>
      <PhotoProcessingStatus label={processingLabel} />
      <div className="photo-selection-current-actions">
        <span>{photo.spec || `${photo.width} × ${photo.height} px`}</span>
        <button
          type="button"
          className="photo-selection-change"
          disabled={disabled}
          onClick={onChange}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5M6.2 7a7 7 0 0 1 11.6-1L20 9M4 15l2.2 3a7 7 0 0 0 11.6-1" />
          </svg>
          更换照片
        </button>
      </div>
    </section>
  );
}
