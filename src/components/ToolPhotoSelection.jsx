import React from "react";
import "../styles/photo-selection.css";

export default function ToolPhotoSelection({
  library,
  selectedId,
  mascot,
  busy,
  error,
  requiresPortrait = false,
  titleId,
  onClose,
  onPhone,
  onCreate,
  onSelect,
  onConfirm,
}) {
  const photos = library.finished || [];
  const selected = photos.find((p) => p.id === selectedId && p.blob);
  return (
    <div className="tool-photo-selection">
      <header className="ui-sheet-header">
        <h2 id={titleId}>选择照片</h2>
        <button
          type="button"
          aria-label="关闭选择照片"
          disabled={busy}
          onClick={onClose}
        >
          <svg aria-hidden="true">
            <use href="#i-close" />
          </svg>
        </button>
      </header>
      <div className="photo-selection-controls">
        <p className="photo-selection-description">
          {requiresPortrait
            ? "请选择一张单人正面证件照，选取后需通过照片检查。"
            : "每次仅选择一张照片，不限制照片内容。"}
        </p>
        <div className="photo-selection-sources">
          <button type="button" disabled={busy} onClick={onPhone}>
            <svg aria-hidden="true">
              <use href="#i-album" />
            </svg>
            <span>手机相册</span>
          </button>
          <button
            type="button"
            disabled={busy || !library.ready}
            onClick={onCreate}
          >
            <svg aria-hidden="true">
              <use href="#i-camera" />
            </svg>
            <span>制作一张</span>
          </button>
        </div>
        <div className="photo-selection-heading">
          <h3>知拍相册</h3>
          <span>{library.ready ? `${photos.length} 张` : ""}</span>
        </div>
      </div>
      <div
        className="ui-sheet-body photo-selection-list"
        role="region"
        aria-label="照片列表"
      >
        {!library.ready && !library.error && (
          <div className="photo-selection-loading" role="status">
            正在读取照片…
          </div>
        )}
        {library.error && (
          <div className="photo-selection-library-error" role="alert">
            <p>相册暂时无法读取，可重试或从手机相册选图。</p>
            <button
              type="button"
              disabled={busy || library.busy}
              onClick={() => library.load()}
            >
              重新读取
            </button>
          </div>
        )}
        {library.ready && !library.error && !photos.length && (
          <div className="photo-selection-library-empty">
            <img src={mascot} width="96" height="96" alt="" />
            <strong>知拍相册暂无照片</strong>
            <p>可从手机相册选取，或制作一张新照片。</p>
          </div>
        )}
        {!!photos.length && (
          <div
            className="photo-selection-grid"
            role="group"
            aria-label="知拍相册照片，单选"
          >
            {photos.map((photo) => (
              <button
                type="button"
                key={photo.id}
                className={photo.id === selectedId ? "selected" : ""}
                aria-pressed={photo.id === selectedId}
                aria-label={"选择" + photo.name}
                disabled={busy || library.busy || !photo.blob}
                onClick={() => onSelect(photo.id)}
              >
                <span className="photo-selection-thumbnail">
                  <img
                    src={library.url(photo.id) || undefined}
                    alt={photo.name}
                    loading="lazy"
                  />
                  {photo.id === selectedId && (
                    <span className="photo-selection-check">
                      <svg aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                  )}
                </span>
                <small>
                  {photo.spec || `${photo.width} × ${photo.height} px`}
                </small>
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="photo-selection-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="ui-sheet-footer">
        <button
          type="button"
          className="photo-selection-confirm"
          disabled={busy || library.busy || !library.ready || !selected}
          onClick={onConfirm}
        >
          使用这张照片
        </button>
      </footer>
    </div>
  );
}
