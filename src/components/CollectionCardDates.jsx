import React from "react";
import { CollectionIcon } from "./CollectionHome.jsx";

export default function CollectionCardDates({ range }) {
  const [start = "", end = ""] = (range ?? "").trim().split(/\s*至\s*/, 2);
  return (
    <span className="university-school-date">
      <span className="university-school-date-row">
        <span>开始时间</span>
        <strong className="university-school-date-value">{start.replaceAll("-", ".") || "未提供"}</strong>
      </span>
      <span className="university-school-date-row">
        <span>结束时间</span>
        <strong className="university-school-date-value">{end.replaceAll("-", ".") || "未提供"}</strong>
        <span className="university-school-enter" aria-hidden="true"><CollectionIcon name="chevron" /></span>
      </span>
    </span>
  );
}
