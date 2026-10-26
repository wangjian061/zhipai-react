import React, { useCallback, useLayoutEffect, useRef } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
import { CollectionProjectRow } from "./CollectionProjectRows.jsx";

export default function CollectionProjectSearch({ scope: s }) {
  const input = useRef(null);
  const content = useRef(null);
  const hasQuery = !!s.searchTerm.trim();
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
    <section className="collection-project-search" aria-label="项目搜索">
      <header className="collection-project-search-header">
        <h1 className="collection-search-sr-only">项目搜索</h1>
        <button
          className="collection-project-search-back"
          type="button"
          aria-label="返回专项列表"
          onClick={() => {
            input.current?.blur();
            s.back();
          }}
        >
          <CollectionIcon name="chevron-left" />
        </button>
        <form
          className="collection-project-search-form"
          role="search"
          aria-label="搜索采集项目"
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
            aria-label="搜索项目名称或机构"
            placeholder="搜索项目名称或机构"
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
            ? `找到 ${projects.length} 个采集项目`
            : "请输入项目或机构名称"}
        </p>
        {!hasQuery ? (
          <div className="collection-project-search-empty">
            <CollectionIcon name="search" />
            <h2>查找采集项目</h2>
            <p>输入项目名称或机构名称</p>
          </div>
        ) : projects.length ? (
          <>
            <div className="collection-project-search-heading">
              <h2 id="collection-project-search-heading">搜索结果</h2>
              <span>{projects.length} 个项目</span>
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
            <h2>未找到相关采集项目</h2>
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
