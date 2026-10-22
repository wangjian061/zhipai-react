import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Controller, View } from "../runtime/components.jsx";
import ToolNavigation from "../components/ToolNavigation.jsx";
import OrderPaymentSheet from "../components/OrderPaymentSheet.jsx";
import OrderThumbnail from "../components/OrderThumbnail.jsx";
import {
  clampOrderTabScroll,
  orderTabScrollTarget,
} from "../components/order-tab-position.js";
import { shortenedOrderNumber } from "../domain/orders.js";
function Icon({ name }) {
  if (name === "chevron-right")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 5 7 7-7 7" />
      </svg>
    );
  if (name === "chevron-down")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
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
function CopyNumber({ value, label }) {
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState(false);
  const attempt = useRef(0);
  const timer = useRef(null);
  useEffect(() => {
    setFeedback("");
    setExpanded(false);
    return () => {
      attempt.current++;
      clearTimeout(timer.current);
    };
  }, [value]);
  const copy = async () => {
    const token = ++attempt.current;
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(String(value));
      if (token !== attempt.current) return;
      setFeedback("copied");
      timer.current = setTimeout(() => setFeedback(""), 2000);
    } catch {
      if (token === attempt.current) setFeedback("failed");
    }
  };
  return (
    <dd className="order-number">
      <span className="order-number-text">
        <span>
          {expanded || feedback === "failed"
            ? value
            : shortenedOrderNumber(value)}
        </span>
        {String(value).length > 20 && (
          <button
            type="button"
            className="order-number-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "收起编号" : "展开完整编号"}
          </button>
        )}
        {feedback === "failed" && (
          <span className="order-copy-error" role="alert">
            请长按{label}复制
          </span>
        )}
      </span>
      <button type="button" onClick={copy} aria-label={`复制${label}`}>
        {feedback === "copied" ? (
          <span className="order-copy-done">已复制</span>
        ) : (
          <Icon name="copy" />
        )}
      </button>
      <span className="order-copy-announcement" role="status">
        {feedback === "copied" ? `${label}已复制` : ""}
      </span>
    </dd>
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
function TypeFilters({ s, positions }) {
  const strip = useRef(null);
  const selected = useRef("");
  const key = `${s.owner}:${s.type}`;
  const target = (host, node) =>
    orderTabScrollTarget(
      node.offsetLeft,
      node.offsetWidth,
      host.clientWidth,
      host.scrollWidth,
    );
  const center = (node, smooth = true) => {
    const host = strip.current;
    if (!host?.clientWidth || !node) return;
    host.scrollTo({
      left: target(host, node),
      behavior:
        smooth &&
        !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "auto",
    });
  };
  useLayoutEffect(() => {
    const host = strip.current;
    if (!host?.clientWidth || s.page !== "orders") return;
    const active = host.querySelector('[aria-selected="true"]');
    if (selected.current !== key && active) {
      const saved = selected.current ? null : positions.current.get(key);
      host.scrollTo({
        left:
          saved == null
            ? target(host, active)
            : clampOrderTabScroll(saved, host.clientWidth, host.scrollWidth),
        behavior: "auto",
      });
    }
    selected.current = key;
    // Keep horizontal browsing context outside this conditionally mounted strip.
    return () => {
      if (host.clientWidth) positions.current.set(key, host.scrollLeft);
    };
  }, [key, s.page, positions]);
  useEffect(() => {
    const host = strip.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    let width = host.clientWidth;
    const observer = new ResizeObserver(() => {
      if (!host.clientWidth || host.clientWidth === width) return;
      width = host.clientWidth;
      const active = host.querySelector('[aria-selected="true"]');
      if (!active) return;
      const visible =
        active.offsetLeft >= host.scrollLeft &&
        active.offsetLeft + active.offsetWidth <= host.scrollLeft + width;
      host.scrollTo({
        left: visible
          ? clampOrderTabScroll(host.scrollLeft, width, host.scrollWidth)
          : target(host, active),
        behavior: "auto",
      });
      positions.current.set(key, host.scrollLeft);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [key, positions]);
  const select = (id, node) => {
    if (id === s.type) return;
    selected.current = `${s.owner}:${id}`;
    center(node);
    s.filter(id, s.status);
  };
  return (
    <div
      className="orders-type-tabs"
      ref={strip}
      role="tablist"
      aria-label="订单类型"
      onScroll={(event) =>
        positions.current.set(key, event.currentTarget.scrollLeft)
      }
    >
      {s.types.map((type, index) => (
        <button
          key={type.id}
          type="button"
          role="tab"
          aria-selected={s.type === type.id}
          aria-controls="orders-list-panel"
          tabIndex={s.type === type.id ? 0 : -1}
          onClick={(event) => select(type.id, event.currentTarget)}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowRight"
                ? (index + 1) % s.types.length
                : event.key === "ArrowLeft"
                  ? (index - 1 + s.types.length) % s.types.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? s.types.length - 1
                      : null;
            if (next == null) return;
            event.preventDefault();
            const node = strip.current.querySelectorAll('[role="tab"]')[next];
            node.focus({ preventScroll: true });
            select(s.types[next].id, node);
          }}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
function StatusFilters({ s }) {
  return (
    <nav
      className="orders-status-tabs"
      role="radiogroup"
      aria-label={s.hub.complete ? "订单状态" : "订单状态（仅已加载）"}
    >
      {s.statuses.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          data-status={t.id}
          className={s.status === t.id ? "active" : ""}
          aria-checked={s.status === t.id}
          tabIndex={s.status === t.id ? 0 : -1}
          onClick={() => {
            if (s.status !== t.id) s.filter(s.type, t.id);
          }}
          onKeyDown={(event) => {
            const index = s.statuses.findIndex((item) => item.id === t.id);
            const next = ["ArrowRight", "ArrowDown"].includes(event.key)
              ? (index + 1) % s.statuses.length
              : ["ArrowLeft", "ArrowUp"].includes(event.key)
                ? (index - 1 + s.statuses.length) % s.statuses.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? s.statuses.length - 1
                    : null;
            if (next == null) return;
            event.preventDefault();
            event.currentTarget.parentElement
              .querySelectorAll('[role="radio"]')
              [next].focus({ preventScroll: true });
            s.filter(s.type, s.statuses[next].id);
          }}
        >
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
function Fields({ rows }) {
  return (
    <dl>
      {rows
        .filter(([, v]) => v != null && v !== "")
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
function Detail({ s, order: o }) {
  const isPrint = o.type === "print";
  const trackingNumber =
    typeof o.tracking === "string" ? o.tracking : o.tracking?.number;
  return (
    <>
      <div className="orders-scroll order-detail-scroll">
        <div className="order-receipt" aria-label="订单凭据">
          <section
            className={`order-transaction-overview is-${o.state}`}
            aria-label="交易概览"
          >
            <div className="order-transaction-heading">
              <span>付款状态</span>
              <strong>{o.payment}</strong>
            </div>
            <div className="order-transaction-amount">
              <span>
                {{ pending: "待付金额", paid: "实付金额" }[o.state] ||
                  "订单金额"}
              </span>
              <strong>{s.money(o.amount)}</strong>
            </div>
            {o.state === "verifying" && (
              <p>付款结果尚未确认，请先查询，勿重复付款。</p>
            )}
          </section>
          <section className="order-receipt-section" aria-label="购买内容">
            <div className="order-product">
              <OrderThumbnail blob={o.thumbnailBlob} title={o.title} />
              <div>
                <h2>{o.title}</h2>
                {!o.details.length && <p>{o.description}</p>}
              </div>
            </div>
            <Fields rows={o.details} />
          </section>
          {!!o.fees?.length && (
            <section
              className="order-receipt-section order-ticket-seam"
              aria-label="费用明细"
            >
              <h2>费用明细</h2>
              <Fields rows={o.fees} />
            </section>
          )}
          {isPrint && (
            <section className="order-receipt-section" aria-label="配送信息">
              <div className="order-section-heading">
                <h2>配送信息</h2>
                {o.delivery && <span>{o.delivery}</span>}
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
                    {trackingNumber ? (
                      <CopyNumber value={trackingNumber} label="物流单号" />
                    ) : (
                      <dd>待更新</dd>
                    )}
                  </div>
                </dl>
              )}
            </section>
          )}
          <section
            className={`order-receipt-section${o.fees?.length ? "" : " order-ticket-seam"}`}
            aria-label="订单信息"
          >
            <h2>订单信息</h2>
            <dl>
              <div>
                <dt>订单编号</dt>
                <CopyNumber value={o.number} label="订单编号" />
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
        </div>
        {!s.online && (
          <p className="orders-notice" role="status">
            网络不可用，请恢复连接后重试。
          </p>
        )}
        {s.notice && (
          <p className="orders-notice" role="status">
            {s.notice}
          </p>
        )}
      </div>
      {o.action && (
        <footer className="orders-footer">
          <div
            className={
              isPrint && o.state === "pending" ? "orders-footer-actions" : ""
            }
          >
            {isPrint && o.state === "pending" && (
              <button
                className="orders-secondary"
                disabled={s.paymentBusy || !s.online}
                onClick={() => s.openSheet("cancel")}
              >
                取消订单
              </button>
            )}
            <button
              className="orders-primary"
              disabled={s.paymentBusy || !s.online}
              onClick={() => s.continue(o)}
            >
              {o.action}
            </button>
          </div>
        </footer>
      )}
    </>
  );
}
function OrderListCard({ s, order: o, onOpen }) {
  // Show only dimensions recorded on this purchase; never infer a preset from pixels.
  const recordedSpec =
    o.details.find(([label]) => label === "照片规格")?.[1] || "";
  const physicalDimensions = recordedSpec.match(
    /\d+(?:\.\d+)?\s*×\s*\d+(?:\.\d+)?\s*mm/,
  )?.[0];
  const fileDimensions = o.details.find(([label]) => label === "文件尺寸")?.[1];
  const dimensions =
    (o.type === "electronic" && fileDimensions !== "未记录"
      ? fileDimensions
      : physicalDimensions) ||
    (fileDimensions !== "未记录" ? fileDimensions : "");
  const secondary =
    dimensions && !o.description.includes(dimensions) ? dimensions : "";
  return (
    <button
      className="order-list-card"
      data-order-key={o.key}
      onClick={(event) => onOpen(o, event.currentTarget)}
    >
      <span className="order-card-heading order-ticket-seam">
        <strong>{o.title}</strong>
        <span className={`order-status-text is-${o.state}`}>{o.payment}</span>
      </span>
      <span className="order-card-body">
        <OrderThumbnail blob={o.thumbnailBlob} title={o.title} />
        <span className="order-card-description">{o.description}</span>
        <strong
          className={`order-card-amount${Number.isFinite(o.amount) ? "" : " is-unconfirmed"}`}
        >
          {s.money(o.amount)}
        </strong>
        {secondary && (
          <span className="order-card-dimensions">{secondary}</span>
        )}
        <time className="order-card-time">{s.orderTime(o.createdAt)}</time>
      </span>
    </button>
  );
}
function OrderList({ s, positions, onOpen }) {
  const scroll = useRef(null);
  const key = `${s.owner}:${s.type}:${s.status}:${s.scrollRevision}`;
  useLayoutEffect(() => {
    if (scroll.current)
      scroll.current.scrollTop = positions.current.get(key) || 0;
  }, [key, positions]);
  return (
    <div
      ref={scroll}
      className="orders-scroll orders-list-scroll"
      id="orders-list-panel"
      role="tabpanel"
      aria-label="订单列表"
      onScroll={(event) =>
        positions.current.set(key, event.currentTarget.scrollTop)
      }
    >
      {s.list.map((o) => (
        <OrderListCard
          key={o.key}
          s={s}
          order={o}
          onOpen={(order, node) => {
            positions.current.set(key, scroll.current.scrollTop);
            onOpen(order, node);
          }}
        />
      ))}
      {!s.list.length && (
        <Empty title={s.emptyTitle}>
          {s.emptyDescription && <p>{s.emptyDescription}</p>}
          {s.hub.count > 0 && (s.type !== "all" || s.status !== "all") && (
            <button
              className="orders-text-action"
              onClick={() => s.filter("all", "all")}
            >
              查看全部订单
            </button>
          )}
          {s.hub.errors.length > 0 && (
            <button
              className="orders-text-action"
              onClick={() => s.hub.retry()}
            >
              重新加载
            </button>
          )}
        </Empty>
      )}
    </div>
  );
}

export function OrdersContent({ s }) {
  const listPositions = useRef(new Map());
  const typePositions = useRef(new Map());
  const surface = useRef(null),
    origin = useRef(null),
    masthead = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(222);
  const listing = !s.selected;
  const previous = useRef({ owner: s.owner, selected: s.selected });
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { owner: s.owner, selected: s.selected };
    if (before.owner !== s.owner) {
      origin.current = null;
      listPositions.current.clear();
      typePositions.current.clear();
      return;
    }
    if (before.selected === s.selected) return;
    const card =
      !s.selected && origin.current
        ? [...surface.current.querySelectorAll("[data-order-key]")].find(
            (node) => node.dataset.orderKey === origin.current,
          )
        : null;
    const heading = surface.current.querySelector(".tool-navigation-title");
    if (heading) heading.tabIndex = -1;
    (card || heading)?.focus({ preventScroll: true });
  }, [s.owner, s.selected]);
  useLayoutEffect(() => {
    const node = masthead.current;
    if (!listing || !node || s.page !== "orders") return;
    const measure = () => {
      // offsetHeight stays in logical phone pixels when desktop preview is scaled.
      if (node.offsetHeight) setHeaderHeight(node.offsetHeight);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [listing, s.owner, s.page]);
  const navigation = (
    <ToolNavigation
      title={listing ? "我的订单" : "订单详情"}
      disabled={s.paymentBusy}
      onBack={() => s.back()}
    />
  );
  const loadError = s.owner && s.hub.errors.length > 0 && (
    <div className="orders-load-error" role="alert">
      {s.hub.unavailable ? "订单暂时无法加载" : "部分订单未能加载"}
      <button onClick={() => s.hub.retry()}>重新加载</button>
    </div>
  );
  return (
    <div
      className={`orders-surface${listing ? " is-list" : ""}`}
      ref={surface}
      style={
        listing ? { "--orders-header-height": `${headerHeight}px` } : undefined
      }
    >
      {listing ? (
        <div className="orders-masthead" ref={masthead}>
          {navigation}
          {loadError}
          {s.owner && !s.online && (
            <p className="orders-notice" role="status">
              网络不可用，请恢复连接后重试。
            </p>
          )}
          {s.owner && (
            <>
              <TypeFilters s={s} positions={typePositions} />
              <StatusFilters s={s} />
            </>
          )}
        </div>
      ) : (
        <>
          {navigation}
          {loadError}
        </>
      )}
      {!s.owner ? (
        <div
          className={listing ? "orders-scroll orders-list-scroll" : undefined}
        >
          <Empty title="登录后查看订单">
            <p>查看订单与付款记录</p>
            <button className="orders-primary" onClick={() => s.login()}>
              登录 / 注册
            </button>
          </Empty>
        </div>
      ) : s.selected ? (
        s.current ? (
          <Detail key={s.current.key} s={s} order={s.current} />
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
            <button className="orders-text-action" onClick={() => s.back()}>
              返回订单列表
            </button>
          </Empty>
        )
      ) : (
        <OrderList
          key={`${s.owner}:${s.type}:${s.status}:${s.scrollRevision}`}
          s={s}
          positions={listPositions}
          onOpen={(order) => {
            origin.current = order.key;
            s.open(order);
          }}
        />
      )}
    </div>
  );
}
export default function OrdersPage() {
  return (
    <Controller name="ordersFlow">
      {(s) => (
        <>
          <View
            as="section"
            scope={s}
            scopeRoot
            show={s.page === "orders"}
            className="page orders-page"
            data-order-view={s.selected ? "detail" : "list"}
            id="orders-page"
            aria-label="订单中心"
          >
            <OrdersContent s={s} />
          </View>
          <OrderPaymentSheet s={s} />
        </>
      )}
    </Controller>
  );
}
