import React from "react";
import { View } from "../runtime/components.jsx";
import "../styles/album-photo-viewer.css";

// Reuse the existing dark photo-viewer pattern; this never changes the chosen SKU.
export default function PrintLayoutViewer({ scope: s }) {
  if (s.modal !== "layoutPreview") return null;
  return (
    <div className="print-overlay">
      <View
        as="section"
        scope={s}
        refName="printDialog"
        className="album-photo-viewer print-layout-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-layout-preview-title"
        tabIndex={-1}
        onKeyDown={(e) => s.trap(e)}
        onClick={(e) => {
          if (e.target === e.currentTarget) s.closeModal();
        }}
      >
        <div className="album-photo-viewer-toolbar print-layout-viewer-toolbar">
          <h2 id="print-layout-preview-title">
            排版预览 · {s.layoutName(s.layoutPreviewId)}
          </h2>
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
          <div
            className="print-preview-paper"
            dangerouslySetInnerHTML={{
              __html: s.workspaceSheet(s.layoutPreviewId),
            }}
          />
        </div>
        <p className="print-layout-preview-caption">
          {s.draft.photo ? "本次照片排版" : "排版示例，请先选取您的照片"}
        </p>
      </View>
    </div>
  );
}
