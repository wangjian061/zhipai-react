import React, { useEffect, useRef, useState } from "react";
import { Controller, View } from "../runtime/components.jsx";
import ToolNavigation from "../components/ToolNavigation.jsx";
import { downloadAlbumBlob } from "../domain/album.js";

const icons = {
  electronic: "camera",
  print: "print",
  repair: "repair",
  outfit: "shirt",
  collection: "document",
};
function Icon({ name }) {
  if (name === "chevron-right")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 5 7 7-7 7" />
      </svg>
    );
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
function TypeFilters({ s }) {
  const track = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = () => {
    const node = track.current;
    if (node)
      setEdges({
        left: node.scrollLeft > 2,
        right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
      });
  };
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const revealSelected = () => {
      const selected = node.querySelector('[aria-pressed="true"]');
      if (selected) {
        const left = selected.offsetLeft;
        if (left < node.scrollLeft) node.scrollLeft = left;
        else if (
          left + selected.offsetWidth >
          node.scrollLeft + node.clientWidth
        )
          node.scrollLeft = left + selected.offsetWidth - node.clientWidth;
      }
      measure();
    };
    revealSelected();
    const observer = new ResizeObserver(revealSelected);
    observer.observe(node);
    return () => observer.disconnect();
  }, [s.type, s.page]);
  return (
    <div className="orders-type-filter">
      <nav
        ref={track}
        className="orders-type-tabs"
        aria-label="订单类型"
        onScroll={measure}
      >
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
      <button
        className="orders-filter-scroll"
        style={{ visibility: edges.left || edges.right ? "visible" : "hidden" }}
        disabled={!edges.left && !edges.right}
        aria-label={edges.right ? "向右查看其他订单类型" : "向左查看订单类型"}
        onClick={() =>
          track.current?.scrollBy({
            left: (edges.right ? 1 : -1) * track.current.clientWidth * 0.75,
            behavior: "auto",
          })
        }
      >
        <Icon name={edges.right ? "chevron-right" : "chevron-left"} />
      </button>
    </div>
  );
}

function Detail({ s, order: o, print: p }) {
  const isPrint = o.type === "print";
  const printReady = isPrint && p?.order?.id === o.sourceId;
  const printDisabled = !printReady || p.disabled;
  const status = o.state === "closed" ? "已关闭" : o.payment;
  const copyTracking = async () => {
    try {
      const number =
        typeof o.tracking === "string" ? o.tracking : o.tracking.number;
      await navigator.clipboard.writeText(number);
      s.notice = "物流单号已复制";
    } catch {
      s.notice = "请长按物流单号复制";
    }
  };
  return (
    <>
      <div className="orders-scroll order-detail-scroll">
        <section
          className={`order-status-panel is-${o.state}`}
          aria-label="交易概览"
        >
          <div className="order-transaction-heading">
            <h2>{status}</h2>
            <div className="order-transaction-amount">
              <span>{o.payment === "已支付" ? "实付金额" : "订单金额"}</span>
              <strong>{s.money(o.amount)}</strong>
            </div>
          </div>
          {o.progress !== status && (
            <p>
              {isPrint ? "冲印进度" : "服务进度"} · {o.progress}
            </p>
          )}
        </section>
        <section className="order-detail-card">
          <div className="order-product">
            <Photo blob={o.photo} type={o.type} />
            <div>
              <h2>{o.title}</h2>
              <p>{o.description}</p>
            </div>
          </div>
          {isPrint && (
            <button
              className="order-layout-link"
              disabled={!printReady}
              onClick={() => p.showModal("layout")}
            >
              <span>查看排版照片</span>
              <Icon name="chevron-right" />
            </button>
          )}
          <dl>
            {o.details
              .filter(
                ([k, v]) =>
                  v != null &&
                  v !== "" &&
                  (!isPrint || !["版式", "冲印数量"].includes(k)),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </section>
        {isPrint && (
          <section className="order-detail-card">
            <div className="order-section-heading">
              <h2>配送信息</h2>
              <span>
                {["pending", "verifying", "cancelled"].includes(o.sourceStatus)
                  ? ""
                  : o.progress}
              </span>
            </div>
            {o.address ? (
              <>
                <p className="order-recipient">
                  <span>{o.address.name}</span>
                  <span>{o.address.phone}</span>
                </p>
                <p>
                  {[o.address.region, o.address.street]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </>
            ) : (
              <p>未记录收货地址</p>
            )}
            {o.tracking && (
              <dl className="order-tracking">
                {o.tracking.carrier && (
                  <div>
                    <dt>承运方</dt>
                    <dd>{o.tracking.carrier}</dd>
                  </div>
                )}
                <div>
                  <dt>物流单号</dt>
                  <dd className="order-number">
                    <span>
                      {typeof o.tracking === "string"
                        ? o.tracking
                        : o.tracking.number || "待更新"}
                    </span>
                    <button onClick={copyTracking} aria-label="复制物流单号">
                      <Icon name="copy" />
                    </button>
                  </dd>
                </div>
              </dl>
            )}
            {o.events.length > 0 && (
              <details className="order-records">
                <summary>订单记录</summary>
                <ol>
                  {[...o.events].reverse().map((event, i) => (
                    <li key={i}>
                      <span>{event.title}</span>
                      <time>{s.orderTime(event.time)}</time>
                    </li>
                  ))}
                </ol>
              </details>
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
        {printReady &&
          ["producing", "printing", "shipped"].includes(o.sourceStatus) && (
            <details className="order-demo-controls">
              <summary>原型演示</summary>
              <button
                className="orders-secondary"
                disabled={printDisabled}
                onClick={() => p.showModal("advance")}
              >
                更新制作与配送状态
              </button>
            </details>
          )}
        {printReady && !p.online && (
          <p className="orders-notice" role="status">
            网络不可用，请恢复连接后再提交或查询付款。
          </p>
        )}
        {(s.notice || (printReady && !p.modal && p.message)) && (
          <p className="orders-notice" role="status">
            {s.notice || p.message}
          </p>
        )}
        {printReady && !p.modal && p.error && (
          <p className="orders-error" role="alert">
            {p.error}
          </p>
        )}
      </div>
      {isPrint
        ? ["pending", "verifying"].includes(o.sourceStatus) && (
            <footer className="orders-footer">
              {o.sourceStatus === "pending" ? (
                <div className="orders-footer-actions">
                  <button
                    className="orders-secondary"
                    disabled={printDisabled}
                    onClick={() => p.showModal("cancel")}
                  >
                    取消订单
                  </button>
                  <button
                    className="orders-primary"
                    disabled={printDisabled || !p.online}
                    onClick={() => p.continuePayment()}
                  >
                    继续付款
                  </button>
                </div>
              ) : (
                <button
                  className="orders-primary"
                  disabled={printDisabled || !p.online}
                  onClick={() => p.showModal("resolution")}
                >
                  查询付款结果
                </button>
              )}
            </footer>
          )
        : o.state !== "closed" && (
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
export function OrdersContent({ s, print }) {
  return (
    <>
      <ToolNavigation
        title={s.selected ? "订单详情" : "我的订单"}
        disabled={!!print?.processing}
        onBack={() => s.back()}
        right={
          !s.selected && s.owner ? (
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
          ) : null
        }
      />
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
              <Detail s={s} order={s.current} print={print} />
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
                    <span>{t.label}</span>
                    <b>{s.hub.ready ? s.count(t.id) : "—"}</b>
                  </button>
                ))}
              </nav>
              <TypeFilters s={s} />
              <div className="orders-scroll" aria-label="订单列表">
                {s.list.map((o) => (
                  <button
                    className="order-list-card"
                    key={o.key}
                    onClick={() => s.open(o)}
                  >
                    <span className="order-card-heading">
                      <span>{s.typeName(o.type)}</span>
                      <span className={`order-status-text is-${o.state}`}>
                        {o.state === "closed" ? "已关闭" : o.payment}
                      </span>
                    </span>
                    <span className="order-product">
                      <Photo blob={o.photo} type={o.type} />
                      <span>
                        <strong>{o.title}</strong>
                        <span className="order-description">
                          {o.description}
                        </span>
                        {o.progress !== o.payment && o.state !== "closed" && (
                          <span className="order-list-progress">
                            {o.progress}
                          </span>
                        )}
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
export default function OrdersPage({ print }) {
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
          <OrdersContent s={s} print={print} />
        </View>
      )}
    </Controller>
  );
}
