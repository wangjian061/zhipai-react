import React, { useLayoutEffect, useRef } from "react";
import { shootingGuides } from "../domain/collection-shooting.js";
import { CollectionIcon } from "./CollectionHome.jsx";
export default function CollectionShootingGuide({ scope: s }) {
  const node = useRef(null),
    file = useRef(null);
  const picker = s.panel === "captureMethod",
    guide = shootingGuides[s.shootingMode];
  useLayoutEffect(() => {
    if (!node.current) return;
    s.$refs.collectionDialog = node.current;
    const button = picker
      ? node.current.querySelector('[data-mode="' + s.shootingMode + '"]')
      : node.current.querySelector(".camera-workflow-dialog-actions button");
    (button || node.current.querySelector("button"))?.focus({
      preventScroll: true,
    });
    return () => {
      if (s.$refs.collectionDialog === node.current)
        delete s.$refs.collectionDialog;
    };
  }, [s, s.panel]);
  if (picker)
    return (
      <section
        ref={node}
        className="collection-drawer collection-auth-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shoot-method-title"
      >
        <header className="ui-sheet-header">
          <h2 id="shoot-method-title">人像采集</h2>
          <button onClick={() => s.closePanel()} aria-label="关闭">
            <CollectionIcon name="close" />
          </button>
        </header>
        <div className="ui-sheet-body collection-shoot-actions">
          {Object.entries(shootingGuides).map(([mode, g]) => (
            <button
              key={mode}
              data-mode={mode}
              onClick={() => s.chooseShootingMode(mode)}
            >
              <span>{g.title.split(" · ")[0]}</span>
              <small>{g.title.split(" · ")[1]}</small>
            </button>
          ))}
          <button onClick={() => file.current?.click()}>从相册选择照片</button>
          <input
            hidden
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) s.useCaptureFile(f);
            }}
          />
          {s.error && <p role="alert">{s.error}</p>}
        </div>
      </section>
    );
  if (s.panel !== "shootingGuide" || !guide) return null;
  return (
    <section
      ref={node}
      className="camera-workflow-dialog collection-shoot-guide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shoot-guide-title"
    >
      <div className="camera-workflow-message">
        <h2 id="shoot-guide-title">{guide.title}</h2>
        <img
          src={"/assets/collection-guide-" + s.shootingMode + ".jpeg"}
          alt={guide.alt}
        />
        {guide.steps.map(([heading, body]) => (
          <div className="shoot-step" key={heading}>
            <h3>{heading}</h3>
            <p>{body}</p>
          </div>
        ))}
        <label>
          <input
            type="checkbox"
            checked={s.skipShootingPrompt}
            onChange={(e) => {
              s.skipShootingPrompt = e.target.checked;
            }}
          />
          下次不再提示
        </label>
      </div>
      <footer className="camera-workflow-dialog-actions">
        <button onClick={() => s.acceptShootingGuide()}>
          知道了，开始拍摄
        </button>
      </footer>
    </section>
  );
}
