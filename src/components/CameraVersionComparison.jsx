import React, { useEffect, useRef, useState } from "react";
import "../styles/camera-dual-results.css";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const initialView = { split: 50, zoom: 1, pan: { x: 0, y: 0 }, animate: false };
const clampPan = (pan, frame, zoom) => {
  const x = (frame.width * (zoom - 1)) / 2;
  const y = (frame.height * (zoom - 1)) / 2;
  return { x: clamp(pan.x, -x, x), y: clamp(pan.y, -y, y) };
};

export function comparisonPan(gesture, point, zoom) {
  return clampPan(
    {
      x: gesture.pan.x + (point.x - gesture.x) / gesture.unitScale,
      y: gesture.pan.y + (point.y - gesture.y) / gesture.unitScale,
    },
    gesture,
    zoom,
  );
}

export function comparisonZoom(
  view,
  target,
  frame,
  anchor,
  destination = anchor,
) {
  const zoom = clamp(target, 1, 3);
  const ratio = zoom / view.zoom;
  const pan = clampPan(
    {
      x: destination.x + (view.pan.x - anchor.x) * ratio,
      y: destination.y + (view.pan.y - anchor.y) * ratio,
    },
    frame,
    zoom,
  );
  return { zoom, pan };
}

function frameGeometry(node, event) {
  const bounds = node.getBoundingClientRect();
  const width = node.clientWidth || bounds.width || 1;
  const height = node.clientHeight || bounds.height || 1;
  return {
    width,
    height,
    point: event
      ? {
          x:
            ((event.clientX - bounds.left) / (bounds.width || 1) - 0.5) * width,
          y:
            ((event.clientY - bounds.top) / (bounds.height || 1) - 0.5) *
            height,
        }
      : { x: 0, y: 0 },
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export default function CameraVersionComparison({ scope: s }) {
  if (s.page !== "camera" || s.panel !== "compare") return null;
  return <Comparison scope={s} />;
}

function Comparison({ scope: s }) {
  const dialog = useRef(null);
  const frame = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(null);
  const current = useRef(initialView);
  const [view, setView] = useState(initialView);
  const { split, zoom, pan, animate } = view;
  const versions = s.resultVersions.filter(
    (version) =>
      version.status === "ready" &&
      !version.previewError &&
      (!s.unlocked || version.selected),
  );
  const dual = versions.length > 1;
  useEffect(() => {
    s.cameraCompare = true;
    dialog.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      s.cameraCompare = false;
    };
  }, [s]);

  function updateView(next) {
    const combined = { ...current.current, ...next };
    current.current = combined;
    setView(combined);
  }
  function zoomAround(target, geometry, anchor) {
    updateView({
      ...comparisonZoom(current.current, target, geometry, anchor),
      animate: true,
    });
  }
  function setSplit(value) {
    updateView({ split: clamp(value, 0, 100), animate: false });
  }
  function startSingle(id, point, fromHandle, moved = false) {
    const base = current.current;
    gesture.current = {
      id,
      point,
      base,
      fromHandle,
      moved,
      kind:
        dual && fromHandle
          ? "split"
          : base.zoom > 1
            ? "pan"
            : dual
              ? "split"
              : "tap",
    };
  }
  function pointerDown(event) {
    if (event.button !== 0 || pointers.current.size >= 2) return;
    const node = event.currentTarget;
    const fromHandle = !!event.target.closest("[data-comparison-handle]");
    const { point } = frameGeometry(node, event);
    pointers.current.set(event.pointerId, point);
    node.setPointerCapture?.(event.pointerId);
    if (current.current.animate) updateView({ animate: false });

    if (pointers.current.size === 2) {
      const [a, b] = pointers.current.values();
      lastTap.current = null;
      gesture.current = {
        kind: "pinch",
        base: current.current,
        anchor: midpoint(a, b),
        distance: Math.max(1, distance(a, b)),
      };
    } else {
      startSingle(event.pointerId, point, fromHandle);
    }
  }
  function pointerMove(event) {
    const active = gesture.current;
    if (!active || !pointers.current.has(event.pointerId)) return;
    const geometry = frameGeometry(event.currentTarget, event);
    const { point } = geometry;
    pointers.current.set(event.pointerId, point);
    if (active.kind === "pinch") {
      const [a, b] = pointers.current.values();
      updateView({
        ...comparisonZoom(
          active.base,
          (active.base.zoom * distance(a, b)) / active.distance,
          geometry,
          active.anchor,
          midpoint(a, b),
        ),
        animate: false,
      });
      return;
    }
    const dx = point.x - active.point.x;
    const dy = point.y - active.point.y;
    if (!active.moved && Math.hypot(dx, dy) < 5) return;
    active.moved = true;
    lastTap.current = null;
    if (
      active.kind === "split" &&
      (active.fromHandle || active.horizontal || Math.abs(dx) >= Math.abs(dy))
    ) {
      active.horizontal = true;
      setSplit(active.base.split + (dx / geometry.width) * 100);
    } else if (active.kind === "pan") {
      updateView({
        pan: comparisonPan(
          { ...active.point, ...geometry, unitScale: 1, pan: active.base.pan },
          point,
          active.base.zoom,
        ),
        animate: false,
      });
    }
  }
  function endPointer(event, cancelled = false) {
    const active = gesture.current;
    if (!pointers.current.delete(event.pointerId) || !active) return;
    if (pointers.current.size === 1) {
      const [remaining] = pointers.current.entries();
      startSingle(...remaining, false, true);
      return;
    }
    gesture.current = null;
    if (
      cancelled ||
      active.moved ||
      active.fromHandle ||
      active.kind === "pinch"
    ) {
      lastTap.current = null;
      return;
    }
    const geometry = frameGeometry(event.currentTarget, event);
    const last = lastTap.current;
    if (
      last &&
      event.timeStamp - last.at < 320 &&
      distance(last.point, geometry.point) <= 28
    ) {
      lastTap.current = null;
      const target = current.current.zoom === 1 ? 2 : 1;
      zoomAround(target, geometry, geometry.point);
    } else lastTap.current = { point: geometry.point, at: event.timeStamp };
  }

  function slideByKey(event) {
    const positions = {
      ArrowLeft: split - 5,
      ArrowDown: split - 5,
      ArrowRight: split + 5,
      ArrowUp: split + 5,
      PageDown: split - 10,
      PageUp: split + 10,
      Home: 0,
      End: 100,
    };
    if (!(event.key in positions)) return;
    event.preventDefault();
    setSplit(positions[event.key]);
  }
  function keyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      s.closePanel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [
      ...dialog.current.querySelectorAll(
        "button:not([disabled]),[role='slider']",
      ),
    ];
    const first = items[0];
    const last = items.at(-1);
    if (
      event.shiftKey &&
      [first, dialog.current].includes(document.activeElement)
    ) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  const imageStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  };
  return (
    <section
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-compare-title"
      aria-busy={s.selectionSaving || undefined}
      tabIndex={-1}
      className="camera-version-viewer"
      onKeyDown={keyDown}
    >
      <header className="camera-compare-header">
        <h2 id="camera-compare-title">成片对比</h2>
        <button
          type="button"
          aria-label="关闭成片对比"
          disabled={s.selectionSaving}
          onClick={() => s.closePanel()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="camera-compare-labels">
        <span>{versions[0]?.name || "照片暂时无法显示"}</span>
        {dual && <span>{versions[1].name}</span>}
      </div>
      <div className="camera-compare-stage">
        {!!versions.length && (
          <div
            className="camera-compare-frame"
            ref={frame}
            data-animate={animate || undefined}
            style={{
              "--result-ratio": s.draft.outputWidth / s.draft.outputHeight,
              "--compare-split": split + "%",
            }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={endPointer}
            onPointerCancel={(event) => endPointer(event, true)}
            onLostPointerCapture={(event) => endPointer(event, true)}
          >
            <img
              src={versions[0].url}
              alt={versions[0].name}
              style={imageStyle}
              draggable="false"
              onError={() => s.setVersionPreviewError(versions[0].id, true)}
            />
            {dual && (
              <>
                <div
                  className="camera-compare-reveal"
                  style={{ clipPath: `inset(0 0 0 ${split}%)` }}
                >
                  <img
                    src={versions[1].url}
                    alt={versions[1].name}
                    style={imageStyle}
                    draggable="false"
                    onError={() =>
                      s.setVersionPreviewError(versions[1].id, true)
                    }
                  />
                </div>
                <span className="camera-compare-divider" aria-hidden="true" />
                <div
                  className="camera-compare-handle"
                  data-comparison-handle
                  role="slider"
                  tabIndex={0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(split)}
                  aria-label="普通版与精修版分割位置"
                  onKeyDown={slideByKey}
                >
                  <span>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m9 6-5 6 5 6m6-12 5 6-5 6" />
                    </svg>
                  </span>
                </div>
              </>
            )}
            {!s.unlocked && (
              <span className="camera-version-watermark">知拍证件照</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
