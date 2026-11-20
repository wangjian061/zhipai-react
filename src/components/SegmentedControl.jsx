import React, { useId } from "react";

export default function SegmentedControl({ label, options, value, onChange, disabled }) {
  const name = useId();
  return (
    <div className="ui-segmented-control" role="radiogroup" aria-label={label}>
      {options.map(({ value: option, label: text }) => (
        <label key={option}>
          <input type="radio" name={name} value={option}
            checked={value === option} disabled={disabled}
            onChange={() => onChange(option)} />
          <span>{text}</span>
        </label>
      ))}
    </div>
  );
}
