import React, { useRef, useState } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";

export default function SupportSearch({ s }) {
  const [draft, setDraft] = useState(s.query);
  const input = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    s.submitSearch(draft);
    input.current?.blur();
  };
  return (
    <section
      className="collection-project-search support-search-page"
      aria-label="帮助搜索"
    >
      <header className="collection-project-search-header">
        <button
          className="collection-project-search-back"
          aria-label="返回客服中心"
          onClick={() => s.leaveSearch()}
        >
          <CollectionIcon name="chevron-left" />
        </button>
        <form
          role="search"
          className="collection-project-search-form"
          onSubmit={submit}
        >
          <CollectionIcon name="search" />
          <input
            autoFocus
            ref={input}
            type="search"
            aria-label="搜索常见问题"
            placeholder="搜索常见问题"
            enterKeyHint="search"
            maxLength={60}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (!e.target.value) s.submitSearch("");
            }}
          />
          {draft && (
            <button
              type="button"
              aria-label="清空关键词"
              onClick={() => {
                setDraft("");
                s.submitSearch("");
                input.current?.focus();
              }}
            >
              ×
            </button>
          )}
          <button className="collection-project-search-submit">搜索</button>
        </form>
      </header>
      <div className="collection-project-search-content">
        {!s.query || !s.filtered.length ? (
          <div className="collection-project-search-empty">
            <CollectionIcon name="search" />
            <h2>{s.query ? "未找到相关问题" : "查找常见问题"}</h2>
            <p>{s.query ? "请换个关键词试试" : "输入问题或关键词"}</p>
            {s.query && (
              <button
                onClick={() => {
                  input.current?.focus();
                  input.current?.select();
                }}
              >
                修改关键词
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="collection-project-search-heading">
              <h2>搜索结果</h2>
              <span>{s.filtered.length} 个问题</span>
            </div>
            {s.filtered.map((f) => (
              <details
                key={f.id}
                name="matching-faq"
                className="support-result"
              >
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
