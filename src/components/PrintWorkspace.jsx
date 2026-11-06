import React from "react";
import ToolWorkspacePlaceholder from "./ToolWorkspacePlaceholder.jsx";
import PhotoSelectionPreview from "./PhotoSelectionPreview.jsx";
import PhotoSelectionActions from "./PhotoSelectionActions.jsx";

export default function PrintWorkspace({ studio: s }) {
  const photo = s.draft.photo;
  return (
    <div className="print-screen">
      <div className="print-body print-direct-workspace" tabIndex={-1}>
        {photo ? (
          <PhotoSelectionPreview photo={photo} src={s.photoURL} />
        ) : (
          <ToolWorkspacePlaceholder
            disabled={s.disabled}
            onSelect={() => s.openAlbum()}
          />
        )}
        <section
          className="tool-settings print-workspace-layouts"
          aria-label="冲印排版"
        >
          <h2>选择排版</h2>
          <div className="print-workspace-options">
            {s.layouts.map((item) => (
              <div
                key={item.id}
                className="print-workspace-option"
                data-selected={s.draft.layout === item.id}
              >
                <button
                  type="button"
                  className="print-workspace-select"
                  aria-pressed={s.draft.layout === item.id}
                  aria-label={"选择" + item.description}
                  disabled={s.disabled}
                  onClick={() => s.selectLayout(item.id)}
                >
                  <span
                    className="print-workspace-sheet"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{
                      __html: s.workspaceSheet(item.id),
                    }}
                  />
                  <strong>{item.description}</strong>
                </button>
                <button
                  type="button"
                  className="print-workspace-preview"
                  aria-haspopup="dialog"
                  aria-label={"预览" + item.description + "排版"}
                  disabled={s.disabled}
                  onClick={() => s.openLayoutPreview(item.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="5.5" />
                    <path d="m15 15 5 5" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {s.layoutsLoading && <p role="status">正在准备本次排版…</p>}
          {s.layoutError && (
            <div role="alert">
              <p>{s.layoutError}</p>
              <button
                type="button"
                className="tool-secondary"
                onClick={() => s.loadLayouts(true)}
              >
                重新获取排版
              </button>
            </div>
          )}
        </section>
        <div className="print-workspace-product">
          <p>背胶模切 · 固定1版 · 不支持加印</p>
          <p>冲印 ¥19.80 ＋ 运费 ¥10.00</p>
        </div>
      </div>
      <footer className="print-footer photo-selection-footer">
        <PhotoSelectionActions
          hasPhoto={!!photo?.blob}
          disabled={s.disabled}
          nextEnabled={
            !!photo && !!s.selectedLayout && !s.layoutError && !s.disabled
          }
          nextLabel="确认排版"
          onSelect={() => s.openAlbum()}
          onNext={() => s.confirm()}
        />
      </footer>
    </div>
  );
}
