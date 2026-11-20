import React from "react";

export default function PriceText({ value, emphasizeAmount = false }) {
  if (typeof value !== "string" || !value.startsWith("¥")) return value;
  if (emphasizeAmount) {
    return <span className="ui-price"><span className="ui-price-currency">¥</span>{value.slice(1)}</span>;
  }
  return <span className="ui-price">{value}</span>;
}
