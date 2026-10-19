import React, { useId } from "react";

function StatusMark({ status }) {
  if (status === "complete") {
    return (
      <path
        d="m84 67 7 7 14-16"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (status === "rejected") {
    return (
      <>
        <path
          d="M94 55v15"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="94" cy="79" r="2.2" fill="#fff" />
      </>
    );
  }
  if (status === "reviewing") {
    return (
      <>
        <circle
          cx="94"
          cy="67"
          r="13"
          fill="none"
          stroke="#fff"
          strokeWidth="2.8"
        />
        <path
          d="M94 58v10l7 4"
          fill="none"
          stroke="#fff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }
  if (status === "draft") {
    return (
      <>
        <path
          d="M94 74V54m-8 8 8-8 8 8M82 77v5h24v-5"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }
  return (
    <>
      <path
        d="M82 58h6l3-4h7l3 4h6v21H82Z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <circle
        cx="94.5"
        cy="68"
        r="5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.8"
      />
    </>
  );
}

export default function CollectionStatusArtwork({ status }) {
  const visualStatus =
    {
      processing: "reviewing",
      processing_failed: "rejected",
      uploaded: "complete",
      upload_failed: "rejected",
      unknown: "reviewing",
    }[status] || status;
  const id = useId().replace(/:/g, ""),
    paper = "status-paper-" + id,
    seal = "status-seal-" + id;
  return (
    <svg
      className="collection-status-art"
      viewBox="0 0 128 108"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={paper} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="var(--task-art-paper)" />
        </linearGradient>
        <linearGradient id={seal} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--task-art-light)" />
          <stop offset="1" stopColor="var(--task-accent)" />
        </linearGradient>
      </defs>
      <ellipse
        cx="68"
        cy="97"
        rx="43"
        ry="5"
        fill="var(--task-outline)"
        opacity=".18"
      />
      <g transform="rotate(-9 58 53)">
        <rect
          x="28"
          y="16"
          width="62"
          height="78"
          rx="10"
          fill="var(--task-outline)"
          opacity=".32"
        />
        <rect
          x="25"
          y="11"
          width="62"
          height="78"
          rx="10"
          fill={"url(#" + paper + ")"}
          stroke="var(--task-outline)"
          strokeWidth="1"
        />
        <rect
          x="35"
          y="22"
          width="41"
          height="39"
          rx="6"
          fill="var(--task-art-paper)"
        />
        <circle cx="55.5" cy="35" r="7" fill="var(--task-outline)" />
        <path
          d="M43 57v-3c0-8 5-11 12.5-11S68 46 68 54v3Z"
          fill="var(--task-outline)"
        />
        <path
          d="M36 70h28M36 77h18"
          stroke="var(--task-outline)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <circle cx="95" cy="70" r="24" fill="var(--task-outline)" opacity=".24" />
      <circle
        cx="94"
        cy="67"
        r="24"
        fill={"url(#" + seal + ")"}
        stroke="#ffffffb3"
        strokeWidth="1.5"
      />
      <StatusMark status={visualStatus} />
      <path
        d="M106 17v8m-4-4h8"
        stroke="var(--task-art-light)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".7"
      />
      <circle
        cx="16"
        cy="60"
        r="2"
        fill="var(--task-art-light)"
        opacity=".55"
      />
    </svg>
  );
}
