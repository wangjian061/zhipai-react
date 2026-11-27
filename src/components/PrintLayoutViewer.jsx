import React, { useId } from "react";
import PrintSheetArtwork from "./PrintSheetArtwork.jsx";
import { handlePrintDialogKey } from "../domain/print.js";
import "../styles/album-photo-viewer.css";

// Reuse the existing dark photo-viewer pattern; this never changes the chosen SKU.
export default function PrintLayoutViewer({ scope: s }) {
  if (s.modal !== "layoutPreview") return null;
  return <PrintGalleryViewer items={s.galleryItems} item={s.galleryItem} closing={s.previewClosing}
    closeLabel="关闭排版预览" dialogRef={node => { s.$refs.printDialog = node; }}
    onSelect={id => s.selectGalleryImage(id)} onClose={() => s.closeModal()} />;
}

export function PrintGalleryViewer({ items, item, closing, closeLabel = "关闭商品大图", dialogRef, onSelect, onClose }) {
  const titleId = useId();
  const index = items.findIndex(({ id }) => id === item.id);
  function step(offset) {
    const next = items[index + offset];
    if (!closing && next) onSelect(next.id);
  }
  function handleKey(event) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    handlePrintDialogKey(event, event.currentTarget, onClose);
  }
  return (
    <div className="print-overlay print-viewer-overlay">
      <section
        ref={dialogRef}
        className="album-photo-viewer print-layout-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKey}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="album-photo-viewer-toolbar print-layout-viewer-toolbar">
          <h2 id={titleId}>{item.label}</h2>
          <button
            type="button"
            className="album-photo-viewer-close"
            aria-label={closeLabel}
            disabled={closing}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div
          className="album-photo-viewer-stage"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="print-preview-paper">
            <PrintSheetArtwork image={item.image} alt={item.label} />
          </div>
        </div>
        <div className="print-gallery-pagination" role="group" aria-label="切换产品图">
          <button type="button" disabled={index === 0 || closing} onClick={() => step(-1)}>上一张</button>
          <span role="status">{index + 1} / {items.length}</span>
          <button type="button" disabled={index === items.length - 1 || closing} onClick={() => step(1)}>下一张</button>
        </div>
      </section>
    </div>
  );
}
