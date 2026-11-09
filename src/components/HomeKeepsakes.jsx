import React from "react";
import { KEEPSAKE_PRODUCTS } from "../domain/keepsake-templates.js";
import { openKeepsake } from "../domain/keepsakes.js";

const HOME_PRODUCTS = [
  {
    kind: "postcard",
    label: "明信片",
    compactArt: "/assets/keepsakes/home-postcard-compact-20261109.webp",
    wideArt: "/assets/keepsakes/home-postcard-wide-20261109.webp",
  },
  {
    kind: "stamp",
    label: "邮票",
    compactArt: "/assets/keepsakes/home-stamp-compact-20261109.webp",
    wideArt: "/assets/keepsakes/home-stamp-wide-20261109.webp",
  },
];

function HomeKeepsakes() {
  const [singleColumn, setSingleColumn] = React.useState(false);

  return (
    <section
      className="home-keepsake-card"
      aria-labelledby="home-keepsake-title"
    >
      <header>
        <h2 id="home-keepsake-title">照片纪念品</h2>
        <button
          className="home-keepsake-layout-toggle"
          type="button"
          aria-controls="home-keepsake-products"
          onClick={() => setSingleColumn((current) => !current)}
        >
          {singleColumn ? "切换双列" : "切换单列"}
        </button>
      </header>
      <div
        id="home-keepsake-products"
        className="home-keepsake-products"
        data-layout={singleColumn ? "single" : "double"}
      >
        {HOME_PRODUCTS.map(({ kind, label, compactArt, wideArt }) => (
          <button
            key={kind}
            className="home-keepsake-entry"
            data-kind={kind}
            type="button"
            aria-label={KEEPSAKE_PRODUCTS[kind].name + "，推荐"}
            onClick={() => openKeepsake(kind)}
            style={
              singleColumn
                ? { "--home-keepsake-banner": `url("${wideArt}")` }
                : undefined
            }
          >
            <span className="home-keepsake-art">
              <img
                src={singleColumn ? wideArt : compactArt}
                alt=""
                loading="lazy"
              />
            </span>
            <span className="home-collection-caption">
              <strong>{label}</strong>
              <span className="home-recommend">推荐</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
export default React.memo(HomeKeepsakes);
