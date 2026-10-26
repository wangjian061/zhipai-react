import React from "react";
import CollectionHeader from "./CollectionHeader.jsx";
import CollectionProjectRows from "./CollectionProjectRows.jsx";
import { CollectionSearch } from "./CollectionHome.jsx";
import CollectionProjectSearch from "./CollectionProjectSearch.jsx";
export default function CollectionProjects({ scope: s }) {
  if (s.view !== "projects") return null;
  if (s.projectCategory === "all") return <CollectionProjectSearch scope={s} />;
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
        <div className="collection-list-heading">
          <h2>采集项目</h2>
          <span>{s.projectsShown.length} 个项目</span>
        </div>
        <CollectionProjectRows scope={s} />
      </div>
    </div>
  );
}
