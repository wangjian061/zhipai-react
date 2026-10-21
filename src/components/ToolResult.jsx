import React, { useEffect, useRef } from "react";
import ToolNavigation from "./ToolNavigation.jsx";
import "../styles/tool-result.css";

// Every completed tool shares this shell; only delivery and task details vary.
export default function ToolResult({ studio: s }) {
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const inAlbum = s.savesToAlbum && !!s.savedRecord;

  return (
    <div className="tool-flow tool-result-flow">
      <ToolNavigation title="处理完成" onBack={() => s.back()} />
      <div className="tool-result-scroll">
        <div className="tool-result-status">
          <img src={s.mascot} width="56" height="56" alt="" />
          <div>
            <h2
              ref={heading}
              tabIndex={-1}
              aria-describedby="tool-result-destination"
            >
              {inAlbum ? "已保存到知拍相册" : "已发起下载"}
            </h2>
            <p id="tool-result-destination">
              {inAlbum ? "原照片仍然保留" : "请在手机相册中查看"}
            </p>
          </div>
        </div>
        <figure className="tool-result-figure">
          <div className="tool-result-photo">
            <img src={s.outputURL} alt={`${s.config.title}结果`} />
            {s.repairResult && (
              <>
                <div
                  className="tool-comparison"
                  style={{ clipPath: `inset(0 ${100 - s.comparison}% 0 0)` }}
                  aria-hidden="true"
                >
                  <img src={s.sourceURL} alt="" />
                </div>
                <div
                  className="tool-compare-handle"
                  style={{ left: `${s.comparison}%` }}
                  aria-hidden="true"
                >
                  <span>
                    <svg>
                      <use href="#i-arrow" />
                    </svg>
                  </span>
                </div>
                <input
                  className="tool-photo-range"
                  type="range"
                  min="0"
                  max="100"
                  value={s.comparison}
                  aria-label="拖动滑杆查看精修前后"
                  onChange={(event) => {
                    s.comparison = Number(event.target.value);
                  }}
                />
              </>
            )}
          </div>
          {s.repairResult && (
            <div
              className="tool-result-comparison-labels"
              aria-label="精修前后对比标记"
            >
              <span>精修前</span>
              <span>精修后</span>
            </div>
          )}
          <figcaption>
            <p className="tool-result-summary">{s.resultSummary}</p>
            <p className="tool-result-file">{s.outputInfo}</p>
          </figcaption>
        </figure>
      </div>
      <footer className="tool-footer tool-result-footer">
        <button
          type="button"
          className={inAlbum ? "tool-secondary" : "tool-primary"}
          onClick={() => s.start()}
        >
          再处理一张
        </button>
        {inAlbum && (
          <button
            type="button"
            className="tool-primary"
            onClick={() => s.viewSaved()}
          >
            查看照片
          </button>
        )}
      </footer>
    </div>
  );
}
