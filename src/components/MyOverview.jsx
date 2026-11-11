import { recentPhotos } from "../domain/photo-actions.js";
import MyPhotoLine from "./MyPhotoLine.jsx";
import React from "react";

function Icon({ name, ...props }) {
  return (
    <svg aria-hidden="true" {...props}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

export default function MyOverview({ scope: s }) {
  if (s.myView !== "overview") return null;
  const account = s.$store.account;
  const groups = [
    {
      title: "帮助与服务",
      items: [
        {
          title: "客服中心",
          icon: "nav-service",
          action: () => s.showPanel("support"),
        },
        {
          title: "意见反馈",
          icon: "feedback",
          action: () => s.showPanel("feedback"),
        },
      ],
    },
    {
      title: "偏好与设置",
      items: [
        {
          title: "切换语言",
          icon: "language",
          detail: "简体中文",
          action: () => s.showPanel("language"),
        },
        {
          title: "账号安全",
          icon: "settings",
          action: () =>
            s.accountRoute(
              account.loggedIn ? "security" : "welcome",
              "/?page=my",
            ),
        },
        {
          title: "隐私协议",
          icon: "document",
          action: () => s.accountRoute("privacy", "/?page=my"),
        },
        { title: "分享知拍", icon: "share", action: () => s.openShare() },
      ],
    },
  ];
  return (
    <div className="my-overview">
      <section
        className="my-personal-hero brand-page-header brand-page-header--info brand-page-sticky"
        data-over-content={s.headerOverContent}
        aria-label="个人账号"
      >
        <button
          className="my-profile-entry"
          onClick={() =>
            s.accountRoute(
              account.loggedIn ? "security" : "welcome",
              "/?page=my",
            )
          }
        >
          <span className="my-profile-avatar">
            <Icon name="user" />
          </span>
          <span className="my-profile-copy">
            <h1 className="brand-page-title">
              {account.loggedIn ? account.masked : "登录 / 注册"}
            </h1>
            <span className="brand-page-caption">
              {account.loggedIn ? "账号安全" : "登录后管理个人服务"}
              <Icon name="chevron" />
            </span>
          </span>
        </button>
        <span className="brand-page-mascot" aria-hidden="true">
          <img
            src="assets/bear-personal-center.png"
            width="1254"
            height="1254"
            alt=""
          />
        </span>
      </section>
      <div className="my-personal-content">
        <>
          <section className="my-recent-photos" aria-label="我的照片">
            <header>
              <h2>我的照片</h2>
              <button type="button" onClick={() => s.go("album")}>
                进入相册
                <Icon name="chevron" />
              </button>
            </header>
            <MyPhotoLine
              photos={recentPhotos(s.$store.photoLibrary)}
              ready={s.$store.photoLibrary.ready}
              paused={s.page !== "my" || s.$store.photoActions?.opened}
              onOpen={(photo) => s.$store.photoActions.show(photo)}
            />
          </section>
          <div className="my-menu-card my-order-entry">
            <button className="my-menu-row" onClick={() => s.openOrders()}>
              <span className="my-menu-icon">
                <Icon name="document" />
              </span>
              <span className="my-menu-label">我的订单</span>
              <Icon name="chevron" className="my-menu-chevron" />
            </button>
          </div>
        </>
        {groups.map((group) => (
          <section className="my-menu-group" key={group.title}>
            <h2>{group.title}</h2>
            <div className="my-menu-card">
              {group.items.map((item) => (
                <button
                  className="my-menu-row"
                  key={item.title}
                  onClick={item.action}
                >
                  <span className="my-menu-icon">
                    <Icon name={item.icon} />
                  </span>
                  <span className="my-menu-label">{item.title}</span>
                  {item.detail && <small>{item.detail}</small>}
                  <Icon name="chevron" className="my-menu-chevron" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
