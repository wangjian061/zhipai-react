import { TaskBackButton } from "./ToolNavigation.jsx";
import React, { useCallback, useLayoutEffect, useRef } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
import { CollectionProjectRow } from "./CollectionProjectRows.jsx";

export default function CollectionProjectSearch({ scope: s }) {
  const input = useRef(null);
  const content = useRef(null);
  const scopeName = s.projectCategory === "all" ? "" : s.categoryInfo.name;
  const enrollment = s.projectCategory === "enrollment";
  const association = s.projectCategory === "association";
  const title = enrollment ? "院校搜索" : association ? "机构搜索" : "项目搜索";
  const placeholder = enrollment ? "输入院校名称" : association ? "搜索机构或项目名称" : scopeName ? "搜索" + scopeName + "项目或机构" : "搜索项目名称或机构";
  const objectName = enrollment ? "所院校" : "个项目";
  const hasQuery = !!s.searchTerm.trim();
  const examples = hasQuery ? [] : [...new Set([
    ...s.projectsShown.map((project) => project.organization),
    ...s.projectsShown.map((project) => project.type === "graduate" ? "毕业生" : ""),
  ].filter(Boolean))].slice(0, 3);
  const projects = hasQuery ? s.projectsShown : [];
  const attach = useCallback(
    (element) => {
      content.current = element;
      s.$refs.collectionProjectSearchScroll = element;
    },
    [s],
  );

  useLayoutEffect(() => {
    if (!content.current) return;
    content.current.scrollTop = s.sectionScroll[s.scrollKey] || 0;
    if(s.focusNewSearch) {s.focusNewSearch=false;input.current?.focus({preventScroll:true});}
    if (s.projectSearchReturnId) {
      const source = Array.from(
        content.current.querySelectorAll("[data-project-id]"),
      ).find((item) => item.dataset.projectId === s.projectSearchReturnId);
      source?.focus({ preventScroll: true });
      s.projectSearchReturnId = "";
    }
  }, [s, s.searchTerm]);

  function focusInput(select = false) {
    input.current?.focus({ preventScroll: true });
    if (select) input.current?.select();
  }

  return (
    <section className="collection-project-search" aria-label={title}>
      <header className="collection-project-search-header ui-task-masthead">
        <h1 className="collection-search-sr-only">{title}</h1>
        <TaskBackButton
          label="返回来源列表"
          onClick={() => {
            input.current?.blur();
            s.back();
          }}
        />
        <form
          className="collection-project-search-form"
          role="search"
          aria-label={title}
          onSubmit={(event) => {
            event.preventDefault();
            s.searchProjects();
            input.current?.blur();
          }}
        >
          <CollectionIcon name="search" />
          <input
            ref={input}
            type="search"
            aria-label={association || enrollment ? placeholder : "搜索项目名称或机构"}
            placeholder={placeholder}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="search"
            value={s.keyword}
            onChange={(event) => {
              s.keyword = event.target.value;
              if (!event.target.value && !event.nativeEvent?.isComposing)
                s.clearSearch();
            }}
          />
          {s.keyword && (
            <button
              className="collection-project-search-clear"
              type="button"
              aria-label="清空关键词"
              onClick={() => {
                s.clearSearch();
                focusInput();
              }}
            >
              <CollectionIcon name="close" />
            </button>
          )}
          <button className="collection-project-search-submit" type="submit">
            搜索
          </button>
        </form>
      </header>

      <div className="collection-project-search-content" ref={attach}>
        <p
          className="collection-search-sr-only"
          role="status"
          aria-atomic="true"
        >
          {hasQuery
            ? `找到 ${projects.length} ${objectName}`
            : enrollment ? "请输入院校名称" : "请输入项目或机构名称"}
        </p>
        {!hasQuery ? (
          <div className="collection-project-search-empty">
            <CollectionIcon name="search" />
            <h2>{enrollment ? "查找录取院校" : association ? "查找合作机构" : scopeName ? "查找" + scopeName + "项目" : "查找采集项目"}</h2>
            <p>{enrollment ? "输入院校名称" : "输入项目名称或机构名称"}</p>
            {!!examples.length && (
              <div className="collection-search-examples" role="group" aria-label="快捷试搜">
                {examples.map((example) => (
                  <button type="button" key={example} onClick={() => {
                    s.keyword = example;
                    s.searchProjects();
                    input.current?.blur();
                  }}><span>{example}</span></button>
                ))}
              </div>
            )}
          </div>
        ) : projects.length ? (
          <>
            <div className="collection-project-search-heading">
              <h2 id="collection-project-search-heading">搜索结果</h2>
              <span>{projects.length} {objectName}</span>
            </div>
            <div
              className="collection-project-search-results"
              role="list"
              aria-labelledby="collection-project-search-heading"
            >
              {projects.map((project) => (
                <div role="listitem" key={project.id}>
                  <CollectionProjectRow
                    scope={s}
                    project={project}
                    onOpen={(id) => {
                      s.projectSearchReturnId = id;
                      input.current?.blur();
                      s.openProject(id);
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="collection-project-search-empty">
            <CollectionIcon name="search" />
            <h2>{enrollment ? "未找到相关院校" : "未找到相关采集项目"}</h2>
            <p>请检查名称，或换个关键词试试</p>
            <button type="button" onClick={() => focusInput(true)}>
              修改关键词
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
