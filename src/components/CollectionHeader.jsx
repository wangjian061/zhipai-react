import React, { useLayoutEffect, useRef } from "react";
import { CollectionIcon } from "./CollectionHome.jsx";

function CategorySupportButton({ scope }) {
  const button = useRef(null);
  const opened = scope.panel === "email";
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (wasOpen.current && !opened) button.current?.focus({ preventScroll: true });
    wasOpen.current = opened;
  }, [opened]);
  return <button ref={button} type="button" className="collection-task-support collection-hero-support"
    aria-haspopup="dialog" aria-expanded={opened} onClick={() => scope.openEmailContact()}>
    <CollectionIcon name="nav-service" />客服
  </button>;
}

export default function CollectionHeader({ title, subtitle, image, onBack, compact, support }) {
  return (
    <section
      className={
        "collection-home-hero collection-themed-hero" +
        (onBack ? " has-back" : "") +
        (compact ? " is-compact" : "")
      }
    >
      {onBack && (
        <button
          className="collection-hero-back"
          aria-label="返回"
          onClick={onBack}
        >
          <CollectionIcon name="chevron-left" />
        </button>
      )}
      <div className="collection-hero-row">
        <div className="collection-hero-copy">
          <h1>{title}</h1>
          {!compact && subtitle && <p>{subtitle}</p>}
        </div>
        {image && <img className="collection-hero-art" src={image} alt="" />}
        {support && <CategorySupportButton scope={support} />}
      </div>
      <span className="collection-hero-orbit" aria-hidden="true" />
    </section>
  );
}
