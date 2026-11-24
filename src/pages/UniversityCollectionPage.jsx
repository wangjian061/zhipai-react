import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Portal } from "../runtime/components.jsx";
import { getControllerScopes, getSnapshot, subscribe } from "../runtime/state.js";
import CollectionHeader from "../components/CollectionHeader.jsx";
import SegmentedControl from "../components/SegmentedControl.jsx";
import { GRADUATE_FLOW_STEPS, graduateHeroMode } from "../domain/collection-config.js";
import { mountGraduateRail } from "../domain/graduate-hero-rail.js";
import CollectionCardDates from "../components/CollectionCardDates.jsx";
import { CollectionIcon } from "../components/CollectionHome.jsx";
import CollectionSchoolDock from "../components/CollectionSchoolDock.jsx";
import { PrintShowroom, clearPrintReturn } from "../components/CollectionPrintShowroom.jsx";
import SharedSheet from "../components/SharedSheet.jsx";
import { TaskBackButton } from "../components/ToolNavigation.jsx";
import { collectionCodeHelp, universityChsiSteps } from "../domain/collection-code-help.js";
import { goGraduate } from "../domain/graduate-print.js";
import { collectionHistoryState, rememberGraduateHero, returnCollectionHistory, universityPath, universityProjectPath } from "../domain/collection-history.js";
import "../styles/album-photo-viewer.css";
import "./graduate-pages.css";

const cap = "/assets/collection-icon-graduate.webp";
const sample = "/assets/collection-chsi-code-sample.webp";
const scanLabel = "扫码 / 上传采集码";
const statusLabels = { ongoing: "进行中", not_started: "未开始", ended: "已结束" };
const scrollPositions = new Map();
const heroModes = [{ value: "flow", label: "采集流程" }, { value: "schools", label: "合作院校" }];
export function CollectionHeroModes({ value, onChange }) {
  return <div className="university-hero-modes">
    <SegmentedControl label="原型配置切换 · 正式版由后台配置" options={heroModes} value={value} onChange={onChange} />
  </div>;
}
function universityLink(mode, params = {}) {
  return universityPath + (mode ? "&" + new URLSearchParams({ mode, ...params }) : "");
}
function CodeGuide({ onOpenSample }) {
  return <>
    <section className="university-code-example" aria-labelledby="university-code-example-title">
      <button type="button" className="university-sample" aria-label="放大学信网图像采集码示例"
        aria-haspopup="dialog" onClick={onOpenSample}>
        <img src={sample} width="373" height="536" alt="" />
      </button>
      <div className="university-code-example-copy">
        <span className="university-code-source">学信网官方凭证</span>
        <h3 id="university-code-example-title">图像采集码长这样</h3>
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
          <div><strong>{title}</strong><p>{path}</p></div>
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
function SampleViewer({ onClose }) {
  const focusClose = useCallback((button) => { button?.focus({ preventScroll: true }); }, []);
  return <Portal target="#collection-modal-layer">
    <section className="album-photo-viewer collection-example-viewer" role="dialog"
      aria-modal="true" aria-label="学信网图像采集码示例"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
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
function SchoolCard({ school, onSelect, rail = false, duplicate = false }) {
  const status = <span className="university-status" data-status={school.status}>
    {!rail && school.demoSchedule ? "演示 · " : ""}{statusLabels[school.status]}
  </span>;
  if (rail) {
    return <button type="button" className="university-school-card university-school-feature"
      aria-hidden={duplicate || undefined} tabIndex={duplicate ? -1 : undefined}
      onMouseDown={(event) => event.preventDefault()} onClick={onSelect}>
      <span className="university-school-cover">
        <img src={school.image} alt="" />
      </span>
      <span className="university-school-identity">
        {school.crest && <img className="university-school-crest" src={school.crest} alt="" width="54" height="54" />}
      </span>
      <span className="university-school-profile">
        <strong>{school.organization}</strong>
        <span className="university-school-summary">{school.summary || "毕业生学历照片采集"}</span>
        {status}
      </span>
      <CollectionCardDates range={school.date} />
    </button>;
  }
  const year = school.name.match(/20\d{2}届/)?.[0];
  return <button type="button" className="university-school-card university-school-row" onClick={onSelect}>
    <img src={school.image} alt="" loading="lazy" />
    <span className="university-school-text">
      <strong>{[school.organization, year].filter(Boolean).join(" · ")}</strong>
      <span>{school.date}</span>
      {status}
    </span>
  </button>;
}
function FlowCard({ step }) {
  return <article className="university-school-feature university-flow-card">
    <div className="university-school-cover">
      <img src={step.image} alt={step.alt} width="810" height="756" draggable={false} />
    </div>
    <div className="university-flow-copy">
      <h3><span className="university-flow-number">{step.id}</span>{step.title}</h3>
      <p>{step.description}</p>
    </div>
  </article>;
}

export function GraduateHeroRail({ items, mode, controls, initialIndex, afterSwitch, onSelect, paused }) {
  const rail = useRef(null);
  const count = items.length;
  const isFlow = mode === "flow";
  const middleStart = count > 1 ? count : 0;
  const track = count > 1 ? [...items, ...items, ...items] : items;

  useLayoutEffect(() => {
    const controller = mountGraduateRail(rail.current, { count, initialIndex, afterSwitch });
    controls.current = controller;
    return () => {
      controller.destroy();
      controls.current = null;
    };
  }, [count, controls, initialIndex, afterSwitch]);

  useLayoutEffect(() => { controls.current?.setPaused(paused); }, [controls, paused, count]);

  function selectSchool(event, school, index) {
    if (event.detail !== 0 && controls.current?.centerSide(index)) return;
    onSelect(school.id);
  }
  function moveWithKeyboard(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    controls.current?.move(event.key === "ArrowRight" ? 1 : -1);
  }
  return <section ref={rail} className="university-rail" aria-label={isFlow ? "采集流程" : "正在采集中院校"} data-mode-switch={afterSwitch || undefined}
    tabIndex={isFlow ? 0 : undefined} onKeyDown={isFlow ? moveWithKeyboard : undefined}>
    {track.map((item, index) => {
      const duplicate = index < middleStart || index >= middleStart + count;
      return <div className="university-rail-item" key={Math.floor(index / count) + ":" + item.id}
        aria-hidden={duplicate || undefined} onClick={isFlow ? () => controls.current?.centerSide(index) : undefined}>
        {isFlow ? <FlowCard step={item} /> :
          <SchoolCard rail school={item} duplicate={duplicate} onSelect={event => selectSchool(event, item, index)} />}
      </div>;
    })}
  </section>;
}
export default function UniversityCollectionPage({ route }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const flow = getControllerScopes().collectionFlow;
  const schools = (flow?.projects || []).filter((school) => school.type === "graduate");
  const activeSchools = flow?.entryEnabled("graduate") ? schools.filter((school) => school.status === "ongoing") : [];
  const params = new URLSearchParams(route.split("?")[1]);
  const mode = params.get("mode") || "";
  const query = params.get("q") || "";
  const matches = schools.filter((item) => item.organization.includes(query));
  const [term, setTerm] = useState(query);
  const [layer, setLayer] = useState(null);
  const [heroPreview, setHeroPreview] = useState(() => globalThis.history?.state?.graduateHero);
  const heroMode = graduateHeroMode(flow?.config, heroPreview?.mode);
  const heroItems = heroMode === "flow" ? GRADUATE_FLOW_STEPS : activeSchools;
  const railControls = useRef(null);
  const modalOpen = !!layer || flow?.panel === "email";
  const scroll = useRef(null);
  const search = useRef(null);
  const focus = useRef(null);
  const guideFromPointer = useRef(false);
  const sampleTrigger = useRef(null);
  const printEntry = useRef(null);
  useLayoutEffect(() => {
    const node = scroll.current;
    node.scrollTop = scrollPositions.get(route) || 0;
    setTerm(query);
    const returningToPrint = !mode && history.state?.universityPrintPanel;
    setLayer(returningToPrint ? "print" : null);
    return () => { scrollPositions.set(route, node.scrollTop); };
  }, [route, query]);
  useEffect(() => {
    if (mode === "search" && !query) search.current?.focus();
  }, [mode, query]);
  function overlay(next, event) {
    focus.current = event.currentTarget;
    if (next === "help") guideFromPointer.current = event.detail > 0;
    setLayer(next);
  }
  function openSample(event) {
    sampleTrigger.current = event.currentTarget;
    setLayer("sample");
  }
  function closeSample() {
    const trigger = sampleTrigger.current;
    setLayer("help");
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }
  function closePrint() {
    clearPrintReturn();
    setLayer(null);
  }
  function rememberHero(index = railControls.current?.index || 0) {
    rememberGraduateHero(heroMode, index);
  }
  function changeHeroMode(value) {
    if (value === heroMode) return;
    const preview = rememberGraduateHero(value);
    setHeroPreview({ ...preview, afterSwitch: true });
  }
  function openSchool(id) {
    if (!mode) rememberHero(activeSchools.findIndex(school => school.id === id));
    const path = universityProjectPath(id, route);
    goGraduate(path, false, collectionHistoryState(path));
  }
  function back() {
    if (mode) goGraduate(universityPath);
    else if (!returnCollectionHistory("category")) goGraduate("/?page=home", true);
  }
  function scan() {
    rememberHero();
    setLayer(null);
    window.dispatchEvent(new CustomEvent("zhipai-scan-open", {
      detail: { intent: "collectionIdentity", returnTo: route },
    }));
    goGraduate("/?page=scan", false, collectionHistoryState("/?page=scan"));
  }
  function openRecords() {
    rememberHero();
    const path = "/?page=collection&view=records&category=graduate&from=university";
    goGraduate(path, false, collectionHistoryState(path));
  }
  const title = mode === "search" ? "院校搜索" : mode === "all" ? "全部院校" : "毕业生图像采集";
  const records = flow?.categoryRecordSummary;
  const searchMode = mode === "search" || mode === "all";
  function submitSearch(value) {
    goGraduate(universityLink(mode, { q: value.trim() }), true);
    search.current?.blur();
  }
  return <>
    <section className={`page collection-page university-page${mode ? "" : " university-page--landing collection-category-canvas"}`}
      aria-label={title} inert={modalOpen}>
      {searchMode ? (
        <header className="collection-project-search-header ui-task-masthead">
          <h1 className="collection-search-sr-only">{title}</h1>
          <TaskBackButton onClick={back} />
          <form role="search" className="collection-project-search-form" onSubmit={(event) => {
            event.preventDefault();
            submitSearch(term);
          }}>
            <CollectionIcon name="search" />
            <input ref={search} type="search" aria-label="输入院校名称" placeholder="输入院校名称"
              maxLength={60} autoComplete="off" enterKeyHint="search"
              value={term} onChange={(event) => {
                const value = event.target.value;
                setTerm(value);
                if (!value && query && !event.nativeEvent.isComposing) goGraduate(universityLink(mode), true);
              }} />
            <button className="collection-project-search-submit" type="submit">搜索</button>
          </form>
        </header>
      ) : <CollectionHeader title={title} onBack={back} compact image={mode ? cap : undefined} support={!mode && flow} />}
      <div ref={scroll} className={mode ? "university-scroll" : "university-stage"}>
        {!mode && <>
          <CollectionHeroModes value={heroMode} onChange={changeHeroMode} />
          {heroItems.length ? <GraduateHeroRail key={heroMode} mode={heroMode} items={heroItems} controls={railControls}
            initialIndex={heroPreview?.index} afterSwitch={heroPreview?.afterSwitch} onSelect={openSchool} paused={modalOpen} />
            : <p className="university-school-empty">当前暂无正在采集的院校。</p>}
          <section className="university-intake" aria-labelledby="university-intake-title">
            <h2 id="university-intake-title">识别学信图像采集码</h2>
            <p>自动识别学籍，获取采集资格</p>
            <button type="button" className="primary-button university-scan-button" onClick={scan}>
              <CollectionIcon name="scan" />{scanLabel}
            </button>
          </section>
        </>}
        {searchMode && (mode === "search" && !query ? (
          <div className="collection-project-search-empty">
            <CollectionIcon name="search" />
            <h2>查找合作院校</h2>
            <p>输入院校名称</p>
            <div className="collection-search-examples" role="group" aria-label="快捷试搜">
              {[...new Set(schools.map((item) => item.organization))].slice(0, 3).map((name) =>
                <button type="button" key={name} onClick={() => submitSearch(name)}><span>{name}</span></button>)}
            </div>
          </div>
        ) : <>
          <h2>{query ? "搜索结果" : "院校列表"}</h2>
          {matches.length ? matches.map((item) => <SchoolCard key={item.id} school={item} onSelect={() => openSchool(item.id)} />) :
            <p role="status">未找到相关院校，请更换院校名称后重试。</p>}
        </>)}
      </div>
      {!mode && <CollectionSchoolDock records={records} printEntry={printEntry}
        guideExpanded={layer === "help" || layer === "sample"} printExpanded={layer === "print"}
        onGuide={event => overlay("help", event)} onPrint={() => { rememberHero(); setLayer("print"); }}
        onRecords={openRecords} />}
    </section>
    {(layer === "help" || layer === "sample") && <SharedSheet opened id="university-help"
      title="3 步获取图像采集码" onClose={() => setLayer(null)}
      className="university-sheet university-guide-sheet" returnFocusRef={focus} suspended={layer === "sample"}
      focusDialogOnOpen={guideFromPointer.current}
      footer={<button type="button" className="primary-button" onClick={scan}>已有采集码，去扫码 / 上传</button>}>
      <CodeGuide onOpenSample={openSample} />
    </SharedSheet>}
    {layer === "sample" && <SampleViewer onClose={closeSample} />}
    {layer === "print" && <PrintShowroom initialProduct={history.state?.universityPrintPanel}
      onClose={closePrint} returnFocusRef={printEntry} />}
  </>;
}
