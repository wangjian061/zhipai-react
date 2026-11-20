import React, { useEffect, useRef, useState } from "react";
import { Portal } from "../runtime/components.jsx";
import { FeedbackToast } from "./Feedback.jsx";
import { documentGestureAction, documentViewport, fitDocumentPhoto } from "../domain/document-viewer.js";

const fittedView = { zoom: 1, x: 0, y: 0 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function DocumentPhotoStage({ blob, onStep, onClose, onUnavailable, onAvailable }) {
  const [view, setView] = useState(fittedView);
  const [source, setSource] = useState(null);
  const [failed, setFailed] = useState(false);
  const currentView = useRef(fittedView);
  const image = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(null);

  useEffect(() => {
    if (!(blob instanceof Blob) || !blob.size) return;
    const url = URL.createObjectURL(blob);
    setSource({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  function geometry(stage, event) {
    const rect = stage.getBoundingClientRect();
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    const frame = fitDocumentPhoto(
      width,
      height,
      image.current?.naturalWidth || width,
      image.current?.naturalHeight || height,
    );
    const point = {
      x: ((event.clientX - rect.left) / (rect.width || 1) - 0.5) * width,
      y: ((event.clientY - rect.top) / (rect.height || 1) - 0.5) * height,
    };
    return { frame, point };
  }

  function updateView(frame, base, zoom, origin, target) {
    const next = documentViewport(base, frame, zoom, origin, target);
    currentView.current = next;
    setView(next);
  }

  function start(event) {
    if (event.button !== 0 || pointers.current.size >= 2) return;
    const { point } = geometry(event.currentTarget, event);
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const [first, second] = pointers.current.values();
    if (second) {
      lastTap.current = null;
      gesture.current = {
        kind: "pinch", origin: midpoint(first, second),
        distance: Math.max(1, distance(first, second)), base: currentView.current,
      };
    } else {
      gesture.current = {
        kind: currentView.current.zoom > 1 ? "pan" : "swipe",
        origin: first, base: currentView.current, tap: true,
      };
    }
  }

  function move(event) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    const { frame, point } = geometry(event.currentTarget, event);
    pointers.current.set(event.pointerId, point);
    const active = gesture.current;
    if (active.kind === "pinch") {
      const [first, second] = pointers.current.values();
      updateView(frame, active.base, active.base.zoom * distance(first, second) / active.distance,
        active.origin, midpoint(first, second));
    } else if (active.kind === "pan") {
      if (distance(point, active.origin) > 14) active.tap = false;
      updateView(frame, active.base, active.base.zoom, active.origin, point);
    } else if (active.kind === "swipe" && distance(point, active.origin) > 14) {
      active.tap = false;
    }
  }

  function finish(event, cancelled = false) {
    if (!pointers.current.delete(event.pointerId)) return;
    const active = gesture.current;
    if (!active) return;
    if (pointers.current.size) {
      const [remaining] = pointers.current.values();
      gesture.current = {
        kind: currentView.current.zoom > 1 ? "pan" : "hold",
        origin: remaining, base: currentView.current, tap: false,
      };
      return;
    }
    gesture.current = null;
    if (cancelled || active.kind === "hold" || active.kind === "pinch") {
      lastTap.current = null;
      return;
    }
    const { frame, point } = geometry(event.currentTarget, event);
    if (active.tap && distance(point, active.origin) <= 14) {
      const previous = lastTap.current;
      if (previous && event.timeStamp - previous.time < 320 && distance(point, previous.point) < 28) {
        lastTap.current = null;
        const base = currentView.current;
        updateView(frame, base, base.zoom > 1 ? 1 : 2, point);
      } else lastTap.current = { time: event.timeStamp, point };
      return;
    }
    lastTap.current = null;
    if (active.kind !== "swipe") return;
    const action = documentGestureAction(point.x - active.origin.x, point.y - active.origin.y);
    if (action === "close") onClose();
    if (action === "next" || action === "previous") onStep(action === "next" ? 1 : -1);
  }

  const missing = !(blob instanceof Blob) || !blob.size;
  return (
    <div className="album-photo-viewer-stage document-viewer-stage"
      onPointerDown={start} onPointerMove={move} onPointerUp={finish}
      onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}>
      {missing || failed ? <p className="album-photo-viewer-error" role="status">照片暂时无法显示</p> :
        source?.blob === blob && <img ref={image} src={source.url} alt="当前证件照片" draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
          onLoad={onAvailable}
          onError={() => { setFailed(true); onUnavailable(); }} />}
    </div>
  );
}

export default function DocumentPhotoViewer({ group, index, onPage, onClose, onSave, onReplace }) {
  const close = useRef(null);
  const dialog = useRef(null);
  const [failedPhoto, setFailedPhoto] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const photo = group.photos[index];
  const title = group.name + " · " + (index + 1) + "/" + group.photos.length;
  const saveDisabled = !(photo.blob instanceof Blob) || !photo.blob.size || failedPhoto === photo.id;
  useEffect(() => { close.current?.focus(); }, []);
  const step = (direction) => {
    const target = Math.max(0, Math.min(group.photos.length - 1, index + direction));
    if (target !== index) onPage(target);
  };
  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Tab") {
      const buttons = Array.from(dialog.current.querySelectorAll("button:not(:disabled)"));
      const end = event.shiftKey ? buttons[0] : buttons.at(-1);
      if (event.target === end) {
        event.preventDefault();
        (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
      }
    }
  }
  return (
    <Portal target="#shared-modal-layer">
      <div className="album-photo-viewer archive-zoom document-viewer" ref={dialog}
        role="dialog" aria-modal="true" aria-labelledby="document-viewer-title" onKeyDown={onKeyDown}>
        <div className="album-photo-viewer-toolbar document-viewer-toolbar">
          <h2 id="document-viewer-title" aria-live="polite">{title}</h2>
          <button type="button" className="album-photo-viewer-close" ref={close} aria-label="关闭证件照片" onClick={onClose}>
            <svg aria-hidden="true"><use href="#i-close" /></svg>
          </button>
        </div>
        <DocumentPhotoStage key={photo.id} blob={photo.blob}
          onStep={step} onClose={onClose} onUnavailable={() => setFailedPhoto(photo.id)}
          onAvailable={() => setFailedPhoto((failed) => failed === photo.id ? null : failed)} />
        <footer className="document-viewer-actions">
          <button type="button" disabled={saveDisabled} onClick={() => {
            const message = onSave(photo, index);
            setFeedback((previous) => ({ photoId: photo.id, id: (previous?.id || 0) + 1, message }));
          }}>保存照片</button>
          <button type="button" onClick={onReplace}>替换</button>
        </footer>
        {feedback?.photoId === photo.id && <FeedbackToast key={feedback.id} message={feedback.message} />}
      </div>
    </Portal>
  );
}
