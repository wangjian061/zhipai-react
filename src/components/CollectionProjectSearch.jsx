import { TaskBackButton } from "./ToolNavigation.jsx";
import React, { useCallback, useLayoutEffect, useRef } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
import { CollectionOrganizationGroup, CollectionProjectRow } from "./CollectionProjectRows.jsx";

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
  const examples = hasQuery || association ? [] : [...new Set([
    ...s.projectsShown.map((project) => project.organization),
    ...s.projectsShown.map((project) => project.type === "graduate" ? "毕业生" : ""),
  ].filter(Boolean))].slice(0, 3);
  const projects = hasQuery && !association ? s.projectsShown : [];
  const directory = association ? s.organizationDirectory : null;
  const total = directory?.total ?? projects.length;
  const shown = directory?.entries.length ?? projects.length;
  const hasMore = shown < total;
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
    if (s.focusNewSearch) {
      s.focusNewSearch = false;
      input.current?.focus({ preventScroll: true });
    }
    if (s.projectSearchReturnId) {
      const source = Array.from(
        content.current.querySelectorAll("[data-project-id]"),
      ).find((item) => item.dataset.projectId === s.projectSearchReturnId);
      source?.focus({ preventScroll: true });
      s.projectSearchReturnId = "";
    }
  }, [s, s.scrollKey]);

  // A tall viewport can fit a whole batch before it becomes scrollable.
  useLayoutEffect(() => {
    const list = content.current;
    if (hasMore && list?.clientHeight > 0 && list.scrollHeight <= list.clientHeight) {
      s.loadMoreOrganizations(shown);
    }
  }, [s, s.scrollKey, hasMore, shown]);

  function loadNearEnd(event) {
    const list = event.currentTarget;
    s.loadMoreOrganizations(shown, list.scrollHeight - list.scrollTop - list.clientHeight);
  }

  function loadFromButton() {
    const key = s.scrollKey;
    s.loadMoreOrganizations(shown);
    s.$nextTick(() => {
      if (s.scrollKey === key) {
        const appended = content.current?.querySelectorAll(".collection-directory-group")[shown];
        appended?.querySelector("button")?.focus();
      }
    });
  }

  function openProject(id) {
    input.current?.blur();
    s.openProject(id);
  }

  function focusInput(select = false) {
    input.current?.focus({ preventScroll: true });
    if (select) input.current?.select();
  }

  return (
    <section className="collection-project-search" aria-label={title} data-directory={association || undefined}>
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
          <div className="collection-project-search-field">
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
                  if (association) input.current?.blur();
                  else focusInput();
                }}
              >
                <CollectionIcon name="close" />
              </button>
            )}
          </div>
          <button className="collection-project-search-submit" type="submit">
            搜索
          </button>
        </form>
      </header>

      <div className="collection-project-search-content" ref={attach} onScroll={hasMore ? loadNearEnd : undefined}>
        <p
          className="collection-search-sr-only"
          role="status"
          aria-atomic="true"
        >
          {association
            ? `共 ${total} 家机构，已显示 ${shown} 家`
            : hasQuery ? `找到 ${total} ${objectName}`
            : enrollment ? "请输入院校名称" : "请输入项目或机构名称"}
        </p>
        {!hasQuery && !association ? (
          <div className="collection-project-search-empty">
            <CollectionIcon name="search" />
            <h2>{enrollment ? "查找录取院校" : scopeName ? "查找" + scopeName + "项目" : "查找采集项目"}</h2>
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
        ) : total ? (
          <>
            <div className="collection-project-search-heading">
              <h2 id="collection-project-search-heading">{hasQuery ? "搜索结果" : "全部机构"}</h2>
              <span>{association ? `共 ${total} 家机构` : `${total} ${objectName}`}</span>
            </div>
            <div
              className="collection-project-search-results"
              role="list"
              aria-labelledby="collection-project-search-heading"
            >
              {directory ? directory.entries.map(([name, group]) => (
                <CollectionOrganizationGroup key={name} scope={s} projects={group} onOpen={openProject} />
              )) : projects.map((project) => (
                <div role="listitem" key={project.id}>
                  <CollectionProjectRow scope={s} project={project} onOpen={openProject} />
                </div>
              ))}
            </div>
            {directory && (
              <div className="collection-directory-footer" data-complete={!hasMore || undefined}>
                {hasMore ? (
                  <button className="ui-button-text" type="button" onClick={loadFromButton}>
                    加载更多机构
                  </button>
                ) : hasQuery ? "已显示全部搜索结果" : "已显示全部机构"}
              </div>
            )}
          </>
        ) : (
          <div className="collection-project-search-empty">
            <CollectionIcon name="search" />
            <h2>{association ? (hasQuery ? "未找到相关机构" : "暂无公开机构") : enrollment ? "未找到相关院校" : "未找到相关采集项目"}</h2>
            {hasQuery && <>
              <p>请检查名称，或换个关键词试试</p>
              <button type="button" onClick={() => focusInput(true)}>修改关键词</button>
            </>}
          </div>
        )}
      </div>
    </section>
  );
}
