import React from "react";
import "../styles/tool-capability-poster.css";

const workspaceBanner = (name) => ({
  src: `./assets/tool-${name}-banner-20261117.jpg`,
  width: 1200,
  height: 896,
});

export const toolPosterArtwork = {
  print: workspaceBanner("print"),
  repair: workspaceBanner("repair"),
  outfit: workspaceBanner("outfit"),
  crop: workspaceBanner("crop"),
  background: workspaceBanner("background"),
  format: workspaceBanner("format"),
  resize: workspaceBanner("resize"),
  specifications: {
    src: "./assets/specifications-hero-series-20261117.webp",
    width: 1644,
    height: 957,
  },
};

export default function ToolCapabilityPoster({ kind, disabled, onSelect }) {
  return (
    <button
      type="button"
      className={`tool-capability-poster ${kind}-workspace-poster`}
      aria-label="选取照片"
      aria-haspopup="dialog"
      disabled={disabled}
      onClick={onSelect}
    >
      <img
        className="tool-capability-poster-art"
        {...toolPosterArtwork[kind]}
        alt=""
        decoding="async"
        draggable={false}
      />
    </button>
  );
}
