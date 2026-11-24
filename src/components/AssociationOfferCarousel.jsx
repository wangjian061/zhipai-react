import React, { useLayoutEffect, useRef, useState } from "react";
import { ASSOCIATION_OFFERS as offers } from "../domain/collection-config.js";
import { nextOfferIndex, offerSwipeStep, startOfferRotation } from "../domain/collection-offer-rotation.js";

export default function AssociationOfferCarousel({ scope: s }) {
  const root = useRef(null);
  const pager = useRef(null);
  const press = useRef(null);
  const suppressClick = useRef(false);
  const panel = s.panel;
  const [selected, setSelected] = useState(() => Math.max(
    0, offers.findIndex(offer => offer.id === globalThis.history?.state?.associationOffer),
  ));

  useLayoutEffect(() => {
    if (!panel) return startOfferRotation(root.current, () => setSelected(index => nextOfferIndex(index, 1, offers.length)));
  }, [panel]);

  function startSwipe(event) {
    if (!event.isPrimary || event.button !== 0) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    suppressClick.current = false;
    event.target.closest("button")?.setPointerCapture(event.pointerId);
  }

  function finishSwipe(event) {
    const origin = press.current;
    if (origin?.id !== event.pointerId) return;
    press.current = null;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    suppressClick.current = Math.max(Math.abs(dx), Math.abs(dy)) > 10;
    const step = offerSwipeStep(dx, dy);
    if (step) setSelected(index => nextOfferIndex(index, step, offers.length));
  }

  function selectByKey(event) {
    const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = nextOfferIndex(selected, step, offers.length);
    setSelected(next);
    pager.current.focus({ preventScroll: true });
  }

  return (
    <section className="association-offers" ref={root} aria-roledescription="轮播"
      aria-label="证照冲印与制作" onKeyDown={selectByKey}>
      <div className="association-offer-stage" onPointerDown={startSwipe} onPointerUp={finishSwipe}
        onPointerCancel={() => { press.current = null; suppressClick.current = true; }}>
        {offers.map((offer, index) => {
          const active = selected === index;
          const service = Boolean(offer.heroImage);
          const action = service ? "了解详情" : "立即下单";
          return (
            <button type="button" key={offer.id} className="association-slide" data-active={active}
              inert={!active} aria-hidden={!active} data-service={service ? offer.id : undefined}
              aria-label={`${offer.title}，${offer.eyebrow}。${offer.summary}。${action}`}
              onClick={event => {
                if (event.detail && suppressClick.current) return;
                if (service) s.openAssociationService(offer.id);
                else s.openAssociationPrint();
              }}>
              <img src={offer.poster} alt="" width="1320" height="600" draggable={false} />
            </button>
          );
        })}
      </div>
      <div className="association-offer-pages">
        {offers.map((offer, index) => (
          <span key={offer.id} data-active={index === selected} aria-hidden="true" />
        ))}
        <input ref={pager} type="range" min={1} max={offers.length} step={1} value={selected + 1}
          aria-label="切换业务海报" aria-valuetext={`第 ${selected + 1} 张，${offers[selected].title}`}
          onChange={event => setSelected(event.currentTarget.valueAsNumber - 1)} />
      </div>
    </section>
  );
}
