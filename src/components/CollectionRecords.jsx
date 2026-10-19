import React, { useCallback, useLayoutEffect, useRef } from "react";
import CollectionRecordCard from "./CollectionRecordCard.jsx";
import CollectionHeader from "./CollectionHeader.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";

const filters = [
  { id: "ongoing", name: "采集中" },
  { id: "complete", name: "采集完成" },
];

export default function CollectionRecords({ scope: s }) {
  const list = useRef(null);
  const attachList = useCallback(
    (element) => {
      list.current = element;
      s.$refs.collectionRecordList = element;
    },
    [s],
  );
  useLayoutEffect(() => {
    if (list.current)
      list.current.scrollTop = s.sectionScroll[s.scrollKey] || 0;
  }, [s, s.view, s.account.session?.phone]);
  if (s.view !== "records") return null;
  return (
    <>
      <CollectionHeader
        title="采集记录"
        subtitle="进度追踪 · 照片归档"
        image="assets/collection-icon-records.webp"
        onBack={() => s.exitCollection()}
      />
      <div className="collection-inner collection-records-inner collection-section-container">
        {!s.account.session ? (
          <div className="collection-service-empty collection-login-card">
            <p>登录后查看本人的采集记录</p>
            <button
              className="account-text"
              onClick={() => s.loginForRecords()}
            >
              登录 / 注册
            </button>
          </div>
        ) : (
          <>
            <nav
              className="collection-record-statistics"
              aria-label="采集记录类型"
            >
              {s.recordStatistics.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    (s.category === item.id ? "is-selected " : "") +
                    (item.count === 0 ? "is-empty" : "")
                  }
                  aria-pressed={s.category === item.id}
                  aria-label={`${item.name}，${item.count}条记录`}
                  onClick={() => {
                    s.category = item.id;
                    if (list.current) list.current.scrollTop = 0;
                    s.sectionScroll.records = 0;
                  }}
                >
                  <span className="collection-stat-art" aria-hidden="true">
                    <img
                      src={
                        item.id === "all"
                          ? "assets/collection-icon-records.webp"
                          : s.categories.find(
                              (category) => category.id === item.id,
                            )?.iconImage
                      }
                      alt=""
                      width="38"
                      height="38"
                    />
                    <strong>{item.count}</strong>
                  </span>
                  <span className="collection-stat-label">{item.name}</span>
                </button>
              ))}
            </nav>
            <div
              className="collection-record-filters"
              role="group"
              aria-label="采集进度，可多选"
            >
              {filters.map((filter) => {
                const selected = s.recordFilterSelected(filter.id);
                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={selected ? "is-selected" : ""}
                    aria-pressed={selected}
                    aria-disabled={selected && s.recordFilter !== "all"}
                    onClick={() => {
                      s.toggleRecordFilter(filter.id);
                      if (list.current) list.current.scrollTop = 0;
                      s.sectionScroll.records = 0;
                    }}
                  >
                    <span
                      className="collection-filter-check"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 16 16">
                        <path d="m3.5 8 3 3 6-6" />
                      </svg>
                    </span>
                    {filter.name}
                  </button>
                );
              })}
            </div>
            <div
              className="collection-record-list"
              ref={attachList}
              tabIndex={0}
              aria-label="采集记录列表"
            >
              {s.filteredRecords.map((record) => (
                <CollectionRecordCard
                  key={record.id}
                  scope={s}
                  record={record}
                />
              ))}
              {s.recordsStore.ready &&
                !s.recordsStore.error &&
                !s.filteredRecords.length && (
                  <div className="collection-empty">
                    <CollectionIcon name="document" />
                    <p>还没有这类采集记录</p>
                    <button
                      className="account-text"
                      onClick={() => s.route("home")}
                    >
                      查看采集项目
                    </button>
                  </div>
                )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
