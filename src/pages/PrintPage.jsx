import React from "react";
import PhotoSelectionEmpty from "../components/PhotoSelectionEmpty.jsx";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function PrintPage({ scope, args = [] }) {
  return (
    <Controller name="printStudio" args={args}>
      {(s) => (
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
          <View
            as="header"
            scope={s}
            className="print-nav"
          >
            <View
              as="button"
              scope={s}
              className="print-back"
              disabled={s.processing || s.store.busy}
              aria-label="返回"
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.back();
                  },
                },
              ]}
            >
              <View as="svg" scope={s} aria-hidden="true">
                <View as="use" scope={s} href="#i-chevron"></View>
              </View>
            </View>
            <View as="h1" scope={s} text={s.title}></View>
            <View
              as="button"
              scope={s}
              className="print-nav-action"
              show={!["orders", "order", "result"].includes(s.view)}
              disabled={s.processing}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.filter = "all";
                    scope.openOrderList();
                  },
                },
              ]}
            >
              {"订单"}
            </View>
            <View
              as="button"
              scope={s}
              className="print-nav-action"
              show={["orders", "order", "result"].includes(s.view)}
              disabled={s.processing}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: false,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.go("support");
                  },
                },
              ]}
            >
              {"客服"}
            </View>
          </View>
          <View
            as="nav"
            scope={s}
            className="print-steps"
            show={["select", "layouts", "confirm"].includes(s.view)}
            aria-label="冲印步骤"
          >
            <View
              as="span"
              scope={s}
              dynamicClass={{
                current: s.view === "select",
                done: s.view !== "select",
              }}
              aria-current={s.view === "select" ? "step" : null}
            >
              <View as="b" scope={s}>
                {"1"}
              </View>
              {"选照片"}
            </View>
            <View
              as="span"
              scope={s}
              dynamicClass={{
                current: s.view === "layouts",
                done: s.view === "confirm",
              }}
              aria-current={s.view === "layouts" ? "step" : null}
            >
              <View as="b" scope={s}>
                {"2"}
              </View>
              {"选排版"}
            </View>
            <View
              as="span"
              scope={s}
              dynamicClass={{
                current: s.view === "confirm",
              }}
              aria-current={s.view === "confirm" ? "step" : null}
            >
              <View as="b" scope={s}>
                {"3"}
              </View>
              {"确认订单"}
            </View>
          </View>
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
          
          <View
            as="div"
            scope={s}
            className="print-screen"
            show={s.view === "select"}
          >
            <View
              as="div"
              scope={s}
              className="print-body print-selection-body"
            >
              {!s.draft.photo && <PhotoSelectionEmpty mascot="assets/bear-print.webp" description="从知拍相册选择" disabled={s.disabled || s.library.busy} onSelect={() => s.openAlbum()} />}
              <View
                as="button"
                scope={s}
                className="print-selected-photo"
                show={!!s.draft.photo}
                disabled={s.disabled || s.library.busy}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openAlbum();
                    },
                  },
                ]}
              >
                <View
                  as="img"
                  scope={s}
                  show={s.draft.photo}
                  src={s.photoURL || undefined}
                  alt="所选冲印照片"
                ></View>
                
                <View
                  as="span"
                  scope={s}
                  className="print-reselect"
                  show={s.draft.photo}
                >
                  {"重新选取"}
                </View>
              </View>
              <View
                as="p"
                scope={s}
                className="print-selected-spec"
                show={s.draft.photo}
                text={s.draft.photo?.spec || ""}
              ></View>
              
            </View>
            <View as="footer" scope={s} className="print-footer print-step-footer">

              <View
                as="button"
                scope={s}
                className="print-primary"
                disabled={s.disabled || s.library.busy}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.draft.photo?.blob ? scope.nextLayouts() : scope.openAlbum();
                    },
                  },
                ]}
              >
                {s.draft.photo?.blob ? "下一步" : "选取照片"}
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-arrow"></View>
                </View>
              </View>
            </View>
          </View>
          <View
            as="div"
            scope={s}
            className="print-screen"
            show={s.view === "layouts"}
          >
            <View as="div" scope={s} className="print-body print-layout-body">
              <View as="section" scope={s} className="print-layout-panel">
                <View as="div" scope={s} className="print-source-strip">
                  <View
                    as="svg"
                    scope={s}
                    className="print-paper-preview"
                    viewBox="0 0 152 102"
                    role="img"
                    aria-label="所选照片的横向排版预览"
                    show={s.selectedLayout && !s.layoutsLoading}
                  >
                    <image
                      href={s.selectedLayout?.previewURL || undefined}
                      width="102"
                      height="152"
                      transform="translate(152 0) rotate(90)"
                    />
                  </View>
                  <View
                    as="div"
                    scope={s}
                    className="print-layout-loading"
                    show={s.layoutsLoading}
                    role="status"
                  >
                    <View
                      as="div"
                      scope={s}
                      className="print-layout-skeleton"
                      aria-hidden="true"
                    >
                      <Repeat
                        scope={s}
                        items={8}
                        names={["slot"]}
                        keyFor={function (scope, $event, $el) {
                          return scope.slot;
                        }}
                      >
                        {(s) => (
                          <>
                            <>
                              <View as="span" scope={s}></View>
                            </>
                          </>
                        )}
                      </Repeat>
                    </View>
                    <View as="p" scope={s}>
                      {"正在获取适用模板…"}
                    </View>
                  </View>
                  <View
                    as="div"
                    scope={s}
                    className="print-no-layout"
                    show={!s.layoutsLoading && !s.layouts.length}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-print"></View>
                    </View>
                    <View as="h3" scope={s}>
                      {"暂时没有可用排版"}
                    </View>
                    <View
                      as="p"
                      scope={s}
                      text={s.layoutError || "请重新获取，或换一张照片。"}
                    ></View>
                    <View as="div" scope={s}>
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
                              scope.loadLayouts(true);
                            },
                          },
                        ]}
                      >
                        {"重新获取"}
                      </View>
                      <View
                        as="button"
                        scope={s}
                        disabled={s.processing || s.store.busy}
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.editPhotos();
                            },
                          },
                        ]}
                      >
                        {"去相册调整"}
                      </View>
                    </View>
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="print-paper-caption"
                  show={s.selectedLayout && !s.layoutsLoading}
                >
                  <View
                    as="span"
                    scope={s}
                    text={s.selectedLayout?.paperLabel || ""}
                  ></View>
                  <View
                    as="span"
                    scope={s}
                    text={"每版 " + (s.selectedLayout?.count || 0) + " 张照片"}
                  ></View>
                </View>
              </View>
              <View
                as="section"
                scope={s}
                className="print-template-section"
                show={!s.layoutsLoading && s.layouts.length}
              >
                <View
                  as="h3"
                  scope={s}
                  text={s.layouts.length === 1 ? "当前排版" : "排版模板"}
                ></View>
                <View
                  as="p"
                  scope={s}
                  className="print-single-layout"
                  show={s.layouts.length === 1}
                  text={s.selectedLayout?.name || ""}
                ></View>
                <View
                  as="div"
                  scope={s}
                  className="print-template-list"
                  show={s.layouts.length > 1}
                >
                  <Repeat
                    scope={s}
                    items={s.layouts}
                    names={["item"]}
                    keyFor={function (scope, $event, $el) {
                      return scope.item.id;
                    }}
                  >
                    {(s) => (
                      <>
                        <>
                          <View
                            as="button"
                            scope={s}
                            className="print-template-option"
                            dynamicClass={{
                              selected: s.draft.layout === s.item.id,
                            }}
                            aria-pressed={s.draft.layout === s.item.id}
                            disabled={s.disabled}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.selectLayout(scope.item.id);
                                },
                              },
                            ]}
                          >
                            <svg
                              className="print-template-preview"
                              viewBox="0 0 152 102"
                              role="img"
                              aria-label={s.item.name + "横向排版"}
                            >
                              <image
                                href={s.item.previewURL}
                                width="102"
                                height="152"
                                transform="translate(152 0) rotate(90)"
                              />
                            </svg>
                            <View
                              as="strong"
                              scope={s}
                              text={s.item.name}
                            ></View>
                            <View
                              as="small"
                              scope={s}
                              text={s.item.description}
                            ></View>
                            <View
                              as="span"
                              scope={s}
                              className="print-selection-check"
                              show={s.draft.layout === s.item.id}
                            >
                              <View as="svg" scope={s} aria-hidden="true">
                                <View as="use" scope={s} href="#i-check"></View>
                              </View>
                            </View>
                          </View>
                        </>
                      </>
                    )}
                  </Repeat>
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="print-quantity-row"
                show={s.selectedLayout && !s.layoutsLoading}
              >
                <div>
                  <strong>固定1版 · 不支持加印</strong>
                  <p>冲印 ¥19.80 ＋ 运费 ¥10.00</p>
                </div>
                <span className="print-fixed-price">
                  ¥29.80<small>合计</small>
                </span>
              </View>
            </View>
            <View as="footer" scope={s} className="print-footer print-step-footer">
              <button type="button" className="print-previous" disabled={s.disabled} onClick={() => s.previousStep()}>
                <svg aria-hidden="true"><use href="#i-chevron-left" /></svg>上一步
              </button>
              <View
                as="button"
                scope={s}
                className="print-primary"
                disabled={!s.selectedLayout || s.disabled || !!s.layoutError}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.confirm();
                    },
                  },
                ]}
              >
                {"下一步"}
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-arrow"></View>
                </View>
              </View>
            </View>
          </View>
          <View
            as="div"
            scope={s}
            className="print-screen"
            show={s.view === "confirm"}
          >
            <View
              as="div"
              scope={s}
              className="print-body"
              show={!s.flowCompleted}
            >
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
                            <View
                              as="span"
                              scope={s}
                              text={s.address.name}
                            ></View>
                            <View
                              as="span"
                              scope={s}
                              text={s.address.phone}
                            ></View>
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
                  <View
                    as="p"
                    scope={s}
                    text={s.quoteError}
                    role="alert"
                  ></View>
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
                {"可在「冲印订单」查看记录"}
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
              <button type="button" className="print-previous" disabled={s.disabled} onClick={() => s.previousStep()}>
                <svg aria-hidden="true"><use href="#i-chevron-left" /></svg>上一步
              </button>
              <View as="div" scope={s}>
                <View as="span" scope={s}>
                  {"合计"}
                </View>
                <View
                  as="strong"
                  scope={s}
                  text={
                    s.quote?.total != null && !s.quoteLoading
                      ? s.money(s.quote.total)
                      : "待计算"
                  }
                ></View>
              </View>
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
                              <View
                                as="span"
                                scope={s}
                                text={s.item.name}
                              ></View>
                              <View
                                as="span"
                                scope={s}
                                text={s.item.phone}
                              ></View>
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
                <View as="div" scope={s} className="print-card print-fields">
                  <View as="label" scope={s}>
                    <View as="span" scope={s}>
                      {"收件人"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      autoComplete="name"
                      maxLength="30"
                      placeholder="收件人姓名"
                      required={true}
                      disabled={s.disabled}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.addressFields.name;
                        },
                        write: function (scope, $event, $el) {
                          scope.addressFields.name = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                  <View as="label" scope={s}>
                    <View as="span" scope={s}>
                      {"手机号码"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      maxLength="11"
                      placeholder="11位手机号码"
                      required={true}
                      disabled={s.disabled}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.addressFields.phone;
                        },
                        write: function (scope, $event, $el) {
                          scope.addressFields.phone = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                  <View as="label" scope={s}>
                    <View as="span" scope={s}>
                      {"省市区"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      autoComplete="address-level1"
                      maxLength="100"
                      placeholder="例如：广东省 深圳市 南山区"
                      required={true}
                      disabled={s.disabled}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.addressFields.region;
                        },
                        write: function (scope, $event, $el) {
                          scope.addressFields.region = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                  <View as="label" scope={s} className="print-street-field">
                    <View as="span" scope={s}>
                      {"详细地址"}
                    </View>
                    <View
                      as="textarea"
                      scope={s}
                      autoComplete="street-address"
                      maxLength="200"
                      placeholder="街道、楼栋及门牌号"
                      required={true}
                      disabled={s.disabled}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.addressFields.street;
                        },
                        write: function (scope, $event, $el) {
                          scope.addressFields.street = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                  <View as="label" scope={s}>
                    <View as="span" scope={s}>
                      {"邮政编码"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength="6"
                      placeholder="选填"
                      disabled={s.disabled}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.addressFields.postal;
                        },
                        write: function (scope, $event, $el) {
                          scope.addressFields.postal = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                  <View as="label" scope={s} className="print-default-field">
                    <View as="span" scope={s}>
                      {"设为默认地址"}
                    </View>
                    <View
                      as="input"
                      scope={s}
                      type="checkbox"
                      disabled={s.disabled}
                      model={{
                        read: function (scope, $event, $el) {
                          return scope.addressFields.default;
                        },
                        write: function (scope, $event, $el) {
                          scope.addressFields.default = $event;
                        },
                        number: false,
                        lazy: false,
                      }}
                    ></View>
                  </View>
                </View>
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
            as="div"
            scope={s}
            className="print-screen"
            show={s.view === "orders"}
          >
            <View
              as="div"
              scope={s}
              className="print-order-filters"
              aria-label="按订单状态筛选"
            >
              <Repeat
                scope={s}
                items={[
                  {
                    key: "all",
                    label: "全部",
                  },
                  {
                    key: "pending",
                    label: "待付款",
                  },
                  {
                    key: "production",
                    label: "制作中",
                  },
                  {
                    key: "shipped",
                    label: "已发货",
                  },
                  {
                    key: "completed",
                    label: "已签收",
                  },
                ]}
                names={["item"]}
                keyFor={function (scope, $event, $el) {
                  return scope.item.key;
                }}
              >
                {(s) => (
                  <>
                    <>
                      <View
                        as="button"
                        scope={s}
                        dynamicClass={{
                          active: s.filter === s.item.key,
                        }}
                        aria-pressed={s.filter === s.item.key}
                        text={s.item.label}
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.filter = scope.item.key;
                            },
                          },
                        ]}
                      ></View>
                    </>
                  </>
                )}
              </Repeat>
            </View>
            <View as="div" scope={s} className="print-body">
              <View
                as="div"
                scope={s}
                className="print-empty"
                show={s.store.ready && !s.orders.length}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-document"></View>
                </View>
                <View
                  as="h2"
                  scope={s}
                  text={
                    s.filter === "all" ? "还没有冲印订单" : "暂无这个状态的订单"
                  }
                ></View>
                <View as="p" scope={s}>
                  {"想把照片印出来？从相册选一张开始。"}
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
                  {"去冲印照片"}
                </View>
              </View>
              <Repeat
                scope={s}
                items={s.orders}
                names={["item"]}
                keyFor={function (scope, $event, $el) {
                  return scope.item.id;
                }}
              >
                {(s) => (
                  <>
                    <>
                      <View
                        as="button"
                        scope={s}
                        className="print-card print-order-card"
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.route("order", {
                                order: scope.item.id,
                              });
                            },
                          },
                        ]}
                      >
                        <View
                          as="div"
                          scope={s}
                          className="print-order-card-top"
                        >
                          <View
                            as="span"
                            scope={s}
                            text={s.time(s.item.createdAt)}
                          ></View>
                          <View
                            as="strong"
                            scope={s}
                            text={s.statusName(s.item.status)}
                          ></View>
                        </View>
                        <View
                          as="div"
                          scope={s}
                          className="print-checkout-product"
                        >
                          <View
                            as="div"
                            scope={s}
                            className="print-product-sheet"
                            html={s.orderSheet(s.item)}
                          ></View>
                          <View as="div" scope={s}>
                            <View
                              as="strong"
                              scope={s}
                              text={
                                s.item.layoutSnapshot?.name ||
                                s.layoutName(s.item.layout)
                              }
                            ></View>
                            <View
                              as="p"
                              scope={s}
                              text={
                                s.item.quantity +
                                " 版 · " +
                                s.orderCount(s.item) +
                                " 张照片"
                              }
                            ></View>
                            <View
                              as="span"
                              scope={s}
                              text={s.money(s.item.total)}
                            ></View>
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
                      </View>
                    </>
                  </>
                )}
              </Repeat>
            </View>
          </View>
          <View
            as="div"
            scope={s}
            className="print-screen"
            show={["order", "result"].includes(s.view)}
          >
            <View as="div" scope={s} className="print-body">
              {s.order ? (
                <>
                  <>
                    <View as="div" scope={s}>
                      <View
                        as="section"
                        scope={s}
                        className="print-order-status"
                        dynamicClass={{
                          cancelled: s.order.status === "cancelled",
                          completed: s.order.status === "completed",
                        }}
                      >
                        <View
                          as="div"
                          scope={s}
                          className="print-order-summary"
                        >
                          <View
                            as="div"
                            scope={s}
                            className="print-order-state-line"
                          >
                            <View
                              as="span"
                              scope={s}
                              className="print-status-icon"
                              show={s.order.status !== "completed"}
                            >
                              <View as="svg" scope={s} aria-hidden="true">
                                <View
                                  as="use"
                                  scope={s}
                                  href={
                                    s.order.status === "cancelled"
                                      ? "#i-close"
                                      : "#i-print"
                                  }
                                ></View>
                              </View>
                            </View>
                            <View
                              as="h2"
                              scope={s}
                              text={s.statusName(s.order.status)}
                            ></View>
                          </View>
                          <View
                            as="p"
                            scope={s}
                            text={s.statusCopy(s.order.status)}
                          ></View>
                        </View>
                        <View
                          as="img"
                          scope={s}
                          className="print-order-mascot"
                          show={s.order.status === "completed"}
                          src="assets/zhipai-mascot.webp"
                          width="1024"
                          height="1024"
                          alt=""
                          aria-hidden="true"
                          decoding="async"
                        ></View>
                      </View>
                      <View
                        as="section"
                        scope={s}
                        className="print-fulfillment"
                        show={s.fulfillmentIndex >= 0}
                        aria-label="制作配送进度"
                      >
                        <Repeat
                          scope={s}
                          items={["待制作", "制作中", "已发货", "已签收"]}
                          names={["item", "index"]}
                          keyFor={function (scope, $event, $el) {
                            return scope.item;
                          }}
                        >
                          {(s) => (
                            <>
                              <>
                                <View
                                  as="span"
                                  scope={s}
                                  dynamicClass={{
                                    done: s.fulfillmentIndex >= s.index,
                                    current: s.fulfillmentIndex === s.index,
                                  }}
                                >
                                  <View as="b" scope={s}>
                                    <View
                                      as="svg"
                                      scope={s}
                                      show={s.fulfillmentIndex > s.index}
                                      aria-hidden="true"
                                    >
                                      <View
                                        as="use"
                                        scope={s}
                                        href="#i-check"
                                      ></View>
                                    </View>
                                    <View
                                      as="i"
                                      scope={s}
                                      show={s.fulfillmentIndex <= s.index}
                                    ></View>
                                  </View>
                                  <View
                                    as="span"
                                    scope={s}
                                    text={s.item}
                                  ></View>
                                </View>
                              </>
                            </>
                          )}
                        </Repeat>
                      </View>
                      <View
                        as="section"
                        scope={s}
                        className="print-card print-tracking"
                        show={s.order.tracking}
                      >
                        <View
                          as="div"
                          scope={s}
                          className="print-section-heading"
                        >
                          <View as="h2" scope={s}>
                            {"物流信息"}
                          </View>
                          <View
                            as="span"
                            scope={s}
                            show={s.order.status === "completed"}
                          >
                            {"已签收"}
                          </View>
                        </View>
                        <View
                          as="strong"
                          scope={s}
                          text={(s.order.tracking?.carrier || "").replace(
                            /^体验/,
                            "",
                          )}
                        ></View>
                        <View as="div" scope={s}>
                          <View
                            as="span"
                            scope={s}
                            text={s.order.tracking?.number || ""}
                          ></View>
                          <View
                            as="button"
                            scope={s}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.copyTracking();
                                },
                              },
                            ]}
                          >
                            {"复制运单"}
                          </View>
                        </View>
                      </View>
                      <View as="section" scope={s} className="print-card">
                        <View as="h2" scope={s}>
                          {"你的冲印照片"}
                        </View>
                        <View
                          as="div"
                          scope={s}
                          className="print-order-paper"
                          html={s.orderSheet(s.order)}
                        ></View>
                        <View
                          as="div"
                          scope={s}
                          className="print-order-paper-caption"
                        >
                          <View
                            as="strong"
                            scope={s}
                            text={
                              s.order.layoutSnapshot?.name ||
                              s.layoutName(s.order.layout)
                            }
                          ></View>
                          <View
                            as="span"
                            scope={s}
                            text={
                              s.order.quantity +
                              " 版 · " +
                              s.orderCount(s.order) +
                              " 张照片"
                            }
                          ></View>
                        </View>
                      </View>
                      <View as="section" scope={s} className="print-card">
                        <View as="h2" scope={s}>
                          {"收货信息"}
                        </View>
                        <View as="p" scope={s} className="print-address-name">
                          <View
                            as="span"
                            scope={s}
                            text={s.order.address?.name || ""}
                          ></View>
                          <View
                            as="span"
                            scope={s}
                            text={s.order.address?.phone || ""}
                          ></View>
                        </View>
                        <View
                          as="p"
                          scope={s}
                          className="print-address-detail"
                          text={s.addressText(s.order.address)}
                        ></View>
                      </View>
                      <View
                        as="section"
                        scope={s}
                        className="print-card print-order-info"
                      >
                        <View as="h2" scope={s}>
                          {"订单信息"}
                        </View>
                        <View as="div" scope={s}>
                          <View as="span" scope={s}>
                            {"订单编号"}
                          </View>
                          <View
                            as="button"
                            scope={s}
                            className="print-order-number"
                            text={s.order.number}
                            aria-label="复制订单编号"
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.copyOrder();
                                },
                              },
                            ]}
                          ></View>
                        </View>
                        <View as="div" scope={s}>
                          <View as="span" scope={s}>
                            {"创建时间"}
                          </View>
                          <View
                            as="span"
                            scope={s}
                            text={s.time(s.order.createdAt)}
                          ></View>
                        </View>
                        <View as="div" scope={s} show={s.order.paidAt}>
                          <View as="span" scope={s}>
                            {"付款时间"}
                          </View>
                          <View
                            as="span"
                            scope={s}
                            text={s.time(s.order.paidAt)}
                          ></View>
                        </View>
                        <View as="div" scope={s}>
                          <View as="span" scope={s}>
                            {"支付方式"}
                          </View>
                          <View
                            as="span"
                            scope={s}
                            text={
                              s.order.method
                                ? s.order.method === "wechat"
                                  ? "微信支付"
                                  : "支付宝支付"
                                : "尚未付款"
                            }
                          ></View>
                        </View>
                        <View as="div" scope={s}>
                          <View as="span" scope={s}>
                            {"冲印费"}
                          </View>
                          <View
                            as="span"
                            scope={s}
                            text={s.money(s.order.base * s.order.quantity)}
                          ></View>
                        </View>
                        <View as="div" scope={s} show={s.order.addon}>
                          <View as="span" scope={s}>
                            {"历史附加套餐"}
                          </View>
                          <View
                            as="span"
                            scope={s}
                            text={s.money(s.order.addonPrice * s.order.addon)}
                          ></View>
                        </View>
                        <View as="div" scope={s}>
                          <View as="span" scope={s}>
                            {"运费"}
                          </View>
                          <View
                            as="span"
                            scope={s}
                            text={s.money(s.order.shipping)}
                          ></View>
                        </View>
                        <View as="div" scope={s} className="print-cost-total">
                          <View as="span" scope={s}>
                            {"实付／应付"}
                          </View>
                          <View
                            as="strong"
                            scope={s}
                            text={s.money(s.order.total)}
                          ></View>
                        </View>
                      </View>
                      <View
                        as="section"
                        scope={s}
                        className="print-card print-timeline"
                      >
                        <View as="h2" scope={s}>
                          {"订单记录"}
                        </View>
                        <Repeat
                          scope={s}
                          items={[...s.order.events].reverse()}
                          names={["item", "index"]}
                          keyFor={function (scope, $event, $el) {
                            return scope.index;
                          }}
                        >
                          {(s) => (
                            <>
                              <>
                                <View as="div" scope={s}>
                                  <View as="span" scope={s}></View>
                                  <View as="p" scope={s}>
                                    <View
                                      as="strong"
                                      scope={s}
                                      text={s.item.title.replace(
                                        /^(?:演示|模拟)/,
                                        "",
                                      )}
                                    ></View>
                                    <View
                                      as="small"
                                      scope={s}
                                      text={s.time(s.item.time)}
                                    ></View>
                                  </View>
                                </View>
                              </>
                            </>
                          )}
                        </Repeat>
                      </View>
                      <View
                        as="details"
                        scope={s}
                        className="print-demo-controls"
                        show={["producing", "printing", "shipped"].includes(
                          s.order.status,
                        )}
                      >
                        <View as="summary" scope={s}>
                          {"制作与配送进度"}
                        </View>
                        <View
                          as="button"
                          scope={s}
                          className="print-secondary"
                          disabled={s.disabled}
                          text={
                            s.order.status === "producing"
                              ? "开始制作"
                              : s.order.status === "printing"
                                ? "发货"
                                : "签收"
                          }
                          events={[
                            {
                              type: "click",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.showModal("advance");
                              },
                            },
                          ]}
                        ></View>
                      </View>
                    </View>
                  </>
                </>
              ) : null}
              <View
                as="div"
                scope={s}
                className="print-empty"
                show={s.store.ready && !s.order}
              >
                <View as="svg" scope={s} aria-hidden="true">
                  <View as="use" scope={s} href="#i-document"></View>
                </View>
                <View as="h2" scope={s}>
                  {"未找到这笔订单"}
                </View>
                <View as="p" scope={s}>
                  {"订单可能不存在，请返回订单列表。"}
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
                        scope.route("orders");
                      },
                    },
                  ]}
                >
                  {"查看订单列表"}
                </View>
              </View>
            </View>
            <View
              as="footer"
              scope={s}
              className="print-footer print-order-actions"
              show={s.order}
            >
              <View
                as="button"
                scope={s}
                className="print-secondary"
                show={s.order?.status === "pending"}
                disabled={s.disabled}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.showModal("cancel");
                    },
                  },
                ]}
              >
                {"取消订单"}
              </View>
              <View
                as="button"
                scope={s}
                className="print-primary"
                show={s.order?.status === "pending"}
                disabled={s.disabled || !s.online}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.continuePayment();
                    },
                  },
                ]}
              >
                {"继续支付"}
              </View>
              <View
                as="button"
                scope={s}
                className="print-primary"
                show={s.order?.status === "verifying"}
                disabled={s.disabled || !s.online}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.showModal("resolution");
                    },
                  },
                ]}
              >
                {"查询付款结果"}
              </View>
              <View
                as="button"
                scope={s}
                className="print-secondary"
                show={
                  s.order && !["pending", "verifying"].includes(s.order.status)
                }
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.route("orders");
                    },
                  },
                ]}
              >
                {"查看全部订单"}
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
                {s.modal === "album" ? (
                  <>
                    <>
                      <View
                        as="div"
                        scope={s}
                        className="print-album-sheet ui-sheet-panel"
                      >
                        <View as="div" scope={s} className="ui-sheet-body">
                          <View
                            as="p"
                            scope={s}
                            className="print-sheet-description"
                          >
                            {"仅选一张知拍照片，用于本次冲印"}
                          </View>
                          <View
                            as="div"
                            scope={s}
                            className="print-photo-grid print-photo-skeleton"
                            show={!s.library.ready && !s.library.error}
                            aria-label="正在读取照片库"
                          >
                            <Repeat
                              scope={s}
                              items={6}
                              names={["slot"]}
                              keyFor={function (scope, $event, $el) {
                                return scope.slot;
                              }}
                            >
                              {(s) => (
                                <>
                                  <>
                                    <View as="span" scope={s}></View>
                                  </>
                                </>
                              )}
                            </Repeat>
                          </View>
                          <View
                            as="div"
                            scope={s}
                            className="print-empty"
                            show={s.library.error}
                          >
                            <View as="svg" scope={s} aria-hidden="true">
                              <View as="use" scope={s} href="#i-album"></View>
                            </View>
                            <View as="h2" scope={s}>
                              {"相册暂时无法读取"}
                            </View>
                            <View
                              as="p"
                              scope={s}
                              text={s.library.error}
                            ></View>
                            <View
                              as="button"
                              scope={s}
                              className="print-primary"
                              disabled={s.library.busy}
                              events={[
                                {
                                  type: "click",
                                  prevent: false,
                                  stop: false,
                                  self: false,
                                  passive: false,
                                  run: function (scope, $event, $el) {
                                    scope.library.load();
                                  },
                                },
                              ]}
                            >
                              {"重新读取相册"}
                            </View>
                          </View>
                          <View
                            as="div"
                            scope={s}
                            className="print-empty print-album-empty"
                            show={s.library.ready && !s.library.finished.length}
                          >
                            <View
                              as="img"
                              scope={s}
                              className="print-empty-mascot"
                              src="assets/zhipai-mascot.webp"
                              width="1024"
                              height="1024"
                              alt=""
                              aria-hidden="true"
                              decoding="async"
                            ></View>
                            <View as="h2" scope={s}>
                              {"还没有证件照"}
                            </View>
                            <View as="p" scope={s}>
                              {"制作并保存一张，就能开始冲印"}
                            </View>
                          </View>
                          <View
                            as="div"
                            scope={s}
                            className="print-photo-grid"
                            show={s.library.ready && s.library.finished.length}
                          >
                            <Repeat
                              scope={s}
                              items={s.library.finished}
                              names={["photo"]}
                              keyFor={function (scope, $event, $el) {
                                return scope.photo.id;
                              }}
                            >
                              {(s) => (
                                <>
                                  <>
                                    <View
                                      as="button"
                                      scope={s}
                                      className="print-photo-option"
                                      dynamicClass={{
                                        selected:
                                          s.candidatePhotoId === s.photo.id,
                                      }}
                                      aria-pressed={
                                        s.candidatePhotoId === s.photo.id
                                      }
                                      aria-label={"选择 " + s.photo.name}
                                      disabled={
                                        s.disabled ||
                                        s.library.busy ||
                                        !s.photo.blob
                                      }
                                      events={[
                                        {
                                          type: "click",
                                          prevent: false,
                                          stop: false,
                                          self: false,
                                          passive: false,
                                          run: function (scope, $event, $el) {
                                            scope.selectCandidate(
                                              scope.photo.id,
                                            );
                                          },
                                        },
                                      ]}
                                    >
                                      <View
                                        as="div"
                                        scope={s}
                                        className="print-photo-frame"
                                      >
                                        <View
                                          as="img"
                                          scope={s}
                                          src={
                                            s.library.url(s.photo.id) ||
                                            undefined
                                          }
                                          alt={s.photo.name}
                                          loading="lazy"
                                        ></View>
                                        <View
                                          as="span"
                                          scope={s}
                                          className="print-selection-check"
                                          show={
                                            s.candidatePhotoId === s.photo.id
                                          }
                                        >
                                          <View
                                            as="svg"
                                            scope={s}
                                            aria-hidden="true"
                                          >
                                            <View
                                              as="use"
                                              scope={s}
                                              href="#i-check"
                                            ></View>
                                          </View>
                                        </View>
                                      </View>
                                      <View
                                        as="span"
                                        scope={s}
                                        className="print-photo-spec"
                                        text={
                                          s.photo.spec ||
                                          s.photo.width +
                                            " × " +
                                            s.photo.height +
                                            " px"
                                        }
                                      ></View>
                                    </View>
                                  </>
                                </>
                              )}
                            </Repeat>
                          </View>
                          <View
                            as="div"
                            scope={s}
                            className="print-library-links"
                          >
                            <View
                              as="button"
                              scope={s}
                              disabled={s.processing || !s.library.ready}
                              events={[
                                {
                                  type: "click",
                                  prevent: false,
                                  stop: false,
                                  self: false,
                                  passive: false,
                                  run: function (scope, $event, $el) {
                                    scope.makePhoto();
                                  },
                                },
                              ]}
                            >
                              <View as="svg" scope={s} aria-hidden="true">
                                <View
                                  as="use"
                                  scope={s}
                                  href="#i-camera"
                                ></View>
                              </View>
                              {"制作一张"}
                            </View>
                            <View
                              as="button"
                              scope={s}
                              disabled={s.processing || !s.library.ready}
                              events={[
                                {
                                  type: "click",
                                  prevent: false,
                                  stop: false,
                                  self: false,
                                  passive: false,
                                  run: function (scope, $event, $el) {
                                    scope.editPhotos();
                                  },
                                },
                              ]}
                            >
                              {"进入相册编辑"}
                              <View as="svg" scope={s} aria-hidden="true">
                                <View
                                  as="use"
                                  scope={s}
                                  href="#i-chevron"
                                ></View>
                              </View>
                            </View>
                          </View>
                        </View>
                        <View as="footer" scope={s} className="ui-sheet-footer">
                          <View
                            as="button"
                            scope={s}
                            className="print-primary print-sheet-use"
                            show={s.library.finished.length}
                            disabled={
                              !s.candidate || s.disabled || s.library.busy
                            }
                            text={s.processing ? "正在选取…" : "使用这张照片"}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.preparePhoto();
                                },
                              },
                            ]}
                          ></View>
                        </View>
                      </View>
                    </>
                  </>
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
                  as="div"
                  scope={s}
                  show={s.modal === "advance"}
                  className="ui-sheet-panel"
                >
                  <View as="div" scope={s} className="ui-sheet-body">
                    <View
                      as="p"
                      scope={s}
                      className="print-dialog-copy"
                      text={
                        s.order?.status === "producing"
                          ? "将订单改为制作中。"
                          : s.order?.status === "printing"
                            ? "将订单改为已发货，并生成运单。"
                            : "将订单改为已签收。"
                      }
                    ></View>
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
                            scope.advanceOrder();
                          },
                        },
                      ]}
                    >
                      {"确认更新状态"}
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
                  show={s.error}
                  text={s.error}
                  role="alert"
                ></View>
              </View>
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
