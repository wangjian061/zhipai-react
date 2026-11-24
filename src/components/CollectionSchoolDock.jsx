import React from "react";
import { COLLECTION_CATEGORIES } from "../domain/collection-config.js";

const printLabels = { graduate: "毕业照冲印", enrollment: "冲印照片", association: "冲印照片" };

export default function CollectionSchoolDock({
  category = "graduate", records, printEntry, guideExpanded, printExpanded, onGuide, onScan, onRecords, onPrint,
}) {
  const printOpensSheet = category === "graduate";
  const recordsTitle = COLLECTION_CATEGORIES.find(item => item.id === category).recordsTitle;
  return <nav className="university-dock" data-columns={category === "enrollment" ? 2 : 3} aria-label="采集服务">
    {category === "graduate" && <button type="button" aria-haspopup="dialog" aria-expanded={guideExpanded} onClick={onGuide}>
      <img src="/assets/university-dock-guide.webp" width="28" height="28" alt="" />
      <span>采集码指引</span>
    </button>}
    {category === "association" && <button type="button" onClick={onScan}>
      <img src="/assets/association-dock-scan.svg" width="28" height="28" alt="" />
      <span>扫码进机构</span>
    </button>}
    <button type="button" aria-label={`${recordsTitle}，${records?.label || "读取中"}`} onClick={onRecords}>
      <span className="university-dock-icon">
        <img src="/assets/university-dock-records.webp" width="28" height="28" alt="" />
        {records?.count != null && <strong className="university-record-count" aria-hidden="true">{records.count}</strong>}
      </span>
      <span>采集记录</span>
    </button>
    <button ref={printEntry} type="button" aria-haspopup={printOpensSheet ? "dialog" : undefined}
      aria-expanded={printOpensSheet ? printExpanded : undefined} onClick={onPrint}>
      <span className="university-dock-icon">
        <img src="/assets/university-dock-print.webp" width="28" height="28" alt="" />
        {printOpensSheet && <span className="university-print-badge" aria-hidden="true">热印</span>}
      </span>
      <span>{printLabels[category]}</span>
    </button>
  </nav>;
}
