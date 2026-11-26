import React, { useCallback, useLayoutEffect, useRef } from "react";
import CollectionRecordCard from "./CollectionRecordCard.jsx";
import CollectionHeader from "./CollectionHeader.jsx";
import ToolNavigation from "./ToolNavigation.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";

const filters = [
  { id: "all", name: "全部" },
  { id: "ongoing", name: "进行中" },
  { id: "complete", name: "已完成" },
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
  }, [s, s.view, s.scrollKey, s.account.session?.phone]);
  if (s.view !== "records") return null;
  const currentCategory = s.recordCategory || s.category;
  const filteredEmpty = s.recordFilter !== "all" && s.recordsInCategory(currentCategory).length > 0;
  const categoryActions = { graduate: "前往毕业生采集", enrollment: "前往新生采集", association: "查看合作机构" };
  function selectFilter(id) {
    if (!s.selectRecordFilter(id)) return;
    if (list.current) list.current.scrollTop = 0;
    s.sectionScroll[s.scrollKey] = 0;
  }
  const progressFilters = (
    <div className={"collection-record-filters" + (s.scopedRecords ? " collection-record-filters--tabs" : "")}
      role="group" aria-label="采集进度">
      {filters.map(({ id, name }) => (
        <button key={id} type="button" className={s.recordFilter === id ? "is-selected" : ""}
          aria-pressed={s.recordFilter === id}
          onClick={() => selectFilter(id)}>
          {name}
        </button>
      ))}
    </div>
  );
  return (
    <>
      {s.scopedRecords ? (
        <div className="collection-records-masthead">
          <ToolNavigation title={s.recordListTitle} onBack={() => s.back()} />
          {s.account.session && progressFilters}
        </div>
      ) : (
        <CollectionHeader
          compact={s.scopedRecords}
          title={s.recordListTitle}
          subtitle="进度追踪 · 照片归档"
          image="assets/collection-icon-records.webp"
          onBack={() => (s.scopedRecords ? s.back() : s.exitCollection())}
        />
      )}
      <div className={"collection-inner collection-records-inner" + (s.scopedRecords ? "" : " collection-section-container")}>
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
            {!s.scopedRecords && (
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
                      s.sectionScroll[s.scrollKey] = 0;
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
            )}
            {!s.scopedRecords && progressFilters}
            <div
              className="collection-record-list"
              ref={attachList}
              tabIndex={0}
              aria-label="采集记录列表"
            >
              {s.recordsStore.error ? (
                <div className="collection-service-empty" role="alert">
                  <p>采集记录读取失败，请重试。</p>
                  <button
                    className="account-text"
                    onClick={() => s.recordsStore.load()}
                  >
                    重新读取
                  </button>
                </div>
              ) : !s.recordsStore.ready ? (
                <p className="collection-service-empty" role="status">
                  正在读取采集记录…
                </p>
              ) : null}
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
                    <p>{filteredEmpty ? "当前筛选下暂无记录" : "还没有这类采集记录"}</p>
                    <button type="button" className="account-text"
                      onClick={() => {
                        if (filteredEmpty) {
                          selectFilter("all");
                          s.$nextTick(() => list.current?.closest(".collection-page")?.querySelector('.collection-record-filters button[aria-pressed="true"]')?.focus({ preventScroll: true }));
                        } else if (s.scopedRecords) s.returnFromRecords(true);
                        else s.route("home");
                      }}>
                      {filteredEmpty ? "查看全部" : categoryActions[currentCategory] || "返回采集首页"}
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
