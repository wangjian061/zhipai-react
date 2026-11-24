import React, { useLayoutEffect, useRef } from "react";
import ToolNavigation from "../components/ToolNavigation.jsx";
import { FeedbackToast } from "../components/Feedback.jsx";
import "./graduate-pages.css";
import "./association-page.css";

export default function AssociationServicePage({ scope: s }) {
  const service = s.associationService;
  const email = s.supportEmail;
  const emailLink = s.associationServiceEmailLink;
  const copied = s.contactNotice === "商务邮箱已复制";
  const copyEmail = () => s.copySupportEmail();
  const title = useRef(null);
  useLayoutEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, []);
  if (!service) return null;

  return (
    <section className="association-service-page" aria-label={service.title}>
      <ToolNavigation title={service.title} onBack={() => s.back()} backLabel="返回其它采集"
        renderTitle={props => <h1 {...props} ref={title} tabIndex={-1}>{service.title}</h1>} />
      <div className="association-service-scroll">
        <section className="association-service-hero" aria-labelledby="association-service-name">
          <img src={service.heroImage} alt={service.heroAlt} width="1080" height="720" />
          <div className="association-service-intro">
            <p className="association-service-eyebrow">{service.eyebrow}</p>
            <h2 id="association-service-name">{service.title}</h2>
            <p>{service.summary}。可以定制设计。</p>
            <ul className="association-service-highlights" role="list">
              {service.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}
            </ul>
          </div>
        </section>

        <section className="association-service-card" aria-labelledby="association-service-specs">
          <h2 id="association-service-specs">规格与工艺</h2>
          <dl className="association-service-specs">
            {service.specs.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </section>

        <section className="association-service-card" aria-labelledby="association-service-process">
          <h2 id="association-service-process">定制合作流程</h2>
          <ol className="association-service-steps" role="list">
            {service.processSteps.map(([title, description], index) => (
              <li key={title}>
                <span className="university-code-step-number" aria-hidden="true">{index + 1}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="association-service-card association-service-contact" aria-labelledby="association-service-contact">
          <h2 id="association-service-contact">商务定制咨询</h2>
          <p>工作日 09:00–18:00 专人对接报价与打样</p>
          <dl className="association-service-channels">
            {email && (
              <div className="association-service-email">
                <dt className="sr-only">商务邮箱</dt>
                <dd>{email}</dd>
                <dd><button type="button" className="ui-button-secondary" onClick={copyEmail} aria-label="复制商务邮箱">复制</button></dd>
              </div>
            )}
            {s.serviceContent.phone && <div><dt>电话</dt><dd>{s.serviceContent.phone}</dd></div>}
            {s.serviceContent.wechat && <div><dt>企业微信</dt><dd>{s.serviceContent.wechat}</dd></div>}
          </dl>
          {!email && <p role="status">商务邮箱暂不可用</p>}
        </section>
      </div>
      <footer className="association-service-footer">
        {s.contactNotice && !copied && <p role="status">{s.contactNotice}</p>}
        <div className="association-service-actions">
          <button type="button" className="ui-button-secondary" disabled={!email} onClick={copyEmail}>复制联系邮箱</button>
          {emailLink
            ? <a className="ui-button-primary" href={emailLink}>联系商务咨询</a>
            : <button type="button" className="ui-button-primary" disabled>联系商务咨询</button>}
        </div>
      </footer>
      <FeedbackToast message={copied ? s.contactNotice : ""} />
    </section>
  );
}
