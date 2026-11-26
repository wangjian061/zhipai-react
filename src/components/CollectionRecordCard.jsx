import React, { useEffect, useState } from "react";

const recordDateFormat = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function recordDate(timestamp) {
  if (timestamp == null || timestamp === "") return "未记录";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "未记录";
  return recordDateFormat.formatToParts(date).filter(part => part.type !== "literal").map(part => part.value).join(".");
}

function RecordPortrait({ record }) {
  const blob = record.photo?.blob;
  const [preview, setPreview] = useState(null);
  const [failedURL, setFailedURL] = useState("");
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
    <span className="collection-record-portrait">
      {visible ? (
        <img
          src={src}
          alt={record.name ? `${record.name}的采集照片` : "采集照片"}
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
  const project = s.projects.find((p) => p.id === record.projectId);
  const status = s.statusFor(record.status);
  const statusKey = s.statusKeyFor(record.status);
  const projectName = project?.name || "专项采集";
  const organization = project?.organization || "未记录";
  const date = recordDate(record.createdAt);
  const dateTime = date === "未记录" ? undefined : date.replaceAll(".", "-");
  return (
    <button
      type="button"
      className="collection-record-card has-portrait is-record-list-item"
      data-status={statusKey}
      data-record-id={record.id}
      data-status-tone={status.tone}
      disabled={s.disabled}
      onClick={() => s.openRecord(record)}
    >
      <RecordPortrait key={record.id} record={record} />
      <span className="collection-record-content collection-record-content--list">
        <span className="collection-record-heading">
          <strong className="collection-record-title">{organization}</strong>
          <span className="collection-record-subtitle">
            <span className="collection-record-batch">{projectName}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={dateTime}>{date}</time>
          </span>
        </span>
        <span className="collection-record-outcome">
          <span className="collection-record-status">{status.label}</span>
          {status.tone === "red" && <span className="collection-record-action is-recovery">去修改</span>}
        </span>
      </span>
    </button>
  );
}
