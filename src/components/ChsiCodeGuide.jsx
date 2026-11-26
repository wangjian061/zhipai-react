import React, { useCallback, useId } from "react";
import { Portal } from "../runtime/components.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";
import { collectionCodeHelp, universityChsiSteps } from "../domain/collection-code-help.js";
import "../styles/album-photo-viewer.css";

const sample = "/assets/collection-chsi-code-sample.webp";

export function CodeGuide({ onOpenSample, albumHint }) {
  const heading = useId();
  return <>
    <section className="university-code-example" aria-labelledby={heading}>
      <button type="button" className="university-sample" aria-label="放大学信网图像采集码示例"
        aria-haspopup="dialog" onClick={onOpenSample}>
        <img src={sample} width="373" height="536" alt="" />
      </button>
      <div className="university-code-example-copy">
        <span className="university-code-source">学信网官方凭证</span>
        <h3 id={heading}>图像采集码长这样</h3>
        <ul className="university-code-checklist" role="list">
          <li><CollectionIcon name="check" />含姓名与院校学籍</li>
          <li><CollectionIcon name="check" />二维码完整无遮挡</li>
        </ul>
        <button type="button" className="university-sample-zoom" aria-haspopup="dialog" onClick={onOpenSample}>
          <CollectionIcon name="search" />放大看样图
        </button>
      </div>
    </section>
    <ol className="university-code-steps" role="list">
      {universityChsiSteps.map(({ title, path }, index) => (
        <li key={title}>
          <span className="university-code-step-number" aria-hidden="true">{index + 1}</span>
          <div><strong>{title}</strong><p>{albumHint && index === universityChsiSteps.length - 1 ? albumHint : path}</p></div>
        </li>
      ))}
    </ol>
    <div className="university-tutorial">
      <span>找不到入口？</span>
      <a className="ui-button-text" href={collectionCodeHelp.chsi.url} target="_blank" rel="noopener noreferrer">
        查看图文教程 <CollectionIcon name="chevron" />
      </a>
    </div>
  </>;
}
export function SampleViewer({ onClose, target = "#collection-modal-layer" }) {
  const focusClose = useCallback((button) => { button?.focus({ preventScroll: true }); }, []);
  return <Portal target={target}>
    <section className="album-photo-viewer collection-example-viewer" role="dialog"
      aria-modal="true" aria-label="学信网图像采集码示例"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key === "Tab") event.preventDefault();
      }}>
      <header className="album-photo-viewer-toolbar">
        <button ref={focusClose} type="button" className="album-photo-viewer-close" aria-label="关闭大图" onClick={onClose}>
          <CollectionIcon name="close" />
        </button>
      </header>
      <div className="album-photo-viewer-stage">
        <img src={sample} alt="学信网图像采集码示例" />
      </div>
    </section>
  </Portal>;
}
