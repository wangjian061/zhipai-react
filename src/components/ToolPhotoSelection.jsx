import React from "react";
import "../styles/photo-selection.css";

export default function ToolPhotoSelection({
  library,
  selectedId,
  multiSelection,
  mascot,
  busy,
  error,
  forMember = false,
  activity,
  titleId,
  title = forMember ? "添加照片" : "选择照片",
  onClose,
  onPhone,
  phoneTriggerRef,
  onCreate,
  onSelect,
  onConfirm,
}) {
  const photos = library.finished || [];
  const selected = photos.find((p) => p.id === selectedId && p.blob);
  const selectionCount = multiSelection?.selectedIds.length ?? Number(!!selected);
  const albumVisible = !multiSelection?.onLogin;
  return (
    <div className="tool-photo-selection">
      <header className="ui-sheet-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          aria-label={"关闭" + title}
          disabled={busy}
          onClick={onClose}
        >
          <svg aria-hidden="true">
            <use href="#i-close" />
          </svg>
        </button>
      </header>
      <div className="photo-selection-controls">
        <div className="photo-selection-sources">
          <button type="button" ref={phoneTriggerRef} disabled={busy} onClick={onPhone}>
            <svg aria-hidden="true">
              <use href="#i-album" />
            </svg>
            <span>手机相册</span>
          </button>
          {onCreate && (
            <button
              type="button"
              disabled={busy || (!forMember && !library.ready)}
              onClick={onCreate}
            >
              <svg aria-hidden="true">
                <use href="#i-camera" />
              </svg>
              <span>{forMember ? "为成员拍照" : "制作一张"}</span>
            </button>
          )}
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
        {!albumVisible && (
          <div className="photo-selection-library-empty">
            <button type="button" className="ui-button-secondary" onClick={multiSelection.onLogin}>登录查看知拍相册</button>
          </div>
        )}
        {albumVisible && !library.ready && !library.error && (
          <div className="photo-selection-loading" role="status">
            正在读取照片…
          </div>
        )}
        {albumVisible && library.error && (
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
        {albumVisible && library.ready && !library.error && !photos.length && (
          <div className="photo-selection-library-empty">
            <img src={mascot} width="96" height="96" alt="" />
            <strong>知拍相册暂无照片</strong>
            <p>
              {forMember
                ? onCreate
                  ? "可从手机相册添加，或为成员拍照。"
                  : "可从手机相册添加照片。"
                : multiSelection ? "可从手机相册添加照片。" : "可从手机相册选取，或制作一张新照片。"}
            </p>
          </div>
        )}
        {albumVisible && !!photos.length && (
          <div
            className="photo-selection-grid"
            role="group"
            aria-label={multiSelection ? "知拍相册照片，多选" : "知拍相册照片，单选"}
          >
            {photos.map((photo) => {
              const chosen = multiSelection ? multiSelection.selectedIds.includes(photo.id) : photo.id === selectedId;
              const added = multiSelection?.addedIds.has(photo.id);
              return <button
                type="button"
                key={photo.id}
                className={chosen ? "selected" : ""}
                aria-pressed={chosen}
                aria-label={"选择" + photo.name}
                disabled={busy || library.busy || !photo.blob || added}
                onClick={() => onSelect(photo.id)}
              >
                <span className="photo-selection-thumbnail">
                  <img
                    src={library.url(photo.id) || undefined}
                    alt={photo.name}
                    loading="lazy"
                  />
                  {chosen && (
                    <span className="photo-selection-check">
                      <svg aria-hidden="true">
                        <use href="#i-check" />
                      </svg>
                    </span>
                  )}
                </span>
                <small>
                  {added ? "已添加" : photo.spec || `${photo.width} × ${photo.height} px`}
                </small>
              </button>;
            })}
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
          disabled={busy || library.busy || !library.ready || !selectionCount}
          onClick={onConfirm}
        >
          {activity ? (
            <span role="status">{activity}</span>
          ) : multiSelection ? (
            selectionCount ? `添加 ${selectionCount} 张照片` : "添加所选照片"
          ) : forMember ? (
            "添加到此相册"
          ) : (
            "使用这张照片"
          )}
        </button>
      </footer>
    </div>
  );
}
