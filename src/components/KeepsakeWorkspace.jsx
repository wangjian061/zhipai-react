import React from "react";
import KeepsakePreview from "./KeepsakePreview.jsx";
import KeepsakeProductArt from "./KeepsakeProductArt.jsx";
import StampProduct from "./StampProduct.jsx";
import {
  sampleArt,
  STAMP_PANE,
  templateGeometry,
} from "../domain/keepsake-templates.js";
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
            ¥{((s.order?.price ?? s.product.price) / 100).toFixed(2)}
            <small> / 张</small>
          </strong>
        </header>
        <dl className="postcard-spec-pair">
          <div>
            <dt>材质</dt>
            <dd>{s.product.material}</dd>
          </div>
          <div>
            <dt>尺寸</dt>
            <dd>{s.product.size}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
function StampPaneSample({ template }) {
  const view = STAMP_PANE;
  const paper = templateGeometry(template);
  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      aria-hidden="true"
    >
      <image
        href={sampleArt(template)}
        width={paper.width}
        height={paper.height}
      />
    </svg>
  );
}
export default function KeepsakeWorkspace({ s, photoTrigger, cropTrigger }) {
  const stamp = s.kind === "stamp";
  return (
    <>
      {stamp ? <StampProduct s={s} /> : <PostcardProduct s={s} />}
      <section
        className="tool-settings keepsake-editor"
        aria-labelledby="keepsake-preview-heading"
      >
        <header>
          <h2 id="keepsake-preview-heading">定制预览</h2>
          {s.photo && (
            <button
              ref={photoTrigger}
              type="button"
              disabled={s.locked || s.purchaseLocked}
              onClick={() => s.pick()}
            >
              更换照片
            </button>
          )}
        </header>
        {s.photo ? (
          <button
            type="button"
            className="keepsake-preview-entry"
            ref={cropTrigger}
            disabled={!s.image || s.locked || s.purchaseLocked}
            onClick={() => s.editComposition()}
          >
            <KeepsakePreview
              template={s.template}
              image={s.image}
              transform={s.composition}
            />
            <span>点击调整照片</span>
          </button>
        ) : (
          <button
            type="button"
            className="keepsake-empty-select"
            ref={photoTrigger}
            disabled={s.locked}
            onClick={() => s.pick()}
            aria-label="选取照片"
          >
            <span className="keepsake-editor-sample">
              {stamp ? (
                <StampPaneSample template={s.template} />
              ) : (
                <img src={sampleArt(s.template)} alt="" />
              )}
            </span>
            <span>
              <strong>选取照片</strong>
              <small>
                {stamp ? "中央与四角可分别调整构图" : "选图后可缩放、旋转或移动照片"}
              </small>
            </span>
          </button>
        )}
      </section>
      {stamp ? (
        <section className="tool-settings stamp-proof">
          <h3>购买人学生证</h3>
          <label className="proof-upload">
            <span>
              {s.studentProof ? "学生证已上传 · 更换" : "上传学生证照片"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={s.locked}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                s.acceptProof(f);
              }}
            />
          </label>
          <p>支付后人工审核。通过后安排制作；未通过将取消订单并原路退款。</p>
          <p>原型体验请使用测试图片。</p>
        </section>
      ) : null}
    </>
  );
}
