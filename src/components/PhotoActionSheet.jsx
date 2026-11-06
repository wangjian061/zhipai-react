import React from "react";
import { useArchiveZoom, ArchiveZoom } from "./ArchiveZoom.jsx";
import SharedSheet from "./SharedSheet.jsx";
import PhotoOperations from "./PhotoOperations.jsx";
import PhotoDeleteDialog from "./PhotoDeleteDialog.jsx";
import { photoFacts } from "../domain/photo-actions.js";
import { openKeepsake } from "../domain/keepsakes.js";
export default function PhotoActionSheet({ scope, album = null, archive = null, returnFocusRef }) {
  const s = album || archive || scope.$store.photoActions,
    p = s.photo;
  const opened = album ? album.view === "detail" && !album.modal : s.opened;
  const zoom = useArchiveZoom(!album && opened ? "personal:" + p?.id : "");
  const url = p && (album ? album.store.url(p.id) : s.url(p));
  if (!album && opened && zoom.side && url)
    return (
      <ArchiveZoom onClose={zoom.close}>
        <img src={url} alt={p.name} />
      </ArchiveZoom>
    );
  if (!album && !archive && opened && s.deleting)
    return <PhotoDeleteDialog description="删除后无法恢复，个人中心也将不再显示这张照片。"
      busy={s.working} error={s.notice} unavailable={!p || s.deleteDisabled}
      onClose={() => s.cancelDelete()} onDelete={() => s.confirmDelete()} />;
  return (
    <SharedSheet
      id={album ? "album-photo-title" : "personal-photo-title"}
      title="照片详情"
      opened={opened}
      onClose={() => (album ? album.closeDetail() : s.close())}
      busy={s.downloading}
      returnFocusRef={returnFocusRef}
      footer={
        <button
          type="button"
          className="tool-primary"
          disabled={!s.photoReadable || s.downloading}
          onClick={() => (album ? album.savePhotos(true) : s.download())}
        >
          {s.downloading ? "正在准备…" : "下载电子照片"}
        </button>
      }
    >
      {p ? (
        <>
          <div className="photo-action-summary">
            <button
              className="sheet-photo-preview"
              data-zoom-source="photo"
              type="button"
              disabled={!s.photoReadable}
              aria-haspopup="dialog"
              aria-label="点击放大查看"
              onClick={() => (album ? album.openPreview() : zoom.open())}
            >
              {p.blob ? (
                <img
                  key={s.photoRenderKey}
                  src={url || undefined}
                  alt="当前照片"
                  onError={() => s.failPhotoReadability(p.blob)}
                />
              ) : (
                <span>文件不可用</span>
              )}
            </button>
            <dl>
              {photoFacts(p).map(([l, v]) => (
                <div key={l}>
                  <dt>{l}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {s.photoReadStatus === "checking" && (
            <p role="status" className="keepsake-note">
              正在读取照片…
            </p>
          )}
          {s.photoReadStatus === "failed" && (
            <div className="keepsake-note" role="alert">
              <p>照片暂时无法读取，请重试。</p>
              <button
                type="button"
                className="tool-secondary"
                onClick={() => s.checkPhotoReadability()}
              >
                重新读取
              </button>
            </div>
          )}
          <h3 className="photo-action-heading">精选服务</h3>
          <PhotoOperations
            disabled={!s.photoReadable || s.downloading}
            onPrint={() => scope.openPrint(p, "finished", "album")}
            onTool={(action) => scope.openPhotoTool(action, p, "finished")}
            onKeepsake={(kind) => openKeepsake(kind, p)}
          />
          <button type="button" className="archive-delete-document" data-photo-delete
            disabled={s.downloading || s.working || s.disabled || s.deleteDisabled}
            onClick={event => album ? album.deleteCurrent() : s.requestDelete(event)}>
            删除照片
          </button>
        </>
      ) : album && !album.store.ready && !album.store.error ? (
        <p role="status">正在读取照片…</p>
      ) : (
        <p role="alert">
          {album?.store.error ||
            "照片已不存在或暂时无法读取，请返回相册重新选择。"}
        </p>
      )}
      {album?.message && <p role="alert">{album.message}</p>}
      {s.notice && (
        <p className="keepsake-note" role="status">
          {s.notice}
        </p>
      )}
    </SharedSheet>
  );
}
