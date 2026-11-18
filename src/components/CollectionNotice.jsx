import React from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
import { FeedbackToast } from "./Feedback.jsx";
export default function CollectionNotice({ scope: s }) {
  if (!s.notice) return null;
  if (s.noticeSeverity === "info" && s.noticeCloseMode === "auto")
    return <FeedbackToast message={!s.panel && s.notice} />;
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
