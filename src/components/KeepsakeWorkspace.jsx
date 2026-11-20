import React from "react";
import KeepsakeProductArt from "./KeepsakeProductArt.jsx";
import StampProduct from "./StampProduct.jsx";
import { sampleArt } from "../domain/keepsake-templates.js";
function PostcardProduct({ s }) {
  return (
    <>
      <div className="keepsake-product-stage">
        <KeepsakeProductArt template={s.template} />
      </div>
      <section className="keepsake-template-options">
        <h2>选择模板</h2>
        <div
          className="keepsake-choice-rail postcard-template-rail"
          aria-label="明信片模板"
        >
          {s.templates.map((t) => (
            <button
              type="button"
              key={t.id}
              aria-pressed={s.templateId === t.id}
              disabled={s.locked || s.purchaseLocked}
              onClick={() => s.chooseTemplate(t.id)}
            >
              <img src={sampleArt(t)} alt="" />
              {t.name}
            </button>
          ))}
        </div>
      </section>
      <section className="tool-settings keepsake-product-spec">
        <header>
          <h2>定制明信片</h2>
          <strong>
            <span className="ui-price">
              ¥{((s.order?.price ?? s.product.price) / 100).toFixed(2)}
            </span>
            <small> / 张</small>
          </strong>
        </header>
        <p>上传一张照片，把毕业、旅行或相聚的瞬间做成明信片。下单前可预览并调整。</p>
        <dl>
          <div>
            <dt>材质</dt>
            <dd>{s.product.material}</dd>
          </div>
          <div>
            <dt>尺寸</dt>
            <dd>{s.product.size}</dd>
          </div>
          <div>
            <dt>成品数量</dt>
            <dd>每单 {s.product.count} {s.product.unit}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
export default function KeepsakeWorkspace({ s }) {
  return s.kind === "stamp" ? <StampProduct s={s} /> : <PostcardProduct s={s} />;
}
