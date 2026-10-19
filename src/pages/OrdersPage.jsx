import React, { useEffect, useState } from "react";
import { Controller, View } from "../runtime/components.jsx";
import { downloadAlbumBlob } from "../domain/album.js";

const icons = {
  electronic: "camera",
  print: "print",
  repair: "repair",
  outfit: "shirt",
  collection: "document",
};
function Icon({ name }) {
  if (name === "copy")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 5V3H4v13h2" />
      </svg>
    );
  return (
    <svg aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
function Photo({ blob, type }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!(blob instanceof Blob)) {
      setUrl("");
      return;
    }
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return (
    <span className="order-thumbnail">
      {url ? (
        <img src={url} alt="订单照片" />
      ) : (
        <Icon name={icons[type] || "document"} />
      )}
    </span>
  );
}
function Empty({ title, children }) {
  return (
    <div className="orders-empty">
      <Icon name="document" />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function Detail({ s, order: o }) {
  return (
    <>
      <div className="orders-scroll order-detail-scroll">
        <section className={`order-status-panel is-${o.tone || o.state}`}>
          <span>{s.typeName(o.type)}</span>
          <h2>{o.progress}</h2>
          <p>
            {o.payment}
            {o.payment === "已支付" && o.state === "processing"
              ? " · 服务进行中"
              : ""}
          </p>
        </section>
        <section className="order-detail-card">
          <div className="order-product">
            <Photo blob={o.photo} type={o.type} />
            <div>
              <h2>{o.title}</h2>
              <p>{o.description}</p>
            </div>
          </div>
          <dl>
            {o.details
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            <div className="order-amount">
              <dt>{o.payment === "已支付" ? "实付金额" : "订单金额"}</dt>
              <dd>{s.money(o.amount)}</dd>
            </div>
          </dl>
        </section>
        {o.address && (
          <section className="order-detail-card">
            <h2>配送信息</h2>
            <p>
              {o.address.name}　{o.address.phone}
            </p>
            <p>
              {[o.address.region, o.address.street].filter(Boolean).join(" ")}
            </p>
            {o.tracking && (
              <p>
                物流单号：
                {typeof o.tracking === "string"
                  ? o.tracking
                  : o.tracking.number || "待更新"}
              </p>
            )}
          </section>
        )}
        <section className="order-detail-card">
          <h2>订单信息</h2>
          <dl>
            <div>
              <dt>订单编号</dt>
              <dd className="order-number">
                <span>{o.number}</span>
                <button onClick={() => s.copy()} aria-label="复制订单编号">
                  <Icon name="copy" />
                </button>
              </dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{s.orderTime(o.createdAt)}</dd>
            </div>
            {o.paidAt && (
              <div>
                <dt>支付时间</dt>
                <dd>{s.orderTime(o.paidAt)}</dd>
              </div>
            )}
            {o.method && (
              <div>
                <dt>支付方式</dt>
                <dd>
                  {{ wechat: "微信支付", alipay: "支付宝" }[o.method] ||
                    "在线支付"}
                </dd>
              </div>
            )}
          </dl>
        </section>
        {s.notice && (
          <p className="orders-notice" role="status">
            {s.notice}
          </p>
        )}
      </div>
      {o.state !== "closed" && (
        <footer className="orders-footer">
          <button
            className="orders-primary"
            onClick={() =>
              o.type === "electronic" && !o.sessionAvailable && o.photo
                ? downloadAlbumBlob(
                    o.photo,
                    o.photo.type === "image/png"
                      ? "知拍电子照片.png"
                      : "知拍电子照片.jpg",
                  )
                : s.continue(o)
            }
          >
            {o.type === "electronic" && !o.sessionAvailable && o.photo
              ? "下载照片"
              : o.action}
          </button>
        </footer>
      )}
    </>
  );
}
export function OrdersContent({ s }) {
  return (
    <>
      <header className="orders-header">
        <button
          className="orders-circle"
          onClick={() => s.back()}
          aria-label="返回"
        >
          <Icon name="chevron-left" />
        </button>
        <h1>{s.selected ? "订单详情" : "我的订单"}</h1>
        {!s.selected && s.owner ? (
          <button
            className="orders-circle"
            onClick={() => {
              s.searchOpen = !s.searchOpen;
            }}
            aria-label="搜索订单"
            aria-expanded={s.searchOpen}
          >
            <Icon name="search" />
          </button>
        ) : (
          <span />
        )}
      </header>
      {!s.owner ? (
        <Empty title="登录后查看订单">
          <p>查看购买记录与服务进度</p>
          <button className="orders-primary" onClick={() => s.login()}>
            登录 / 注册
          </button>
        </Empty>
      ) : (
        <>
          {s.hub.errors.length > 0 && (
            <div className="orders-load-error" role="alert">
              部分订单未能加载
              <button onClick={() => s.hub.retry()}>重新加载</button>
            </div>
          )}
          {s.selected ? (
            s.current ? (
              <Detail s={s} order={s.current} />
            ) : (
              <Empty
                title={
                  s.hub.ready
                    ? "未找到该订单"
                    : s.hub.errors.length
                      ? "订单暂时无法加载"
                      : "正在读取订单"
                }
              >
                <p>{s.hub.ready ? "请返回订单列表查看" : ""}</p>
              </Empty>
            )
          ) : (
            <>
              {s.searchOpen && (
                <form
                  className="orders-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    s.search();
                  }}
                >
                  <Icon name="search" />
                  <input
                    aria-label="搜索订单"
                    placeholder="搜索订单号、服务或项目"
                    value={s.query}
                    onChange={(e) => {
                      s.query = e.target.value;
                    }}
                  />
                  <button type="submit">搜索</button>
                </form>
              )}
              <nav className="orders-status-tabs" aria-label="订单状态">
                {s.statuses.map((t) => (
                  <button
                    key={t.id}
                    className={s.status === t.id ? "active" : ""}
                    aria-pressed={s.status === t.id}
                    onClick={() => s.filter(s.type, t.id)}
                  >
                    <b>{s.hub.ready ? s.count(t.id) : "—"}</b>
                    <span>{t.label}</span>
                  </button>
                ))}
              </nav>
              <nav className="orders-type-tabs" aria-label="订单类型">
                {s.types.map((t) => (
                  <button
                    key={t.id}
                    className={s.type === t.id ? "active" : ""}
                    aria-pressed={s.type === t.id}
                    onClick={() => s.filter(t.id, s.status)}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="orders-scroll" aria-label="订单列表">
                {s.list.map((o) => (
                  <button
                    className="order-list-card"
                    key={o.key}
                    onClick={() => s.open(o)}
                  >
                    <span className="order-card-heading">
                      <span>{s.typeName(o.type)}</span>
                      <span
                        className={`order-status-text is-${o.tone || o.state}`}
                      >
                        {o.progress}
                      </span>
                    </span>
                    <span className="order-product">
                      <Photo blob={o.photo} type={o.type} />
                      <span>
                        <strong>{o.title}</strong>
                        <span className="order-description">
                          {o.description}
                        </span>
                      </span>
                    </span>
                    <span className="order-card-meta">
                      <time>{s.orderTime(o.createdAt)}</time>
                      <strong>{s.money(o.amount)}</strong>
                    </span>
                  </button>
                ))}
                {!s.list.length && (
                  <Empty
                    title={
                      !s.hub.ready && !s.hub.errors.length
                        ? "正在读取订单"
                        : s.query
                          ? "未找到匹配订单"
                          : "暂无相关订单"
                    }
                  >
                    <p>
                      {s.hub.errors.length
                        ? "请重试加载后查看完整订单"
                        : s.hub.ready
                          ? "购买的服务将在这里展示"
                          : ""}
                    </p>
                  </Empty>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
export default function OrdersPage() {
  return (
    <Controller name="ordersFlow">
      {(s) => (
        <View
          as="section"
          scope={s}
          scopeRoot
          show={s.page === "orders"}
          className="page orders-page"
          id="orders-page"
          aria-label="订单中心"
        >
          <OrdersContent s={s} />
        </View>
      )}
    </Controller>
  );
}
