import React, { useRef, useState } from "react";
import SharedSheet from "./SharedSheet.jsx";
import { layoutPrintPath, openCollectionPrint } from "../domain/collection-history.js";
import { graduatePrintPath } from "../domain/graduate-print.js";

const printServices = [
  {
    id: "graduate",
    path: graduatePrintPath,
    image: "/assets/print-hero-graduate-6inch.webp",
    alt: "三张错落铺开的纸质毕业照，前景是身穿学士服的朋友合影",
    tab: "毕业 6 寸冲印",
    eyebrow: "毕业季珍藏",
    title: "毕业 6 寸冲印",
    description: "把一起走过的青春，印成拿在手里的记忆。",
    action: "开始挑选照片",
    footnote: "专业冲印相纸 · 支持逐张精裁 · 10 张起印",
  },
  {
    id: "layout",
    path: layoutPrintPath,
    image: "/assets/print-hero-diecut-layout.webp",
    alt: "整版背胶证件照，上排一张的边角轻轻揭起，露出底纸",
    tab: "背胶排版照",
    eyebrow: "免剪刀 · 一撕即贴",
    title: "背胶模切排版照",
    description: "精准模切，轻揭一角，简历与档案利落服帖。",
    action: "去排版冲印",
    footnote: "一寸 / 二寸可选版式 · 撕下即贴 · 顺丰直发",
  },
];

const enrollmentServices = [{
  ...printServices[1],
  eyebrow: "四六级报名 · 入学报到必备",
  description: "四六级报名、入学建档、学生证，一撕即贴都服帖。",
  footnote: "一寸 / 二寸可选版式 · 免剪刀精准模切 · 顺丰直发",
}];

export function clearPrintReturn() {
  const state = { ...history.state };
  delete state.universityPrintPanel;
  history.replaceState(state, "");
}

export function openPrintProduct(product) {
  history.replaceState({ ...history.state, universityPrintPanel: product.id }, "");
  openCollectionPrint(product.path);
}

// Ignore taps and predominantly vertical gestures so scrolling never changes products.
export function showroomSwipeProduct(dx, dy, services = printServices) {
  if (services.length < 2 || Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.3) return null;
  return dx < 0 ? services[1] : services[0];
}

export function PrintShowroom({ category = "graduate", initialProduct, onOpenProduct = openPrintProduct, ...sheetProps }) {
  const enrollment = category === "enrollment";
  const services = enrollment ? enrollmentServices : printServices;
  const canSwitch = services.length > 1;
  const [product, setProduct] = useState(() =>
    services.find(item => item.id === initialProduct) || services[0]);
  const selectedButton = useRef(null);
  const start = useRef(null);
  const swiped = useRef(false);

  function startSwipe(event) {
    swiped.current = false;
    if (!event.isPrimary || event.button !== 0) {
      start.current = null;
      return;
    }
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (!event.target.closest("button")) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishSwipe(event) {
    const origin = start.current;
    start.current = null;
    if (origin?.id !== event.pointerId) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const next = showroomSwipeProduct(dx, dy, services);
    if (!next) return;
    swiped.current = true;
    setProduct(next);
  }

  function switchWithArrow(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = event.key === "ArrowLeft" ? 0 : 1;
    setProduct(services[index]);
    event.currentTarget.querySelectorAll("button")[index].focus();
  }

  return <SharedSheet {...sheetProps} opened id="university-print-title" title={enrollment ? "照片冲印" : "毕业照冲印"}
    className="university-sheet university-print-sheet" sectionProps={{ "data-product": product.id, "data-category": category }}
    initialFocusRef={canSwitch ? selectedButton : undefined}
    leading={canSwitch && <div className="university-print-switch" role="group" aria-label="选择冲印商品"
      onKeyDown={switchWithArrow}>
      {services.map(item => (
        <button type="button" key={item.id} ref={item === product ? selectedButton : null}
          aria-pressed={item === product} aria-controls="university-print-product"
          onClick={() => setProduct(item)}>{item.tab}</button>
      ))}
    </div>}>
    <section className="university-print-product" id="university-print-product" aria-labelledby="university-print-name"
      {...(canSwitch && {
        onPointerDown: startSwipe,
        onPointerUp: finishSwipe,
        onPointerCancel: () => { start.current = null; },
      })}>
      <div className="university-print-copy">
        <span className="university-print-eyebrow">{product.eyebrow}</span>
        <h3 id="university-print-name">{product.title}</h3>
        <p className="university-print-description">{product.description}</p>
        <button type="button" className="ui-button-primary university-print-action" onClick={event => {
          if (!event.detail || !swiped.current) onOpenProduct(product);
        }}>{product.action}</button>
      </div>
      <div className="university-print-photo">
        <img key={product.id} src={product.image} alt={product.alt} width="1440" height="810" draggable={false} />
      </div>
      <p className="university-print-footnote">{product.footnote}</p>
    </section>
  </SharedSheet>;
}
