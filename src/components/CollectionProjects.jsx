import React from "react";
import AssociationCollectionPage from "../pages/AssociationCollectionPage.jsx";
import EnrollmentCollectionPage from "../pages/EnrollmentCollectionPage.jsx";
import CollectionHeader from "./CollectionHeader.jsx";
import CollectionProjectRows from "./CollectionProjectRows.jsx";
import { CollectionSearch } from "./CollectionHome.jsx";
import CollectionProjectSearch from "./CollectionProjectSearch.jsx";
export default function CollectionProjects({ scope: s }) {
  if (s.view !== "projects") return null;
  if (s.isProjectSearch) return <CollectionProjectSearch scope={s} />;
  if (s.projectCategory === "enrollment")
    return s.page === "collection" ? <EnrollmentCollectionPage scope={s} /> : null;
  if (s.projectCategory === "association")
    return s.page === "collection" ? <AssociationCollectionPage scope={s} /> : null;
  const records = s.categoryRecordSummary;
  return (
    <div className="collection-section collection-category-page collection-category-canvas">
      <CollectionHeader
        compact
        title={s.categoryInfo.name}
        image={s.categoryInfo.image}
        onBack={() => s.back()}
      />
      <div className="collection-home-inner">
        <div className="collection-category-actions">
          <CollectionSearch scope={s} />
          <button
            type="button"
            className="collection-record-entry"
            aria-label={`${s.categoryInfo.recordsTitle}，${records.label}`}
            onClick={() => s.openCategoryRecords()}
          >
            <img
              src="assets/collection-icon-records.webp"
              width="20"
              height="20"
              alt=""
            />
            <span>采集记录</span>
            {records.count !== null && (
              <span className="collection-record-count" aria-hidden="true">
                {records.count}
              </span>
            )}
          </button>
        </div>
        {s.projectCategory === "graduate" && (
          <div className="collection-code-shortcut">
            <div>
              <strong>已有学信网图像采集码？</strong>
              <p>扫码自动匹配所属院校与身份</p>
            </div>
            <button type="button" onClick={() => s.openCategoryScanner()}>
              <span>扫码 / 上传</span>
            </button>
          </div>
        )}
        <div className="collection-list-heading">
          <div className="collection-list-title">
            <h2>采集项目</h2>
            <span aria-live="polite">{s.projectsShown.length} 个项目</span>
          </div>
          <div className="collection-project-filters" role="group" aria-label="筛选采集项目">
            {[["all", "全部"], ["open", "可采集"]].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={s.projectFilter === id}
                onClick={() => s.setProjectFilter(id)}><span>{label}</span></button>
            ))}
          </div>
        </div>
        <CollectionProjectRows scope={s} />
      </div>
    </div>
  );
}
