import React from "react";

export default function CameraResultVersions({ scope: s }) {
  const paid = s.unlocked;
  const versions = s.resultVersions.filter(
    (version) => !paid || version.selected,
  );
  return (
    <section className="camera-version-section" aria-label="成片版本对比">
      <fieldset className="camera-version-grid" disabled={s.busy}>
        <legend className="sr-only">选择一张要解锁的照片</legend>
        {versions.map((version) => (
          <article
            key={version.id}
            className="camera-version"
            data-selected={version.selected}
          >
            <h3>{version.name}</h3>
            <figure
              className="camera-version-photo"
              style={{
                aspectRatio: `${s.draft.outputWidth} / ${s.draft.outputHeight}`,
              }}
            >
              {version.status === "ready" && !version.previewError ? (
                <>
                  <img
                    src={version.url || undefined}
                    alt={version.name + "制作成片"}
                    draggable="false"
                    onError={() => s.setVersionPreviewError(version.id, true)}
                  />
                  {!paid && (
                    <span
                      className="camera-version-watermark"
                      aria-label="预览水印"
                    >
                      知拍证件照
                    </span>
                  )}
                </>
              ) : (
                <div className="camera-version-placeholder">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <circle cx="12" cy="9" r="2.5" />
                    <path d="M7.5 18v-1a4.5 4.5 0 0 1 9 0v1" />
                  </svg>
                  <span>
                    {version.previewError ? "照片暂未显示" : "本版本未完成"}
                  </span>
                </div>
              )}
            </figure>
            <p className="camera-version-price">¥{version.price}</p>
            {version.status === "ready" && !version.previewError ? (
              <label className="camera-version-select">
                <input
                  type="radio"
                  name="camera-photo-version"
                  value={version.id}
                  disabled={s.versionLocked}
                  checked={version.selected}
                  onChange={() => s.selectVersion(version.id)}
                  aria-label={version.name + "，" + version.price + "元"}
                />
                <span>
                  {paid
                    ? "已解锁"
                    : version.selected
                      ? "已选择"
                      : "选择" + version.shortName}
                </span>
              </label>
            ) : version.previewError ? (
              <button
                className="camera-version-retry"
                type="button"
                onClick={() => s.reloadVersionPreview(version.id)}
              >
                重新加载
              </button>
            ) : (
              <>
                <p className="camera-version-reason" role="status">
                  {version.reason}
                </p>
                <button
                  className="camera-version-retry"
                  type="button"
                  disabled={s.versionLocked}
                  onClick={() => s.retryVersion(version.id)}
                >
                  重试{version.shortName}
                </button>
              </>
            )}
          </article>
        ))}
      </fieldset>
      <button
        type="button"
        className="camera-compare-entry"
        disabled={s.busy}
        onClick={() => s.openComparison()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10" cy="10" r="6" />
          <path d="m14.5 14.5 5 5M7 10h6M10 7v6" />
        </svg>
        放大对比
      </button>
    </section>
  );
}
