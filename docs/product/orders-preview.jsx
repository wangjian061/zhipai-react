// A separate documentation document. No account, storage or payment adapter is read/called.
import React, { useEffect, useReducer, useRef } from "react";
import { createRoot } from "react-dom/client";
import { OrdersContent } from "../../src/pages/OrdersPage.jsx";
import OrderReceiptDialog from "../../src/components/OrderReceiptDialog.jsx";
import {
  ORDER_TYPES,
  ORDER_STATES,
  money,
  orderTime,
} from "../../src/domain/orders.js";
import { PRINT_FULFILLMENT_STEPS } from "../../src/domain/order-status.js";
import "../../src/styles/orders.css";
import "../../src/styles/ui-sheets.css";
import "./orders-preview.css";

const makeRows = () =>
  [
    {
      key: "print:demo-delivered",
      type: "print",
      sourceId: "demo-delivered",
      number: "DEMO202610210001",
      title: "背胶模切证件照",
      description: "二寸4张＋一寸8张 · 1版",
      amount: 2980,
      state: "paid",
      fulfillment: PRINT_FULFILLMENT_STEPS[2],
      fulfillmentSteps: PRINT_FULFILLMENT_STEPS,
      details: [],
      fees: [
        ["冲印费", "¥19.80"],
        ["配送费", "¥10.00"],
      ],
      address: {
        name: "演示收件人",
        phone: "138****8000",
        region: "演示地区",
        street: "示例收货地址，不用于配送",
      },
    },
    {
      key: "repair:demo-failed",
      type: "repair",
      number: "DEMO202610210002",
      title: "照片精修",
      description: "二寸",
      amount: 200,
      state: "failed",
      details: [["照片规格", "二寸"]],
    },
    {
      key: "electronic:demo-paid",
      type: "electronic",
      number: "DEMO-electronic-very-long-order-number-202610210003",
      title: "证件照制作 · 精修版",
      description: "二寸 · 蓝底",
      amount: 980,
      state: "paid",
      paidAt: 1792573200000,
      method: "wechat",
      details: [
        ["照片规格", "二寸 · 35 × 49 mm"],
        ["文件尺寸", "413 × 579 px"],
        ["背景颜色", "蓝色"],
      ],
    },
    {
      key: "outfit:demo-refunding",
      type: "outfit",
      number: "DEMO202610210004",
      title: "照片换装",
      description: "二寸 · 男装衬衫",
      amount: 200,
      state: "refunding",
      refund: { status: "refunding", amount: 200, requestedAt: 1792638000000 },
      details: [
        ["照片规格", "二寸"],
        ["所选服装", "男装衬衫"],
      ],
    },
    {
      key: "repair:demo-refunded",
      type: "repair",
      number: "DEMO202610220005",
      title: "照片精修",
      description: "二寸 · 白底",
      amount: 200,
      state: "refunded",
      details: [
        ["照片规格", "二寸"],
        ["背景颜色", "白色"],
      ],
      refund: {
        status: "refunded",
        amount: 200,
        refundedAt: 1792639000000,
        method: "original",
      },
    },
    {
      key: "electronic:demo-missing",
      type: "electronic",
      number: "DEMO202610210005",
      title: "证件照制作",
      description: "电子照片",
      amount: 980,
      state: "paid",
      missing: true,
      details: [["文件尺寸", "413 × 579 px"]],
    },
    {
      key: "collection:demo-long",
      type: "collection",
      number: "DEMO202610210006",
      title: "2026级新生入学照片采集 · 长项目名称排版演示",
      description: "示例学院 · 演示参与者",
      amount: 1200,
      state: "paid",
      details: [],
    },
  ].map((row, i) => ({ ...row, createdAt: 1792573200000 - i * 60000 }));
function Preview() {
  const [, redraw] = useReducer((n) => n + 1, 0);
  const ref = useRef(null);
  if (!ref.current) {
    const data = {
      page: "orders",
      owner: "isolated-preview",
      types: ORDER_TYPES,
      statuses: ORDER_STATES,
      type: "all",
      status: "all",
      selected: "",
      scrollRevision: 0,
      sheet: "",
      paymentOpen: false,
      paymentBusy: false,
      paymentError: "",
      paymentOutcome: "success",
      paymentMethod: "wechat",
      queryMode: false,
      online: true,
      notice: "",
      rows: makeRows(),
      photo: null,
      failures: [],
      loading: false,
      get all() {
        return this.rows.map((row) => ({
          ...row,
          thumbnailBlob: row.missing ? null : this.photo,
          payment: this.stateName(row.state),
        }));
      },
      get typed() {
        return this.all.filter(
          (o) => this.type === "all" || o.type === this.type,
        );
      },
      get list() {
        return this.typed.filter(
          (o) => this.status === "all" || o.state === this.status,
        );
      },
      get canConfirmReceipt() {
        return (
          this.current?.state === "paid" &&
          this.current?.fulfillment?.id === "delivered"
        );
      },
      get current() {
        return this.all.find((o) => o.key === this.selected) || null;
      },
      get emptyTitle() {
        return this.failures.length
          ? "订单暂时无法加载"
          : this.status !== "all"
            ? `暂无${this.stateName(this.status)}订单`
            : "暂无订单";
      },
      get emptyDescription() {
        return this.failures.length
          ? "请重试加载后查看完整订单"
          : this.rows.length
            ? "可切换订单状态或类型查看"
            : "购买的服务将在这里展示";
      },
      get hub() {
        const self = this;
        return {
          all: self.all,
          count: self.all.length,
          errors: self.failures,
          ready: !self.loading,
          complete: !self.loading && !self.failures.length,
          unavailable: self.failures.length === 4 && !self.rows.length,
          retry: () => self.reset(),
        };
      },
      money,
      orderTime,
      count(state) {
        return this.typed.filter((o) => state === "all" || o.state === state)
          .length;
      },
      typeName(id) {
        return ORDER_TYPES.find((t) => t.id === id)?.label;
      },
      stateName(id) {
        return ORDER_STATES.find((t) => t.id === id)?.label;
      },
      filter(type, status) {
        this.closePayment();
        this.type = type;
        this.status = status;
        this.selected = "";
        this.scrollRevision++;
      },
      open(o) {
        this.selected = o.key;
        this.notice = "";
      },
      back() {
        if (this.paymentBusy) return;
        if (this.sheet) this.closePayment();
        else {
          this.selected = "";
          this.notice = "";
        }
      },
      openSheet(kind) {
        if (
          this.paymentBusy ||
          kind !== "receipt" ||
          !this.canConfirmReceipt ||
          !this.online
        )
          return;
        this.paymentFocus = document.activeElement;
        this.sheet = kind;
        this.paymentOpen = kind === "payment";
        this.paymentError = "";
      },
      closePayment() {
        if (this.paymentBusy) return;
        this.sheet = "";
        this.paymentOpen = false;
        const focus = this.paymentFocus;
        setTimeout(() => focus?.isConnected && focus.focus(), 0);
      },
      async confirmReceipt() {
        if (
          this.paymentBusy ||
          this.sheet !== "receipt" ||
          !this.canConfirmReceipt ||
          !this.online
        )
          return;
        this.paymentBusy = true;
        await new Promise((resolve) => setTimeout(resolve, 400));
        this.rows.find((r) => r.key === this.selected).fulfillment =
          PRINT_FULFILLMENT_STEPS[3];
        this.paymentBusy = false;
        this.closePayment();
        this.notice = "已确认收货";
        redraw();
      },
      reset() {
        this.closePayment();
        this.rows = makeRows();
        this.type = "all";
        this.status = "all";
        this.selected = "";
        this.failures = [];
        this.online = true;
        this.notice = "";
        this.scrollRevision++;
      },
      scenario(name) {
        if (this.paymentBusy) return;
        this.reset();
        if (name === "empty") this.rows = [];
        if (name === "partial") this.failures = ["demo"];
        if (name === "failure") {
          this.rows = [];
          this.failures = ["a", "b", "c", "d"];
        }
        if (name === "offline") this.online = false;
        const keys = {
          delivered: "print:demo-delivered",
          failed: "repair:demo-failed",
          paid: "electronic:demo-paid",
          refunding: "outfit:demo-refunding",
          refunded: "repair:demo-refunded",
          missing: "electronic:demo-missing",
          long: "collection:demo-long",
        };
        if (keys[name]) this.selected = keys[name];
        const progress = PRINT_FULFILLMENT_STEPS.find(
          (item) => item.id === name,
        );
        if (progress) {
          this.rows[0].fulfillment = progress;
          this.selected = this.rows[0].key;
        }
      },
    };
    ref.current = new Proxy(data, {
      set(target, key, value) {
        target[key] = value;
        redraw();
        return true;
      },
    });
  }
  const s = ref.current;
  useEffect(() => {
    const c = new AbortController();
    fetch("/assets/print-portrait.png", { signal: c.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!c.signal.aborted) s.photo = blob;
      })
      .catch(() => {});
    return () => c.abort();
  }, [s]);
  return (
    <main className="preview-layout">
      <aside>
        <h1>订单交互验收</h1>
        <p>
          复用当前订单组件及样式。全部是隔离的内存样例，不读取或改动你的订单；退款与物流均为演示，刷新复原。
        </p>
        <a href="./orders-1.4.6.md">产品执行规范</a>
        <h2>选择场景</h2>
        <div className="preview-options">
          {[
            ["all", "列表"],
            ...PRINT_FULFILLMENT_STEPS.map((item) => [item.id, item.label]),
            ["failed", "支付失败"],
            ["paid", "支付成功 · 长编号"],
            ["refunding", "退款中"],
            ["refunded", "已退款"],
            ["missing", "缺照片与历史参数"],
            ["long", "长项目名"],
            ["empty", "无购买记录"],
            ["partial", "部分加载失败"],
            ["failure", "全部加载失败"],
            ["offline", "离线"],
          ].map(([id, label]) => (
            <button
              disabled={s.paymentBusy}
              key={id}
              onClick={() => s.scenario(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p>
          可操作类型与状态单选、票据详情、编号展开、四段冲印进度、确认收货及返回；不提供申请退款入口。
        </p>
        <p>
          列表滚动、抽屉与底栏使用实际组件；本样例不验证持久化和真实支付接口。三端验收还需覆盖原生安全区、系统返回和动态字体。
        </p>
      </aside>
      <div className="preview-device device-fit">
        <svg width="0" height="0" aria-hidden="true">
          <defs>
            <symbol id="i-chevron-left" viewBox="0 0 24 24">
              <path d="m15 5-7 7 7 7" />
            </symbol>
            <symbol id="i-document" viewBox="0 0 24 24">
              <path d="M6 3h9l4 4v14H6zM9 11h7M9 15h7" />
            </symbol>
          </defs>
        </svg>
        <div className="preview-status" aria-hidden="true">
          <b>9:41</b>
          <i />
          <svg viewBox="0 0 54 20">
            <path
              d="M1 14v-3m4 3V8m4 6V5m4 9V2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="27"
              y="4"
              width="22"
              height="11"
              rx="3"
              fill="none"
              stroke="currentColor"
            />
            <path d="M51 7v5" stroke="currentColor" />
            <rect x="30" y="7" width="16" height="5" rx="1" />
          </svg>
        </div>
        <section
          className="orders-page"
          data-order-view={s.selected ? "detail" : "list"}
          inert={!!s.sheet}
        >
          <OrdersContent s={s} />
        </section>
        <div id="orders-modal-layer" />
        <OrderReceiptDialog s={s} />
        <div className="preview-home-indicator" aria-hidden="true" />
      </div>
    </main>
  );
}
createRoot(document.getElementById("preview-root")).render(<Preview />);
