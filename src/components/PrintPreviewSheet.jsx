import React from "react";
import SharedSheet from "./SharedSheet.jsx";
import SegmentedControl from "./SegmentedControl.jsx";
import FixedPhotoCrop from "./FixedPhotoCrop.jsx";
import PhotoSelectionActions from "./PhotoSelectionActions.jsx";
import PrintSheetArtwork from "./PrintSheetArtwork.jsx";

const sections = [
  { value: "sheet", label: "整版成品" },
  { value: "crop", label: "手动裁剪" },
];

export default function PrintPreviewSheet({ studio: s }) {
  if (s.modal !== "printPreview" || !s.cropSource) return null;
  const busy = !!s.cropJob || s.layoutsLoading;
  const error = s.cropError || s.layoutError;
  return (
    <SharedSheet
      id="print-preview-title"
      title="冲印预览"
      className="print-preview-sheet"
      opened
      target={null}
      closeLabel="关闭冲印预览"
      onClose={() => s.closeModal()}
      footer={
        <PhotoSelectionActions
          hasPhoto
          disabled={s.processing || (s.store.busy && !s.cropJob)}
          selectDisabled={busy}
          nextEnabled={!!s.cropJob || (!s.disabled && (s.previewTab === "crop" || s.cropReady))}
          replaceLabel="换一张"
          nextLabel="满意，去确认订单"
          onSelect={() => s.openAlbum()}
          onNext={() => s.confirm()}
        />
      }
    >
      <SegmentedControl
        label="冲印预览方式"
        options={sections}
        value={s.previewTab}
        disabled={busy}
        onChange={(section) => s.showPreviewTab(section)}
      />
      {s.previewTab === "crop" ? (
        <FixedPhotoCrop
          key={s.cropSource.id}
          photo={s.cropSource}
          src={s.cropSourceURL}
          value={s.crop}
          disabled={s.disabled}
          onChange={(value) => s.setCrop(value)}
        />
      ) : (
        <>
          <div className="print-preview-stage">
            {s.cropReady && <PrintSheetArtwork studio={s} layout={s.layout.id} />}
            {busy && (
              <div className={s.cropReady ? "sr-only" : "print-preview-loading"} role="status">
                {!s.cropReady && <span aria-hidden="true" />}
                <p>正在生成冲印预览…</p>
              </div>
            )}
            {!busy && error && (
              <div className="print-preview-error">
                <p role="alert">{error}</p>
                <button type="button" className="tool-secondary" onClick={() => s.preparePrintPreview()}>
                  重试
                </button>
              </div>
            )}
          </div>
          <div className="keepsake-preview-micro keepsake-preview-templates" role="group" aria-label="冲印版式">
            {s.layouts.map((layout) => (
              <button
                key={layout.id}
                type="button"
                aria-pressed={layout.id === s.layout.id}
                disabled={s.disabled}
                onClick={() => s.selectLayout(layout.id)}
              >
                {layout.description}
              </button>
            ))}
          </div>
        </>
      )}
      {s.previewTab === "crop" && error && !busy && <p className="print-preview-error" role="alert">{error}</p>}
    </SharedSheet>
  );
}
