import React from "react";
import CollectionHeader from "./CollectionHeader.jsx";
import CollectionProjectRows from "./CollectionProjectRows.jsx";
import { CollectionSearch, CollectionIcon } from "./CollectionHome.jsx";
import CollectionProjectSearch from "./CollectionProjectSearch.jsx";
export default function CollectionProjects({ scope: s }) {
  if (s.view !== "projects") return null;
  if (s.isProjectSearch) return <CollectionProjectSearch scope={s} />;
  return (
    <div className="collection-section collection-category-page">
      <CollectionHeader
        title={s.categoryInfo.name}
        subtitle={s.categoryInfo.subtitle}
        image={s.categoryInfo.image}
        onBack={() => s.back()}
      />
      <div className="collection-home-inner">
        <CollectionSearch scope={s} />
        <button
          type="button"
          className="collection-center-entry collection-record-entry"
          onClick={() => s.openCategoryRecords()}
        >
          <img
            src="assets/collection-icon-records.webp"
            width="32"
            height="32"
            alt=""
          />
          <span>
            <strong>{s.categoryInfo.recordsTitle}</strong>
          </span>
          <small aria-live="polite">{s.categoryRecordCountLabel}</small>
          <CollectionIcon name="chevron" />
        </button>
        <div className="collection-list-heading">
          <h2>采集项目</h2>
          <span>{s.projectsShown.length} 个项目</span>
        </div>
        <CollectionProjectRows scope={s} />
      </div>
    </div>
  );
}
