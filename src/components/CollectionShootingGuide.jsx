import React, { useCallback, useRef } from "react";
import SharedSheet from "./SharedSheet.jsx";
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
  const picker = s.panel === "captureMethod",
    guide = shootingGuides[s.shootingMode];
  const initialFocus = useRef(null);
  const attach = useCallback((dialog) => {
    if (dialog) s.$refs.collectionDialog = dialog;
    else if (s.$refs.collectionDialog === node.current) delete s.$refs.collectionDialog;
    node.current = dialog;
    if (!dialog) pull.current = null;
  }, [s]);

  function startPull(event) {
    if (!event.isPrimary || event.button !== 0 || s.busy) return;
    const sheet = node.current;
    const scale = sheet.getBoundingClientRect().height / sheet.offsetHeight || 1;
    pull.current = { id: event.pointerId, startY: event.clientY, scale };
    event.currentTarget.setPointerCapture(event.pointerId);
    sheet.dataset.pulling = "";
  }

  function movePull(event) {
    const active = pull.current;
    if (!active || active.id !== event.pointerId) return;
    const deltaY = event.clientY - active.startY;
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
    delete node.current.dataset.pulling;
    node.current.style.removeProperty("--shoot-preparation-pull");
    if (event.type === "pointerup" && deltaY / active.scale >= dismissPullDistance)
      s.closePanel();
  }

  const grip = (
    <span className="collection-shoot-grip" aria-hidden="true"
      onPointerDown={startPull}
      onPointerMove={movePull}
      onPointerUp={endPull}
      onPointerCancel={endPull}
      onLostPointerCapture={endPull}
    />
  );
  const methods = s.captureMethods;
  const initialMode = methods.includes(s.shootingMode) ? s.shootingMode : methods[0];
  if (picker)
    return (
      <SharedSheet opened embedded key="capture-method" id="shoot-method-title"
        dialogRef={attach} initialFocusRef={initialFocus}
        className="collection-drawer collection-shoot-sheet collection-shoot-picker"
        title="请选择采集方式" leading={grip} busy={s.busy} onClose={() => s.closePanel()}>
        <div className="collection-shoot-actions utility-grid" data-columns={methods.length}>
          {methods.map((mode) => {
            const choice = shootingGuides[mode] || albumChoice;
            return (
              <button
                key={mode}
                type="button"
                className="utility-grid-item"
                data-mode={mode}
                ref={mode === initialMode ? initialFocus : undefined}
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
      </SharedSheet>
    );
  if (s.panel !== "shootingGuide" || !guide) return null;
  return (
    <SharedSheet opened embedded key="shooting-guide" id="shoot-guide-title"
      dialogRef={attach}
      className="collection-drawer collection-shoot-sheet collection-shoot-preparation"
      title={(methods.length === 1 ? "本次使用" : "您已选择") + guide.cameraLabel}
      leading={grip} busy={s.busy} onClose={() => s.closePanel()}
      footer={<button type="button" className="collection-primary"
        disabled={!s.canChooseCapture} onClick={() => s.acceptShootingGuide()}>
        进入相机
      </button>}>
      <div className="collection-shoot-preparation-content">
        <p className="collection-shoot-preparation-subtitle">{guide.guideTitle}</p>
        <img className="collection-shoot-illustration" src={guideImages[s.shootingMode]}
          alt={guide.alt} width="600" height="800" />
        <ol className="camera-workflow-description collection-shoot-steps">
          {guide.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
    </SharedSheet>
  );
}
