import React from "react";

export default function SpecificationIcon({ kind = "portrait" }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="specification-icon">
      {kind === "portrait" ? (
        <>
          <rect
            x="10"
            y="4"
            width="28"
            height="40"
            rx="4"
            fill="var(--tool-icon-light, #e5ebf4)"
          />
          <rect
            x="14"
            y="8"
            width="20"
            height="32"
            rx="2"
            fill="currentColor"
          />
          <circle cx="24" cy="20" r="6" fill="#fff" />
          <path d="M16 38v-4a8 8 0 0 1 16 0v4" fill="#fff" />
        </>
      ) : kind === "job" ? (
        <>
          <rect
            x="5"
            y="15"
            width="38"
            height="27"
            rx="4"
            fill="var(--tool-icon-light, #e5ebf4)"
          />
          <path
            d="M17 15v-4h14v4M5 25c12 5 26 5 38 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <rect
            x="21"
            y="25"
            width="6"
            height="8"
            rx="1"
            fill="var(--tool-icon-accent, #6583bc)"
          />
        </>
      ) : kind === "driver" ? (
        <>
          <path
            d="m12 22 4-10h16l4 10v14H12Z"
            fill="var(--tool-icon-light, #e5ebf4)"
          />
          <path d="m15 22 3-7h12l3 7Z" fill="currentColor" />
          <rect
            x="8"
            y="23"
            width="32"
            height="13"
            rx="4"
            fill="currentColor"
          />
          <path
            d="M13 36v4m22-4v4M14 29h4m12 0h4"
            stroke="var(--tool-icon-accent, #6583bc)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : kind === "passport" ? (
        <>
          <rect
            x="10"
            y="4"
            width="28"
            height="40"
            rx="4"
            fill="currentColor"
          />
          <circle
            cx="24"
            cy="23"
            r="9"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
          />
          <path
            d="M15 23h18M24 14c-6 6-6 12 0 18 6-6 6-12 0-18ZM18 37h12"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      ) : kind === "identity" ? (
        <>
          <rect
            x="4"
            y="9"
            width="40"
            height="30"
            rx="4"
            fill="var(--tool-icon-light, #e5ebf4)"
          />
          <circle cx="16" cy="20" r="5" fill="currentColor" />
          <path d="M9 33v-3a7 7 0 0 1 14 0v3Z" fill="currentColor" />
          <path
            d="M28 19h10m-10 6h10m-10 6h6"
            stroke="var(--tool-icon-accent, #6583bc)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect
            x="9"
            y="5"
            width="30"
            height="38"
            rx="4"
            fill="var(--tool-icon-light, #e5ebf4)"
          />
          <path d="m14 17 10-5 10 5-10 5Z" fill="currentColor" />
          <path
            d="M18 21v5c4 2 8 2 12 0v-5M16 33h16m-16 5h10"
            fill="none"
            stroke="var(--tool-icon-accent, #6583bc)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
