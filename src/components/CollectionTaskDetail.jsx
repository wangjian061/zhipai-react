import React from "react";
import PhotoProcessingEffect, {
  PhotoProcessingStatus,
} from "./PhotoProcessingEffect.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";
import CollectionStatusArtwork from "./CollectionStatusArtwork.jsx";
import { canEditCollectionPhoto } from "../domain/collection-status.js";
import { buildCollectionTaskInformation } from "../domain/collection-task-information.js";

export function CollectionTaskHeader({ scope: s }) {
  if (!s.isRecordView) return null;
  return (
    <header className="collection-task-nav" inert={!!s.panel}>
      <button
        type="button"
        className="collection-task-back"
        disabled={s.busy}
        aria-label="返回"
        onClick={() => s.back()}
      >
        <CollectionIcon name="chevron-left" />
      </button>
      <button
        type="button"
        className="collection-task-support"
        disabled={s.disabled || !s.current}
        onClick={() => s.openTaskSupport()}
      >
        <CollectionIcon name="nav-service" />
        客服
      </button>
    </header>
  );
}

function PortraitGuide() {
  return (
    <figure className="collection-task-guide">
      <img
        src="assets/print-portrait.png"
        alt="白色背景、正面端正的一寸证件照拍摄参考"
      />
      <figcaption>拍摄参考</figcaption>
    </figure>
  );
}

export default function CollectionTaskDetail({ scope: s }) {
  const record = s.current;
  if (!["detail", "complete"].includes(s.view) || !record) return null;
  const copy = s.status;
  const status = s.statusKey;
  const error = s.error || s.recordsStore.error;
  const information = buildCollectionTaskInformation(record, s.project);
  return (
    <div className="collection-task-detail" data-status={status}>
      <section
        className="collection-task-status"
        aria-labelledby="collection-task-heading"
      >
        <div className="collection-task-status-row">
          <CollectionStatusArtwork status={status} />
          <div className="collection-task-status-copy">
            <h1 id="collection-task-heading">{copy.label}</h1>
            <p>
              {status === "rejected" && !s.canViewReviewReason
                ? "请核对项目要求后重新拍摄"
                : copy.hint}
            </p>
          </div>
        </div>
        {s.canViewReviewReason && (
          <button
            type="button"
            className="collection-task-review-link"
            disabled={s.disabled}
            onClick={() => s.openReviewReason()}
          >
            {s.failureReasonLabel}
            <CollectionIcon name="chevron" />
          </button>
        )}
      </section>
      <div className="collection-task-content">
        <section className="collection-task-visual" aria-label="本次采集照片">
          {s.photoSrc ? (
            <>
              <figure className="collection-task-photo">
                <img
                  src={s.photoSrc}
                  alt={
                    record.name ? record.name + "的采集照片" : "本次采集照片"
                  }
                />
                <PhotoProcessingEffect
                  active={status === "processing"}
                  imageSrc={s.photoSrc}
                />
              </figure>
              <PhotoProcessingStatus
                label={status === "processing" ? "正在制作证件照" : ""}
              />
            </>
          ) : status === "pending" ? (
            <PortraitGuide />
          ) : status === "processing" ? (
            <div className="collection-task-processing" role="status">
              <span>制作完成后，照片将在此展示</span>
            </div>
          ) : (
            <div className="collection-task-missing" role="status">
              <CollectionIcon name="album" />
              <span>照片暂不可预览</span>
              <button
                type="button"
                disabled={s.disabled}
                onClick={() => s.recordsStore.load()}
              >
                重新读取照片
              </button>
            </div>
          )}
          {status === "draft" && s.canCollect && (
            <button
              type="button"
              className="collection-task-retake"
              disabled={s.disabled}
              onClick={() => s.capture()}
            >
              <CollectionIcon name="camera" />
              重新拍摄
            </button>
          )}
          {canEditCollectionPhoto(record.status) && !s.canCollect && (
            <p className="collection-task-project-limit">
              {s.projectState.message}
            </p>
          )}
          {error && !s.panel && (
            <div className="collection-task-error" role="alert">
              <p>{error}</p>
              {s.recordsStore.error && (
                <button
                  type="button"
                  disabled={s.disabled}
                  onClick={() => s.recordsStore.load()}
                >
                  重新读取
                </button>
              )}
            </div>
          )}
        </section>
        <dl className="collection-task-information" aria-label="本次采集信息">
          {information.map((row) => (
            <div key={row.key}>
              <dt>{row.label}</dt>
              <dd>
                {row.key === "customer" ? (
                  <strong>{row.value}</strong>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function CollectionTaskFooter({ scope: s }) {
  const record = s.current;
  if (!["detail", "complete"].includes(s.view) || !record) return null;
  const status = s.statusKey;
  const requiresCollection = canEditCollectionPhoto(record.status);
  return (
    <footer className="collection-task-footer" inert={!!s.panel}>
      <button
        type="button"
        className="collection-primary"
        disabled={
          s.disabled ||
          (requiresCollection && !s.canCollect) ||
          (status === "draft" && !record.photo?.blob) ||
          (record.fixture && !["reviewing", "processing"].includes(status))
        }
        onClick={() => s.primary()}
      >
        <CollectionIcon name={s.status.icon} />
        {s.primaryLabel}
      </button>
    </footer>
  );
}
