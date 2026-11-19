import React from "react";

export default function PriceText({ value }) {
  if (typeof value !== "string" || !value.startsWith("¥")) return value;
  return <span className="ui-price">{value}</span>;
}
