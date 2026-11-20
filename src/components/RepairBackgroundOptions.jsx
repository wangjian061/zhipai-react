import React from "react";

export default function RepairBackgroundOptions({
  ref,
  colors,
  color,
  disabled,
  invalid = false,
  onChange,
}) {
  return (
    <section ref={ref} className="tool-repair-background" data-invalid={invalid || undefined}>
      <h3 id="repair-background-title">背景颜色</h3>
      <div
        className="tool-repair-background-options"
        role="radiogroup"
        aria-labelledby="repair-background-title"
        aria-describedby={invalid ? "repair-background-error" : undefined}
        aria-required="true"
        aria-invalid={invalid || undefined}
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 12 4 4 8-9" />
                </svg>
              )}
            </i>
            <span>{item.name}</span>
          </label>
        ))}
      </div>
      {invalid && (
        <p id="repair-background-error" className="ui-field-error" role="alert">
          请先选择一种背景颜色
        </p>
      )}
    </section>
  );
}
