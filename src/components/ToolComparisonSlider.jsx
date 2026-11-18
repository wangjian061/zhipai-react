import React from "react";

export default function ToolComparisonSlider({ value, onChange }) {
  return (
    <>
      <div
        className="tool-compare-handle"
        style={{ left: value + "%" }}
        aria-hidden="true"
      >
        <span>
          <svg>
            <use href="#i-arrow" />
          </svg>
        </span>
      </div>
      <input
        type="range"
        className="tool-photo-range"
        min="0"
        max="100"
        aria-label="拖动滑杆查看精修前后"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </>
  );
}
