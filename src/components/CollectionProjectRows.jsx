import React, { useLayoutEffect, useRef, useCallback } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
const projectCredentials = {
  graduate: "凭学信网采集码办理",
  enrollment: "凭身份证或学号核验",
  association: "凭姓名与工号核验",
};

export function CollectionProjectRow({ scope: s, project: p, onOpen }) {
  const state = s.projectStatus(p);
  const schoolSearch = s.projectCategory === "enrollment" && s.isProjectSearch;
  return (
    <button
      className="collection-project-row"
      type="button"
      data-project-id={p.id}
      onClick={() => (onOpen ? onOpen(p.id) : s.openProject(p.id))}
    >
      <span className={"collection-project-art " + p.type}>
        <img src={p.image} alt="" />
      </span>
      <div>
        <strong>{schoolSearch ? p.organization : p.name}</strong>
        <p>
          <CollectionIcon name="collection-org" />
          {schoolSearch ? p.name : p.organization}
        </p>
        <p className="collection-project-date">
          <CollectionIcon name="document" />
          {p.date}
        </p>
        {projectCredentials[p.type] && <p>{projectCredentials[p.type]}</p>}
        <span className={"collection-project-state " + state.tone}>
          {p.demoSchedule ? "演示 · " : ""}{state.label}
        </span>
      </div>
      <CollectionIcon name="chevron" />
    </button>
  );
}
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
      {s.projectsShown.map((p) => (
        <CollectionProjectRow key={p.id} scope={s} project={p} />
      ))}
      {!s.projectsShown.length && (
        <div className="collection-empty">
          <CollectionIcon name="search" />
          <p>{home ? "暂无热门项目" : s.projectFilter === "open" ? "本类暂无可采集项目" : "未找到匹配的采集项目"}</p>
          {!home && s.projectFilter === "open" && (
            <button type="button" className="ui-button-text" onClick={() => s.setProjectFilter("all")}>
              查看全部项目
            </button>
          )}
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
