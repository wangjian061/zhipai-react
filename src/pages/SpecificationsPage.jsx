import React, { useEffect, useRef, useState } from "react";
import { Controller, View } from "../runtime/components.jsx";
import SharedSheet from "../components/SharedSheet.jsx";
import SpecificationIcon from "../components/SpecificationIcon.jsx";
import ToolNavigation from "../components/ToolNavigation.jsx";
import { specificationBackgroundState, specificationDimensions } from "../domain/photo-specifications.js";

const commonIds = new Set(["one", "two", "small-two", "large-one"]);

export function SpecificationList({ specifications, onChoose }) {
  const groups = [
    ["常用尺寸", specifications.filter((spec) => commonIds.has(spec.id))],
    ["考试与证件", specifications.filter((spec) => !commonIds.has(spec.id))],
  ];
  return (
    <div className="specifications-content">
      {groups.map(([title, specs]) => specs.length > 0 && (
        <section className="specification-group" key={title}>
          <h2>{title}</h2>
          <div className="specification-group-card">
            {specs.map((spec) => (
              <button type="button" key={spec.id} data-specification={spec.id} aria-haspopup="dialog"
                onClick={(event) => onChoose(spec.id, event.currentTarget)}>
                <span className="specification-row-label">
                  <strong>{spec.name}</strong>
                  <small>{spec.usage || "通用证件照"}</small>
                </span>
                <small className="specification-row-size">{specificationDimensions(spec)}</small>
                <svg aria-hidden="true"><use href="#i-chevron" /></svg>
              </button>
            ))}
          </div>
        </section>
      ))}
      {!specifications.length && <p role="status">暂无可用规格</p>}
    </div>
  );
}

function isPaleColor(value) {
  if (value === "transparent") return true;
  if (!/^#[\da-f]{6}$/i.test(value)) return false;
  const [r, g, b] = value.slice(1).match(/../g).map((channel) => {
    const unit = parseInt(channel, 16) / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b >= 0.72;
}

export function SpecificationColorSheet({ spec, background, onSelect, onClose, onConfirm, label, disabled, trigger }) {
  return (
    <SharedSheet opened id="specification-color-title" title="选择背景颜色"
      target={null} returnFocusRef={trigger} onClose={onClose} footer={
        <button type="button" className="specifications-primary" disabled={disabled} onClick={onConfirm}>{label}</button>
      }>
      <div className="specification-summary">
        <SpecificationIcon kind={spec?.icon} />
        {spec && <div><strong>{spec.name}</strong><p>{specificationDimensions(spec)}{specificationDimensions(spec).endsWith("mm") ? ` · ${spec.width} × ${spec.height} px` : ""}</p></div>}
      </div>
      <fieldset className="specification-colors">
        <legend>背景颜色</legend>
        <div>
          {background.colors.map((color) => (
            <button type="button" key={color.id} aria-pressed={background.backgroundId === color.id}
              onClick={() => onSelect(color)}>
              <span aria-hidden="true"
                className={color.value === "transparent" ? "transparent-frame" : undefined}
                data-pale={isPaleColor(color.value) || undefined}
                style={{ backgroundColor: color.value }}>
                {background.backgroundId === color.id && (
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg>
                )}
              </span>
              {color.name}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="specification-color-note" role="status">{background.message || "拍摄后仍可在制作页调整规格与底色。"}</p>
    </SharedSheet>
  );
}

function Directory({ onBack, specifications, onChoose, inert, backRef }) {
  return (
    <div className="specifications-base" inert={inert} ref={backRef}>
      <ToolNavigation appearance="overlay" title="照片规格" onBack={onBack} />
      <div className="specifications-scroll">
        <div className="specifications-hero">
          <img
            src="./assets/specifications-hero-series-20261117.webp"
            width={1644}
            height={957}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
        <SpecificationList specifications={specifications} onChoose={onChoose} />
      </div>
    </div>
  );
}

// The camera's current photo stays mounted while the same directory opens above it.
export function CameraSpecificationDirectory({ scope: s }) {
  const [colorOpen, setColorOpen] = useState(false);
  const session = useRef(null);
  const directory = useRef(null);
  useEffect(() => {
    const url = location.href;
    if (!session.current) {
      session.current = crypto.randomUUID();
      history.pushState({ ...history.state, cameraSpecification: { id: session.current, level: 1 } }, "", url);
    }
    directory.current?.querySelector("button")?.focus();
    function sync() {
      const state = history.state?.cameraSpecification;
      const level = location.href === url && state?.id === session.current ? state.level : null;
      if (level === 1) setColorOpen(false);
      else if (level === 2) setColorOpen(true);
      else s.closePanel();
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [s]);
  const trigger = useRef(null);
  const spec = s.specs.find((item) => item.id === s.fields.specId);
  const background = specificationBackgroundState(spec?.id, s.fields.background, s.specs, s.colors);
  return (
    <div className="camera-specification-directory" onKeyDown={(event) => {
      if (event.key === "Escape" && !colorOpen) { event.preventDefault(); history.back(); }
    }}>
      <Directory onBack={() => history.back()} specifications={s.specs} inert={colorOpen} backRef={directory}
        onChoose={(id, button) => {
          trigger.current = button;
          s.setPanelSpec(id);
          history.pushState({ ...history.state, cameraSpecification: { id: session.current, level: 2 } }, "", location.href);
          setColorOpen(true);
        }} />
      {colorOpen && <SpecificationColorSheet spec={spec} background={background} trigger={trigger}
        onClose={() => history.back()} onSelect={(color) => { s.fields.background = color.value; }}
        label="使用此规格" disabled={!background.background} onConfirm={() => {
          s.fields.background = background.background;
          s.applyPanel();
          history.go(-2);
        }} />}
    </div>
  );
}

export default function SpecificationsPage({ args = [] }) {
  return (
    <Controller name="specificationPicker" args={args}>
      {(s) => (
        <View as="section" scope={s} scopeRoot className="page specifications-page ui-task-page"
          show={s.page === "specifications"} aria-label="照片规格">
          <Directory onBack={() => s.back()} specifications={s.specifications} inert={s.opened}
            onChoose={(id, button) => s.choose(id, button)} />
          {s.opened && (
            <SpecificationColorSheet spec={s.selected} background={s.backgroundState}
              onClose={() => s.close()} onSelect={(color) => s.selectBackground(color.id)}
              onConfirm={() => s.confirm()} disabled={!s.selection} label="去拍照或选图" />
          )}
        </View>
      )}
    </Controller>
  );
}
