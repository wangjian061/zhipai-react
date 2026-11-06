import React, { useId } from "react";
import {
  keepsakeSVG,
  templateGeometry,
  STAMP_PANE,
} from "../domain/keepsake-templates.js";

export default function KeepsakePreview({
  template,
  image,
  transform,
  interactive = false,
  activeSlot,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const id = useId();
  const geometry = templateGeometry(template);
  const stamp = template.kind === "stamp";
  const view = stamp ? STAMP_PANE : geometry;
  return (
    <span
      className={`keepsake-preview${interactive ? " is-interactive" : ""}`}
      style={{ aspectRatio: `${view.width}/${view.height}` }}
      role={interactive ? "group" : undefined}
      aria-label={interactive ? "拖动或缩放照片调整构图" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span
        className="keepsake-paper"
        dangerouslySetInnerHTML={{
          __html: keepsakeSVG(
            template,
            image,
            transform,
            id,
            undefined,
            stamp ? view : undefined,
          ),
        }}
      />
      {stamp && activeSlot && (
        <svg
          className="stamp-slot-outline"
          aria-hidden="true"
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        >
          {geometry.slots
            .filter((slot) => slot.group === activeSlot)
            .map((slot) => (
              <rect
                key={slot.x + "-" + slot.y}
                x={slot.x}
                y={slot.y}
                width={slot.w}
                height={slot.h}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </svg>
      )}
    </span>
  );
}
