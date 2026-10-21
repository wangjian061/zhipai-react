import React from "react";

// Home-only geometry: shared navigation and tool-page icons keep their own roles.
export default function HomeToolIcon({ name }) {
  const shapes = {
    print: (
      <>
        <path fill="var(--tool-icon-light)" d="M6 3h12v7H6z" />
        <path
          fill="currentColor"
          d="M5 8h14a3 3 0 0 1 3 3v6h-4v-4H6v4H2v-6a3 3 0 0 1 3-3Z"
        />
        <path fill="var(--tool-icon-accent)" d="M7 14h10v7H7z" />
        <circle fill="var(--tool-icon-light)" cx="18.5" cy="11" r="1" />
      </>
    ),
    repair: (
      <>
        <rect
          fill="var(--tool-icon-light)"
          x="3"
          y="4"
          width="16"
          height="17"
          rx="3"
        />
        <path
          fill="currentColor"
          d="m11 6 1.8 5.2L18 13l-5.2 1.8L11 20l-1.8-5.2L4 13l5.2-1.8Z"
        />
        <path
          fill="var(--tool-icon-accent)"
          d="m19 1 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"
        />
      </>
    ),
    outfit: (
      <>
        <path
          fill="currentColor"
          d="m8 3-6 4 3 5 3-1v10h12V11l2 1 2-5-6-4c-1.2 2.7-5.5 2.7-7 0Z"
          transform="translate(-1 0)"
        />
        <path fill="var(--tool-icon-light)" d="m9 3 3 4 3-4-3 1Z" />
        <path fill="var(--tool-icon-accent)" d="M11.3 7h1.4v12h-1.4z" />
      </>
    ),
    spec: (
      <>
        <rect
          fill="var(--tool-icon-light)"
          x="2"
          y="4"
          width="20"
          height="16"
          rx="3"
        />
        <circle fill="currentColor" cx="8" cy="10" r="2.3" />
        <path fill="currentColor" d="M4.5 17v-1a3.5 3.5 0 0 1 7 0v1Z" />
        <path
          fill="var(--tool-icon-accent)"
          d="M14 9h5v1.5h-5zm0 4h5v1.5h-5z"
        />
      </>
    ),
    crop: (
      <>
        <path fill="var(--tool-icon-light)" d="M7 7h11v11H7z" />
        <path fill="currentColor" d="M5 2h2v15h15v2H5Z" />
        <path fill="var(--tool-icon-accent)" d="M2 5h17v17h-2V7H2Z" />
      </>
    ),
    background: (
      <>
        <rect
          fill="var(--tool-icon-light)"
          x="2"
          y="2"
          width="16"
          height="17"
          rx="3"
        />
        <rect
          fill="var(--tool-icon-accent)"
          x="6"
          y="6"
          width="16"
          height="16"
          rx="3"
        />
        <circle fill="var(--tool-icon-light)" cx="17.5" cy="10.5" r="1.5" />
        <path fill="currentColor" d="m7 19 5-6 4 4 2-2 4 4v1H7Z" />
      </>
    ),
    format: (
      <>
        <path fill="var(--tool-icon-light)" d="M5 2h9l5 5v14H5z" />
        <path
          fill="currentColor"
          d="M14 2v5h5ZM3 11h12v2H3zm6-3 4 4-4 4-1.4-1.4 2.6-2.6-2.6-2.6Z"
        />
        <path
          fill="var(--tool-icon-accent)"
          d="M11 17h10v2H11zm4-3 1.4 1.4-2.6 2.6 2.6 2.6L15 22l-4-4Z"
        />
      </>
    ),
    resize: (
      <>
        <path fill="var(--tool-icon-light)" d="M6 2h9l5 5v15H6z" />
        <path
          fill="currentColor"
          d="M15 2v5h5ZM2 10h2v4h4v2H2Zm1.7 4.3 6-6L11 9.7l-6 6Z"
        />
        <path
          fill="var(--tool-icon-accent)"
          d="M22 19h-6v-2h4v-4h2Zm-8.7-8.7 1.4-1.4 6 6-1.4 1.4Z"
        />
      </>
    ),
  };
  return (
    <svg
      className="home-tool-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {shapes[name]}
    </svg>
  );
}
