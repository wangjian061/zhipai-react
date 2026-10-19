import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

function recordDate(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "未记录"
    : date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
}

function RecordPortrait({ record, contentHeight }) {
  const blob = record.photo?.blob;
  const [preview, setPreview] = useState(null);
  const [failedURL, setFailedURL] = useState("");
  const [naturalRatio, setNaturalRatio] = useState(null);
  const ratio =
    naturalRatio ||
    (record.photo?.width > 0 && record.photo?.height > 0
      ? record.photo.width / record.photo.height
      : 60 / 84);
  useEffect(() => {
    if (!(blob instanceof Blob)) return;
    const url = URL.createObjectURL(blob);
    setPreview({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  // Do not show a previous person's photo while the next URL is being prepared.
  const src = preview?.blob === blob ? preview?.url : "";
  const visible = src && src !== failedURL;
  return (
    <span
      className="collection-record-portrait"
      style={{ width: contentHeight ? contentHeight * ratio : 82 }}
    >
      {visible ? (
        <img
          src={src}
          alt={record.name ? `${record.name}的采集照片` : "采集照片"}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalHeight)
              setNaturalRatio(image.naturalWidth / image.naturalHeight);
          }}
          onError={() => setFailedURL(src)}
        />
      ) : (
        <svg viewBox="0 0 60 84" role="img" aria-label="暂无采集照片">
          <circle cx="30" cy="29" r="10" fill="currentColor" />
          <path
            d="M12 65v-7c0-10 8-17 18-17s18 7 18 17v7Z"
            fill="currentColor"
          />
        </svg>
      )}
    </span>
  );
}

export default function CollectionRecordCard({ scope: s, record }) {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(([entry]) =>
      setContentHeight(entry.contentRect.height),
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  const project = s.projects.find((p) => p.id === record.projectId);
  const status = s.statusFor(record.status);
  return (
    <button
      type="button"
      className="collection-record-card has-portrait"
      data-status={s.statusKeyFor(record.status)}
      data-status-tone={status.tone}
      disabled={s.disabled}
      onClick={() => s.openRecord(record)}
    >
      <RecordPortrait
        key={record.id}
        record={record}
        contentHeight={contentHeight}
      />
      <span className="collection-record-content" ref={contentRef}>
        <span className="collection-record-title-row">
          <strong className="collection-record-title">
            {project?.name || "专项采集"}
          </strong>
          <span className={"collection-chip " + status.tone}>
            {status.label}
          </span>
        </span>
        <span className="collection-record-metadata">
          <span>采集机构</span>
          <span>{project?.organization || "未记录"}</span>
        </span>
        <span className="collection-record-metadata">
          <span>采集日期</span>
          <time>{recordDate(record.createdAt)}</time>
        </span>
      </span>
    </button>
  );
}
