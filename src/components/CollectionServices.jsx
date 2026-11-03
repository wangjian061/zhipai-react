import React from "react";
import CollectionHeader from "./CollectionHeader.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";
export default function CollectionServices({ scope: s }) {
  if (s.view !== "services") return null;
  return (
    <div className="collection-section collection-service-page">
      <CollectionHeader
        title="服务中心"
        subtitle="采集帮助 · 客服支持"
        image="assets/collection-bear-service.webp"
        onBack={() => s.exitCollection()}
      />
      <div className="collection-services-inner collection-section-container">
        <button
          className="collection-center-entry"
          onClick={() => s.openNotifications()}
        >
          <span className="collection-notification-mark">
            <CollectionIcon name="notification" />
          </span>
          <span>
            <strong>通知中心</strong>
            <small>系统通知与项目动态</small>
          </span>
          <CollectionIcon name="chevron" />
        </button>
        <section className="collection-contact-card">
          <CollectionIcon name="nav-service" />
          <div>
            <h2>联系知拍客服</h2>
            <p>采集问题统一受理与协调</p>
          </div>
          <button
            onClick={() => s.openEmailContact()}
            aria-label="联系知拍客服"
          >
            联系
            <CollectionIcon name="chevron" />
          </button>
        </section>
        <section className="collection-service-card">
          <header>
            <h2>采集帮助</h2>
          </header>
          {!s.serviceContent.ready ? (
            <p role="status" className="collection-service-empty">
              正在读取帮助内容…
            </p>
          ) : s.serviceContent.error ? (
            <div className="collection-service-empty" role="alert">
              <p>{s.serviceContent.error}</p>
              <button
                className="account-text"
                onClick={() => s.retryServiceContent()}
              >
                重新读取
              </button>
            </div>
          ) : s.serviceContent.questions.length ? (
            s.serviceContent.questions.map((q) => (
              <div className="collection-faq" key={q.id}>
                <button aria-haspopup="dialog" onClick={() => s.openHelp(q.id)}>
                  <span>{q.title}</span>
                  <CollectionIcon name="chevron" />
                </button>
              </div>
            ))
          ) : (
            <p className="collection-service-empty">暂无帮助内容</p>
          )}
        </section>
      </div>
    </div>
  );
}
