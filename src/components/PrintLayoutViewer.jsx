import React from "react";
import PrintSheetArtwork from "./PrintSheetArtwork.jsx";
import { View } from "../runtime/components.jsx";
import "../styles/album-photo-viewer.css";

// Reuse the existing dark photo-viewer pattern; this never changes the chosen SKU.
export default function PrintLayoutViewer({ scope: s }) {
  if (s.modal !== "layoutPreview") return null;
  const item = s.galleryItem;
  const items = s.galleryItems;
  const index = items.findIndex(({ id }) => id === item.id);
  function handleKey(event) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      s.stepGalleryImage(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    s.trap(event);
  }
  return (
    <div className="print-overlay print-viewer-overlay">
      <View
        as="section"
        scope={s}
        refName="printDialog"
        className="album-photo-viewer print-layout-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-layout-preview-title"
        tabIndex={-1}
        onKeyDown={handleKey}
        onClick={(e) => {
          if (e.target === e.currentTarget) s.closeModal();
        }}
      >
        <div className="album-photo-viewer-toolbar print-layout-viewer-toolbar">
          <h2 id="print-layout-preview-title">{item.label}</h2>
          <button
            type="button"
            className="album-photo-viewer-close"
            aria-label="关闭排版预览"
            disabled={s.previewClosing}
            onClick={() => s.closeModal()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div
          className="album-photo-viewer-stage"
          onClick={(e) => {
            if (e.target === e.currentTarget) s.closeModal();
          }}
        >
          <div className="print-preview-paper">
            <PrintSheetArtwork image={item.image} alt={item.label} />
          </div>
        </div>
        <div className="print-gallery-pagination" role="group" aria-label="切换产品图">
          <button type="button" disabled={index === 0 || s.previewClosing} onClick={() => s.stepGalleryImage(-1)}>上一张</button>
          <span role="status">{index + 1} / {items.length}</span>
          <button type="button" disabled={index === items.length - 1 || s.previewClosing} onClick={() => s.stepGalleryImage(1)}>下一张</button>
        </div>
      </View>
    </div>
  );
}
