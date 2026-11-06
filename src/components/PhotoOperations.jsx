import React from "react";
import HomeToolIcon from "./HomeToolIcon.jsx";
import { PHOTO_OPERATIONS } from "../domain/photo-actions.js";
export default function PhotoOperations({
  disabled = false,
  onTool,
  onKeepsake,
  onPrint,
}) {
  return (
    <div
      className="utility-grid photo-operation-grid"
      aria-label="精选服务"
      data-columns="3"
    >
      {PHOTO_OPERATIONS.map((item) => (
        <button
          className="utility-grid-item"
          type="button"
          key={item.id}
          disabled={disabled}
          onClick={() =>
            item.print
              ? onPrint()
              : item.keepsake
                ? onKeepsake(item.id)
                : onTool(item.id)
          }
        >
          <span className="utility-item-icon">
            <HomeToolIcon name={item.id} />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
