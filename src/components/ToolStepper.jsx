import React from "react";
import "../styles/tool-stepper.css";

export default function ToolStepper({ steps, current, label = "制作步骤" }) {
  return (
    <nav className="tool-stepper" aria-label={label}>
      <ol
        style={{
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        }}
      >
        {steps.map((name, index) => (
          <li
            key={index}
            className={
              index === current ? "current" : index < current ? "done" : ""
            }
            aria-current={index === current ? "step" : undefined}
          >
            <span className="tool-stepper-number">{index + 1}</span>
            <span className="tool-stepper-label">{name}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
