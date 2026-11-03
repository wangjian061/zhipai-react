import React from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
export default function CollectionAnnouncement({ scope: s }) {
  if (s.view !== "announcement") return null;
  const n = s.sourceMessage;
  return (
    <div className="collection-announcement-page">
      <header className="collection-nav">
        <button type="button" aria-label="返回" onClick={() => s.back()}>
          <CollectionIcon name="chevron-left" />
        </button>
        <h1>通知详情</h1>
      </header>
      {n?.body ? (
        <>
          <article className="collection-announcement-content">
            <p className="collection-announcement-meta">
              {n.type === "project" ? "项目通知" : "系统通知"}
            </p>
            <h2>{n.title}</h2>
            <p className="collection-announcement-meta">
              {n.projectName || "知拍"} · {n.time}
            </p>
            {n.body.split("\n\n").map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </article>
          {n.projectId && (
            <footer className="collection-announcement-footer">
              <button
                className="collection-primary"
                onClick={() => s.openAnnouncementProject()}
              >
                查看项目
              </button>
            </footer>
          )}
        </>
      ) : (
        <div className="collection-empty" role="alert">
          <p>通知暂时无法查看，请返回通知中心重新读取。</p>
          <button className="account-text" onClick={() => s.back()}>
            返回通知中心
          </button>
        </div>
      )}
    </div>
  );
}
