import ShippingAddressFields from "../components/ShippingAddressFields.jsx";
import React, { useRef } from "react";
import { Controller, View } from "../runtime/components.jsx";
import ToolNavigation from "../components/ToolNavigation.jsx";
import PhotoSelectionActions from "../components/PhotoSelectionActions.jsx";
import KeepsakeCropControls from "../components/KeepsakeCropControls.jsx";
import KeepsakeWorkspace from "../components/KeepsakeWorkspace.jsx";
import SharedSheet, { SheetFrame } from "../components/SharedSheet.jsx";
import ToolPhotoSelection from "../components/ToolPhotoSelection.jsx";
const money = (v) => "¥" + (v / 100).toFixed(2);
function Screen({ s }) {
  const phoneInput = useRef(null);
  const photoTrigger = useRef(null);
  const cropTrigger = useRef(null);
  if (s.page !== "keepsake") return null;
  const productTitle =
    s.kind === "stamp" ? "致青春 · 学生纪念邮折" : s.product.name;
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
        onClick={() => s.pay()}
      >
        {s.paying ? "正在确认…" : "确认演示付款 " + money(s.total)}
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
        className="page tool-page keepsake-page"
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
            {(s.view === "work" || s.view === "templates") && (
              <KeepsakeWorkspace
                s={s}
                photoTrigger={photoTrigger}
                cropTrigger={cropTrigger}
              />
            )}
            {s.busy && <p role="status">正在准备照片…</p>}
            {s.view === "confirm" && (
              <>
                <button
                  type="button"
                  className="keepsake-address tool-settings"
                  disabled={s.locked || s.order?.status === "verifying"}
                  onClick={() => s.open("addresses")}
                >
                  <span>收货地址</span>
                  <strong>
                    {s.address
                      ? `${s.address.name} ${s.address.phone}`
                      : "请选择收货地址"}
                  </strong>
                  {s.address && (
                    <span>
                      {s.address.region} {s.address.street}
                    </span>
                  )}
                </button>
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
                {s.kind === "stamp" && s.studentProof && (
                  <section className="tool-settings stamp-proof">
                    <h3>学生资格</h3>
                    <p>学生证已上传，付款后人工审核。</p>
                  </section>
                )}
                <dl className="tool-settings keepsake-fees">
                  <div>
                    <dt>商品金额</dt>
                    <dd>{money(s.order?.price ?? s.product.price)}</dd>
                  </div>
                  <div>
                    <dt>运费</dt>
                    <dd>{money(s.order?.shipping ?? s.product.shipping)}</dd>
                  </div>
                  <div>
                    <dt>数量</dt>
                    <dd>1套</dd>
                  </div>
                  <div>
                    <dt>应付金额</dt>
                    <dd>{money(s.total)}</dd>
                  </div>
                </dl>
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
          {(s.view === "work" || s.view === "templates") && (
            <footer className="tool-footer photo-selection-footer">
              <button
                type="button"
                className="tool-primary"
                disabled={
                  !s.photo ||
                  !s.image ||
                  !s.proofReady ||
                  s.locked ||
                  s.purchaseLocked
                }
                onClick={() => s.confirm()}
              >
                {s.busy ? "正在准备照片…" : "下一步 · 填写收货地址"}
              </button>
            </footer>
          )}
          {s.view === "confirm" && (
            <footer className="tool-footer photo-selection-footer">
              <PhotoSelectionActions
                label="订单确认操作"
                hasPhoto
                disabled={s.locked}
                replaceLabel="上一步"
                nextLabel={
                  s.order?.status === "verifying"
                    ? "查询原单付款结果"
                    : "确认并支付 " + money(s.total)
                }
                nextEnabled={s.canPay}
                onSelect={() => s.back()}
                onNext={() => s.requestPayment()}
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
            keepsakeCrop: "调整构图",
            addresses: "收货地址",
            addressEdit: "新增收货地址",
            payment: "确认付款",
            resolution: "查询付款结果",
          }[s.panel] || ""
        }
        opened={!!s.panel && s.panel !== "album"}
        onClose={() => s.close()}
        busy={s.locked}
        returnFocusRef={s.panel === "keepsakeCrop" ? cropTrigger : undefined}
        footer={
          s.panel === "keepsakeCrop" ? (
            <button
              type="button"
              className="tool-primary"
              disabled={s.locked}
              onClick={() => s.applyCrop()}
            >
              完成
            </button>
          ) : (
            paymentFooter
          )
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
            disabled={s.locked}
            onChange={(key, value) => {
              s.addressFields[key] = value;
            }}
          />
        )}
        {s.panel === "payment" && (
          <>
            <p>{s.order?.templateName || s.template.name} · 1套</p>
            <p>应付 {money(s.total)} · 原型演示</p>
            {[
              ["wechat", "微信支付"],
              ["alipay", "支付宝支付"],
            ].map(([id, label]) => (
              <label className="tool-payment-method" key={id}>
                <span>{label}</span>
                <input
                  type="radio"
                  name="keepsake-method"
                  checked={s.paymentMethod === id}
                  disabled={s.locked}
                  onChange={() => {
                    s.paymentMethod = id;
                  }}
                />
              </label>
            ))}
            <label className="keepsake-demo-outcome">
              原型演示结果
              <select
                value={s.demoOutcome}
                disabled={s.locked}
                onChange={(e) => {
                  s.demoOutcome = e.target.value;
                }}
              >
                <option value="success">付款成功</option>
                <option value="failure">付款失败</option>
                <option value="cancel">取消付款</option>
                <option value="unknown">结果未确认</option>
              </select>
            </label>
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
        {s.error && (
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
