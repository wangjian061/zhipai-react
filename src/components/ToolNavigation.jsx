import React from "react";
import "../styles/tool-navigation.css";

export function TaskBackButton({ onClick, label = "返回", disabled = false }) {
  return (
    <button
      type="button"
      className="tool-navigation-back"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <use href="#i-chevron-left" />
      </svg>
    </button>
  );
}

export default function ToolNavigation({
  title,
  onBack,
  disabled = false,
  right,
  appearance = "task",
  backLabel = "返回",
  renderTitle,
  inert,
}) {
  const titleProps = { className: "tool-navigation-title", title };
  return (
    <header className="tool-navigation" data-appearance={appearance} inert={inert}>
      <TaskBackButton onClick={onBack} label={backLabel} disabled={disabled} />
      {renderTitle ? renderTitle(titleProps) : title ? <h1 {...titleProps}>{title}</h1> : <span />}
      <div className="tool-navigation-right">{right}</div>
    </header>
  );
}
