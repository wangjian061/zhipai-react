import React, { useLayoutEffect, useRef, useCallback } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
export default function CollectionProjectRows({ scope: s }) {
  const list = useRef(null);
  const home = s.view === "home";
  const attach = useCallback(
    (element) => {
      list.current = element;
      s.$refs[home ? "collectionProjectList" : "collectionCategoryList"] =
        element;
    },
    [s, home],
  );
  useLayoutEffect(() => {
    if (list.current)
      list.current.scrollTop = s.sectionScroll[s.scrollKey] || 0;
  }, [s, s.view, s.projectCategory, s.searchTerm]);
  return (
    <div
      className="collection-project-list"
      ref={attach}
      tabIndex={0}
      aria-label={s.view === "home" ? "热门项目列表" : "分类项目列表"}
    >
      {s.projectsShown.map((p) => {
        const state = s.projectStatus(p);
        return (
          <button
            key={p.id}
            className="collection-project-row"
            onClick={() => s.openProject(p.id)}
          >
            <span className={"collection-project-art " + p.type}>
              <img src={p.image} alt="" />
            </span>
            <div>
              <strong>{p.name}</strong>
              <p>
                <CollectionIcon name="collection-org" />
                {p.organization}
              </p>
              <p className="collection-project-date">
                <CollectionIcon name="document" />
                {p.date}
              </p>
              <span className={"collection-project-state " + state.tone}>
                {state.label}
              </span>
            </div>
            <CollectionIcon name="chevron" />
          </button>
        );
      })}
      {!s.projectsShown.length && (
        <div className="collection-empty">
          <CollectionIcon name="search" />
          <p>{s.view === "home" ? "暂无热门项目" : "未找到匹配的采集项目"}</p>
          {s.searchTerm && (
            <button className="account-text" onClick={() => s.clearSearch()}>
              清除搜索
            </button>
          )}
        </div>
      )}
    </div>
  );
}
