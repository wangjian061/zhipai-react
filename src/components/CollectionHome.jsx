import React from "react";
import CollectionHeader from "./CollectionHeader.jsx";
import CollectionProjectRows from "./CollectionProjectRows.jsx";
export function CollectionIcon({ name, ...props }) {
  return (
    <svg aria-hidden="true" {...props}>
      <use href={"#i-" + name} />
    </svg>
  );
}
export function CollectionSearch({ scope: s }) {
  return (
    <div role="search">
      <button className="collection-search collection-search-entry" type="button"
        ref={node => { s.$refs.projectSearchEntry = node; }}
        aria-label={s.view === "projects" ? "搜索" + s.categoryInfo.name + "项目" : "搜索全部采集项目"}
        onClick={() => s.enterProjectSearch()}>
        <CollectionIcon name="search" /><span>搜索项目或机构</span><strong>搜索</strong>
      </button>
    </div>
  );
}
export default function CollectionHome({ scope: s }) {
  if (s.view !== "home") return null;
  return (
    <div className="collection-section collection-list-home">
      <CollectionHeader
        title="专项采集服务"
        subtitle="官方合作 · 安全合规 · 一键完成"
        image="assets/collection-header-cards.webp"
        onBack={() => s.exitCollection()}
      />
      <div className="collection-home-inner">
        <CollectionSearch scope={s} />
        <div className="collection-shortcuts" aria-label="采集分类与通知">
          <div className="collection-category-group">
            {s.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={
                  "collection-category-entry " +
                  c.id +
                  (!s.entryEnabled(c.id) ? " is-closed" : "")
                }
                aria-disabled={!s.entryEnabled(c.id)}
                onClick={() => s.openCategory(c.id)}
              >
                <img
                  className="collection-shortcut-art"
                  src={c.iconImage}
                  width="42"
                  height="42"
                  alt=""
                />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
          <button
            className={
              "collection-notification-entry" +
              (!s.entryEnabled("notifications") ? " is-closed" : "")
            }
            type="button"
            aria-label="进入通知中心"
            aria-disabled={!s.entryEnabled("notifications")}
            onClick={() => s.openNotifications()}
          >
            <img
              className="collection-shortcut-art"
              src="assets/collection-icon-notification.webp"
              width="42"
              height="42"
              alt=""
            />
            <span>通知</span>
            {s.notifications.some((item) => item.read === false) && <i aria-label="有未读通知" />}
          </button>
        </div>
        <div className="collection-list-heading">
          <h2>热门项目</h2>
        </div>
        <CollectionProjectRows scope={s} />
      </div>
    </div>
  );
}
