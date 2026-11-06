import React, { Children, cloneElement, useLayoutEffect, useRef } from "react";
import { startCollectionMarquee } from "../domain/collection-marquee.js";

// 2026-11-06: stop autoplay; retain the marquee implementation for later use.
const AUTO_PLAY = false;

export default function HomeCollectionRail({ active, children }) {
  const rail = useRef(null);
  const cards = Children.toArray(children);
  const count = cards.length;

  useLayoutEffect(() => {
    if (active)
      return startCollectionMarquee(rail.current, count, undefined, undefined, {
        autoplay: AUTO_PLAY,
      });
  }, [active, count]);

  return (
    <div className="home-collection-rail" ref={rail}>
      {(AUTO_PLAY ? [-1, 0, 1] : [0]).map((lap) =>
        cards.map((card) =>
          cloneElement(card, {
            key: lap + ":" + card.key,
            tabIndex: lap === 0 ? undefined : -1,
            "aria-hidden": lap === 0 ? undefined : true,
          }),
        ),
      )}
    </div>
  );
}
