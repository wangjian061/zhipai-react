import React, { useLayoutEffect, useRef } from "react";
import frontGuideImage from "/assets/collection-guide-front.jpeg?url";
import rearGuideImage from "/assets/collection-guide-rear.jpeg?url";
import frontCaptureIcon from "/assets/collection-capture-front.png?url";
import rearCaptureIcon from "/assets/collection-capture-rear.png?url";
import albumCaptureIcon from "/assets/collection-capture-album.png?url";
import { shootingGuides } from "../domain/collection-shooting.js";

const guideImages = { front: frontGuideImage, rear: rearGuideImage };
const captureIcons = { front: frontCaptureIcon, rear: rearCaptureIcon, album: albumCaptureIcon };
const albumChoice = { cameraLabel: "相册选图", captureLabel: "上传照片" };
const dismissPullDistance = 72;

export default function CollectionShootingGuide({ scope: s }) {
  const node = useRef(null);
  const pull = useRef(null);
  const moved = useRef(false);
  const picker = s.panel === "captureMethod",
    guide = shootingGuides[s.shootingMode];
  useLayoutEffect(() => {
    const dialog = node.current;
    if (!dialog) return;
    s.$refs.collectionDialog = dialog;
    const initialFocus = picker
      ? dialog.querySelector('[data-mode="' + s.shootingMode + '"]') || dialog.querySelector("[data-mode]")
      : dialog.querySelector("#shoot-guide-title");
    (initialFocus || dialog.querySelector("button"))?.focus({
      preventScroll: true,
    });
    return () => {
      pull.current = null;
      moved.current = false;
      if (s.$refs.collectionDialog === dialog)
        delete s.$refs.collectionDialog;
    };
  }, [s, s.panel]);

  function startPull(event) {
    if (!event.isPrimary || event.button !== 0 || s.busy) return;
    const sheet = node.current;
    const scale = sheet.getBoundingClientRect().height / sheet.offsetHeight || 1;
    pull.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, scale };
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    sheet.dataset.pulling = "";
  }

  function movePull(event) {
    const active = pull.current;
    if (!active || active.id !== event.pointerId) return;
    const deltaY = event.clientY - active.startY;
    moved.current ||= Math.hypot(event.clientX - active.startX, deltaY) / active.scale >= 8;
    node.current.style.setProperty(
      "--shoot-preparation-pull",
      `${Math.max(0, deltaY / active.scale)}px`,
    );
  }

  function endPull(event) {
    const active = pull.current;
    if (!active || active.id !== event.pointerId) return;
    pull.current = null;
    const deltaY = event.clientY - active.startY;
    moved.current ||=
      event.type !== "pointerup" ||
      Math.hypot(event.clientX - active.startX, deltaY) / active.scale >= 8;
    delete node.current.dataset.pulling;
    node.current.style.removeProperty("--shoot-preparation-pull");
    if (event.type === "pointerup" && deltaY / active.scale >= dismissPullDistance)
      s.closePanel();
  }

  const grip = (
    <button
      type="button"
      className="collection-shoot-grip"
      aria-label={picker ? "关闭采集方式选择" : "关闭拍摄准备"}
      disabled={s.busy}
      onPointerDown={startPull}
      onPointerMove={movePull}
      onPointerUp={endPull}
      onPointerCancel={endPull}
      onLostPointerCapture={endPull}
      onClick={(event) => {
        if (!moved.current || event.detail === 0) s.closePanel();
      }}
    />
  );
  const methods = s.captureMethods;
  if (picker)
    return (
      <section
        key="capture-method"
        ref={node}
        className="collection-drawer ui-sheet collection-shoot-sheet collection-shoot-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shoot-method-title"
      >
        <header className="ui-sheet-header">
          {grip}
          <h2 id="shoot-method-title">请选择采集方式</h2>
        </header>
        <div className="ui-sheet-body">
          <div className="collection-shoot-actions utility-grid" data-columns={methods.length}>
            {methods.map((mode) => {
              const choice = shootingGuides[mode] || albumChoice;
              return (
                <button
                  key={mode}
                  type="button"
                  className="utility-grid-item"
                  data-mode={mode}
                  disabled={!s.canChooseCapture}
                  onClick={() => mode === "album" ? s.chooseCaptureFile() : s.chooseShootingMode(mode)}
                >
                  <span className="utility-item-icon">
                    <img src={captureIcons[mode]} alt="" width="48" height="48" />
                    {mode === "rear" && <span className="collection-shoot-recommend">推荐</span>}
                  </span>
                  <span className="collection-shoot-name">{choice.cameraLabel}</span>
                  <small>{choice.captureLabel}</small>
                </button>
              );
            })}
          </div>
          {s.error && <p className="collection-error" role="alert">{s.error}</p>}
        </div>
      </section>
    );
  if (s.panel !== "shootingGuide" || !guide) return null;
  return (
    <section
      key="shooting-guide"
      ref={node}
      className="collection-drawer ui-sheet collection-shoot-sheet collection-shoot-preparation"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shoot-guide-title"
    >
      <header className="ui-sheet-header">{grip}</header>
      <div className="ui-sheet-panel">
        <div className="ui-sheet-body collection-shoot-preparation-body">
          <div className="collection-shoot-preparation-content">
            <h2 id="shoot-guide-title" className="collection-shoot-preparation-title" tabIndex={-1}>
              <span className="collection-shoot-preparation-selection">
                {methods.length === 1 ? "本次使用" : "您已选择"}{guide.cameraLabel}
              </span>{" "}
              <span>{guide.guideTitle}</span>
            </h2>
            <img
              className="collection-shoot-illustration"
              src={guideImages[s.shootingMode]}
              alt={guide.alt}
              width="600"
              height="800"
            />
            <ol className="camera-workflow-description collection-shoot-steps">
              {guide.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
        </div>
        <footer className="ui-sheet-footer">
          <button
            type="button"
            className="collection-primary"
            disabled={!s.canChooseCapture}
            onClick={() => s.acceptShootingGuide()}
          >
            进入相机
          </button>
        </footer>
      </div>
    </section>
  );
}
