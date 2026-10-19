import React from "react";
import "../styles/tool-navigation.css";

export default function ToolNavigation({
  title,
  onBack,
  disabled = false,
  right,
}) {
  return (
    <header className="tool-navigation">
      <button
        type="button"
        className="tool-navigation-back"
        aria-label="返回"
        disabled={disabled}
        onClick={onBack}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <use href="#i-chevron-left" />
        </svg>
      </button>
      <h1 className="tool-navigation-title" title={title}>
        {title}
      </h1>
      <div className="tool-navigation-right">{right}</div>
    </header>
  );
}
