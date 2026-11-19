import React from "react";

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="6" />
      <path d="m14.5 14.5 5 5M7 10h6M10 7v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.5 12.5 3.8 3.8L17.8 8.5" />
    </svg>
  );
}

const versionPresentation = {
  ordinary: {
    previewTag: "标准裁切",
    optionTag: "基础版",
    description: "按所选规格裁切，保留原片质感。",
    features: ["标准尺寸裁切", "按所选底色出片"],
  },
  retouched: {
    previewTag: "质感精修",
    optionTag: "精修版",
    description: "在标准出片基础上，微调亮度、对比度和色彩。",
    features: ["标准尺寸裁切", "自然提亮", "对比度微调", "色彩微调"],
  },
};

function canPreview(version) {
  return version.status === "ready" && !version.previewError;
}

function VersionPreview({ version, scope: s }) {
  const content = versionPresentation[version.id];
  const previewable = canPreview(version);
  return (
    <figure
      className="camera-version-preview"
      data-version={version.id}
      data-ready={previewable}
    >
      <div
        className="camera-version-photo"
        style={{
          aspectRatio: `${s.draft.outputWidth} / ${s.draft.outputHeight}`,
        }}
      >
        {previewable ? (
          <>
            <img
              src={version.url || undefined}
              alt={version.name + "制作成片"}
              draggable="false"
              onError={() => s.setVersionPreviewError(version.id, true)}
            />
            {!s.unlocked && (
              <>
                <span className="camera-version-preview-tag">
                  {content.previewTag}
                </span>
                <span
                  className="camera-version-watermark"
                  aria-label="预览水印"
                >
                  知拍证件照
                </span>
              </>
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
      </div>
      {s.unlocked && (
        <figcaption className="camera-version-caption">
          <strong>{version.name}</strong>
          <span className="camera-version-status">已解锁</span>
        </figcaption>
      )}
    </figure>
  );
}

export default function CameraResultVersions({ scope: s }) {
  const group = React.useId();
  const paid = s.unlocked;
  const versions = s.resultVersions.filter(
    (version) => !paid || version.selected,
  );
  const options = [...versions].reverse();
  const showOptions = !paid || versions.some((version) => !canPreview(version));
  return (
    <>
      <section className="camera-version-previews" aria-label="成片预览">
        <div className="camera-result-specs">
          <span>
            <i
              style={{ backgroundColor: s.draft?.background }}
              aria-hidden="true"
            />
            {s.spec.name} · {s.spec.mm}
          </span>
          <span>{s.backgroundLabel}</span>
          {s.draft?.outputWidth > 0 && s.draft.outputHeight > 0 && (
            <span>
              {s.draft.outputWidth} × {s.draft.outputHeight} px
            </span>
          )}
        </div>
        <div className="camera-version-preview-grid">
          {versions.map((version) => (
            <VersionPreview key={version.id} version={version} scope={s} />
          ))}
        </div>
        <button
          type="button"
          className="camera-compare-entry"
          disabled={s.busy || !versions.some(canPreview)}
          onClick={(event) => s.openComparison(event.currentTarget)}
        >
          <span className="camera-compare-entry-label">
            <ZoomIcon />
            放大对比细节
          </span>
        </button>
      </section>
      {showOptions && (
        <fieldset className="camera-version-options" disabled={s.busy}>
          <legend className="sr-only">
            {paid ? "已解锁照片" : "选择一张要解锁的照片"}
          </legend>
          {options.map((version) => {
            const content = versionPresentation[version.id];
            const previewable = canPreview(version);
            const selectable = previewable && !paid && !s.versionLocked;
            const recommended =
              previewable && !paid && version.id === "retouched";
            const price =
              s.versionLocked && version.selected
                ? s.electronicPrice
                : version.price;
            const id = group + "-" + version.id;
            return (
              <article
                key={version.id}
                className="camera-version"
                data-version={version.id}
                data-selected={version.selected}
              >
                {!paid && (
                  <span className="camera-version-indicator" aria-hidden="true">
                    {version.selected && <CheckIcon />}
                  </span>
                )}
                <div className="camera-version-content">
                  <div className="camera-version-head">
                    <div className="camera-version-title">
                      <h3>{version.name}</h3>
                      {!paid && (
                        <span className="camera-version-pill">
                          {content.optionTag}
                        </span>
                      )}
                    </div>
                    {!paid && (
                      <p className="camera-version-price">
                        <span className="camera-price-currency">¥</span>
                        {price}
                      </p>
                    )}
                  </div>
                  {!paid && (
                    <p
                      className="camera-version-description"
                      id={id + "-description"}
                    >
                      {content.description}
                    </p>
                  )}
                  {!paid && previewable && (
                    <ul className="camera-version-features">
                      {content.features.map((feature) => (
                        <li key={feature}>
                          <CheckIcon />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!previewable &&
                    (version.previewError ? (
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
                    ))}
                </div>
                {recommended && (
                  <span
                    className="camera-version-ribbon"
                    id={id + "-recommendation"}
                  >
                    <span>98%人选择</span>
                  </span>
                )}
                {previewable && !paid && (
                  <input
                    id={id}
                    className="sr-only camera-version-radio"
                    type="radio"
                    name={group + "-camera-photo-version"}
                    value={version.id}
                    disabled={!selectable}
                    checked={version.selected}
                    onChange={() => s.selectVersion(version.id)}
                    aria-label={version.name + "，" + price + "元"}
                    aria-describedby={
                      id +
                      "-description" +
                      (recommended ? " " + id + "-recommendation" : "")
                    }
                  />
                )}
                {selectable && (
                  <label className="camera-version-hit" htmlFor={id}>
                    <span className="sr-only">选择{version.name}</span>
                  </label>
                )}
              </article>
            );
          })}
        </fieldset>
      )}
    </>
  );
}
