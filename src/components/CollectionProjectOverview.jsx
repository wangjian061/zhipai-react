import React from "react";
import CollectionProjectHeader from "./CollectionProjectHeader.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";

const examples = [
  { key: "good", label: "正面清晰" },
  { key: "mask", label: "面部遮挡" },
  { key: "gaze", label: "视线偏移" },
  { key: "outfit", label: "服装过浅" },
];
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
              {s.projectState.label}
            </span>
          </div>
          <p className="collection-project-organization">
            <CollectionIcon name="collection-org" />
            <span>{s.project.organization}</span>
          </p>
          <dl className="collection-project-time">
            <dt>采集时间</dt>
            <dd>{s.project.date}</dd>
          </dl>
        </section>
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
        <button
          className="collection-record-link"
          onClick={() => s.openPanel("projectRecords")}
        >
          <CollectionIcon name="document" />
          <strong>当前采集任务</strong>
          <span>{s.projectRecords.length} 条记录</span>
          <CollectionIcon name="chevron" />
        </button>
        <section
          className="collection-project-examples"
          aria-labelledby="collection-examples-heading"
        >
          <h3 id="collection-examples-heading">拍摄示例</h3>
          <div className="collection-examples">
            {examples.map((item) => (
              <figure key={item.key}>
                <img
                  src={"assets/collection-example-" + item.key + ".webp"}
                  alt={item.label}
                  width="90"
                  height="120"
                />
                <figcaption
                  className={
                    item.key === "good" ? "collection-example-good" : undefined
                  }
                >
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
