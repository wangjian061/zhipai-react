import React from "react";
import CollectionHeader from "./CollectionHeader.jsx";
import { CollectionIcon } from "./CollectionHome.jsx";
const questions = [
  {
    id: "entry",
    title: "如何找到需要参加的采集项目？",
    answer:
      "在专项列表中按新生入学、毕业生或行业协会筛选，也可以搜索项目名称或采集单位。进入项目后，核对采集要求再开始办理。",
  },
  {
    id: "identity",
    title: "身份认证需要准备哪些资料？",
    answer:
      "认证方式由采集项目决定。请按页面要求准备证件、学号、工号或图像采集码，并核对姓名和编号。",
  },
  {
    id: "review",
    title: "照片审核未通过怎么办？",
    answer:
      "打开采集记录，查看审核意见，按要求重新拍摄并提交审核。已有记录会保留，无需重复创建。",
  },
  {
    id: "save",
    title: "采集完成后如何保存照片？",
    answer: "在采集记录中选择已完成的记录，进入详情后点击保存照片。",
  },
];
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
        <section className="collection-service-card">
          <header>
            <h2>采集帮助</h2>
          </header>
          {questions.map((q) => (
            <div className="collection-faq" key={q.id}>
              <button
                aria-expanded={s.helpOpen === q.id}
                aria-controls={"collection-faq-" + q.id}
                onClick={() => {
                  s.helpOpen = s.helpOpen === q.id ? "" : q.id;
                }}
              >
                <span>{q.title}</span>
                <CollectionIcon name="chevron" />
              </button>
              {s.helpOpen === q.id && (
                <p id={"collection-faq-" + q.id}>{q.answer}</p>
              )}
            </div>
          ))}
        </section>
        <section className="collection-contact-card">
          <CollectionIcon name="nav-service" />
          <div>
            <h2>联系知拍客服</h2>
            <p>zpai_service@163.com</p>
          </div>
          <button
            onClick={() => s.openEmailContact()}
            aria-label="联系知拍客服"
          >
            联系
            <CollectionIcon name="chevron" />
          </button>
        </section>
      </div>
    </div>
  );
}
