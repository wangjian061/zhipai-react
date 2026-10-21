import React, { useEffect, useRef, useState } from "react";
import "../styles/camera-dual-results.css";

export function comparisonPan(gesture, point, zoom) {
  const limitX = (gesture.width * (zoom - 1)) / 2;
  const limitY = (gesture.height * (zoom - 1)) / 2;
  return {
    x: Math.max(
      -limitX,
      Math.min(
        limitX,
        gesture.pan.x + (point.x - gesture.x) / gesture.unitScale,
      ),
    ),
    y: Math.max(
      -limitY,
      Math.min(
        limitY,
        gesture.pan.y + (point.y - gesture.y) / gesture.unitScale,
      ),
    ),
  };
}

export default function CameraVersionComparison({ scope: s }) {
  if (s.page !== "camera" || s.panel !== "compare") return null;
  return <Comparison scope={s} />;
}

function Comparison({ scope: s }) {
  const dialog = useRef(null),
    drag = useRef(null);
  const [split, setSplit] = useState(50),
    [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const versions = s.resultVersions.filter(
    (version) =>
      version.status === "ready" &&
      !version.previewError &&
      (!s.unlocked || version.selected),
  );
  useEffect(() => {
    s.cameraCompare = true;
    dialog.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      s.cameraCompare = false;
    };
  }, [s]);
  const transform = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  };
  const keyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      s.closePanel();
    }
    if (event.key !== "Tab") return;
    const items = [
      ...dialog.current.querySelectorAll(
        "button:not([disabled]),input:not([disabled])",
      ),
    ];
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return (
    <section
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-compare-title"
      tabIndex={-1}
      className="camera-version-viewer"
      onKeyDown={keyDown}
    >
      <header className="camera-compare-header">
        <h2 id="camera-compare-title">成片对比</h2>
        <button
          type="button"
          aria-label="关闭成片对比"
          onClick={() => s.closePanel()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="camera-compare-labels">
        <span>{versions[0]?.name || "照片暂时无法显示"}</span>
        {versions[1] && <span>{versions[1].name}</span>}
      </div>
      <div className="camera-compare-stage">
        {!!versions.length && (
          <div
            className="camera-compare-frame"
            style={{
              "--result-ratio": s.draft.outputWidth / s.draft.outputHeight,
            }}
            onPointerDown={(event) => {
              if (zoom <= 1) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              const bounds = event.currentTarget.getBoundingClientRect();
              const width = event.currentTarget.clientWidth || bounds.width;
              const height = event.currentTarget.clientHeight || bounds.height;
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                pan,
                width,
                height,
                unitScale: bounds.width / width || 1,
              };
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              setPan(
                comparisonPan(
                  drag.current,
                  { x: event.clientX, y: event.clientY },
                  zoom,
                ),
              );
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <img
              src={versions[0].url}
              alt={versions[0].name}
              style={transform}
              draggable="false"
              onError={() => s.setVersionPreviewError(versions[0].id, true)}
            />
            {versions[1] && (
              <div
                className="camera-compare-reveal"
                style={{ clipPath: `inset(0 0 0 ${split}%)` }}
              >
                <img
                  src={versions[1].url}
                  alt={versions[1].name}
                  style={transform}
                  draggable="false"
                  onError={() => s.setVersionPreviewError(versions[1].id, true)}
                />
              </div>
            )}
            {versions[1] && (
              <span
                className="camera-compare-divider"
                style={{ left: split + "%" }}
                aria-hidden="true"
              />
            )}
            {!s.unlocked && (
              <span className="camera-version-watermark">知拍证件照</span>
            )}
          </div>
        )}
      </div>
      <div className="camera-compare-controls">
        {versions.length > 1 && (
          <label>
            对比位置
            <input
              type="range"
              min="0"
              max="100"
              value={split}
              aria-label="普通版与精修版分割位置"
              onChange={(event) => setSplit(Number(event.target.value))}
            />
          </label>
        )}
        {!!versions.length && (
          <label>
            缩放 {zoom.toFixed(1)}倍
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              aria-label="两张照片同步缩放"
              onChange={(event) => {
                setZoom(Number(event.target.value));
                setPan({ x: 0, y: 0 });
              }}
            />
          </label>
        )}
        <p>
          {versions.length > 1
            ? "拖动对比位置查看差异，放大后可拖动照片。"
            : "当前仅有一个版本可查看。"}
        </p>
      </div>
    </section>
  );
}
