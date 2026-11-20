import { SheetFrame, SheetHeader } from "../components/SharedSheet.jsx";
import React, { useRef, useState } from "react";
import PhotoProcessingEffect, {
  PhotoProcessingStatus,
} from "../components/PhotoProcessingEffect.jsx";
import { toolPhotoProcessingLabel } from "../components/photo-processing.js";
import ToolNavigation from "../components/ToolNavigation.jsx";
import SegmentedControl from "../components/SegmentedControl.jsx";
import ToolResult from "../components/ToolResult.jsx";
import RepairBackgroundOptions from "../components/RepairBackgroundOptions.jsx";
import ToolStepper from "../components/ToolStepper.jsx";
import PhotoSelectionPreview from "../components/PhotoSelectionPreview.jsx";
import PhotoSelectionActions from "../components/PhotoSelectionActions.jsx";
import ToolPhotoSelection from "../components/ToolPhotoSelection.jsx";
import PendingPhotoResults from "../components/PendingPhotoResults.jsx";
import PhotoSelectionEmpty from "../components/PhotoSelectionEmpty.jsx";
import ToolComparisonSlider from "../components/ToolComparisonSlider.jsx";
import ToolCapabilityPoster from "../components/ToolCapabilityPoster.jsx";
import PriceText from "../components/PriceText.jsx";
import { TOOL_SERVICE_PRICE } from "../domain/tools.js";
import { PaymentChoices, PaymentRecovery } from "../components/PaymentHandoff.jsx";
import { checkoutLabel } from "../domain/payment-handoff.js";
import {
  PortraitCheckStatus,
  PortraitCheckPanel,
} from "../components/PortraitPhotoCheck.jsx";
import { Controller, View, Repeat } from "../runtime/components.jsx";

const sizePresets = { KB: [50, 100, 200, 500], MB: [0.5, 1, 2, 5] };
const sizeUnits = Object.keys(sizePresets).map((unit) => ({ value: unit, label: unit }));

const repairBenefits = ["高清画质增强", "自然肤色匀净", "五官光影立体", "可选四色证件底"];

function RepairServiceCard() {
  return (
    <section className="tool-settings keepsake-product-spec tool-repair-service">
      <header>
        <h2>人像质感精修</h2>
      </header>
      <p>支持单人正面日常照或自拍，智能优化清晰度与肤色质感</p>
      <ul>
        {repairBenefits.map((benefit) => (
          <li key={benefit}>
            <svg aria-hidden="true"><use href="#i-check" /></svg>
            {benefit}
          </li>
        ))}
      </ul>
      <dl>
        <div><dt>拍照建议</dt><dd>单人正面平视 · 光线充足</dd></div>
        <div><dt>交付方式</dt><dd>自动存至知拍相册（保留原图）</dd></div>
      </dl>
    </section>
  );
}

function ToolPaymentPanel({ s }) {
  const [repairColorMissing, setRepairColorMissing] = useState(false);
  const colorGroup = useRef(null);
  const showRepairColors = s.action === "repair" && !s.legacyRepairOrder;
  const needsRepairColor = showRepairColors && !s.repairSettingsLocked && !s.repairColor;

  function pay() {
    if (needsRepairColor) {
      setRepairColorMissing(true);
      colorGroup.current?.scrollIntoView({ block: "nearest" });
      return;
    }
    s.pay({ handoff: true });
  }

  return (
    <div className="ui-sheet-panel">
      <div className="ui-sheet-body">
        <div className="tool-payment-order">
          <img
            src={(s.action === "repair" ? s.sourceURL : s.outputURL || s.sourceURL) || undefined}
            alt="本次处理照片"
          />
          <div>
            <strong>{s.config.title}</strong>
            {showRepairColors && (
              <small>{s.repairColor ? `${s.repairColor.name}背景` : "请选择背景颜色"}</small>
            )}
          </div>
          <b><PriceText value={s.money(s.currentOrder?.amount ?? TOOL_SERVICE_PRICE)} /></b>
        </div>
        {showRepairColors && (
          <RepairBackgroundOptions
            ref={colorGroup}
            colors={s.colors}
            color={s.repairColor}
            disabled={s.repairSettingsLocked}
            invalid={repairColorMissing && needsRepairColor}
            onChange={(id) => {
              s.selectRepairBackground(id);
              if (s.repairColor) setRepairColorMissing(false);
            }}
          />
        )}
        <PaymentChoices kind={s.action} method={s.paymentMethod}
          setMethod={(value) => { s.paymentMethod = value; }}
          outcome={s.paymentOutcome} setOutcome={(value) => { s.paymentOutcome = value; }}
          disabled={s.paying}
        />
      </div>
      <footer className="ui-sheet-footer">
        <button type="button" className="tool-primary" disabled={s.busy || s.ordersStore.busy} onClick={pay}>
          {s.paying ? "正在确认…" : checkoutLabel(s.action, s.paymentMethod, s.currentOrder)}
        </button>
      </footer>
    </div>
  );
}

export default function ToolsPage({ scope, args = [] }) {
  return (
    <Controller name="toolStudio" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className={["work", "saved", "orders"].includes(s.view) && s.action !== "spec" ? "page tool-page ui-task-page" : "page tool-page"}
          id="tool-page"
          data-view={s.view}
          show={s.page === "tool"}
          data-tool={s.action}
          inert={!!s.panel}
          aria-label="照片工具"
        >
          <View
            as="div"
            scope={s}
            className="tool-flow"
            show={s.view === "work" && s.action !== "spec"}
            dynamicClass={{
              "outfit-work-result": s.outfitResult,
            }}
          >
            <ToolNavigation
              title={
                s.outfitResult
                  ? "换装效果"
                  : s.repairResult
                    ? "精修效果"
                    : s.config.title
              }
              disabled={s.busy}
              onBack={() => s.back()}
            />
            {!s.isInlineWorkspace && (
              <ToolStepper steps={s.config.steps} current={s.step} />
            )}
            <View
              as="div"
              scope={s}
              className="tool-work-scroll"
              tabIndex={s.isInlineWorkspace ? -1 : undefined}
            >
              {s.page === "tool" && !s.photo && s.config.service && (
                <PendingPhotoResults
                  type={s.action}
                  onResume={(order) => s.resumeOrder(order)}
                />
              )}
              {s.page === "tool" &&
                s.view === "work" &&
                !s.photo &&
                s.isInlineWorkspace && (
                  <>
                    <ToolCapabilityPoster
                      kind={s.action}
                      disabled={s.busy}
                      onSelect={() => s.pick()}
                    />
                    {s.action === "repair" && <RepairServiceCard />}
                  </>
                )}
              {!s.photo && !s.isInlineWorkspace && (
                <PhotoSelectionEmpty
                  mascot={s.mascot}
                  description="请选择您的照片"
                  disabled={s.busy}
                  onSelect={() => s.pick()}
                />
              )}
              {s.step === 0 && s.photo && (
                <PhotoSelectionPreview
                  photo={s.photo}
                  src={s.sourceURL}
                  processingLabel={toolPhotoProcessingLabel(s)}
                />
              )}
              <View
                as="section"
                scope={s}
                className="tool-photo-card"
                show={s.photo && s.step > 0}
              >
                <View
                  as="header"
                  scope={s}
                  className="tool-photo-heading"
                  show={s.config.service && (s.action !== "repair" || s.serviceApplied)}
                >
                  <View
                    as="h2"
                    scope={s}
                    text={
                      s.serviceResult
                        ? s.action === "repair"
                          ? "精修照片"
                          : "换装照片"
                        : "当前照片"
                    }
                  ></View>
                  <View
                    as="span"
                    scope={s}
                    show={s.outfitResult}
                    text={s.chosenOutfit?.name}
                  ></View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="tool-image-stage"
                  dynamicStyle={
                    "--photo-ratio:" + s.outputWidth + "/" + s.outputHeight
                  }
                >
                  <View
                    as="img"
                    scope={s}
                    src={
                      (s.choosingPhoto || (s.action === "repair" && !s.serviceApplied)
                        ? s.sourceURL
                        : s.outputURL || s.sourceURL) || undefined
                    }
                    alt={s.action === "repair" && !s.serviceApplied ? "当前原照片" : s.config.title + "结果预览"}
                  ></View>
                  <View
                    as="div"
                    scope={s}
                    className="tool-comparison"
                    show={s.action === "repair" && s.serviceApplied}
                    dynamicStyle={
                      "clip-path:inset(0 " + (100 - s.comparison) + "% 0 0)"
                    }
                    aria-hidden="true"
                  >
                    <View
                      as="img"
                      scope={s}
                      src={s.sourceURL || undefined}
                      alt=""
                    ></View>
                  </View>

                  {s.action === "repair" && s.serviceApplied && (
                    <ToolComparisonSlider value={s.comparison} onChange={(value) => { s.comparison = value; }} />
                  )}
                  <PhotoProcessingEffect
                    active={!!toolPhotoProcessingLabel(s)}
                    imageSrc={s.outputURL || s.sourceURL}
                  />
                </View>
                {s.action === "repair" && s.serviceApplied && (
                  <div
                    className="tool-comparison-labels"
                    aria-label="精修前后对比标记"
                  >
                    <span>精修前</span>
                    <span>精修后</span>
                  </div>
                )}
                <PhotoProcessingStatus label={toolPhotoProcessingLabel(s)} />
                <View as="div" scope={s} className="tool-photo-meta" show={s.action !== "repair" || s.serviceApplied}>
                  <View
                    as="span"
                    scope={s}
                    text={
                      s.action === "outfit" && s.outfitOutputSize
                        ? s.spec.name + " · " + s.spec.mm
                        : s.photo?.spec ||
                          s.photo?.width + " × " + s.photo?.height + " px"
                    }
                  ></View>
                  <View
                    as="span"
                    scope={s}
                    text={s.sourceKind === "finished" ? "知拍照片" : "手机照片"}
                  ></View>
                </View>
              </View>
              {s.showPortraitCheck && s.portraitCheck.status !== "checking" && (
                <PortraitCheckStatus
                  check={s.portraitCheck}
                  repair={s.action === "repair"}
                  onReasons={() => s.openPanel("portrait")}
                  onRetry={() => s.validatePortraitPhoto()}
                />
              )}
              <View
                as="section"
                scope={s}
                className="tool-settings"
                show={
                  (s.isInlineWorkspace || (s.photo && !s.choosingPhoto)) &&
                  s.action === "crop"
                }
              >
                <View as="div" scope={s} className="tool-options-heading">
                  <View as="h2" scope={s}>
                    {"裁剪尺寸"}
                  </View>
                </View>
                <View as="div" scope={s} className="tool-spec-list tool-crop-options">
                  <Repeat
                    scope={s}
                    items={s.specs}
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
                            disabled={s.busy}
                            dynamicClass={{
                              selected: s.specId === s.item.id,
                            }}
                            aria-pressed={s.specId === s.item.id}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.chooseSpec(scope.item.id);
                                },
                              },
                            ]}
                          >
                            <View
                              as="strong"
                              scope={s}
                              text={s.item.name}
                            ></View>
                            <View as="small" scope={s} text={s.item.mm}></View>
                          </View>
                        </>
                      </>
                    )}
                  </Repeat>
                  <button type="button" disabled={!s.photo || s.choosingPhoto || s.busy}
                    aria-haspopup="dialog"
                    onClick={() => s.openPanel("crop")}>
                    <strong>手动裁剪</strong>
                  </button>
                </View>
              </View>
              <View
                as="section"
                scope={s}
                className="tool-settings"
                show={
                  s.action === "background" &&
                  (s.isInlineWorkspace ||
                    (s.photo && !s.choosingPhoto && s.standardized))
                }
              >
                <View as="div" scope={s} className="tool-options-heading">
                  <View as="h2" scope={s}>
                    {"背景颜色"}
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="tool-color-list"
                  role="group"
                  aria-label="背景颜色，可横向滑动"
                >
                  <Repeat
                    scope={s}
                    items={s.colors}
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
                            disabled={
                              s.busy ||
                              (!!s.photo &&
                                (!s.portraitEligible || !s.standardized))
                            }
                            aria-label={s.item.name}
                            aria-pressed={s.background === s.item.id}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.setBackground(scope.item.id);
                                },
                              },
                            ]}
                          >
                            <View
                              as="i"
                              scope={s}
                              dynamicStyle={"background:" + s.item.value}
                              dynamicClass={{
                                selected: s.background === s.item.id,
                              }}
                            ></View>
                            <View as="span" scope={s} text={s.item.name}></View>
                          </View>
                        </>
                      </>
                    )}
                  </Repeat>
                </View>
                <View as="small" scope={s} className="tool-local-note">
                  {"本地处理，适用于纯色背景照片"}
                </View>
              </View>
              <View
                as="section"
                scope={s}
                className="tool-settings"
                show={
                  (s.isInlineWorkspace || (s.photo && !s.choosingPhoto)) &&
                  s.action === "format"
                }
              >
                <View as="div" scope={s} className="tool-options-heading">
                  <View as="h2" scope={s}>
                    {"输出格式"}
                  </View>
                  <View
                    as="span"
                    scope={s}
                    text={s.photo?.type.replace("image/", "").toUpperCase()}
                  ></View>
                </View>
                <View as="div" scope={s} className="tool-format-list">
                  <Repeat
                    scope={s}
                    items={[
                      {
                        id: "jpeg",
                        name: "JPG",
                      },
                      {
                        id: "png",
                        name: "PNG",
                      },
                    ]}
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
                            disabled={s.busy}
                            dynamicClass={{
                              selected: s.format === s.item.id,
                            }}
                            aria-pressed={s.format === s.item.id}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.setFormat(scope.item.id);
                                },
                              },
                            ]}
                          >
                            <View
                              as="strong"
                              scope={s}
                              text={s.item.name}
                            ></View>
                            <View
                              as="small"
                              scope={s}
                              text={
                                s.item.id === "jpeg" ? "体积更轻" : "支持透明"
                              }
                            ></View>
                          </View>
                        </>
                      </>
                    )}
                  </Repeat>
                </View>
              </View>
              <View
                as="section"
                scope={s}
                className="tool-settings"
                show={
                  (s.isInlineWorkspace || (s.photo && !s.choosingPhoto)) &&
                  s.action === "resize"
                }
              >
                <View as="div" scope={s} className="tool-options-heading">
                  <View as="h2" scope={s}>
                    {"目标文件体积"}
                  </View>
                </View>
                <View as="div" scope={s} className="tool-size-input">
                  <View as="span" scope={s}>
                    {"不超过"}
                  </View>
                  <View
                    as="input"
                    scope={s}
                    type="number"
                    min="0.005"
                    step="any"
                    inputMode="decimal"
                    disabled={s.busy}
                    aria-label="目标文件体积"
                    events={[
                      {
                        type: "input",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.needsPreview = true;
                        },
                      },
                    ]}
                    model={{
                      read: function (scope, $event, $el) {
                        return scope.targetValue;
                      },
                      write: function (scope, $event, $el) {
                        scope.targetValue = $event;
                      },
                      number: true,
                      lazy: false,
                    }}
                  ></View>
                  <SegmentedControl label="文件体积单位" options={sizeUnits}
                    value={s.sizeUnit} disabled={s.busy} onChange={(unit) => s.changeSizeUnit(unit)} />
                </View>
                <div className="tool-size-presets" role="group" aria-label="快捷体积">
                  {sizePresets[s.sizeUnit]?.map((value) => (
                    <button type="button" key={value} disabled={s.busy}
                      aria-pressed={Number(s.targetValue) === value}
                      onClick={() => { s.targetValue = value; s.needsPreview = true; }}>
                      {value} {s.sizeUnit}
                    </button>
                  ))}
                </div>
                <View as="div" scope={s} className="tool-size-comparison" show={!!s.photo}>
                  <View as="span" scope={s}>
                    {"原文件"}
                    <View
                      as="b"
                      scope={s}
                      text={
                        s.photo
                          ? s.size(s.photo.size || s.photo.blob.size)
                          : "—"
                      }
                    ></View>
                  </View>
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-arrow"></View>
                  </View>
                  <View as="span" scope={s}>
                    {"处理后"}
                    <View
                      as="b"
                      scope={s}
                      text={
                        s.output && !s.needsPreview
                          ? s.size(s.output.size)
                          : "待处理"
                      }
                    ></View>
                  </View>
                </View>
                <View as="small" scope={s} className="tool-local-note">
                  {"像素尺寸不变，输出 JPG"}
                </View>
              </View>
              <View
                as="section"
                scope={s}
                className="tool-settings outfit-clothes-card"
                show={s.action === "outfit" && !s.outfitResult}
              >
                <View as="div" scope={s} className="outfit-clothes-heading">
                  <View as="h2" scope={s}>
                    {"选择服装"}
                  </View>
                  <View as="span" scope={s} text={s.photo || s.outfitExampleActive ? s.chosenOutfit?.name : ""}></View>
                </View>
                <SegmentedControl label="服装分类"
                  options={s.outfitCategories.map(({ id, name }) => ({ value: id, label: name }))}
                  value={s.outfitCategory} disabled={s.busy}
                  onChange={(category) => s.selectOutfitCategory(category)} />
                <View
                  as="div"
                  scope={s}
                  key={s.outfitCategory}
                  className="tool-outfit-list"
                  role="group"
                  aria-label="服装款式，可左右滑动"
                  tabIndex={0}
                >
                  <Repeat
                    scope={s}
                    items={s.filteredOutfits}
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
                            disabled={s.busy}
                            dynamicClass={{
                              selected: (s.photo || s.outfitExampleActive) && s.outfit === s.item.id,
                            }}
                            aria-pressed={!!(s.photo || s.outfitExampleActive) && s.outfit === s.item.id}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.selectOutfit(scope.item.id);
                                },
                              },
                            ]}
                          >
                            <View
                              as="img"
                              scope={s}
                              src={s.item.image}
                              loading="lazy"
                              decoding="async"
                              alt={s.item.name}
                            ></View>
                            <View as="span" scope={s} text={s.item.name}></View>
                          </View>
                        </>
                      </>
                    )}
                  </Repeat>
                </View>
              </View>
              <View
                as="p"
                scope={s}
                className="tool-file-info"
                show={
                  s.output &&
                  s.step > 0 &&
                  !s.busy &&
                  !s.needsPreview &&
                  s.action !== "outfit"
                }
                text={s.outputInfo}
              ></View>
              <PaymentRecovery order={s.currentOrder} busy={s.paying}
                resolution={s.checkoutResolution} setResolution={(value) => { s.checkoutResolution = value; }}
              />
              <View
                as="p"
                scope={s}
                className="tool-error"
                show={s.error && !s.choosingPhoto}
                text={s.error}
                role="alert"
              ></View>
              <View
                as="p"
                scope={s}
                className="tool-notice"
                show={s.notice && !(s.serviceResult && s.savedRecord)}
                text={s.notice}
                role="status"
              ></View>
            </View>
            <View
              as="footer"
              scope={s}
              className="tool-footer tool-work-footer"
              dynamicClass={{
                "photo-selection-footer": s.isInlineWorkspace || s.step === 0,
              }}
            >
              {s.isInlineWorkspace || s.step === 0 ? (
                <PhotoSelectionActions
                  hasPhoto={!!s.photo?.blob}
                  disabled={s.busy}
                  selectDisabled={s.currentOrder?.status === "verifying"}
                  nextEnabled={s.primaryEnabled}
                  nextLabel={s.primaryLabel}
                  onSelect={() => s.pick()}
                  onNext={() => s.primary()}
                />
              ) : (
                <>
                  <View
                    as="button"
                    scope={s}
                    className="tool-repick"
                    show={s.step > 0 && !s.serviceResult}
                    disabled={s.busy}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.previousStep();
                        },
                      },
                    ]}
                  >
                    <View as="svg" scope={s} aria-hidden="true">
                      <View as="use" scope={s} href="#i-chevron-left"></View>
                    </View>
                    <View as="span" scope={s} text="上一步"></View>
                  </View>
                  <View
                    as="button"
                    scope={s}
                    className="tool-primary"
                    disabled={!s.primaryEnabled}
                    text={s.saving ? "正在保存…" : s.primaryLabel}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.primary();
                        },
                      },
                    ]}
                  ></View>
                </>
              )}
            </View>
          </View>
          {s.page === "tool" && s.view === "saved" && <ToolResult studio={s} />}
          <View
            as="div"
            scope={s}
            className="tool-flow"
            show={s.view === "orders"}
          >
            <ToolNavigation
              title={s.action === "repair" ? "照片精修订单" : "换装订单"}
              onBack={() => s.back()}
            />
            <View as="div" scope={s} className="tool-work-scroll">
              <View
                as="div"
                scope={s}
                className="tool-orders-empty"
                show={s.ordersStore.ready && !s.orders.length}
              >
                <View
                  as="img"
                  scope={s}
                  src={s.mascot}
                  alt=""
                  width="1024"
                  height="1024"
                ></View>
                <View as="h2" scope={s}>
                  {"暂无订单"}
                </View>
                <View
                  as="button"
                  scope={s}
                  className="tool-primary"
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.start();
                      },
                    },
                  ]}
                >
                  {"开始制作"}
                </View>
              </View>
              <View
                as="p"
                scope={s}
                className="tool-error"
                show={s.ordersStore.error}
                text={s.ordersStore.error}
              ></View>
              <View
                as="button"
                scope={s}
                className="tool-secondary"
                show={s.ordersStore.error}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.ordersStore.load();
                    },
                  },
                ]}
              >
                {"重新读取订单"}
              </View>
              <Repeat
                scope={s}
                items={s.orders}
                names={["order"]}
                keyFor={function (scope, $event, $el) {
                  return scope.order.id;
                }}
              >
                {(s) => (
                  <>
                    <>
                      <View
                        as="button"
                        scope={s}
                        className="tool-order-card"
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.resumeOrder(scope.order);
                            },
                          },
                        ]}
                      >
                        <View
                          as="img"
                          scope={s}
                          src={s.orderURL(s.order)}
                          alt={s.order.photo.name}
                        ></View>
                        <View as="div" scope={s}>
                          <View
                            as="strong"
                            scope={s}
                            text={s.config.title}
                          ></View>
                          <View
                            as="small"
                            scope={s}
                            text={s.time(s.order.createdAt)}
                          ></View>
                          <View
                            as="span"
                            scope={s}
                            text={s.orderStatus(s.order)}
                          ></View>
                        </View>
                        <View
                          as="b"
                          scope={s}
                        >
                          <span className="ui-price">{s.money(s.order.amount)}</span>
                        </View>
                      </View>
                    </>
                  </>
                )}
              </Repeat>
            </View>
          </View>
            <SheetFrame opened={s.page === "tool" && !!s.panel} target="#tool-modal-layer"
              id="tool-sheet-title" className={s.panel === "album" ? "tool-sheet photo-selection-sheet" : "tool-sheet"}
              busy={s.paying || s.saving} onClose={() => s.closePanel()}
              dialogRef={(node) => { s.$refs.toolDialog = node; }}>
              {s.panel !== "album" && <SheetHeader id="tool-sheet-title" onClose={() => s.closePanel()}
                busy={s.paying || s.saving} title={{
                  crop: "手动裁剪",
                  portraitOutcome: "照片检查",
                  portrait: "照片检查未通过",
                  payment: s.action === "outfit" ? "确认换装订单" : "照片精修订单",
                }[s.panel]} />}
                <View
                  as="div"
                  scope={s}
                  className="tool-sheet-body ui-sheet-panels"
                >
                  <PortraitCheckPanel
                    panel={s.panel}
                    check={s.portraitCheck}
                    repair={s.action === "repair"}
                    onChoose={(outcome, reason) =>
                      s.choosePortraitOutcome(outcome, reason)
                    }
                    onClose={() => s.closePanel()}
                    closeLabel={s.isInlineWorkspace ? "返回调整" : "返回选照片"}
                  />
                  {s.panel === "album" ? (
                    <ToolPhotoSelection
                      library={s.library}
                      selectedId={s.candidateId}
                      mascot={s.mascot}
                      busy={s.busy}
                      error={s.error}
                      requiresPortrait={s.config.requiresPortrait}
                      selectionHint={s.action === "repair" ? "请选择一张清晰的单人正面人像，选取后需通过照片检查。" : undefined}
                      titleId="tool-sheet-title"
                      onClose={() => s.closePanel()}
                      onPhone={() => s.pickPhone()}
                      onCreate={() => s.makePhoto()}
                      onSelect={(id) => s.selectCandidate(id)}
                      onConfirm={() => s.useCandidate()}
                    />
                  ) : null}
                  <View
                    as="div"
                    scope={s}
                    show={s.panel === "crop"}
                    className="ui-sheet-panel"
                  >
                    <View as="div" scope={s} className="ui-sheet-body">
                      <View
                        as="div"
                        scope={s}
                        className="tool-crop-preview"
                        dynamicStyle={
                          "--crop-ratio:" + s.spec.width + "/" + s.spec.height
                        }
                        events={[
                          {
                            type: "pointerdown",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.startCropGesture($event);
                            },
                          },
                          {
                            type: "pointermove",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.moveCropGesture($event);
                            },
                          },
                          {
                            type: "pointerup",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.endCropGesture($event);
                            },
                          },
                          {
                            type: "pointercancel",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.endCropGesture($event);
                            },
                          },
                        ]}
                      >
                        <View
                          as="img"
                          scope={s}
                          src={s.sourceURL || undefined}
                          dynamicStyle={s.cropImageStyle}
                          alt="拖动调整裁剪区域"
                          draggable="false"
                        ></View>
                        <View as="span" scope={s}></View>
                      </View>
                      <View as="small" scope={s} className="tool-crop-hint">
                        {"拖动位置 · 双指缩放"}
                      </View>
                      <View as="label" scope={s} className="tool-range">
                        {"缩放"}
                        <View
                          as="input"
                          scope={s}
                          type="range"
                          min="1"
                          max="2"
                          step="0.05"
                          events={[
                            {
                              type: "change",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.preview();
                              },
                            },
                          ]}
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.scale;
                            },
                            write: function (scope, $event, $el) {
                              scope.scale = $event;
                            },
                            number: true,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                      <View as="label" scope={s} className="tool-range">
                        {"左右"}
                        <View
                          as="input"
                          scope={s}
                          type="range"
                          min="-100"
                          max="100"
                          events={[
                            {
                              type: "change",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.preview();
                              },
                            },
                          ]}
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.offsetX;
                            },
                            write: function (scope, $event, $el) {
                              scope.offsetX = $event;
                            },
                            number: true,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                      <View as="label" scope={s} className="tool-range">
                        {"上下"}
                        <View
                          as="input"
                          scope={s}
                          type="range"
                          min="-100"
                          max="100"
                          events={[
                            {
                              type: "change",
                              prevent: false,
                              stop: false,
                              self: false,
                              passive: false,
                              run: function (scope, $event, $el) {
                                scope.preview();
                              },
                            },
                          ]}
                          model={{
                            read: function (scope, $event, $el) {
                              return scope.offsetY;
                            },
                            write: function (scope, $event, $el) {
                              scope.offsetY = $event;
                            },
                            number: true,
                            lazy: false,
                          }}
                        ></View>
                      </View>
                      <View
                        as="button"
                        scope={s}
                        className="tool-secondary"
                        events={[
                          {
                            type: "click",
                            prevent: false,
                            stop: false,
                            self: false,
                            passive: false,
                            run: function (scope, $event, $el) {
                              scope.scale = 1;
                              scope.offsetX = 0;
                              scope.offsetY = 0;
                              scope.preview();
                            },
                          },
                        ]}
                      >
                        {"重置裁剪"}
                      </View>
                    </View>
                    <footer className="ui-sheet-footer">
                      <button type="button" className="ui-button-primary" disabled={s.busy} onClick={() => s.applyCrop()}>完成</button>
                    </footer>
                  </View>
                  {s.panel === "payment" && <ToolPaymentPanel key={s.action} s={s} />}
                  <View
                    as="p"
                    scope={s}
                    className="tool-error"
                    show={s.panel !== "album" && s.error}
                    text={s.error}
                    role="alert"
                  ></View>
                </View>
            </SheetFrame>
        </View>
      )}
    </Controller>
  );
}
