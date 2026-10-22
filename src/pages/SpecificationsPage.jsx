import React from "react";
import { Controller, View } from "../runtime/components.jsx";
import SpecificationIcon from "../components/SpecificationIcon.jsx";
import { specificationDimensions } from "../domain/photo-specifications.js";

const icon = (name) => (
  <svg aria-hidden="true">
    <use href={"#i-" + name} />
  </svg>
);

export function SpecificationGrid({ specifications, onChoose }) {
  return (
    <div className="specification-grid utility-grid" data-columns="3">
      {specifications.map((spec) => (
        <button
          type="button"
          className="utility-grid-item"
          key={spec.id}
          onClick={() => onChoose(spec.id)}
          aria-haspopup="dialog"
          aria-label={`${spec.name}，${spec.mm}，${spec.width} × ${spec.height} px`}
        >
          <span className="utility-item-icon">
            <SpecificationIcon kind={spec.icon} />
          </span>
          <span className="utility-grid-item-label">{spec.name}</span>
          <small className="utility-grid-detail">
            {specificationDimensions(spec)}
          </small>
        </button>
      ))}
    </div>
  );
}

export default function SpecificationsPage({ args = [] }) {
  return (
    <Controller name="specificationPicker" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page specifications-page"
          show={s.page === "specifications"}
          aria-label="证照规格"
        >
          <div className="specifications-base" inert={s.opened}>
            <header className="specifications-nav">
              <button
                type="button"
                className="specifications-back"
                aria-label="返回"
                onClick={() => s.back()}
              >
                {icon("chevron-left")}
              </button>
              <h1>证照规格</h1>
              <span aria-hidden="true" />
            </header>
            <div className="specifications-scroll">
              <div className="specifications-hero">
                {s.page === "specifications" && (
                  <img
                    key="specifications-light-hero"
                    src="./assets/specifications-hero-light-20261020.jpg"
                    alt=""
                    width="1000"
                    height="582"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                    onLoad={(event) => {
                      event.currentTarget.style.visibility = "";
                    }}
                  />
                )}
              </div>
              <div className="specifications-content">
                <div className="specifications-card utility-card">
                  <h2>常用规格</h2>
                  <SpecificationGrid
                    specifications={s.specifications}
                    onChoose={(id) => s.choose(id)}
                  />
                </div>
              </div>
            </div>
          </div>
          {s.opened && (
            <div
              className="specifications-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) s.close();
              }}
              onKeyDown={(e) => s.trap(e)}
            >
              <View
                as="div"
                scope={s}
                refName="colorDialog"
                className="specifications-sheet ui-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="specification-color-title"
                tabIndex={-1}
              >
                <span className="sheet-handle" aria-hidden="true" />
                <header className="ui-sheet-header">
                  <h2 id="specification-color-title">选择背景颜色</h2>
                  <button
                    type="button"
                    aria-label="关闭选色"
                    onClick={() => s.close()}
                  >
                    {icon("close")}
                  </button>
                </header>
                <div className="ui-sheet-body">
                  <div className="specification-summary">
                    <SpecificationIcon kind={s.selected?.icon} />
                    <div>
                      <strong>{s.selected?.name}</strong>
                      <p>
                        {s.selected?.mm} · {s.selected?.width} ×{" "}
                        {s.selected?.height} px
                      </p>
                    </div>
                  </div>
                  <fieldset className="specification-colors">
                    <legend>背景颜色</legend>
                    <div>
                      {s.backgrounds.map((color) => (
                        <button
                          type="button"
                          key={color.id}
                          aria-pressed={
                            s.backgroundState.backgroundId === color.id
                          }
                          onClick={() => s.selectBackground(color.id)}
                        >
                          <span
                            className={
                              color.value === "transparent"
                                ? "transparent-frame"
                                : undefined
                            }
                            style={{
                              backgroundColor: color.value,
                              color: [
                                "#ffffff",
                                "#d5d9e0",
                                "transparent",
                              ].includes(color.value)
                                ? "#0032ff"
                                : "#fff",
                            }}
                          >
                            {s.backgroundState.backgroundId === color.id && (
                              <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="m5 10 3 3 7-7" />
                              </svg>
                            )}
                          </span>
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <p className="specification-color-note" role="status">
                    {s.backgroundState.message ||
                      "拍摄后仍可在制作页调整规格与底色。"}
                  </p>
                </div>
                <footer className="ui-sheet-footer">
                  <button
                    type="button"
                    className="specifications-primary"
                    disabled={!s.selection}
                    onClick={() => s.confirm()}
                  >
                    去拍照或选图
                  </button>
                </footer>
              </View>
            </div>
          )}
        </View>
      )}
    </Controller>
  );
}
