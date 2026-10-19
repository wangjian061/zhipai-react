import React from "react";
import PhotoSelectionEmpty from "../components/PhotoSelectionEmpty.jsx";
import {
  RepairCheckStatus,
  RepairCheckPanel,
} from "../components/RepairPhotoCheck.jsx";
import { Controller, View, Repeat, Portal } from "../runtime/components.jsx";
export default function ToolsPage({ scope, args = [] }) {
  return (
    <Controller name="toolStudio" args={args}>
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          className="page tool-page"
          id="tool-page"
          data-view={s.view}
          show={s.page === "tool"}
          data-tool={s.action}
          inert={!!s.panel}
          aria-label="照片工具"
        >
          {s.action === "spec" && (
            <div className="tool-flow">
              <header className="tool-app-nav">
                <button
                  className="tool-round-back"
                  aria-label="返回"
                  onClick={() => s.back()}
                >
                  <svg aria-hidden="true">
                    <use href="#i-chevron" />
                  </svg>
                </button>
                <h1>证照规格</h1>
              </header>
              <p className="tool-notice">该功能暂未开放</p>
            </div>
          )}
          <View
            as="div"
            scope={s}
            className="tool-flow"
            show={s.view === "work" && s.action !== "spec"}
            dynamicClass={{
              "outfit-work-result": s.outfitResult,
            }}
          >
            <View as="header" scope={s} className="tool-app-nav tool-work-nav">
              <View
                as="button"
                scope={s}
                className="tool-round-back"
                disabled={s.busy}
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
              <View
                as="h1"
                scope={s}
                text={
                  s.outfitResult
                    ? "换装效果"
                    : s.repairResult
                      ? "精修效果"
                      : s.config.title
                }
              ></View>
              <View
                as="button"
                scope={s}
                className="tool-order-link"
                show={s.config.service}
                disabled={s.busy}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.openOrders();
                    },
                  },
                ]}
              >
                {"订单"}
              </View>
            </View>
            <View
              as="nav"
              scope={s}
              className="tool-steps"
              aria-label="制作步骤"
            >
              <Repeat
                scope={s}
                items={s.config.steps}
                names={["label", "index"]}
                keyFor={function (scope, $event, $el) {
                  return scope.label;
                }}
              >
                {(s) => (
                  <>
                    <>
                      <View
                        as="span"
                        scope={s}
                        dynamicClass={{
                          current: s.step === s.index,
                          done: s.step > s.index,
                        }}
                        aria-current={s.step === s.index ? "step" : null}
                      >
                        <View as="b" scope={s} text={s.index + 1}></View>
                        <View as="span" scope={s} text={s.label}></View>
                      </View>
                    </>
                  </>
                )}
              </Repeat>
            </View>
            <View as="div" scope={s} className="tool-work-scroll">
              {!s.photo && (
                <PhotoSelectionEmpty
                  mascot={s.mascot}
                  description={
                    s.config.sources.includes("phone")
                      ? "知拍相册 / 手机相册"
                      : "从知拍相册选择"
                  }
                  disabled={s.busy}
                  onSelect={() => s.pick()}
                />
              )}
              {s.choosingPhoto && s.photo && (
                <button
                  type="button"
                  className="tool-selection-change"
                  onClick={() => s.pick()}
                >
                  已保留当前照片<span>更换照片</span>
                </button>
              )}
              <View
                as="section"
                scope={s}
                className="tool-photo-card"
                show={s.photo}
              >
                <View
                  as="header"
                  scope={s}
                  className="tool-photo-heading"
                  show={s.config.service}
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
                      (s.choosingPhoto
                        ? s.sourceURL
                        : s.outputURL || s.sourceURL) || undefined
                    }
                    alt={s.config.title + "结果预览"}
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
                  <View
                    as="div"
                    scope={s}
                    className="tool-photo-tags"
                    show={s.action === "repair" && s.serviceApplied}
                  >
                    <View as="span" scope={s}>
                      {"精修前"}
                    </View>
                    <View as="span" scope={s}>
                      {"精修后"}
                    </View>
                  </View>
                  <View
                    as="div"
                    scope={s}
                    className="tool-compare-handle"
                    show={s.action === "repair" && s.serviceApplied}
                    dynamicStyle={"left:" + s.comparison + "%"}
                    aria-hidden="true"
                  >
                    <View as="span" scope={s}>
                      <View as="svg" scope={s}>
                        <View as="use" scope={s} href="#i-arrow"></View>
                      </View>
                    </View>
                  </View>
                  <View
                    as="input"
                    scope={s}
                    className="tool-photo-range"
                    show={s.action === "repair" && s.serviceApplied}
                    type="range"
                    min="0"
                    max="100"
                    aria-label="拖动滑杆查看精修前后"
                    model={{
                      read: function (scope, $event, $el) {
                        return scope.comparison;
                      },
                      write: function (scope, $event, $el) {
                        scope.comparison = $event;
                      },
                      number: true,
                      lazy: false,
                    }}
                  ></View>
                  <View
                    as="button"
                    scope={s}
                    className="tool-adjust"
                    show={s.action === "crop" && !s.choosingPhoto && !s.busy}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.openPanel("crop");
                        },
                      },
                    ]}
                  >
                    {"手动裁剪"}
                  </View>
                  <View
                    as="div"
                    scope={s}
                    className="tool-process-overlay"
                    show={s.busy && !s.saving && !s.paying}
                    role="status"
                  >
                    <View as="span" scope={s} className="camera-spinner"></View>
                    <View
                      as="strong"
                      scope={s}
                      text={
                        s.stage === "checking"
                          ? "正在检查照片"
                          : s.stage === "standardizing"
                            ? "标准化处理中"
                            : s.stage === "processing"
                              ? s.action === "repair"
                                ? "正在精修照片"
                                : "正在换装"
                              : "正在处理照片"
                      }
                    ></View>
                  </View>
                </View>
                <View as="div" scope={s} className="tool-photo-meta">
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
              {s.action === "repair" &&
                s.photo &&
                !s.choosingPhoto &&
                !s.serviceApplied && (
                  <RepairCheckStatus
                    check={s.portraitCheck}
                    onReasons={() => s.openPanel("portrait")}
                    onRetry={() => s.validateRepairPhoto()}
                  />
                )}
              <View
                as="section"
                scope={s}
                className="tool-settings"
                show={s.photo && !s.choosingPhoto && s.action === "crop"}
              >
                <View as="div" scope={s} className="tool-options-heading">
                  <View as="h2" scope={s}>
                    {"裁剪尺寸"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    disabled={s.busy}
                    aria-pressed={s.specId === "custom"}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.specId = "custom";
                          scope.needsPreview = true;
                        },
                      },
                    ]}
                  >
                    {"自定义"}
                  </View>
                </View>
                <View as="div" scope={s} className="tool-spec-list">
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
                </View>
                <View
                  as="div"
                  scope={s}
                  className="tool-custom-dimensions"
                  show={s.specId === "custom"}
                >
                  <View as="label" scope={s}>
                    {"宽"}
                    <View
                      as="input"
                      scope={s}
                      type="number"
                      min="1"
                      max="4096"
                      step="1"
                      inputMode="numeric"
                      disabled={s.busy}
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
                          return scope.customWidth;
                        },
                        write: function (scope, $event, $el) {
                          scope.customWidth = $event;
                        },
                        number: true,
                        lazy: false,
                      }}
                    ></View>
                    {"px"}
                  </View>
                  <View as="label" scope={s}>
                    {"高"}
                    <View
                      as="input"
                      scope={s}
                      type="number"
                      min="1"
                      max="4096"
                      step="1"
                      inputMode="numeric"
                      disabled={s.busy}
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
                          return scope.customHeight;
                        },
                        write: function (scope, $event, $el) {
                          scope.customHeight = $event;
                        },
                        number: true,
                        lazy: false,
                      }}
                    ></View>
                    {"px"}
                  </View>
                  <View
                    as="button"
                    scope={s}
                    disabled={s.busy}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.preview();
                        },
                      },
                    ]}
                  >
                    {"应用尺寸"}
                  </View>
                </View>
              </View>
              <View
                as="section"
                scope={s}
                className="tool-settings"
                show={
                  s.photo &&
                  !s.choosingPhoto &&
                  s.action === "background" &&
                  s.standardized
                }
              >
                <View as="div" scope={s} className="tool-options-heading">
                  <View as="h2" scope={s}>
                    {"背景颜色"}
                  </View>
                  <View as="span" scope={s}>
                    {"标准化已完成"}
                  </View>
                </View>
                <View as="div" scope={s} className="tool-color-list">
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
                            disabled={s.busy}
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
                show={s.photo && !s.choosingPhoto && s.action === "format"}
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
                show={s.photo && !s.choosingPhoto && s.action === "resize"}
              >
                <View as="div" scope={s} className="tool-options-heading">
                  <View as="h2" scope={s}>
                    {"目标文件体积"}
                  </View>
                  <View
                    as="select"
                    scope={s}
                    disabled={s.busy}
                    aria-label="文件体积单位"
                    events={[
                      {
                        type: "change",
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
                        return scope.sizeUnit;
                      },
                      write: function (scope, $event, $el) {
                        scope.sizeUnit = $event;
                      },
                      number: false,
                      lazy: false,
                    }}
                  >
                    <View as="option" scope={s}>
                      {"KB"}
                    </View>
                    <View as="option" scope={s}>
                      {"MB"}
                    </View>
                  </View>
                </View>
                <View as="label" scope={s} className="tool-size-input">
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
                  <View as="strong" scope={s} text={s.sizeUnit}></View>
                </View>
                <View as="div" scope={s} className="tool-size-comparison">
                  <View as="span" scope={s}>
                    {"原文件"}
                    <View
                      as="b"
                      scope={s}
                      text={
                        s.photo ? s.size(s.photo.size || s.photo.blob.size) : ""
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
                <View
                  as="button"
                  scope={s}
                  className="tool-secondary"
                  disabled={s.busy}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.preview();
                      },
                    },
                  ]}
                >
                  {"应用体积"}
                </View>
                <View as="small" scope={s} className="tool-local-note">
                  {"像素尺寸不变，输出 JPG"}
                </View>
              </View>
              <View
                as="section"
                scope={s}
                className="tool-settings outfit-clothes-card"
                show={
                  s.photo &&
                  !s.choosingPhoto &&
                  s.action === "outfit" &&
                  s.standardized &&
                  !s.outfitResult
                }
              >
                <View as="div" scope={s} className="outfit-clothes-heading">
                  <View as="h2" scope={s}>
                    {"选择服装"}
                  </View>
                  <View as="span" scope={s} text={s.chosenOutfit?.name}></View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="tool-outfit-tabs"
                  role="group"
                  aria-label="服装分类"
                >
                  <Repeat
                    scope={s}
                    items={s.outfitCategories}
                    names={["category"]}
                    keyFor={function (scope, $event, $el) {
                      return scope.category.id;
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
                              selected: s.outfitCategory === s.category.id,
                            }}
                            aria-pressed={s.outfitCategory === s.category.id}
                            text={s.category.name}
                            events={[
                              {
                                type: "click",
                                prevent: false,
                                stop: false,
                                self: false,
                                passive: false,
                                run: function (scope, $event, $el) {
                                  scope.selectOutfitCategory(scope.category.id);
                                },
                              },
                            ]}
                          ></View>
                        </>
                      </>
                    )}
                  </Repeat>
                </View>
                <View as="div" scope={s} className="tool-outfit-list">
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
                              selected: s.outfit === s.item.id,
                            }}
                            aria-pressed={s.outfit === s.item.id}
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
                  !s.busy &&
                  !s.needsPreview &&
                  s.action !== "outfit"
                }
                text={s.outputInfo}
              ></View>
              <View
                as="p"
                scope={s}
                className="tool-error"
                show={s.error}
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
              <View
                as="section"
                scope={s}
                className="tool-saved-confirmation"
                show={s.serviceResult && s.savedRecord}
                role="status"
              >
                <View
                  as="span"
                  scope={s}
                  className="tool-saved-icon"
                  aria-hidden="true"
                >
                  <View as="svg" scope={s}>
                    <View as="use" scope={s} href="#i-check"></View>
                  </View>
                </View>
                <View as="div" scope={s}>
                  <View as="strong" scope={s}>
                    {"已保存到知拍相册"}
                  </View>
                  <View as="span" scope={s}>
                    {"原照片仍然保留"}
                  </View>
                </View>
                <View
                  as="button"
                  scope={s}
                  disabled={s.busy}
                  events={[
                    {
                      type: "click",
                      prevent: false,
                      stop: false,
                      self: false,
                      passive: false,
                      run: function (scope, $event, $el) {
                        scope.openResultAlbum();
                      },
                    },
                  ]}
                >
                  {"查看相册"}
                  <View as="svg" scope={s} aria-hidden="true">
                    <View as="use" scope={s} href="#i-arrow"></View>
                  </View>
                </View>
              </View>
              <View
                as="div"
                scope={s}
                className="tool-recovery"
                show={s.error && s.photo && !s.busy}
              >
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
                        scope.pick();
                      },
                    },
                  ]}
                >
                  {"重新选图"}
                </View>
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
                        scope.retry();
                      },
                    },
                  ]}
                >
                  {"重试"}
                </View>
              </View>
            </View>
            <View
              as="footer"
              scope={s}
              className="tool-footer tool-work-footer"
            >
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
            </View>
          </View>
          <View
            as="div"
            scope={s}
            className="tool-flow"
            show={s.view === "saved"}
          >
            <View as="header" scope={s} className="tool-app-nav">
              <View
                as="button"
                scope={s}
                className="tool-round-back"
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
              <View as="h1" scope={s}>
                {"保存完成"}
              </View>
            </View>
            <View as="div" scope={s} className="tool-saved">
              <View
                as="img"
                scope={s}
                className="tool-saved-bear"
                src={s.mascot}
                width="1024"
                height="1024"
                alt=""
              ></View>
              <View
                as="h2"
                scope={s}
                text={s.config.service ? "已保存到知拍相册" : "照片已下载"}
              ></View>
              <View
                as="p"
                scope={s}
                text={
                  s.config.service ? "原照片仍然保留" : "可在设备下载记录中查看"
                }
              ></View>
              <View
                as="img"
                scope={s}
                className="tool-saved-photo"
                src={s.outputURL || undefined}
                alt="保存的照片"
              ></View>
              <View as="small" scope={s} text={s.outputInfo}></View>
              <View
                as="button"
                scope={s}
                className="tool-primary"
                show={s.config.service && s.savedRecord}
                events={[
                  {
                    type: "click",
                    prevent: false,
                    stop: false,
                    self: false,
                    passive: false,
                    run: function (scope, $event, $el) {
                      scope.viewSaved();
                    },
                  },
                ]}
              >
                {"查看照片"}
              </View>
              <button
                type="button"
                className="tool-secondary"
                disabled={s.busy}
                onClick={() => s.previousStep()}
              >
                上一步
              </button>
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
                      scope.start();
                    },
                  },
                ]}
              >
                {"再处理一张"}
              </View>
            </View>
          </View>
          <View
            as="div"
            scope={s}
            className="tool-flow"
            show={s.view === "orders"}
          >
            <View as="header" scope={s} className="tool-app-nav">
              <View
                as="button"
                scope={s}
                className="tool-round-back"
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
              <View
                as="h1"
                scope={s}
                text={s.action === "repair" ? "AI修复订单" : "换装订单"}
              ></View>
            </View>
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
                          text={s.money(s.order.amount)}
                        ></View>
                      </View>
                    </>
                  </>
                )}
              </Repeat>
            </View>
          </View>
          <Portal target="#tool-modal-layer">
            <View
              as="div"
              scope={s}
              className="tool-overlay"
              show={s.page === "tool" && s.panel}
              events={[
                {
                  type: "click",
                  prevent: false,
                  stop: false,
                  self: true,
                  passive: false,
                  run: function (scope, $event, $el) {
                    scope.closePanel();
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
                className="tool-sheet"
                refName="toolDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tool-sheet-title"
              >
                <View as="header" scope={s}>
                  <View
                    as="button"
                    scope={s}
                    disabled={s.paying || s.saving}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.closePanel();
                        },
                      },
                    ]}
                  >
                    {"取消"}
                  </View>
                  <View
                    as="h2"
                    scope={s}
                    id="tool-sheet-title"
                    text={
                      {
                        album: "选择照片",
                        crop: "手动裁剪",
                        portraitOutcome: "照片检查",
                        portrait: "照片检查未通过",
                        payment:
                          s.action === "outfit" ? "确认换装订单" : "开始AI精修",
                      }[s.panel]
                    }
                  ></View>
                  <View
                    as="button"
                    scope={s}
                    show={s.panel === "crop"}
                    disabled={s.busy}
                    events={[
                      {
                        type: "click",
                        prevent: false,
                        stop: false,
                        self: false,
                        passive: false,
                        run: function (scope, $event, $el) {
                          scope.applyCrop();
                        },
                      },
                    ]}
                  >
                    {"完成"}
                  </View>
                </View>
                <View
                  as="div"
                  scope={s}
                  className="tool-sheet-body ui-sheet-panels"
                >
                  <RepairCheckPanel
                    panel={s.panel}
                    check={s.portraitCheck}
                    onChoose={(outcome, reason) =>
                      s.choosePortraitOutcome(outcome, reason)
                    }
                    onSelect={() => s.pick()}
                  />
                  {s.panel === "album" ? (
                    <>
                      <>
                        <View as="div" scope={s} className="ui-sheet-panel">
                          <View as="div" scope={s} className="ui-sheet-body">
                            <View
                              as="div"
                              scope={s}
                              className="tool-source-tabs"
                            >
                              <View as="strong" scope={s}>
                                {"知拍相册"}
                              </View>
                              <View
                                as="button"
                                scope={s}
                                show={s.config.sources.includes("phone")}
                                events={[
                                  {
                                    type: "click",
                                    prevent: false,
                                    stop: false,
                                    self: false,
                                    passive: false,
                                    run: function (scope, $event, $el) {
                                      scope.pickPhone();
                                    },
                                  },
                                ]}
                              >
                                <View as="svg" scope={s} aria-hidden="true">
                                  <View
                                    as="use"
                                    scope={s}
                                    href="#i-upload"
                                  ></View>
                                </View>
                                {"手机相册"}
                              </View>
                            </View>
                            <View
                              as="p"
                              scope={s}
                              className="tool-sheet-description"
                              show={!s.library.ready && !s.library.error}
                            >
                              {"正在读取照片…"}
                            </View>
                            <View
                              as="div"
                              scope={s}
                              className="tool-sheet-empty"
                              show={
                                s.library.ready && !s.library.finished.length
                              }
                            >
                              <View
                                as="img"
                                scope={s}
                                src={s.mascot}
                                width="1024"
                                height="1024"
                                alt=""
                              ></View>
                              <View as="strong" scope={s}>
                                {"还没有照片"}
                              </View>
                            </View>
                            <View
                              as="p"
                              scope={s}
                              className="tool-error"
                              show={s.library.error}
                              text={s.library.error}
                            ></View>
                            <View
                              as="button"
                              scope={s}
                              className="tool-secondary"
                              show={s.library.error}
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
                              {"重新读取"}
                            </View>
                            <View
                              as="div"
                              scope={s}
                              className="tool-library-grid"
                            >
                              <Repeat
                                scope={s}
                                items={s.library.finished}
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
                                        dynamicClass={{
                                          selected: s.candidateId === s.item.id,
                                        }}
                                        aria-pressed={
                                          s.candidateId === s.item.id
                                        }
                                        aria-label={"选择" + s.item.name}
                                        disabled={
                                          s.library.busy || !s.item.blob
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
                                                scope.item.id,
                                              );
                                            },
                                          },
                                        ]}
                                      >
                                        <View
                                          as="img"
                                          scope={s}
                                          src={
                                            s.library.url(s.item.id) ||
                                            undefined
                                          }
                                          alt={s.item.name}
                                          loading="lazy"
                                        ></View>
                                        <View
                                          as="span"
                                          scope={s}
                                          show={s.candidateId === s.item.id}
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
                                    </>
                                  </>
                                )}
                              </Repeat>
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
                                    scope.makePhoto();
                                  },
                                },
                              ]}
                            >
                              {"制作一张"}
                            </View>
                          </View>
                          <View
                            as="footer"
                            scope={s}
                            className="ui-sheet-footer"
                          >
                            <View
                              as="button"
                              scope={s}
                              className="tool-primary tool-sheet-use"
                              show={s.library.finished.length}
                              disabled={
                                !s.candidateId || s.busy || s.library.busy
                              }
                              events={[
                                {
                                  type: "click",
                                  prevent: false,
                                  stop: false,
                                  self: false,
                                  passive: false,
                                  run: function (scope, $event, $el) {
                                    scope.useCandidate();
                                  },
                                },
                              ]}
                            >
                              {"使用这张照片"}
                            </View>
                          </View>
                        </View>
                      </>
                    </>
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
                  </View>
                  <View
                    as="div"
                    scope={s}
                    show={s.panel === "payment"}
                    className="ui-sheet-panel"
                  >
                    <View as="div" scope={s} className="ui-sheet-body">
                      <View as="div" scope={s} className="tool-payment-order">
                        <View
                          as="img"
                          scope={s}
                          src={s.outputURL || s.sourceURL || undefined}
                          alt="本次处理照片"
                        ></View>
                        <View as="div" scope={s}>
                          <View
                            as="strong"
                            scope={s}
                            text={s.config.title}
                          ></View>
                        </View>
                        <View as="b" scope={s}>
                          {"¥2.00"}
                        </View>
                      </View>
                      <View
                        as="label"
                        scope={s}
                        className="tool-payment-method"
                      >
                        <View as="span" scope={s}>
                          {"微信支付"}
                        </View>
                        <View
                          as="input"
                          scope={s}
                          type="radio"
                          name="tool-payment"
                          value="wechat"
                          disabled={s.paying}
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
                      <View
                        as="label"
                        scope={s}
                        className="tool-payment-method"
                      >
                        <View as="span" scope={s}>
                          {"支付宝支付"}
                        </View>
                        <View
                          as="input"
                          scope={s}
                          type="radio"
                          name="tool-payment"
                          value="alipay"
                          disabled={s.paying}
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
                        className="tool-primary"
                        disabled={s.busy || s.ordersStore.busy}
                        text={s.paying ? "正在确认…" : "确认付款"}
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
                    as="p"
                    scope={s}
                    className="tool-error"
                    show={s.error}
                    text={s.error}
                    role="alert"
                  ></View>
                </View>
              </View>
            </View>
          </Portal>
        </View>
      )}
    </Controller>
  );
}
