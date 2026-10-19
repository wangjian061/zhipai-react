import React from "react";
import { CollectionIcon } from "./CollectionHome.jsx";
export default function CollectionHeader({ title, subtitle, image, onBack }) {
  return (
    <section
      className={
        "collection-home-hero collection-themed-hero" +
        (onBack ? " has-back" : "")
      }
    >
      {onBack && (
        <button
          className="collection-hero-back"
          aria-label="返回"
          onClick={onBack}
        >
          <CollectionIcon name="chevron-left" />
        </button>
      )}
      <div className="collection-hero-row">
        <div className="collection-hero-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <img className="collection-hero-art" src={image} alt="" />
      </div>
      <span className="collection-hero-orbit" aria-hidden="true" />
    </section>
  );
}
