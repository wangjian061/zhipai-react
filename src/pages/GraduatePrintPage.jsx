import React, { useEffect, useRef, useState } from "react";
import { Controller, Portal, View } from "../runtime/components.jsx";
import ToolNavigation from "../components/ToolNavigation.jsx";
import SharedSheet, { SheetFrame } from "../components/SharedSheet.jsx";
import ToolPhotoSelection from "../components/ToolPhotoSelection.jsx";
import FixedPhotoCrop from "../components/FixedPhotoCrop.jsx";
import SegmentedControl from "../components/SegmentedControl.jsx";
import { PrintAddressEntry } from "../components/PrintAddressBook.jsx";
import { PrintProductGallery, PrintProductSpecs } from "../components/PrintWorkspace.jsx";
import { PrintGalleryViewer } from "../components/PrintLayoutViewer.jsx";
import PhotoSelectionActions from "../components/PhotoSelectionActions.jsx";
import { PaymentChoices, PaymentRecovery } from "../components/PaymentHandoff.jsx";
import { checkoutLabel } from "../domain/payment-handoff.js";
import { openOrderCenter } from "../domain/order-routing.js";
import { graduateCropReady, graduatePrintPath, graduatePrintTitle, graduateProductImages, graduateRatio, graduateSourceAllowed, graduatePrintPrices, graduateQuote } from "../domain/graduate-print.js";
import "./graduate-pages.css";

const price = (cents) => `¥${(cents / 100).toFixed(2)}`;
const orientations = [
  { value: "landscape", label: "横版 3∶2" },
  { value: "portrait", label: "竖版 2∶3" },
];
function useFileURL(blob) {
  const [entry, setEntry] = useState(null);
  useEffect(() => {
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    setEntry({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return entry && entry.blob === blob ? entry.url : undefined;
}
function LocalImage({ photo, alt, ...props }) {
  const url = useFileURL(photo?.blob);
  return url ? <img src={url} alt={alt} {...props} /> : <span className="graduate-image-loading" role="status">正在读取照片…</span>;
}
function PhotoGrid({ s }) {
  return <div className="graduate-print-grid">
    {s.photos.map((item, index) => {
      const ready = graduateCropReady(item);
      return <View as="article" scope={s} refName={`photo-${item.id}`} key={item.id}
        className="graduate-print-photo" data-highlight={s.highlight === item.id}>
        <button className="graduate-photo-preview" type="button" disabled={!s.editable}
          aria-label={`裁剪照片 ${index + 1} · ${ready ? "已裁好 6 寸" : "待裁剪 6 寸"}`}
          onClick={() => s.editCrop(item.id)}>
          <LocalImage photo={item.output || item.source} alt={`照片 ${index + 1}`} loading="lazy" />
          <span className="graduate-print-state" data-ready={ready}>{ready ? "已裁好 6 寸" : "待裁剪 6 寸"}</span>
        </button>
        {s.editable && <button className="graduate-remove" type="button" aria-label={`移除照片 ${index + 1}`}
          onClick={() => s.remove(item.id)}>×</button>}
      </View>;
    })}
  </div>;
}

function GraduateProduct({ s }) {
  const { minimum, base, additional, shipping } = graduatePrintPrices;
  return <>
    <PrintProductGallery items={graduateProductImages} current={s.galleryItem} disabled={!s.store.ready || s.busy}
      triggerRef={node => { s.$refs.productImage = node; }}
      onSelect={id => s.selectProductImage(id)} onOpen={() => s.openProductImage()} />
    <PrintProductSpecs title="六寸光面照片冲印">
      <div><dt>相纸规格</dt><dd>六寸光面</dd></div>
      <div><dt>起印价格</dt><dd><span className="ui-price">{price(base)}</span> / {minimum} 张</dd></div>
      <div><dt>加印</dt><dd>{price(additional)}/张，张数不限</dd></div>
      <div><dt>运费</dt><dd>{price(shipping)}</dd></div>
    </PrintProductSpecs>
    {s.photos.length > 0 && <section className="tool-settings graduate-photos" aria-labelledby="graduate-photos-title">
      <h2 id="graduate-photos-title">已选照片</h2>
      <PhotoGrid s={s} />
    </section>}
  </>;
}
function SelectionSheet({ s, close }) {
  const input = useRef(null);
  const album = s.$store.photoLibrary;
  const addedIds = new Set(s.photos.filter((item) => item.origin === "album").map((item) => item.source.id));
  const library = {
    finished: album.finished.filter(graduateSourceAllowed),
    ready: album.ready, busy: album.busy, error: album.error,
    load: () => album.load(), url: (id) => album.url(id),
  };
  return <SheetFrame opened id="graduate-selection-title" busy={s.busy} onClose={close}>
    <input hidden ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple
      aria-label="从手机相册选择照片" onChange={(event) => {
        const files = [...event.currentTarget.files];
        event.currentTarget.value = "";
        void s.importFiles(files);
      }} />
    <ToolPhotoSelection library={library} mascot="/assets/bear-print.webp" busy={s.busy} error={s.error}
      titleId="graduate-selection-title" title="添加照片" onClose={close} onPhone={() => input.current?.click()}
      multiSelection={{ selectedIds: s.selection, addedIds, onLogin: !s.owner ? () => s.loginForAlbum() : undefined }}
      onSelect={(id) => {
        s.selection = s.selection.includes(id) ? s.selection.filter((item) => item !== id) : [...s.selection, id];
      }}
      onConfirm={() => s.addAlbum()} />
  </SheetFrame>;
}

function CropSheet({ s, close }) {
  const source = s.selectedPhoto.source;
  const url = useFileURL(source.blob);
  const other = s.waiting.filter((photo) => photo.id !== s.cropId).length;
  return <SharedSheet opened id="graduate-crop-title" title="手动裁剪（6 寸）" busy={s.busy} onClose={close}
    className="graduate-sheet graduate-crop-sheet" footer={<div className="graduate-action-pair">
      {!!other && <button className="ui-button-secondary" type="button" disabled={s.busy || !url}
        onClick={() => s.saveCrop(false)}>仅确认本张</button>}
      <button className="primary-button" type="button" disabled={s.busy || !url}
        onClick={() => s.saveCrop(!!other)}>{other ? `确认并裁下一张（还剩 ${other} 张）` : "确认完成 6 寸裁剪"}</button>
    </div>}>
    {s.cropNotice && <p className="graduate-crop-notice" role="status">{s.cropNotice}</p>}
    <SegmentedControl label="裁剪方向" options={orientations} value={s.crop.orientation} disabled={s.busy}
      onChange={(orientation) => s.changeCrop({ orientation, scale: 1, offsetX: 0, offsetY: 0 })} />
    {url && <FixedPhotoCrop key={s.cropId} photo={source} src={url} value={s.crop}
      ratio={graduateRatio(s.crop.orientation)} disabled={s.busy} onChange={(value) => s.changeCrop(value)} />}
    {s.error && <p role="alert" className="ui-field-error">{s.error}</p>}
  </SharedSheet>;
}
function OrderSummary({ s }) {
  const quantity = s.order?.quantity || s.photos.length;
  const { minimum, additional } = graduatePrintPrices;
  const quote = graduateQuote(quantity);
  if (!quote) return null;
  const { base, extraCount, extra } = quote;
  const total = s.order?.total ?? quote.total;
  return <section className="tool-settings graduate-card">
    <h2>{graduatePrintTitle} · 共 {quantity} 张</h2>
    <dl className="graduate-fees">
      <div><dt>基础 {minimum} 张</dt><dd>{price(base)}</dd></div>
      {!!extraCount && <div><dt>加印 {extraCount} 张 × {price(additional)}</dt><dd>{price(extra)}</dd></div>}
      <div><dt>运费</dt><dd>{price(s.order?.shipping ?? quote.shipping)}</dd></div>
      <div><dt>合计</dt><dd className="ui-price">{price(total)}</dd></div>
    </dl>
  </section>;
}
export function GraduatePrintScreen({ s }) {
  function close() {
    if (s.busy) return;
    s.error = "";
    s.cropNotice = "";
    s.highlight = "";
    s.panel = "";
  }
  const stage = s.transferringGuest ? "guest" : s.order?.paidAt && s.view !== "work" ? "complete" : s.view;
  const missing = s.error.startsWith("还差 ");
  const minimumRemaining = graduatePrintPrices.minimum - s.photos.length;
  return <>
    <section className="page print-page ui-task-page graduate-print-page" aria-label={graduatePrintTitle} inert={!!s.panel}>
      <ToolNavigation title={stage === "confirm" ? "确认订单" : stage === "complete" ? "订单已确认" : graduatePrintTitle}
        onBack={() => s.back()} disabled={s.busy} />
      <div className={stage === "work" ? "print-body keepsake-scroll" : "graduate-scroll"}>
        {!s.store.ready && (s.store.error ? <p role="alert">{s.store.error} <button type="button" onClick={() => s.store.load()}>重新读取</button></p> : <p role="status">正在读取冲印草稿…</p>)}
        {stage === "guest" && <section className="tool-settings graduate-card">
          <h2>{s.guestOrder ? "选择本次冲印任务" : "转入本次照片"}</h2>
          <p>{s.guestOrder ? "账号中的已有订单和本次新选照片都已保留。" : "正在读取登录前的选图与裁剪进度。"}</p>
        </section>}
        {stage === "work" && <GraduateProduct s={s} />}
        {stage === "confirm" && <>
          <PrintAddressEntry address={s.checkoutAddress} disabled={!s.editable} readOnly={!!s.order}
            buttonRef={node => { s.$refs.graduateAddress = node; }} error={s.addressError}
            onOpen={() => s.openAddresses()} />
          {(s.quote || s.order) && <OrderSummary s={s} />}
          <PaymentRecovery order={s.order} busy={s.busy} resolution={s.resolution} setResolution={(value) => { s.resolution = value; }} />
        </>}
        {stage === "complete" && <>
          <section className="tool-settings graduate-card"><h2>支付成功</h2><p>正在安排冲印。</p></section>
          <OrderSummary s={s} />
        </>}
      </div>
      <footer className={stage === "work" ? "print-footer photo-selection-footer print-preview-footer" : "print-footer graduate-print-footer"}>
        {stage === "work" && (s.photos.length > 0 || missing) && <div className="graduate-counts" data-missing={missing}>
          <strong>已选 {s.photos.length} 张 · 待裁 {s.waiting.length} 张</strong>
          {s.quote ? <strong className="ui-price">{price(s.quote.print)}</strong> :
            <span role={missing ? "alert" : undefined}>还差 {minimumRemaining} 张起印</span>}
        </div>}
        {!s.panel && s.highlight && s.cropNotice && <p role="status" className="graduate-crop-notice">{s.cropNotice}</p>}
        {!s.panel && s.error && !missing && <p role="alert" className="ui-field-error">{s.error}</p>}
        {stage === "work" ? <PhotoSelectionActions hasPhoto={s.photos.length > 0 || !!s.order}
          disabled={!s.store.ready || s.busy} selectDisabled={!s.editable}
          selectLabel="上传照片" replaceLabel="添加照片" nextLabel="去确认订单"
          onSelect={() => { s.panel = "pick"; s.selection = []; s.error = ""; }}
          onNext={() => s.confirm()} /> : <div className="graduate-action-pair">
          {stage === "guest" && <button type="button" className="primary-button" disabled={s.busy}
            onClick={() => s.adoptGuest()}>{s.guestOrder ? "选择冲印任务" : "继续转入照片"}</button>}
          {stage === "confirm" && <>
            <button className="ui-button-secondary" type="button" disabled={s.busy} onClick={() => s.back()}>上一步</button>
            <button className="primary-button" type="button" disabled={s.busy || !s.store.ready}
              onClick={() => s.requestPayment()}>{s.order ? checkoutLabel("print", s.method, s.order) : "立即支付"}</button>
          </>}
          {stage === "complete" && <>
            <button className="ui-button-secondary" type="button" onClick={() => s.restart()}>再冲印一组</button>
            <button className="primary-button" type="button" onClick={() => openOrderCenter("print", graduatePrintPath)}>查看订单</button>
          </>}
        </div>}
      </footer>
    </section>
    {s.panel === "gallery" && <Portal target="#print-modal-layer">
      <PrintGalleryViewer items={graduateProductImages} item={s.galleryItem} closing={s.galleryClosing}
        dialogRef={node => { s.$refs.productViewer = node; }}
        onSelect={id => s.selectProductImage(id)} onClose={() => s.closeProductImage()} />
    </Portal>}
    {s.panel === "guestChoice" && <SharedSheet opened id="graduate-guest-choice-title" title="选择本次冲印任务"
      busy={s.busy} onClose={close}
      footer={<div className="graduate-guest-actions">
        <button className="primary-button" type="button" disabled={s.busy} onClick={() => s.adoptGuest(true)}>
          使用本次新选的 {s.guestDraft?.photos.length} 张照片继续
        </button>
        <button className="ui-button-secondary" type="button" disabled={s.busy} onClick={() => s.viewGuestOrder()}>查看已有订单</button>
      </div>}>
      <p>当前账号有一笔未完成的冲印订单。使用本次照片会替换工作草稿，已裁好的照片可以直接继续，已有订单仍可在订单列表查看。</p>
      {s.error && <p role="alert" className="ui-field-error">{s.error}</p>}
    </SharedSheet>}
    {s.panel === "pick" && <SelectionSheet s={s} close={close} />}
    {s.panel === "crop" && s.selectedPhoto && <CropSheet s={s} close={close} />}
    {s.panel === "payment" && <SharedSheet opened id="graduate-payment-title" title="选择支付方式" busy={s.busy} onClose={close}
      footer={<button className="primary-button" type="button" disabled={s.busy}
        onClick={() => s.pay()}>{checkoutLabel("print", s.method, null)}</button>}>
      <PaymentChoices kind="print" method={s.method} setMethod={(value) => { s.method = value; }}
        outcome={s.outcome} setOutcome={(value) => { s.outcome = value; }} disabled={s.busy} />
      {s.error && <p role="alert" className="ui-field-error">{s.error}</p>}
    </SharedSheet>}
  </>;
}
export default function GraduatePrintPage() {
  return <Controller name="graduatePrint">{(s) => <GraduatePrintScreen s={s} />}</Controller>;
}
