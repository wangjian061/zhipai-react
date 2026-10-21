import React from "react";

export default function HomeCollectionCard({ scope: s }) {
  return (
    <section className="collection-card home-collection-card">
      <h2>
        <a
          className="home-collection-link"
          href="/?page=collection"
          aria-label="进入专项采集"
          aria-describedby="home-collection-audience"
          onClick={(event) => {
            if (
              event.defaultPrevented ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            s.go("collection");
          }}
        >
          <span>专项采集</span>
          <span className="home-collection-arrow" aria-hidden="true">
            <svg>
              <use href="#i-arrow" />
            </svg>
          </span>
        </a>
      </h2>
      <p id="home-collection-audience" className="home-collection-audience">
        新生入学 · 毕业生 · 行业协会会员
      </p>
      <img
        className="home-collection-artwork"
        src="assets/home-collection-theme-20261020.png"
        alt=""
        width="2172"
        height="724"
        decoding="async"
        draggable="false"
      />
    </section>
  );
}
