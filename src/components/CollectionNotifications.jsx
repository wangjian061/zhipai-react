import React, { useRef, useLayoutEffect, useCallback } from "react";
import CollectionHeader from "./CollectionHeader.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";
const filters = [
  { id: "all", label: "全部" },
  { id: "system", label: "系统" },
  { id: "project", label: "项目" },
  { id: "collection", label: "采集" },
];
export default function CollectionNotifications({ scope: s }) {
  const list = useRef(null);
  const attach = useCallback(
    (element) => {
      list.current = element;
      s.$refs.collectionMessageList = element;
    },
    [s],
  );
  useLayoutEffect(() => {
    if (list.current)
      list.current.scrollTop = s.sectionScroll.notifications || 0;
  }, [s, s.view]);
  if (s.view !== "notifications") return null;
  return (
    <div className="collection-section collection-notifications-page">
      <CollectionHeader
        title="通知中心"
        subtitle="项目动态 · 采集进度"
        image="assets/collection-icon-notification.webp"
        onBack={() => s.back()}
      />
      <div className="collection-home-inner">
        <nav className="collection-message-tabs" aria-label="通知类型">
          {filters.map((f) => (
            <button
              key={f.id}
              aria-pressed={s.notificationFilter === f.id}
              className={s.notificationFilter === f.id ? "selected" : ""}
              onClick={() => {
                s.notificationFilter = f.id;
              }}
            >
              {f.label}
            </button>
          ))}
        </nav>
        <div className="collection-message-scroll" ref={attach}>
          {s.notificationsShown.map((n) => (
            <button
              className={"collection-message-card " + (n.status || n.type)}
              data-status-tone={
                n.type === "collection"
                  ? s.statusFor(n.record.status).tone
                  : undefined
              }
              key={n.type + n.id}
              onClick={() => s.openNotification(n)}
            >
              <span className="collection-notification-mark">
                <CollectionIcon
                  name={n.type === "collection" ? "document" : "notification"}
                />
              </span>
              <span className="collection-notification-copy">
                <span className="collection-notification-title">
                  <strong>{n.title}</strong>
                  <time>{n.time}</time>
                </span>
                <span className="collection-notification-project">
                  {n.projectName ||
                    (n.type === "system" ? "系统通知" : "项目通知")}
                </span>
                <span className="collection-notification-description">
                  {n.text}
                </span>
              </span>
              {(n.record || n.projectId) && <CollectionIcon name="chevron" />}
            </button>
          ))}
          {!s.notificationsShown.length && (
            <div className="collection-empty">
              <CollectionIcon name="notification" />
              <p>暂无通知</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
