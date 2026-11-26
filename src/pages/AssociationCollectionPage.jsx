import React, { useLayoutEffect, useRef } from "react";
import CollectionHeader from "../components/CollectionHeader.jsx";
import CollectionCardDates from "../components/CollectionCardDates.jsx";
import { CollectionIcon } from "../components/CollectionHome.jsx";
import CollectionSchoolDock from "../components/CollectionSchoolDock.jsx";
import AssociationOfferCarousel from "../components/AssociationOfferCarousel.jsx";
import { startCollectionMarquee } from "../domain/collection-marquee.js";
import "./association-page.css";

function OrganizationCard({ project, onOpen }) {
  return (
    <button className="association-org-card" type="button" data-project-id={project.id}
      onClick={event => { if (!event.defaultPrevented) onOpen(project.id); }}>
      <img className="association-org-cover" src={project.image} alt="" width="360" height="116" draggable={false} />
      <span className="association-org-copy">
        <strong className="association-org-heading">{project.organization}</strong>
        <span className="association-org-project">{project.name}</span>
        <span className="association-org-status">进行中</span>
      </span>
      <CollectionCardDates range={project.date} />
    </button>
  );
}

export default function AssociationCollectionPage({ scope: s }) {
  const list = useRef(null);
  const rail = useRef(null);
  const organizations = s.projects.filter(project => project.type === "association" && project.status === "ongoing");
  useLayoutEffect(() => {
    const node = rail.current;
    if (!node) return;
    s.$refs.associationRail = node;
    node.scrollLeft = history.state?.associationRailOffset || 0;
    const stop = startCollectionMarquee(node, organizations.length, undefined, undefined, { autoplay: false });
    return () => {
      stop();
      if (s.$refs.associationRail === node) delete s.$refs.associationRail;
    };
  }, [s, organizations.length]);
  useLayoutEffect(() => {
    const node = list.current;
    s.$refs.collectionCategoryList = node;
    node.scrollTop = s.sectionScroll[s.scrollKey] || 0;
    return () => {
      if (s.$refs.collectionCategoryList === node) delete s.$refs.collectionCategoryList;
    };
  }, [s]);

  return (
    <section className="university-page university-page--landing collection-category-canvas association-landing"
      aria-label="其它采集" inert={!!s.panel}>
      <CollectionHeader title="其它采集" compact onBack={() => s.back()} support={s} />
      <div className="association-list" ref={list}>
        <AssociationOfferCarousel scope={s} />
        <section className="association-organizations" aria-labelledby="association-orgs-title">
          <div className="association-orgs-heading">
            <h2 id="association-orgs-title">正在采集</h2>
            <button type="button" className="ui-button-text" data-directory-entry
              onClick={() => s.enterProjectSearch("", "directory")}>全部机构 <CollectionIcon name="chevron" /></button>
          </div>
          {organizations.length ? (
            <div className="association-orgs" ref={rail}>
              {organizations.map(project => <OrganizationCard key={project.id} project={project}
                onOpen={id => s.openProject(id)} />)}
            </div>
          ) : <p className="collection-empty">暂无进行中的机构采集</p>}
        </section>
      </div>
      <section className="university-intake association-intake" aria-labelledby="association-intake-title">
        <p id="association-intake-title">查找所属机构，开启照片采集</p>
        <button className="primary-button university-scan-button" type="button"
          ref={node => { s.$refs.projectSearchEntry = node; }} onClick={() => s.enterProjectSearch()}>
          <CollectionIcon name="search" />搜索查找机构
        </button>
      </section>
      <CollectionSchoolDock category="association" records={s.categoryRecordSummary}
        onScan={() => s.openCategoryScanner()} onRecords={() => s.openCategoryRecords()}
        onPrint={() => s.openAssociationPrint()} />
    </section>
  );
}
