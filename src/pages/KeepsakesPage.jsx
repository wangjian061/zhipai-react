import ShippingAddressFields from "../components/ShippingAddressFields.jsx";
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, View } from "../runtime/components.jsx";
import ToolNavigation from "../components/ToolNavigation.jsx";
import PhotoSelectionActions from "../components/PhotoSelectionActions.jsx";
import KeepsakeCropControls from "../components/KeepsakeCropControls.jsx";
import KeepsakeWorkspace from "../components/KeepsakeWorkspace.jsx";
import SharedSheet, { SheetFrame } from "../components/SharedSheet.jsx";
import ToolPhotoSelection from "../components/ToolPhotoSelection.jsx";
import { PaymentChoices, PaymentRecovery } from "../components/PaymentHandoff.jsx";
import { checkoutLabel } from "../domain/payment-handoff.js";
const money = (v) => "¥" + (v / 100).toFixed(2);
function readConnection() {
  return globalThis.navigator?.onLine !== false;
}

function subscribeToConnection(update) {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

export function checkoutPaymentAction(s, online) {
  if (s.locked || !s.orders.ready || !online || (!s.order && (!s.photo || !s.output)))
    return "disabled";
  if (s.canPay) return "pay";
  if (!s.address) return "address";
  if (!s.proofReady) return "proof";
  return "disabled";
}

function CheckoutFieldAlert({ id, pulse, children }) {
  return (
    <>
      <span key={pulse} className="keepsake-checkout-pulse" aria-hidden="true" />
      <p id={id} className="ui-field-error keepsake-checkout-error" role="alert">{children}</p>
    </>
  );
}

function StampVerification({ s, cardRef, missingPulse }) {
  const uploaded = s.proofReady;
  const uploadLabel = uploaded ? "更换学生身份凭证" : "上传学生证照片";
  const fileInput = !s.purchaseLocked && (
    <input type="file" aria-label={uploadLabel} accept="image/jpeg,image/png,image/webp"
      aria-describedby={missingPulse ? "keepsake-proof-required" : undefined}
      aria-invalid={missingPulse ? true : undefined} disabled={s.locked} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        s.acceptProof(file);
      }} />
  );
  const proofIcon = (
    <span className="stamp-verification-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><use href="#i-id" /></svg>
    </span>
  );
  return (
    <section ref={cardRef} className="tool-settings keepsake-checkout-card stamp-verification-card"
      data-missing={!!missingPulse} aria-labelledby="stamp-verification-title"
      aria-busy={s.proofReading || undefined}>
      <header>
        <h2 id="stamp-verification-title">学生身份核验</h2>
        <span className="stamp-verification-status" data-uploaded={uploaded}>
          {uploaded ? "已上传" : "待上传"}
        </span>
      </header>
      <p>仅限在校学生购买，请上传学生证或学信网截图，支付后人工审核，未通过自动原路退款。</p>
      {uploaded ? (
        <div className="stamp-verification-row">
          {s.studentProofURL
            ? <img src={s.studentProofURL} alt="已上传的学生身份凭证" />
            : proofIcon}
          <div>
            <strong>学生身份凭证已上传</strong>
            <small>支付后人工审核</small>
          </div>
          {fileInput && (
            <label className="stamp-proof-input stamp-proof-replace">
              更换
              {fileInput}
            </label>
          )}
        </div>
      ) : fileInput && (
        <label className="stamp-verification-row stamp-proof-input stamp-proof-entry">
          {proofIcon}
          <strong>上传学生证照片</strong>
          <svg className="stamp-proof-chevron" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chevron" /></svg>
          {fileInput}
        </label>
      )}
      {missingPulse && (
        <CheckoutFieldAlert id="keepsake-proof-required" pulse={missingPulse}>
          请先上传购买人学生证后再继续支付
        </CheckoutFieldAlert>
      )}
      {s.proofReading && <p role="status">正在读取凭证…</p>}
      {s.proofError && <p className="stamp-proof-error" role="alert">{s.proofError}</p>}
    </section>
  );
}

function Screen({ s }) {
  const phoneInput = useRef(null);
  const photoTrigger = useRef(null);
  const addressCardRef = useRef(null);
  const proofCardRef = useRef(null);
  const [missing, setMissing] = useState(null);
  const online = useSyncExternalStore(subscribeToConnection, readConnection, readConnection);
  const stamp = s.kind === "stamp";
  const checkingOut = s.page === "keepsake" && s.view === "confirm";
  const showMissing = checkingOut && !s.purchaseLocked && missing?.kind === s.kind;
  const addressPulse = showMissing && missing.field === "address" && !s.address ? missing.pulse : 0;
  const proofPulse = showMissing && stamp && missing.field === "proof" && !s.proofReady ? missing.pulse : 0;

  useEffect(() => {
    if (missing && !addressPulse && !proofPulse) setMissing(null);
  }, [missing, addressPulse, proofPulse]);

  if (s.page !== "keepsake") return null;
  const hasSelection = !!(s.photo || s.previewRequest);
  const inPreview = s.panel === "keepsakeCrop";
  const productTitle = stamp ? "致青春 · 学生纪念邮折" : s.product.name;

  function handlePayment() {
    const next = checkoutPaymentAction(s, readConnection());
    if (next === "pay") {
      setMissing(null);
      return s.requestPayment({ handoff: true });
    }
    if (next === "disabled") return;
    setMissing((previous) => ({ kind: s.kind, field: next, pulse: (previous?.pulse || 0) + 1 }));
    const card = next === "address" ? addressCardRef : proofCardRef;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    card.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  const title = {
    templates: productTitle,
    work: productTitle,
    confirm: "确认订单",
    result: "下单成功",
  }[s.view];
  const paperSpec = s.order || s.product;
  const addresses = s.$store.printLibrary.addresses;
  const paymentFooter =
    s.panel === "payment" ? (
      <button
        className="tool-primary"
        disabled={!s.canPay || s.paying}
        onClick={() => s.pay(s.demoOutcome, { handoff: true })}
      >
        {s.paying ? "正在确认…" : checkoutLabel(s.kind, s.paymentMethod, s.order)}
      </button>
    ) : s.panel === "resolution" ? (
      <button
        className="tool-primary"
        disabled={s.locked}
        onClick={() => s.resolvePayment()}
      >
        查询原单付款结果
      </button>
    ) : s.panel === "addressEdit" ? (
      <button
        className="tool-primary"
        disabled={s.locked}
        onClick={() => s.saveAddress()}
      >
        保存收货地址
      </button>
    ) : null;
  return (
    <>
      <section
        className="page tool-page keepsake-page ui-task-page"
        inert={!!s.panel}
        aria-label={s.product.name}
      >
        <div className="tool-flow">
          <ToolNavigation
            title={title}
            disabled={s.locked}
            onBack={() => s.back()}
          />
          <div className="keepsake-scroll">
            {s.orders.error && (
              <p className="tool-error" role="alert">
                {s.orders.error}
                <button
                  className="tool-secondary"
                  onClick={() => s.orders.load()}
                >
                  重新读取
                </button>
              </p>
            )}
            {s.isProductView && (
              <KeepsakeWorkspace s={s} />
            )}
            {s.busy && !s.proofReading && !s.panel && <p role="status">正在准备照片…</p>}
            {s.view === "confirm" && (
              <>
                <div ref={addressCardRef} className="tool-settings keepsake-checkout-card keepsake-address-card"
                  data-missing={!!addressPulse}>
                  <button
                    type="button"
                    className="keepsake-address"
                    aria-describedby={addressPulse ? "keepsake-address-required" : undefined}
                    disabled={s.locked || s.order?.status === "verifying"}
                    onClick={() => s.open("addresses")}
                  >
                    <span>收货地址</span>
                    <strong>
                      {s.address
                        ? `${s.address.name} ${s.address.phone}`
                        : "请选择收货地址"}
                    </strong>
                    {s.address && <span>{s.address.region} {s.address.street}</span>}
                  </button>
                  {addressPulse > 0 && (
                    <CheckoutFieldAlert id="keepsake-address-required" pulse={addressPulse}>
                      请先选择收货地址后再继续支付
                    </CheckoutFieldAlert>
                  )}
                </div>
                {stamp && <StampVerification s={s} cardRef={proofCardRef} missingPulse={proofPulse || undefined} />}
                <section className="tool-settings keepsake-purchase">
                  <img src={s.outputURL} alt="本次合成成品" />
                  <div>
                    <h2>
                      {s.order?.templateName || s.template.name}
                      {s.product.itemName}
                    </h2>
                    <p>
                      1套 · 内含{s.order?.count ?? s.product.count}
                      {s.order?.unit ?? s.product.unit}
                    </p>
                    {s.kind === "postcard" &&
                      paperSpec.material &&
                      paperSpec.size && (
                        <small>
                          {paperSpec.material} · {paperSpec.size}
                        </small>
                      )}
                  </div>
                </section>
                <dl className="tool-settings keepsake-fees">
                  <div>
                    <dt>商品金额</dt>
                    <dd><span className="ui-price">{money(s.order?.price ?? s.product.price)}</span></dd>
                  </div>
                  <div>
                    <dt>运费</dt>
                    <dd><span className="ui-price">{money(s.order?.shipping ?? s.product.shipping)}</span></dd>
                  </div>
                  <div>
                    <dt>数量</dt>
                    <dd>1套</dd>
                  </div>
                  <div>
                    <dt>应付金额</dt>
                    <dd><span className="ui-price">{money(s.total)}</span></dd>
                  </div>
                </dl>
                <section className="tool-settings">
                  <PaymentRecovery order={s.order} busy={s.paying}
                    resolution={s.checkoutResolution} setResolution={(value) => { s.checkoutResolution = value; }}
                  />
                  {s.order?.status !== "verifying" && (
            <PaymentChoices kind={s.kind} method={s.paymentMethod}
              setMethod={(value) => { s.paymentMethod = value; }}
              outcome={s.demoOutcome} setOutcome={(value) => { s.demoOutcome = value; }} disabled={s.locked}
            />
                  )}
                </section>
                <p className="keepsake-note">
                  {s.kind === "stamp"
                    ? "运费为原型演示值，付款流程仅作演示。"
                    : "原型模拟下单，不实际扣款。"}
                </p>
              </>
            )}
            {s.view === "result" && (
              <>
                <div className="keepsake-success">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                  <h2>
                    {s.order?.review === "rejected"
                      ? "订单已取消"
                      : "演示付款成功"}
                  </h2>
                  <p>模板、照片与收货信息已记录</p>
                </div>
                <img
                  className="keepsake-finished-preview"
                  src={s.outputURL}
                  alt="本次定制成品"
                />
                <section className="tool-settings">
                  <h3>
                    {s.order?.review === "pending"
                      ? "学生资格待审核"
                      : s.order?.review === "rejected"
                        ? "审核未通过 · 订单已取消"
                        : "制作中"}
                  </h3>
                  <p>
                    {s.order?.review === "pending"
                      ? "支付成功，待人工审核通过后安排制作。"
                      : s.order?.review === "rejected"
                        ? s.order.refund?.status === "refunded"
                          ? "款项已原路退回。"
                          : "正在原路退款。"
                        : "后续进度在我的订单中查看"}
                  </p>
                  {s.order?.review === "pending" && (
                    <details className="stamp-review-demo">
                      <summary>演示人工审核</summary>
                      <button
                        disabled={s.locked}
                        onClick={() => s.demoReview("approved")}
                      >
                        审核通过
                      </button>
                      <button
                        disabled={s.locked}
                        onClick={() => s.demoReview("rejected")}
                      >
                        审核未通过
                      </button>
                    </details>
                  )}
                </section>
                <p className="keepsake-note">
                  本地模拟订单，未接入真实生产配送。
                </p>
              </>
            )}
            {s.error && s.panel !== "album" && (
              <p className="tool-error" role="alert">
                {s.error}
              </p>
            )}
          </div>
          {s.isProductView && (
            <footer className="tool-footer photo-selection-footer">
              {hasSelection && s.previewError && (
                <p className="keepsake-proof-note" role="status">{s.previewError}</p>
              )}
              {hasSelection ? (
                <div className="keepsake-preview-actions">
                  <button ref={photoTrigger} type="button" className="tool-secondary"
                    disabled={s.locked || s.purchaseLocked} onClick={() => s.editComposition()}>
                    继续预览
                  </button>
                  <button type="button" className="tool-primary"
                    disabled={!s.canContinue} onClick={() => s.confirm()}>
                    去确认订单
                  </button>
                </div>
              ) : (
                <button ref={photoTrigger} type="button" className="tool-primary"
                  disabled={s.locked || s.purchaseLocked} onClick={() => s.pick()}>
                  上传照片 · 预览效果
                </button>
              )}
            </footer>
          )}
          {s.view === "confirm" && (
            <footer className="tool-footer photo-selection-footer">
              <PhotoSelectionActions
                label="订单确认操作"
                hasPhoto
                disabled={s.locked}
                replaceLabel="上一步"
                selectDisabled={s.order?.status === "verifying"}
                nextLabel={s.paying ? "正在确认…" : checkoutLabel(s.kind, s.paymentMethod, s.order)}
                nextEnabled={checkoutPaymentAction(s, online) !== "disabled"}
                onSelect={() => s.back()}
                onNext={handlePayment}
              />
            </footer>
          )}
          {s.view === "result" && (
            <footer className="tool-footer photo-selection-footer">
              <PhotoSelectionActions
                label="订单完成操作"
                hasPhoto
                replaceLabel="回到首页"
                nextLabel="查看订单"
                onSelect={() => s.go("home")}
                onNext={() => s.viewOrder()}
              />
            </footer>
          )}
        </div>
      </section>
      <SheetFrame
        id="keepsake-photo-title"
        className="photo-selection-sheet"
        returnFocusRef={photoTrigger}
        opened={s.panel === "album"}
        busy={s.locked}
        onClose={() => s.close()}
      >
        <ToolPhotoSelection
          titleId="keepsake-photo-title"
          library={s.$store.photoLibrary}
          selectedId={s.candidateId}
          mascot="/assets/bear-album.webp"
          busy={s.locked}
          error={s.error}
          onClose={() => s.close()}
          onSelect={(value) => s.selectCandidate(value)}
          onConfirm={() => s.useCandidate()}
          onPhone={() => phoneInput.current?.click()}
          onCreate={() => s.makePhoto()}
        />
        <input
          ref={phoneInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            s.usePhoneFile(file);
          }}
        />
      </SheetFrame>
      <SharedSheet
        id="keepsake-sheet-title"
        title={
          {
            keepsakeCrop: "定制预览",
            addresses: "收货地址",
            addressEdit: "新增收货地址",
            payment: "确认付款",
            resolution: "查询付款结果",
          }[s.panel] || ""
        }
        opened={!!s.panel && s.panel !== "album"}
        onClose={() => s.close()}
        busy={s.locked}
        returnFocusRef={inPreview ? photoTrigger : undefined}
        className={inPreview ? "keepsake-preview-sheet" : undefined}
        footer={
          inPreview ? (
            <div className="keepsake-preview-actions">
              <button type="button" className="tool-secondary" disabled={s.locked}
                onClick={() => s.pick()}>换一张</button>
              <button type="button" className="tool-primary" disabled={!s.canContinue}
                onClick={() => s.confirm()}>
                满意，去确认订单
              </button>
            </div>
          ) : paymentFooter
        }
      >
        {s.panel === "keepsakeCrop" && s.cropDraft && <KeepsakeCropControls s={s} />}
        {s.panel === "addresses" && (
          <>
            <div className="keepsake-address-list">
              {addresses.map((x) => (
                <button key={x.id} onClick={() => s.chooseAddress(x.id)}>
                  <strong>
                    {x.name} {x.phone}
                  </strong>
                  <span>
                    {x.region} {x.street}
                  </span>
                </button>
              ))}
            </div>
            {!s.$store.printLibrary.ready ? (
              <p role="status">正在读取收货地址…</p>
            ) : (
              !addresses.length && <p>暂无收货地址</p>
            )}
            {s.$store.printLibrary.error && (
              <p className="tool-error" role="alert">
                {s.$store.printLibrary.error}
                <button
                  className="tool-secondary"
                  onClick={() => s.$store.printLibrary.load()}
                >
                  重新读取
                </button>
              </p>
            )}
            <button
              className="tool-primary"
              disabled={
                !s.$store.printLibrary.ready || s.$store.printLibrary.busy
              }
              onClick={() => s.open("addressEdit")}
            >
              新增收货地址
            </button>
          </>
        )}
        {s.panel === "addressEdit" && (
          <ShippingAddressFields
            fields={s.addressFields}
            error={s.error}
            disabled={s.locked}
            onChange={(key, value) => {
              s.addressFields[key] = value;
            }}
          />
        )}
        {s.panel === "payment" && (
          <>
            <p>{s.order?.templateName || s.template.name} · 1套</p>
            <p>应付 <span className="ui-price">{money(s.total)}</span> · 原型演示</p>
            <PaymentChoices kind={s.kind} method={s.paymentMethod}
              setMethod={(value) => { s.paymentMethod = value; }}
              outcome={s.demoOutcome} setOutcome={(value) => { s.demoOutcome = value; }} disabled={s.locked}
            />
          </>
        )}
        {s.panel === "resolution" && (
          <>
            <p>本单付款结果尚未确认，先查询原单，避免重复支付。</p>
            <label className="keepsake-demo-outcome">
              原型查询结果
              <select
                value={s.resolution}
                disabled={s.locked}
                onChange={(e) => {
                  s.resolution = e.target.value;
                }}
              >
                <option value="paid">已支付</option>
                <option value="failed">未支付</option>
                <option value="unknown">仍未确认</option>
              </select>
            </label>
          </>
        )}
        {s.error && s.panel !== "addressEdit" && (
          <p className="tool-error" role="alert">
            {s.error}
          </p>
        )}
      </SharedSheet>
    </>
  );
}
export default function KeepsakesPage({ scope }) {
  return (
    <Controller name="keepsakeStudio">{(s) => <Screen s={s} />}</Controller>
  );
}
