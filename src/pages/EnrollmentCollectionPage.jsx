import React, { useRef, useState } from "react";
import CollectionHeader from "../components/CollectionHeader.jsx";
import { CollectionIcon } from "../components/CollectionHome.jsx";
import CollectionSchoolDock from "../components/CollectionSchoolDock.jsx";
import { CollectionHeroModes, GraduateHeroRail } from "./UniversityCollectionPage.jsx";
import { ENROLLMENT_FLOW_STEPS, enrollmentHeroMode } from "../domain/collection-config.js";
import { layoutPrintPath, openCollectionPrint, rememberEnrollmentHero } from "../domain/collection-history.js";
import "./graduate-pages.css";
import "./enrollment-page.css";

const exampleMarks = {
  enrollment: "学",
  "enrollment-vocational": "职",
  "enrollment-postgraduate": "研",
  "example-arts": "艺",
};

function SchoolChip({ school, configured, duplicate, onOpen }) {
  const content = <>
    {school.crest
      ? <img className="enrollment-crest" src={school.crest} alt="" width="26" height="26" />
      : <span className="enrollment-crest enrollment-example-seal" data-school={school.id} aria-hidden="true">
          {exampleMarks[school.id] || "学"}
        </span>}
    {school.organization}
  </>;
  if (!configured) return <span className="enrollment-school-chip">{content}</span>;
  return <button className="enrollment-school-chip" type="button" data-project-id={school.id}
    tabIndex={duplicate ? -1 : undefined} onClick={() => onOpen(school.id)}>{content}</button>;
}

function SchoolWall({ projects, onOpen }) {
  const [heldRow, setHeldRow] = useState(null);
  const configured = projects.filter(school => school.type === "enrollment");
  const displaySchools = [
    ...projects.filter(school => school.type === "graduate" && school.crest),
    { id: "example-arts", organization: "示例艺术学院" },
  ];
  const rows = [0, 1, 2].map(row => [
    ...configured.filter((_, index) => index % 3 === row),
    ...displaySchools.filter((_, index) => index % 3 === row),
  ]);
  return <section className="enrollment-wall" aria-label="合作院校示例">
    <div className="enrollment-wall-rows">
      {rows.map((schools, row) => (
        <div className="enrollment-marquee" key={row}
          data-held={heldRow === row || undefined} onTouchStart={() => setHeldRow(row)}
          onTouchEnd={() => setHeldRow(null)} onTouchCancel={() => setHeldRow(null)}>
          <div className="enrollment-marquee-track">
            {[false, true].map(duplicate => (
              <div className="enrollment-marquee-group" key={String(duplicate)} aria-hidden={duplicate || undefined}>
                {schools.map(school => <SchoolChip key={school.id} school={school} configured={school.type === "enrollment"}
                  duplicate={duplicate} onOpen={onOpen} />)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <p className="enrollment-wall-note">合作院校展示 · 演示数据</p>
  </section>;
}

export default function EnrollmentCollectionPage({ scope: s }) {
  const [preview, setPreview] = useState(() => globalThis.history?.state?.enrollmentHero);
  const mode = enrollmentHeroMode(s.config, preview?.mode);
  const rail = useRef(null);
  const modalOpen = !!s.panel;

  function changeMode(value) {
    if (value === mode) return;
    setPreview({ ...rememberEnrollmentHero(value), afterSwitch: true });
  }
  function rememberPosition() {
    rememberEnrollmentHero(mode, rail.current?.index ?? 0);
  }

  return (
    <section className="university-page university-page--landing collection-category-canvas enrollment-landing" inert={modalOpen}
      aria-label="新生入学采集">
      <CollectionHeader title="新生入学采集" compact onBack={() => s.back()} support={s} />
      <div className="university-stage enrollment-stage" ref={node => { s.$refs.collectionCategoryList = node; }}>
        <CollectionHeroModes value={mode} onChange={changeMode} />
        {mode === "flow"
          ? <GraduateHeroRail mode="flow" items={ENROLLMENT_FLOW_STEPS} controls={rail} paused={modalOpen}
              initialIndex={preview?.index} afterSwitch={preview?.afterSwitch} />
          : <SchoolWall projects={s.projects} onOpen={id => { rememberPosition(); s.openProject(id); }} />}
        <section className="university-intake" aria-labelledby="enrollment-intake-title">
          <h2 id="enrollment-intake-title">查找你的录取院校</h2>
          <p>核验身份证号或学号，在线完成入学照采集</p>
          <button type="button" className="primary-button university-scan-button"
            ref={node => { s.$refs.projectSearchEntry = node; }} onClick={() => { rememberPosition(); s.enterProjectSearch(); }}>
            <CollectionIcon name="search" />查找录取院校
          </button>
        </section>
      </div>
      <CollectionSchoolDock category="enrollment" records={s.categoryRecordSummary}
        onPrint={() => { rememberPosition(); openCollectionPrint(layoutPrintPath); }}
        onRecords={() => { rememberPosition(); s.openCategoryRecords(); }} />
    </section>
  );
}
