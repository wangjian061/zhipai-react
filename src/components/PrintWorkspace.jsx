import React, { useEffect, useRef } from "react";
import PhotoSelectionActions from "./PhotoSelectionActions.jsx";
import PrintSheetArtwork from "./PrintSheetArtwork.jsx";

export function PrintProductGallery({ items, current, onSelect, onOpen, disabled, triggerRef }) {
  const rail = useRef(null);
  useEffect(() => {
    const list = rail.current;
    const selected = list?.querySelector('[aria-pressed="true"]');
    if (!selected) return;
    const track = list.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    if (item.left < track.left) list.scrollLeft += item.left - track.left;
    else if (item.right > track.right) list.scrollLeft += item.right - track.right;
  }, [current.id]);

  return (
    <figure className="print-product-gallery">
      <button
        type="button"
        ref={triggerRef}
        className="keepsake-product-stage print-gallery-stage"
        aria-label={"查看大图：" + current.label}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={onOpen}
      >
        <span className="keepsake-product-art">
          <PrintSheetArtwork image={current.image} />
        </span>
      </button>
      <figcaption ref={rail} className="keepsake-choice-rail print-gallery-rail" aria-label="产品视图">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={current.id === item.id}
            onClick={() => onSelect(item.id)}
          >
            <img src={item.image} alt="" />
            {item.label}
          </button>
        ))}
      </figcaption>
    </figure>
  );
}

export function PrintProductSpecs({ title, description, children }) {
  return <section className="tool-settings keepsake-product-spec">
    <header><h2>{title}</h2></header>
    {description && <p>{description}</p>}
    <dl>{children}</dl>
  </section>;
}

export default function PrintWorkspace({ studio: s }) {
  const hasPhoto = !!s.cropSource?.blob;
  const layout = s.layout;
  return (
    <div className="print-screen">
      <div className="print-body keepsake-scroll" tabIndex={-1}>
        <PrintProductGallery items={s.galleryItems} current={s.galleryItem} disabled={!s.store.ready || s.processing}
          onSelect={id => s.selectGalleryImage(id)} onOpen={() => s.openLayoutPreview()} />
        {hasPhoto && (s.cropJob || s.layoutsLoading) && (
          <p className="sr-only" role="status">正在生成冲印预览…</p>
        )}
        {!s.disabled && (s.cropError || s.layoutError) && (
          <p className="print-preview-error" role="alert">{s.cropError || s.layoutError}</p>
        )}
        <PrintProductSpecs title="背胶模切证件照" description="自带背胶 · 免剪裁，下单前可预览并手动裁剪构图">
          <div className="print-sku-row">
            <dt>版式</dt>
            <dd role="group" aria-label="版式">
              {s.layouts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={layout.id === item.id}
                  disabled={s.disabled}
                  onClick={() => s.selectLayout(item.id)}
                >
                  {item.description}
                </button>
              ))}
            </dd>
          </div>
          <div><dt>相纸规格</dt><dd>富士相纸 六寸</dd></div>
          <div><dt>相纸工艺</dt><dd>背胶模切</dd></div>
          <div><dt>购买限制</dt><dd>每单 1 版，不支持加印</dd></div>
        </PrintProductSpecs>
      </div>
      <footer className="print-footer photo-selection-footer print-preview-footer">
        <PhotoSelectionActions
          hasPhoto={hasPhoto}
          disabled={!s.store.ready || s.processing || (s.store.busy && !s.cropJob)}
          nextEnabled={!s.disabled || !!s.cropJob}
          selectLabel="上传照片 · 预览效果"
          replaceLabel="继续预览"
          nextLabel="去确认订单"
          onSelect={() => hasPhoto ? s.openPrintPreview() : s.openAlbum()}
          onNext={() => s.confirm()}
        />
      </footer>
    </div>
  );
}
