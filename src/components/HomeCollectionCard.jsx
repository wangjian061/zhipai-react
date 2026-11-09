import { collectionHistoryState } from "../domain/collection-history.js";
import React from "react";
const entries = [
  {
    category: "graduate",
    title: "毕业生采集",
    subtitle: "毕业图像采集",
    asset: "graduate",
  },
  {
    category: "enrollment",
    title: "新生采集",
    subtitle: "大学入学证照",
    asset: "enrollment",
  },
  {
    category: "association",
    title: "其它采集",
    subtitle: "机构行业证照",
    asset: "other",
  },
];
export default function HomeCollectionCard() {
  return (
    <section
      className="collection-card home-collection-card home-collection-categories"
      aria-labelledby="home-collection-title"
    >
      <h2 id="home-collection-title">证照采集</h2>
      <div className="home-collection-grid">
        {entries.map((item) => (
          <a
            key={item.category}
            className="home-collection-category"
            data-category={item.category}
            draggable={false}
            href={`/?page=collection&view=projects&category=${item.category}&from=home&section=home`}
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
              history.pushState(
                collectionHistoryState(event.currentTarget.href),
                "",
                event.currentTarget.href,
              );
              window.dispatchEvent(new Event("zhipai-route"));
            }}
          >
            <span className="home-collection-art">
              <img
                src={`/assets/home-collection-${item.asset}-20261105.webp`}
                width="600"
                height="720"
                alt=""
                decoding="async"
                draggable="false"
              />
            </span>
            <span className="home-collection-caption">
              <strong>
                {item.category === "association" ? (
                  item.title
                ) : (
                  <>
                    <span className="home-collection-keyword">
                      {item.title.slice(0, -2)}
                    </span>
                    采集
                  </>
                )}
              </strong>
              <span>{item.subtitle}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
