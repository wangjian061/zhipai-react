import React, { useCallback, useLayoutEffect, useRef } from "react";
import { SearchHeader, SearchExamples, SearchEmpty } from "./IndependentSearch.jsx";
import { CollectionOrganizationGroup, CollectionProjectRow } from "./CollectionProjectRows.jsx";

export default function CollectionProjectSearch({ scope: s }) {
  const input = useRef(null);
  const content = useRef(null);
  const scopeName = s.projectCategory === "all" ? "" : s.categoryInfo.name;
  const schoolSearch = ["enrollment", "graduate"].includes(s.projectCategory);
  const association = s.projectCategory === "association";
  const title = schoolSearch ? "院校搜索" : association ? "机构搜索" : "项目搜索";
  const placeholder = schoolSearch ? "输入院校名称" : association ? "搜索机构或项目名称" : scopeName ? "搜索" + scopeName + "项目或机构" : "搜索项目名称或机构";
  const objectName = schoolSearch ? "所院校" : "个项目";
  const hasQuery = !!s.searchTerm.trim();
  const examples = hasQuery || association ? [] : [...new Set(
    s.projectsShown.map(project => project.organization).filter(Boolean),
  )].slice(0, 3);
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
      <SearchHeader title={title} backLabel="返回来源列表" inputRef={input} placeholder={placeholder}
        value={s.keyword} onChange={value => { s.keyword = value; }} onClear={() => s.clearSearch()}
        onSearch={() => s.searchProjects()} blurOnClear={association}
        onBack={() => { input.current?.blur(); s.back(); }} />

      <div className="collection-project-search-content" ref={attach} onScroll={hasMore ? loadNearEnd : undefined}>
        <p
          className="collection-search-sr-only"
          role="status"
          aria-atomic="true"
        >
          {association
            ? `共 ${total} 家机构，已显示 ${shown} 家`
            : hasQuery ? `找到 ${total} ${objectName}`
            : schoolSearch ? "请输入院校名称" : "请输入项目或机构名称"}
        </p>
        {!hasQuery && !association ? (
          <SearchExamples title={schoolSearch ? "常见示例院校" : "常见示例"} examples={examples}
            hint={schoolSearch ? "点击示例可直接搜索，也可输入院校名称。" : "点击示例可直接搜索，也可输入项目或机构名称。"}
            onSelect={value => { s.keyword = value; s.searchProjects(); input.current?.blur(); }} />
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
          <SearchEmpty title={association ? (hasQuery ? "未找到相关机构" : "暂无公开机构") : schoolSearch ? "未找到相关院校" : "未找到相关采集项目"}
            hint="请检查名称，或换个关键词试试" onEdit={hasQuery ? () => focusInput(true) : undefined} />
        )}
      </div>
    </section>
  );
}
