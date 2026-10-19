import React, { useLayoutEffect, useRef } from "react";
import { LiquidTabIndicator } from "../domain/liquid-tabs.js";
import { CollectionIcon } from "./CollectionHome.jsx";
const sections = [
  { id: "home", label: "专项列表", icon: "nav-home" },
  { id: "records", label: "采集记录", icon: "document" },
  { id: "services", label: "服务中心", icon: "nav-service" },
];
export default function CollectionNavigation({ scope: s }) {
  const menu = useRef(null),
    indicator = useRef(null);
  const pendingCount = s.actionableRecords.length;
  const visible = s.page === "collection" && s.isSection && !s.panel;
  useLayoutEffect(() => {
    if (!visible || !menu.current) return;
    indicator.current = new LiquidTabIndicator(
      menu.current,
      () => s.view,
      sections.map((t) => t.id),
    );
    indicator.current.sync(true);
    return () => {
      indicator.current?.destroy();
      indicator.current = null;
    };
  }, [visible, s, pendingCount]);
  useLayoutEffect(() => {
    indicator.current?.sync();
  }, [s.view]);
  if (!visible) return null;
  return (
    <nav className="collection-floating-nav" aria-label="专项采集导航">
      <div className="collection-tab-container">
        <div className="tab-menu" ref={menu}>
          {sections.map((t) => (
            <button
              key={t.id}
              className={"tab" + (s.view === t.id ? " active" : "")}
              aria-current={s.view === t.id ? "page" : undefined}
              onClick={() => s.switchSection(t.id)}
            >
              <span className="collection-nav-icon">
                <CollectionIcon name={t.icon} />
                {t.id === "records" && pendingCount > 0 && (
                  <small
                    className="collection-record-badge"
                    aria-label={pendingCount + " 条采集记录待处理"}
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </small>
                )}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <button
        className="scan-tab"
        onClick={() => s.openCamera("scan")}
        aria-label="打开扫码"
      >
        <svg aria-hidden="true">
          <use href="#i-scan" />
        </svg>
        <span>扫码</span>
      </button>
    </nav>
  );
}
