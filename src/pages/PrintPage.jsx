import PrintLayoutViewer from "../components/PrintLayoutViewer.jsx";
import ShippingAddressFields from "../components/ShippingAddressFields.jsx";
import React from "react";
import ToolNavigation from "../components/ToolNavigation.jsx";
import PrintWorkspace from "../components/PrintWorkspace.jsx";
import ToolPhotoSelection from "../components/ToolPhotoSelection.jsx";
import PhotoSelectionEmpty from "../components/PhotoSelectionEmpty.jsx";
import PhotoSelectionPreview from "../components/PhotoSelectionPreview.jsx";
import PhotoSelectionActions from "../components/PhotoSelectionActions.jsx";
import FixedPhotoCrop from "../components/FixedPhotoCrop.jsx";
import { View, Repeat, Portal } from "../runtime/components.jsx";
export default function PrintPage({ scope: s }) {
  return (
    <View
      as="section"
      scope={s}
      scopeRoot
      className="page print-page"
      id="print-page"
      data-view={s.view}
      inert={s.$store.printUi.opened}
      show={s.page === "print"}
      aria-label="照片冲印"
    >
      <ToolNavigation
        title={s.title}
        disabled={s.processing || s.store.busy}
        onBack={() => s.back()}
      />
      <View
        as="div"
        scope={s}
        className="print-global-error"
        show={s.store.error}
        role="alert"
      >
        <View as="p" scope={s} text={s.store.error}></View>
        <View
          as="button"
          scope={s}
          disabled={s.store.busy}
          events={[
            {
              type: "click",
              prevent: false,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.store.loading = scope.store.load();
              },
            },
          ]}
        >
          {"重新读取"}
        </View>
      </View>
      <View
        as="div"
        scope={s}
        className="print-notice"
        show={s.message}
        text={s.message}
        role="status"
        aria-live="polite"
      ></View>
      <View
        as="div"
        scope={s}
        className="print-error-banner"
        show={s.error}
        text={s.error}
        role="alert"
      ></View>

      {s.view === "crop" && s.draft.photo && (
        <div className="print-screen print-crop-screen">
          <div className="print-body print-crop-body">
            <div className="print-crop-heading">
              <h2>调整照片，适配冲印</h2>
              <p>两种排版均使用一寸比例，请确认保留的画面。</p>
              <span>一寸比例 · 5∶7</span>
            </div>
            <FixedPhotoCrop
              key={s.draft.photo.id}
              photo={s.draft.photo}
              src={s.photoURL}
              value={s.crop}
              processing={s.processing}
              disabled={s.disabled}
              onChange={(value) => s.setCrop(value)}
            />
          </div>
          <footer className="print-footer print-step-footer">
            <button
              className="print-previous"
              disabled={s.disabled}
              onClick={() => s.previousStep()}
            >
              <svg aria-hidden="true">
                <use href="#i-chevron-left" />
              </svg>
              上一步
            </button>
            <button
              className="print-primary"
              disabled={s.disabled}
              onClick={() => s.applyCrop()}
            >
              {s.processing ? "正在裁剪…" : "确认裁剪并继续"}
            </button>
          </footer>
        </div>
      )}
      {s.view === "layouts" && <PrintWorkspace studio={s} />}
      <View
        as="div"
        scope={s}
        className="print-screen"
        show={s.view === "confirm"}
      >
        <View as="div" scope={s} className="print-body" show={!s.flowCompleted}>
          <View
            as="button"
            scope={s}
            className="print-address-entry"
            disabled={s.disabled}
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.openAddresses();
                },
              },
            ]}
          >
            <View as="span" scope={s} className="print-address-symbol">
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-nav-user"></View>
              </View>
            </View>
            <View as="div" scope={s}>
              {s.address ? (
                <>
                  <>
                    <View as="div" scope={s}>
                      <View as="strong" scope={s}>
                        <View as="span" scope={s} text={s.address.name}></View>
                        <View as="span" scope={s} text={s.address.phone}></View>
                      </View>
                      <View
                        as="p"
                        scope={s}
                        text={s.addressText(s.address)}
                      ></View>
                    </View>
                  </>
                </>
              ) : null}
              <View as="div" scope={s} show={!s.address}>
                <View as="strong" scope={s}>
                  {"添加收货地址"}
                </View>
                <View as="p" scope={s}>
                  {"照片将寄送到这个地址"}
                </View>
              </View>
            </View>
            <View
              as="svg"
              scope={s}
              className="print-row-chevron"
              aria-hidden="true"
            >
              <View as="use" scope={s} href="#i-chevron"></View>
            </View>
          </View>
          <View as="section" scope={s} className="print-card">
            <View as="div" scope={s} className="print-section-heading">
              <View as="h2" scope={s}>
                {"冲印内容"}
              </View>
              <View
                as="button"
                scope={s}
                disabled={s.disabled}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.route("layouts");
                    },
                  },
                ]}
              >
                {"修改"}
              </View>
            </View>
            <View as="div" scope={s} className="print-checkout-product">
              <View
                as="div"
                scope={s}
                className="print-product-sheet"
                html={s.sheet(s.draft.layout)}
              ></View>
              <View as="div" scope={s}>
                <View as="strong" scope={s} text={s.layout.name}></View>
                <View
                  as="p"
                  scope={s}
                  text={s.layout.paperLabel || "背胶模切排版照"}
                ></View>
                <View
                  as="span"
                  scope={s}
                  text={
                    s.draft.quantity +
                    " 版 · 共 " +
                    (s.layout.count || 0) * s.draft.quantity +
                    " 张照片"
                  }
                ></View>
              </View>
            </View>
          </View>
          <View as="section" scope={s} className="print-card print-costs">
            <View as="h2" scope={s}>
              {"费用明细 "}
            </View>
            <View as="div" scope={s}>
              <View as="span" scope={s}>
                {"冲印费 "}
                <View
                  as="small"
                  scope={s}
                  show={s.quote}
                  text={s.quote ? s.money(s.quote.unitPrice) + " / 版" : ""}
                ></View>
              </View>
              <View
                as="strong"
                scope={s}
                text={
                  s.quoteLoading
                    ? "正在获取…"
                    : s.quote
                      ? s.money(s.quote.subtotal)
                      : "—"
                }
              ></View>
            </View>
            <View as="div" scope={s}>
              <View as="span" scope={s}>
                {"运费"}
              </View>
              <View
                as="strong"
                scope={s}
                text={
                  s.quoteLoading
                    ? "正在获取…"
                    : s.quote?.shipping != null
                      ? s.money(s.quote.shipping)
                      : "¥10.00"
                }
              ></View>
            </View>
            <View as="div" scope={s} className="print-cost-total">
              <View as="span" scope={s}>
                {"合计"}
              </View>
              <View
                as="strong"
                scope={s}
                text={
                  s.quote?.total != null && !s.quoteLoading
                    ? s.money(s.quote.total)
                    : "—"
                }
              ></View>
            </View>
            <View
              as="div"
              scope={s}
              className="print-quote-error"
              show={s.quoteError}
            >
              <View as="p" scope={s} text={s.quoteError} role="alert"></View>
              <View
                as="button"
                scope={s}
                disabled={s.quoteLoading}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.loadQuote(true);
                    },
                  },
                ]}
              >
                {"重新获取费用"}
              </View>
            </View>
          </View>
          <View as="p" scope={s} className="print-checkout-caption">
            {"配送范围与时效以正式订单信息为准"}
          </View>
        </View>
        <View
          as="div"
          scope={s}
          className="print-flow-done"
          show={s.flowCompleted}
          role="status"
        >
          <View
            as="img"
            scope={s}
            src="assets/zhipai-mascot.webp"
            width="1024"
            height="1024"
            alt=""
            aria-hidden="true"
          ></View>
          <View as="h2" scope={s}>
            {"订单已确认"}
          </View>
          <View as="p" scope={s}>
            {"本次冲印流程已完成"}
            <View as="br" scope={s}></View>
            {"可在「我的订单」查看记录"}
          </View>
          <View
            as="button"
            scope={s}
            className="print-primary"
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.startPrint();
                },
              },
            ]}
          >
            {"重新选择照片"}
          </View>
        </View>
        <View
          as="footer"
          scope={s}
          className="print-footer print-pay-footer"
          show={!s.flowCompleted}
        >
          <View as="div" scope={s} className="print-pay-actions">
            <button
              type="button"
              className="print-previous"
              disabled={s.disabled}
              onClick={() => s.previousStep()}
            >
              <svg aria-hidden="true">
                <use href="#i-chevron-left" />
              </svg>
              上一步
            </button>
            <View
              as="button"
              scope={s}
              className="print-primary"
              disabled={!s.canSubmit || !s.online}
              text={s.store.busy ? "正在提交…" : "确认并支付"}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.submitOrder();
                  },
                },
              ]}
            ></View>
          </View>
        </View>
      </View>
      <View
        as="div"
        scope={s}
        className="print-screen"
        show={s.view === "addresses"}
      >
        <View as="div" scope={s} className="print-body">
          <View
            as="div"
            scope={s}
            className="print-empty"
            show={s.store.ready && !s.store.addresses.length}
          >
            <View as="svg" scope={s} aria-hidden="true">
              <View as="use" scope={s} href="#i-nav-user"></View>
            </View>
            <View as="h2" scope={s}>
              {"添加一个收货地址"}
            </View>
            <View as="p" scope={s}>
              {"收件人、联系电话和详细地址都需要填写。"}
            </View>
          </View>
          <Repeat
            scope={s}
            items={s.store.addresses}
            names={["item"]}
            keyFor={function (scope, $event, $el) {
              return scope.item.id;
            }}
          >
            {(s) => (
              <>
                <>
                  <View
                    as="section"
                    scope={s}
                    className="print-card print-address-card"
                  >
                    <View
                      as="button"
                      scope={s}
                      className="print-address-select"
                      disabled={s.disabled}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.selectAddress(scope.item.id);
                          },
                        },
                      ]}
                    >
                      <View
                        as="span"
                        scope={s}
                        className="print-radio"
                        dynamicClass={{
                          checked: s.draft.addressId === s.item.id,
                        }}
                      ></View>
                      <View as="div" scope={s}>
                        <View as="strong" scope={s}>
                          <View as="span" scope={s} text={s.item.name}></View>
                          <View as="span" scope={s} text={s.item.phone}></View>
                          <View as="small" scope={s} show={s.item.default}>
                            {"默认"}
                          </View>
                        </View>
                        <View
                          as="p"
                          scope={s}
                          text={s.addressText(s.item)}
                        ></View>
                      </View>
                    </View>
                    <View
                      as="button"
                      scope={s}
                      className="print-address-edit"
                      disabled={s.disabled}
                      events={[
                        {
                          type: "click",
                          prevent: false,
                          stop: false,
                          self: false,
                          passive: false,
                          run: function (scope, $event, $el) {
                            scope.editAddress(scope.item.id);
                          },
                        },
                      ]}
                    >
                      {"编辑"}
                    </View>
                  </View>
                </>
              </>
            )}
          </Repeat>
        </View>
        <View as="footer" scope={s} className="print-footer">
          <View
            as="button"
            scope={s}
            className="print-primary"
            disabled={s.disabled}
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.editAddress();
                },
              },
            ]}
          >
            {"添加新地址"}
          </View>
        </View>
      </View>
      <View
        as="div"
        scope={s}
        className="print-screen"
        show={s.view === "address"}
      >
        <View
          as="form"
          scope={s}
          className="print-address-form"
          events={[
            {
              type: "submit",
              prevent: true,
              stop: false,
              self: false,
              passive: false,
              run: function (scope, $event, $el) {
                scope.saveAddress();
              },
            },
          ]}
        >
          <View as="div" scope={s} className="print-body">
            <ShippingAddressFields
              className="print-card"
              fields={s.addressFields}
              disabled={s.disabled}
              onChange={(key, value) => {
                s.addressFields[key] = value;
              }}
            />
            <View
              as="p"
              scope={s}
              className="print-form-error"
              show={s.addressError}
              text={s.addressError}
              role="alert"
            ></View>
          </View>
          <View as="footer" scope={s} className="print-footer">
            <View
              as="button"
              scope={s}
              className="print-primary"
              type="submit"
              disabled={s.disabled}
              text={s.store.busy ? "正在保存…" : "保存并使用"}
            ></View>
          </View>
        </View>
      </View>
      <View
        as="p"
        scope={s}
        className="print-offline-note"
        show={!s.online}
        role="status"
      >
        {"网络不可用，请恢复连接后再提交或查询付款。"}
      </View>
      <Portal target="#print-modal-layer">
        <PrintLayoutViewer scope={s} />
        {s.modal !== "layoutPreview" && (
          <View
            as="div"
            scope={s}
            className="print-overlay"
            show={s.$store.printUi.opened}
            events={[
              {
                type: "click",
                prevent: false,
                stop: false,
                self: true,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.closeModal();
                },
              },
              {
                type: "keydown",
                prevent: false,
                stop: false,
                self: false,
                passive: false,
                run: function (scope, $event, $el) {
                  scope.trap($event);
                },
              },
            ]}
            transition={{
              opacity: true,
              duration: 180,
            }}
          >
            <View
              as="section"
              scope={s}
              className="print-dialog ui-sheet"
              show={s.$store.printUi.opened}
              dynamicClass={{
                "print-photo-drawer": s.modal === "album",
                "photo-selection-sheet": s.modal === "album",
              }}
              refName="printDialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="print-dialog-title"
              transition={{
                enter: "print-sheet-enter",
                start: "print-sheet-start",
                end: "print-sheet-end",
              }}
            >
              {s.modal !== "album" && (
                <View as="header" scope={s} className="ui-sheet-header">
                  <View
                    as="h2"
                    scope={s}
                    id="print-dialog-title"
                    text={s.modalTitle}
                  ></View>
                  <View
                    as="button"
                    scope={s}
                    className="print-dialog-close"
                    disabled={s.processing}
                    aria-label="关闭"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.closeModal();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-close"></View>
                    </View>
                  </View>
                </View>
              )}
              {s.modal === "album" ? (
                <ToolPhotoSelection
                  library={s.library}
                  selectedId={s.candidatePhotoId}
                  mascot="assets/bear-print.webp"
                  busy={s.processing || s.store.busy}
                  error={s.error}
                  titleId="print-dialog-title"
                  onClose={() => s.closeModal()}
                  onPhone={() => s.pickPhone()}
                  onCreate={() => s.makePhoto()}
                  onSelect={(id) => s.selectCandidate(id)}
                  onConfirm={() => s.preparePhoto()}
                />
              ) : null}
              <View
                as="div"
                scope={s}
                show={s.modal === "payment"}
                className="ui-sheet-panel"
              >
                <View as="div" scope={s} className="ui-sheet-body">
                  <View
                    as="p"
                    scope={s}
                    className="print-payment-amount"
                    text={s.order ? s.money(s.order.total) : ""}
                  ></View>
                  <View as="label" scope={s} className="print-payment-option">
                    <View as="span" scope={s}>
                      {"微信支付"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      type="radio"
                      name="print-payment"
                      value="wechat"
                      disabled={s.processing}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.paymentMethod;
                        },
                        write: function (scope, $event, $el) {
                          scope.paymentMethod = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                  <View as="label" scope={s} className="print-payment-option">
                    <View as="span" scope={s}>
                      {"支付宝支付"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      type="radio"
                      name="print-payment"
                      value="alipay"
                      disabled={s.processing}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.paymentMethod;
                        },
                        write: function (scope, $event, $el) {
                          scope.paymentMethod = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                </View>
                <View as="footer" scope={s} className="ui-sheet-footer">
                  <View
                    as="button"
                    scope={s}
                    className="print-primary"
                    disabled={s.disabled || !s.online}
                    text={s.processing ? "正在确认…" : "确认付款"}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.pay();
                        },
                      },
                    ]}
                  ></View>
                </View>
              </View>
              <View
                as="div"
                scope={s}
                show={s.modal === "resolution"}
                className="ui-sheet-panel"
              >
                <View as="div" scope={s} className="ui-sheet-body">
                  <View as="p" scope={s} className="print-dialog-copy">
                    {"付款结果未确认时，先查询同一订单，避免重复付款。"}
                  </View>
                  <View as="label" scope={s} className="print-query-choice">
                    {"付款状态"}
                    <View
                      as="select"
                      scope={s}
                      disabled={s.processing}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.resolution;
                        },
                        write: function (scope, $event, $el) {
                          scope.resolution = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    >
                      <View as="option" scope={s} value="paid">
                        {"已付款"}
                      </View>
                      <View as="option" scope={s} value="unpaid">
                        {"未付款"}
                      </View>
                      <View as="option" scope={s} value="unknown">
                        {"仍未确认"}
                      </View>
                    </View>
                  </View>
                </View>
                <View as="footer" scope={s} className="ui-sheet-footer">
                  <View
                    as="button"
                    scope={s}
                    className="print-primary"
                    disabled={s.disabled || !s.online}
                    text={s.processing ? "正在查询…" : "查询结果"}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.resolvePayment();
                        },
                      },
                    ]}
                  ></View>
                </View>
              </View>
              <View
                as="div"
                scope={s}
                show={s.modal === "cancel"}
                className="ui-sheet-panel"
              >
                <View as="div" scope={s} className="ui-sheet-body">
                  <View as="p" scope={s} className="print-dialog-copy">
                    {"取消这笔待付款订单？照片和地址仍会保留。"}
                  </View>
                </View>
                <View as="footer" scope={s} className="ui-sheet-footer">
                  <View
                    as="button"
                    scope={s}
                    className="print-primary"
                    disabled={s.disabled}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.cancelOrder();
                        },
                      },
                    ]}
                  >
                    {"确认取消"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    className="print-secondary"
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.closeModal();
                        },
                      },
                    ]}
                  >
                    {"保留订单"}
                  </View>
                </View>
              </View>
              <View
                as="p"
                scope={s}
                className="print-modal-message"
                show={s.message}
                text={s.message}
                role="status"
              ></View>
              <View
                as="p"
                scope={s}
                className="print-form-error"
                show={s.modal !== "album" && s.error}
                text={s.error}
                role="alert"
              ></View>
            </View>
          </View>
        )}
      </Portal>
    </View>
  );
}
