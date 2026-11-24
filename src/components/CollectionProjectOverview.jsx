import React, { useRef } from "react";
import { ModuleFeedback } from "./Feedback.jsx";
import { View } from "../runtime/components.jsx";
import "../styles/album-photo-viewer.css";
import CollectionProjectHeader from "./CollectionProjectHeader.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";

const examples = [
  { key: "good", label: "正面清晰", description: "正对镜头，保证面部和双肩清晰入镜。" },
  { key: "mask", label: "面部遮挡", description: "整理头发，保持眉眼及面部轮廓清楚可见。" },
  { key: "gaze", label: "视线偏移", description: "平视镜头，头部保持端正。" },
  { key: "outfit", label: "服装过浅", description: "选择与照片背景区分明显的服装。" },
];
export function CollectionExampleViewer({ scope: s }) {
  const touch = useRef(null);
  const index = s.projectExampleIndex;
  const example = examples[index];
  const step = (delta) => {
    s.projectExampleIndex = Math.max(0, Math.min(examples.length - 1, index + delta));
  };
  return (
    <View as="section" scope={s} refName="collectionDialog"
      className="album-photo-viewer collection-example-viewer"
      role="dialog" aria-modal="true" aria-labelledby="collection-example-title"
      aria-describedby="collection-example-description" tabIndex={-1}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          step(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
      <header className="album-photo-viewer-toolbar">
        <span role="status">{index + 1} / {examples.length}</span>
        <button type="button" className="album-photo-viewer-close" aria-label="关闭拍摄示例"
          onClick={() => s.closePanel()}>
          <CollectionIcon name="close" />
        </button>
      </header>
      <div className="album-photo-viewer-stage"
        onTouchStart={({ touches }) => { touch.current = touches.length === 1 ? touches[0].clientX : null; }}
        onTouchCancel={() => { touch.current = null; }}
        onTouchEnd={({ changedTouches }) => {
          const start = touch.current;
          touch.current = null;
          if (start === null) return;
          const delta = changedTouches[0].clientX - start;
          if (Math.abs(delta) >= 44) step(delta < 0 ? 1 : -1);
        }}>
        <img src={`assets/collection-example-${example.key}.webp`} alt={example.label} />
      </div>
      <div className="collection-example-pagination">
        <button type="button" aria-disabled={index === 0} onClick={() => step(-1)}>上一张</button>
        <button type="button" aria-disabled={index === examples.length - 1} onClick={() => step(1)}>下一张</button>
      </div>
      <div className="collection-example-caption">
        <h2 id="collection-example-title">{example.label}</h2>
        <p id="collection-example-description">{example.description}</p>
      </div>
    </View>
  );
}

export function CollectionRequirements({ items }) {
  return (
    <ol className="collection-requirements-list">
      {items.map((text, i) => (
        <li key={i}>{text}</li>
      ))}
    </ol>
  );
}
export default function CollectionProjectOverview({ scope: s }) {
  if (s.view !== "project") return null;
  return (
    <div className="collection-project-overview">
      <CollectionProjectHeader project={s.project} />
      <div className="collection-project-content">
        <section className="collection-project-summary">
          <div className="collection-project-title-row">
            <h2>{s.project.name}</h2>
            <span className={"collection-chip " + s.projectState.tone}>
              {s.project.demoSchedule ? "演示 · " : ""}{s.projectState.label}
            </span>
          </div>
          <p className="collection-project-organization">
            <CollectionIcon name="collection-org" />
            <span>{s.project.organization}</span>
          </p>
          <dl className="collection-project-time">
            <dt>{s.project.demoSchedule ? "演示采集时间" : "采集时间"}</dt>
            <dd>{s.project.date}</dd>
          </dl>
        </section>
        {!s.canCollect && (
          <ModuleFeedback title={s.project.status === "ongoing" ? "暂未开放这个功能" : s.projectState.message}
            tone={s.project.status === "ended" ? "danger" : "warning"} />
        )}
        <section
          className="collection-requirements"
          aria-labelledby="collection-requirements-heading"
        >
          <header>
            <h3 id="collection-requirements-heading">采集要求</h3>
            <button
              className="collection-requirements-expand"
              aria-haspopup="dialog"
              onClick={() => s.openRequirements()}
            >
              查看全部要求
              <CollectionIcon name="chevron" />
            </button>
          </header>
          <CollectionRequirements items={s.project.requirements.slice(0, 3)} />
        </section>
        {s.projectRecords.length > 0 && <button
          type="button"
          className="collection-record-link"
          onClick={() => s.openPanel("projectRecords")}
        >
          <CollectionIcon name="document" />
          <strong>当前采集任务</strong>
          <span>{s.projectRecords.length} 条记录</span>
          <CollectionIcon name="chevron" />
        </button>}
        <section
          className="collection-project-examples"
          aria-labelledby="collection-examples-heading"
        >
          <h3 id="collection-examples-heading">拍摄示例</h3>
          <div className="collection-examples">
            {examples.map((item, index) => (
              <button type="button" key={item.key} aria-haspopup="dialog"
                aria-label={`放大拍摄示例：${item.label}`} onClick={(event) => s.openProjectExamples(index, event.currentTarget)}>
                <img src={`assets/collection-example-${item.key}.webp`} alt="" width="90" height="120" />
                <span className={item.key === "good" ? "collection-example-good" : undefined}>{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
