import React from "react";
import KeepsakeProductArt from "./KeepsakeProductArt.jsx";
import {
  KEEPSAKE_PRODUCTS,
  KEEPSAKE_TEMPLATES,
} from "../domain/keepsake-templates.js";
import { openKeepsake } from "../domain/keepsakes.js";

function HomeKeepsakes() {
  return (
    <section
      className="home-keepsake-card"
      aria-labelledby="home-keepsake-title"
    >
      <header>
        <h2 id="home-keepsake-title">照片纪念品</h2>
      </header>
      <div className="home-keepsake-products">
        {[
          ["postcard", "明信片"],
          ["stamp", "邮票"],
        ].map(([kind, label]) => (
          <button
            key={kind}
            className="home-keepsake-entry"
            data-kind={kind}
            type="button"
            aria-label={KEEPSAKE_PRODUCTS[kind].name + "，推荐"}
            onClick={() => openKeepsake(kind)}
          >
            <span className="home-keepsake-art">
              <KeepsakeProductArt
                template={KEEPSAKE_TEMPLATES.find((t) => t.kind === kind)}
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
