import React from "react";

export default function HomeBrandHeader({
  overContent = false,
  unread,
  onOpenNotifications,
}) {
  return (
    <div className="home-header-slot brand-page-sticky">
      <header
        className="home-brand-header brand-page-header"
        data-over-content={overContent}
      >
        <div className="home-brand-row">
          <h1 className="brand-page-title">
            <span className="home-brand-mark">
              <img
                src="/assets/share-brand-logo.png"
                width="54"
                height="63"
                alt=""
              />
            </span>
            知拍证件照
          </h1>
          <button
            id="home-notifications"
            type="button"
            className="home-brand-bell"
            aria-label={unread ? "通知中心，有未读消息" : "通知中心"}
            onClick={onOpenNotifications}
          >
            <span className="home-brand-bell-surface">
              <svg aria-hidden="true">
                <use href="#i-notification" />
              </svg>
              {unread && <i className="home-brand-unread" aria-hidden="true" />}
            </span>
          </button>
        </div>
        <p className="home-brand-tagline">
          <img
            src="/assets/home-brand-tagline.svg"
            width="750"
            height="100"
            alt="拍照片，用知拍！"
          />
        </p>
        <span className="home-brand-mascot brand-page-mascot" aria-hidden="true">
          <img src="/assets/zhipai-mascot.webp" alt="" draggable="false" />
        </span>
      </header>
    </div>
  );
}
