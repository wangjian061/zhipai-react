import React from "react";
import PhotoProcessingEffect, {
  PhotoProcessingStatus,
} from "./PhotoProcessingEffect.jsx";
import "../styles/photo-selection.css";

export default function PhotoSelectionPreview({
  photo,
  src,
  processingLabel = "",
}) {
  return (
    <section className="photo-selection-preview" aria-label="当前所选照片">
      <div className="photo-selection-current">
        <img src={src} alt="当前所选照片" />
        <PhotoProcessingEffect active={!!processingLabel} imageSrc={src} />
      </div>
      <PhotoProcessingStatus label={processingLabel} />
      <div className="photo-selection-caption">
        <span>{photo.spec || `${photo.width} × ${photo.height} px`}</span>
      </div>
    </section>
  );
}
