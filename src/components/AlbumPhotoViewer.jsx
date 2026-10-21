import React from "react";
import { View } from "../runtime/components.jsx";
import { visiblePhotoBounds } from "./photo-processing.js";
import "../styles/album-photo-viewer.css";

export default function AlbumPhotoViewer({ scope: s }) {
  if (s.page !== "album" || s.modal !== "preview") return null;
  const closeFromBlank = (event) => {
    const frame = event.currentTarget.getBoundingClientRect();
    const image = event.currentTarget.querySelector("img");
    const bounds =
      image &&
      visiblePhotoBounds({
        frame,
        image: image.getBoundingClientRect(),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
    const x = ((event.clientX - frame.left) / frame.width) * 100;
    const y = ((event.clientY - frame.top) / frame.height) * 100;
    if (
      !bounds ||
      x < bounds.left ||
      x > bounds.left + bounds.width ||
      y < bounds.top ||
      y > bounds.top + bounds.height
    )
      s.closeModal();
  };
  return (
    <View
      as="section"
      scope={s}
      refName="albumViewer"
      className="album-photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="照片大图"
      tabIndex={-1}
      onKeyDown={(event) => s.trapFocus(event)}
      onClick={(event) => {
        if (event.target === event.currentTarget) s.closeModal();
      }}
    >
      <div
        className="album-photo-viewer-toolbar"
        onClick={(event) => {
          if (event.target === event.currentTarget) s.closeModal();
        }}
      >
        <button
          type="button"
          className="album-photo-viewer-close"
          aria-label="关闭照片大图"
          disabled={s.previewClosing}
          onClick={() => s.closeModal()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="album-photo-viewer-stage" onClick={closeFromBlank}>
        {s.photo?.blob && !s.previewImageFailed ? (
          <img
            src={s.store.url(s.photo.id) || undefined}
            alt={s.photo.name}
            onError={() => {
              s.previewImageFailed = true;
            }}
          />
        ) : (
          <p className="album-photo-viewer-error" role="status">
            照片暂时无法显示
          </p>
        )}
      </div>
    </View>
  );
}
