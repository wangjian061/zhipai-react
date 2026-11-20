import React, { useEffect, useId, useRef } from "react";
import { keepsakePhotoPlacement, templateFor, templateGeometry, STAMP_PANE } from "../domain/keepsake-templates.js";

export default function KeepsakePreview({ s }) {
  const canvas = useRef(null);
  const touchStart = useRef(null);
  const lastTap = useRef(null);
  const lastTouchTime = useRef(-Infinity);
  const id = useId();
  const template = templateFor(s.previewFrame.templateId);
  const geometry = templateGeometry(template);
  const stamp = template.kind === "stamp";
  const view = stamp ? STAMP_PANE : geometry;
  const disabled = !s.previewReady || s.locked || s.purchaseLocked;

  useEffect(() => {
    const node = canvas.current;
    if (!node || disabled) return;
    function wheel(event) {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode ? 16 : 1);
      s.zoomCrop({ x: event.clientX, y: event.clientY }, node.getBoundingClientRect(),
        { factor: Math.exp(-delta * 0.003) });
    }
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [s, disabled]);

  function point(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function toggle(event) {
    if (disabled) return;
    s.zoomCrop(point(event), event.currentTarget.getBoundingClientRect(), { toggle: true });
  }

  function pointerDown(event) {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.pointerType === "touch") {
      touchStart.current = s.pointers.size ? null : { id: event.pointerId, ...point(event) };
      if (!touchStart.current) lastTap.current = null;
    }
    s.pointerDown(event);
  }

  function pointerMove(event) {
    if (disabled) return;
    const start = touchStart.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
      touchStart.current = null;
      lastTap.current = null;
    }
    s.pointerMove(event);
  }

  function pointerUp(event) {
    s.pointerUp(event);
    if (event.pointerType !== "touch") return;
    const time = performance.now();
    lastTouchTime.current = time;
    if (touchStart.current?.id !== event.pointerId) return;
    touchStart.current = null;
    const previous = lastTap.current;
    if (previous && time - previous.time < 320 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 24) {
      lastTap.current = null;
      toggle(event);
    } else lastTap.current = { ...point(event), time };
  }

  function keyDown(event) {
    if (disabled) return;
    const pan = { ArrowLeft: [10, 0], ArrowRight: [-10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
    const transform = s.activeTransform;
    if (pan[event.key]) {
      const [x, y] = pan[event.key];
      s.setTransform({ ...transform, offsetX: transform.offsetX + x, offsetY: transform.offsetY + y });
    } else if (event.key === "+" || event.key === "=" || event.key === "-") {
      s.setTransform({ ...transform, scale: transform.scale + (event.key === "-" ? -0.15 : 0.15) });
    } else return;
    event.preventDefault();
  }

  const frame = <image href={s.previewFrame?.data} width={geometry.width} height={geometry.height} />;
  return (
    <div
      ref={canvas}
      className={disabled ? "keepsake-preview" : "keepsake-preview is-interactive"}
      aria-busy={s.previewLoading}
      style={{ aspectRatio: `${view.width}/${view.height}` }}
      role="group"
      tabIndex={disabled ? -1 : 0}
      aria-label="调整照片构图。方向键移动，加号或减号缩放"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={(event) => {
        touchStart.current = lastTap.current = null;
        s.pointerUp(event);
      }}
      onLostPointerCapture={(event) => s.pointerUp(event)}
      onDoubleClick={(event) => {
        if (performance.now() - lastTouchTime.current > 450) toggle(event);
      }}
      onKeyDown={keyDown}
    >
      <svg className="keepsake-paper" viewBox={`${view.x ?? 0} ${view.y ?? 0} ${view.width} ${view.height}`} aria-hidden="true">
        <defs><image id={id} href={s.image.data} width={s.image.width} height={s.image.height} /></defs>
        {stamp ? frame : <rect width={geometry.width} height={geometry.height} fill="#fff" />}
        {geometry.slots.map((slot, index) => {
          const clip = id + "-" + index;
          const box = { x: slot.x, y: slot.y, width: slot.w, height: slot.h };
          const settings = slot.group ? s.cropDraft[slot.group] : s.activeTransform;
          return (
            <React.Fragment key={index}>
              <defs><clipPath id={clip}><rect {...box} /></clipPath></defs>
              <g clipPath={`url(#${clip})`}>
                <use href={"#" + id} transform={keepsakePhotoPlacement(s.image, slot, settings)} />
              </g>
            </React.Fragment>
          );
        })}
        {!stamp && frame}
        {stamp && geometry.slots.filter((slot) => slot.group === s.activeSlot).map((slot) => (
          <rect key={slot.x + "-" + slot.y} className="stamp-slot-outline"
            x={slot.x} y={slot.y} width={slot.w} height={slot.h} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}
