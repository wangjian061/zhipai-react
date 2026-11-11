import React from "react";
import CollectionHeader from "./CollectionHeader.jsx";
import CollectionProjectRows from "./CollectionProjectRows.jsx";
import { CollectionSearch } from "./CollectionHome.jsx";
import CollectionProjectSearch from "./CollectionProjectSearch.jsx";
export default function CollectionProjects({ scope: s }) {
  if (s.view !== "projects") return null;
  if (s.isProjectSearch) return <CollectionProjectSearch scope={s} />;
  const records = s.categoryRecordSummary;
  return (
    <div className="collection-section collection-category-page">
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
        <div className="collection-list-heading">
          <h2>采集项目</h2>
          <span>{s.projectsShown.length} 个项目</span>
        </div>
        <CollectionProjectRows scope={s} />
      </div>
    </div>
  );
}
