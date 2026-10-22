import React from "react";

export default function RepairBackgroundOptions({
  colors,
  color,
  disabled,
  onChange,
  required = true,
}) {
  return (
    <section className="tool-settings tool-repair-background">
      <div className="tool-options-heading">
        <h2 id="repair-background-title">背景颜色</h2>
        <span aria-live="polite" id="repair-background-selection">
          {color
            ? `已选：${color.name}`
            : required
              ? "请选择一种"
              : "沿用原订单"}
        </span>
      </div>
      <div
        className="tool-repair-background-options"
        role="radiogroup"
        aria-labelledby="repair-background-title"
        aria-describedby="repair-background-selection"
        aria-required={required}
      >
        {colors.map((item) => (
          <label key={item.id}>
            <input
              type="radio"
              name="repair-background"
              value={item.id}
              checked={color?.id === item.id}
              disabled={disabled}
              onChange={() => onChange(item.id)}
            />
            <i style={{ background: item.value }} aria-hidden="true">
              {color?.id === item.id && (
                <svg viewBox="0 0 24 24">
                  <path d="m6 12 4 4 8-9" />
                </svg>
              )}
            </i>
            <span>{item.name}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
