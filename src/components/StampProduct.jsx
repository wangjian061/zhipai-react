import React from "react";
import { STAMP_VIEWS, stampViewImage } from "../domain/keepsake-templates.js";
import KeepsakeProductArt from "./KeepsakeProductArt.jsx";

export default function StampProduct({ s }) {
  return (
    <>
      <figure className="stamp-gallery">
        <div className="keepsake-product-stage">
          <KeepsakeProductArt template={s.template} stampView={s.stampView} />
        </div>
        <figcaption className="keepsake-choice-rail" aria-label="产品视图">
          {STAMP_VIEWS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={s.stampView === key}
              onClick={() => {
                s.stampView = key;
              }}
            >
              <img src={stampViewImage(key)} alt="" />
              {label}
            </button>
          ))}
        </figcaption>
      </figure>
      <section className="tool-settings keepsake-product-spec stamp-product-spec">
        <header>
          <h2>致青春 · 学生纪念邮折</h2>
          <strong>
            <span className="ui-price">¥{((s.order?.price ?? s.product.price) / 100).toFixed(2)}</span>
            <small> / 套</small>
          </strong>
        </header>
        <p>一张照片可定制中央大图与四角小图</p>
        <dl>
          <div>
            <dt>套装</dt>
            <dd>一套一册（含封套与邮票内页）</dd>
          </div>
          <div>
            <dt>版式</dt>
            <dd>5 个定制位 · 8 枚固定图案</dd>
          </div>
          <div>
            <dt>购买条件</dt>
            <dd>仅限学生购买</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
