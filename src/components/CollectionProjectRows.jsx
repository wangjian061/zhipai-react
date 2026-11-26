import React, { useLayoutEffect, useRef, useCallback } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
const projectCredentials = {
  graduate: "凭学信网采集码办理",
  enrollment: "凭身份证或学号核验",
  association: "凭姓名与工号核验",
};

function ProjectArt({ project }) {
  return (
    <span className={"collection-project-art " + project.type}>
      <img src={project.image} alt="" />
    </span>
  );
}

function compactDirectoryDate(date) {
  const dotted = date.trim().replaceAll("-", ".");
  const range = dotted.match(/^(\d{4}\.\d{2}\.\d{2})\s*至\s*(\d{4}\.\d{2}\.\d{2})$/);
  if (!range) return date;
  const [, start, end] = range;
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return start + " - " + (sameYear ? end.slice(5) : end);
}

function DirectorySchedule({ project, status }) {
  return (
    <span className="collection-directory-meta">
      <span className="collection-directory-status" data-tone={status.tone}>{status.label}</span>
      {project.date && <>
        <span className="collection-directory-separator" aria-hidden="true">·</span>
        <span className="collection-directory-date" title={project.date}>
          <span aria-hidden="true">{compactDirectoryDate(project.date)}</span>
          <span className="collection-search-sr-only">采集时间：{project.date}</span>
        </span>
      </>}
    </span>
  );
}

function DirectoryChevron() {
  return (
    <span className="collection-directory-enter" aria-hidden="true">
      <CollectionIcon name="chevron" />
    </span>
  );
}

export function CollectionOrganizationGroup({ scope, projects, onOpen }) {
  const first = projects[0];
  const headingId = "directory-organization-" + first.id;
  return (
    <div className="collection-directory-group" role="listitem">
      {projects.length === 1 ? (
        <button
          type="button"
          className="collection-directory-single"
          data-project-id={first.id}
          onClick={() => onOpen(first.id)}
        >
          <ProjectArt project={first} />
          <span className="collection-directory-copy">
            <span className="collection-directory-titles">
              <strong className="collection-directory-name">{first.organization}</strong>
              <span className="collection-directory-project-name">{first.name}</span>
            </span>
            <span className="collection-directory-bottom">
              <DirectorySchedule project={first} status={scope.projectStatus(first)} />
              <DirectoryChevron />
            </span>
          </span>
        </button>
      ) : (
        <>
          <div className="collection-directory-group-header">
            <ProjectArt project={first} />
            <h3 className="collection-directory-name" id={headingId}>{first.organization}</h3>
            <span className="collection-directory-count">{projects.length} 个项目</span>
          </div>
          {projects.map(project => (
            <button
              type="button"
              className="collection-directory-subproject"
              key={project.id}
              data-project-id={project.id}
              aria-describedby={headingId}
              onClick={() => onOpen(project.id)}
            >
              <span className="collection-directory-copy">
                <strong className="collection-directory-project-name">{project.name}</strong>
                <DirectorySchedule project={project} status={scope.projectStatus(project)} />
              </span>
              <DirectoryChevron />
            </button>
          ))}
        </>
      )}
    </div>
  );
}

export function CollectionProjectRow({ scope: s, project: p, onOpen }) {
  const state = s.projectStatus(p);
  const schoolSearch = s.isProjectSearch && ["enrollment", "graduate"].includes(s.projectCategory);
  const status = (
    <span className={"collection-project-state " + state.tone}>
      {p.demoSchedule ? "演示 · " : ""}{state.label}
    </span>
  );
  return (
    <button
      className="collection-project-row"
      type="button"
      data-project-id={p.id}
      onClick={() => (onOpen ? onOpen(p.id) : s.openProject(p.id))}
    >
      <ProjectArt project={p} />
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
        {status}
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
