import React, { useRef, useState } from "react";
import { SearchHeader, SearchExamples, SearchEmpty } from "./IndependentSearch.jsx";

export default function SupportSearch({ s }) {
  const [draft, setDraft] = useState(s.query);
  const input = useRef(null);
  function submit(value) {
    setDraft(value);
    s.submitSearch(value);
    input.current?.blur();
  }
  return (
    <section
      className="collection-project-search support-search-page"
      aria-label="帮助搜索"
    >
      <SearchHeader title="帮助搜索" backLabel="返回客服中心" onBack={() => s.leaveSearch()}
        inputRef={input} autoFocus placeholder="搜索常见问题" value={draft} onChange={setDraft}
        onClear={() => { setDraft(""); s.submitSearch(""); }} onSearch={submit} />
      <div className="collection-project-search-content">
        {!s.query ? (
          <SearchExamples title="常见问题" examples={s.filtered.slice(0, 3).map(faq => faq.question)}
            hint="点击问题可直接搜索，也可输入关键词。" onSelect={submit} />
        ) : !s.filtered.length ? (
          <SearchEmpty title="未找到相关问题" hint="请换个关键词试试"
            onEdit={() => { input.current?.focus(); input.current?.select(); }} />
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
