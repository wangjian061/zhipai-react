import React, { useState } from "react";

export default function HomeHeroSlide({ scope, slide, index, active, loaded }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`carousel-slide${active ? " is-active" : ""}`}
      role="group"
      aria-roledescription="幻灯片"
      aria-label={`${index + 1} / ${scope.slides.length}`}
      aria-hidden={!active}
      inert={!active}
    >
      {!failed && (
        <img
          className="carousel-image"
          src={loaded ? slide.image : undefined}
          alt=""
          width={slide.width}
          height={slide.height}
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
          draggable="false"
          onError={() => setFailed(true)}
        />
      )}
      <button
        type="button"
        className="hero-cta home-hero-link"
        aria-label={`${slide.title}，${slide.subtitle}，${slide.actionLabel}`}
        onClick={(event) => scope.activate(event, slide.action)}
      >
        {failed && (
          <span className="home-hero-image-fallback">
            <strong>{slide.title}</strong>
            <span>图片暂时无法显示</span>
            <span>{slide.actionLabel}</span>
          </span>
        )}
      </button>
    </div>
  );
}
