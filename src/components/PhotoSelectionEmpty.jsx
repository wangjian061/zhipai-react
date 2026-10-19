import React from "react";
import "../styles/photo-selection.css";

export default function PhotoSelectionEmpty({ mascot, description, disabled, onSelect }) {
  return (
    <button type="button" className="photo-selection-empty" disabled={disabled} onClick={onSelect}>
      <img src={mascot} width="140" height="140" alt="" />
      <strong>选取一张照片</strong>
      <span>{description}</span>
    </button>
  );
}
