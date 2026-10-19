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
        { title: "拍摄攻略", icon: "book", action: () => s.showPanel("guide") },
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
      <section className="my-personal-hero" aria-label="个人账号">
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
            <h1>{account.loggedIn ? account.masked : "登录 / 注册"}</h1>
            <span>
              {account.loggedIn ? "账号安全" : "登录后管理个人服务"}
              <Icon name="chevron" />
            </span>
          </span>
        </button>
        <img
          className="my-personal-bear"
          src="assets/bear-personal-center.png"
          width="160"
          height="170"
          alt=""
        />
      </section>
      <div className="my-personal-content">
        <div className="my-quick-links" aria-label="我的照片与订单">
          <button className="my-quick-card" onClick={() => s.go("album")}>
            <span className="my-quick-heading">
              <Icon name="album" />
              <strong>我的相册</strong>
              <Icon name="chevron" />
            </span>
            <span className="my-quick-count">
              <b>{s.$store.photoLibrary.finished.length}</b>
              <span>张照片</span>
            </span>
          </button>
          <button className="my-quick-card" onClick={() => s.openOrders()}>
            <span className="my-quick-heading">
              <Icon name="document" />
              <strong>我的订单</strong>
              <Icon name="chevron" />
            </span>
            <span className="my-quick-count">
              <b>
                {account.loggedIn && s.$store.orderCenter.ready
                  ? s.$store.orderCenter.count
                  : "—"}
              </b>
              <span>
                {account.loggedIn
                  ? s.$store.orderCenter.pendingCount
                    ? `${s.$store.orderCenter.pendingCount}笔待付款`
                    : "笔订单"
                  : "登录后查看"}
              </span>
            </span>
          </button>
        </div>
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
