import React from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
import { TaskBackButton } from "./ToolNavigation.jsx";

export function SearchHeader({ title, backLabel, onBack, inputRef, placeholder, value, onChange,
  onClear, onSearch, autoFocus = false, blurOnClear = false }) {
  return <header className="collection-project-search-header ui-task-masthead">
    <h1 className="collection-search-sr-only">{title}</h1>
    <TaskBackButton label={backLabel} onClick={onBack} />
    <form role="search" aria-label={title} className="collection-project-search-form"
      onSubmit={event => {
        event.preventDefault();
        onSearch(value);
        inputRef.current?.blur();
      }}>
      <div className="collection-project-search-field">
        <CollectionIcon name="search" />
        <input ref={inputRef} type="search" aria-label={placeholder} placeholder={placeholder}
          autoComplete="off" autoFocus={autoFocus} enterKeyHint="search" maxLength={60} value={value}
          onChange={event => {
            onChange(event.target.value);
            if (!event.target.value && !event.nativeEvent.isComposing) onClear();
          }} />
        {value && <button type="button" className="collection-project-search-clear" aria-label="清空关键词"
          onClick={() => {
            onClear();
            if (blurOnClear) inputRef.current?.blur();
            else inputRef.current?.focus({ preventScroll: true });
          }}><CollectionIcon name="close" /></button>}
      </div>
      <button type="submit" className="collection-project-search-submit">搜索</button>
    </form>
  </header>;
}

export function SearchExamples({ title, examples, hint, onSelect }) {
  return <section className="collection-search-start" aria-label={title}>
    <div className="collection-project-search-heading"><h2>{title}</h2><span>本地示例</span></div>
    <div className="collection-search-examples" role="group" aria-label="快捷试搜">
      {examples.map(example => <button type="button" key={example} onClick={() => onSelect(example)}>
        <span>{example}</span>
      </button>)}
    </div>
    <p>{hint}</p>
  </section>;
}

export function SearchEmpty({ title, hint, onEdit }) {
  return <div className="collection-project-search-empty">
    <CollectionIcon name="search" />
    <h2>{title}</h2>
    {onEdit && <><p>{hint}</p><button type="button" onClick={onEdit}>修改关键词</button></>}
  </div>;
}
