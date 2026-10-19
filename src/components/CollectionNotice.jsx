import React from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
export default function CollectionNotice({ scope: s }) {
  if (!s.notice) return null;
  return (
    <div
      className={"collection-top-notice " + s.noticeSeverity}
      role={s.noticeSeverity === "info" ? "status" : "alert"}
    >
      <CollectionIcon name="notification" />
      <span>{s.notice}</span>
      <button onClick={() => s.dismissNotice()} aria-label="关闭通知">
        ×
      </button>
    </div>
  );
}
