import {
  registerStore,
  registerController,
  getStore,
} from "../runtime/state.js";
import { readElectronicOrders } from "./camera.js";
import { transactOrder } from "./order-payment.js";
import { COLLECTION_PROJECTS } from "./collection.js";
import { accountRoute } from "./account.js";
import { orderNavigate, safeOrderPath } from "./order-routing.js";

export const ORDER_TYPES = [
  { id: "all", label: "全部类型" },
  { id: "electronic", label: "电子照片" },
  { id: "print", label: "照片冲印" },
  { id: "repair", label: "照片精修" },
  { id: "outfit", label: "照片换装" },
  { id: "collection", label: "专项采集" },
];
export const ORDER_STATES = [
  { id: "all", label: "全部" },
  { id: "pending", label: "待付款" },
  { id: "verifying", label: "付款确认中" },
  { id: "paid", label: "已支付" },
  { id: "closed", label: "已关闭" },
];
const paymentState = (status) =>
  ["paid", "producing", "printing", "shipped", "completed"].includes(status)
    ? "paid"
    : status === "cancelled"
      ? "closed"
      : status === "verifying"
        ? "verifying"
        : "pending";
const paymentFields = (status) => {
  const state = paymentState(status);
  return {
    state,
    payment: ORDER_STATES.find((s) => s.id === state).label,
    action:
      state === "pending"
        ? "继续付款"
        : state === "verifying"
          ? "查询付款结果"
          : null,
  };
};
const outfitName = (id) => {
  const [category, style] = (id || "").split("-");
  return (
    [
      { men: "男装", women: "女装", children: "童装" }[category],
      { suit: "西装", shirt: "衬衫", casual: "休闲装" }[style],
    ]
      .filter(Boolean)
      .join(" · ") || "未记录"
  );
};
const thumbnail = (...blobs) =>
  blobs.find((blob) => blob instanceof Blob && blob.size > 0) || null;
export function normalizeOrders({
  owner,
  print = [],
  tools = [],
  electronic = [],
  collection = [],
  projects = COLLECTION_PROJECTS,
}) {
  if (!owner) return [];
  const own = (r) => r.owner === owner && !r.fixture;
  const entries = [];
  const add = (type, r, fields) =>
    entries.push({
      key: type + ":" + r.id,
      type,
      sourceId: r.id,
      number: r.number || r.id,
      createdAt: r.createdAt,
      paidAt: r.paidAt,
      method: r.method,
      ...fields,
    });
  // Read-only purchase identification; no photo viewer or business result links.
  for (const r of print.filter(own))
    add("print", r, {
      ...paymentFields(r.status),
      title: "证件照排版冲印",
      thumbnailBlob: thumbnail(r.photo?.blob),
      amount: r.total,
      description: `${r.layoutSnapshot?.name || "排版照"} · ${r.quantity || 1}版`,
      address: r.address,
      tracking: r.tracking,
      delivery:
        { shipped: "已发货", completed: "已签收" }[r.status] ||
        (["producing", "printing"].includes(r.status) ? "待发货" : ""),
      sourceStatus: r.status,
      details: [
        ["冲印费", money((r.base || 0) * (r.quantity || 1))],
        ...(r.addon ? [["历史附加套餐", money(r.addonPrice * r.addon)]] : []),
        ["配送费", money(r.shipping || 0)],
      ],
    });
  for (const r of tools
    .filter(own)
    .filter((r) => ["repair", "outfit"].includes(r.action)))
    add(r.action, r, {
      ...paymentFields(r.status),
      title: r.action === "repair" ? "照片精修" : "照片换装",
      thumbnailBlob: thumbnail(r.output, r.photo?.blob),
      amount: r.amount,
      description: r.photo?.spec || "证件照服务",
      details:
        r.action === "outfit" ? [["所选服装", outfitName(r.outfit)]] : [],
    });
  for (const r of electronic.filter(own))
    add("electronic", r, {
      ...paymentFields(r.status),
      title: r.versionName ? r.versionName + "解锁" : "电子证件照解锁",
      thumbnailBlob: thumbnail(r.photo?.blob),
      amount: r.amount,
      description: r.specification || "无水印电子照片",
      details: [],
    });
  for (const r of collection
    .filter(own)
    .filter((r) => r.payment && !r.payment.legacyPrototype)) {
    const p = projects.find((p) => p.id === r.projectId),
      payment = r.payment;
    add(
      "collection",
      {
        ...r,
        id: payment.id,
        number: payment.id,
        createdAt: payment.createdAt || r.createdAt,
        paidAt: payment.paidAt,
        method: payment.method,
      },
      {
        ...paymentFields(payment.status),
        title: p?.name || "专项采集",
        thumbnailBlob: thumbnail(r.photo?.blob),
        amount: payment.amount,
        description: p?.organization || "专项采集服务",
        details: [["采集人", r.name]],
      },
    );
  }
  return [...new Map(entries.map((e) => [e.key, e])).values()].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
}
export function money(cents) {
  return Number.isFinite(cents) ? "¥" + (cents / 100).toFixed(2) : "金额待确认";
}
export function orderTime(value) {
  const d = new Date(value);
  return value && !Number.isNaN(+d)
    ? d.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "未记录";
}
registerStore("orderCenter", {
  electronic: [],
  electronicReady: false,
  error: "",
  loading: false,
  refreshAgain: false,
  init() {
    this.refresh();
    this.onUpdate = () => this.refresh();
    window.addEventListener("zhipai-orders-updated", this.onUpdate);
  },
  async refresh() {
    if (this.loading) {
      this.refreshAgain = true;
      return;
    }
    this.loading = true;
    this.error = "";
    try {
      this.electronic = await readElectronicOrders();
      this.electronicReady = true;
    } catch {
      this.error = "电子照片订单读取失败";
    } finally {
      this.loading = false;
      if (this.refreshAgain) {
        this.refreshAgain = false;
        this.refresh();
      }
    }
  },
  get all() {
    return normalizeOrders({
      owner: getStore("account")?.session?.phone,
      print: getStore("printLibrary")?.orders,
      tools: getStore("toolOrders")?.items,
      collection: getStore("collectionRecords")?.items,
      electronic: this.electronic,
    });
  },
  get count() {
    return this.all.length;
  },
  get pendingCount() {
    return this.all.filter((o) => o.state === "pending").length;
  },
  get errors() {
    return [
      this.error,
      getStore("printLibrary")?.error,
      getStore("toolOrders")?.error,
      getStore("collectionRecords")?.error,
    ].filter(Boolean);
  },
  get ready() {
    return (
      this.electronicReady &&
      getStore("printLibrary")?.ready &&
      getStore("toolOrders")?.ready &&
      getStore("collectionRecords")?.ready
    );
  },
  async retry() {
    await Promise.allSettled([
      this.refresh(),
      getStore("printLibrary").load(),
      getStore("toolOrders").load(),
      getStore("collectionRecords").load(),
    ]);
  },
});
registerStore("orderUi", { opened: false });
registerController("ordersFlow", () => ({
  onRoute: null,
  paymentOpen: false,
  paymentBusy: false,
  paymentError: "",
  paymentMethod: "wechat",
  paymentOutcome: "success",
  paymentReturn: "",
  paymentFocus: null,
  type: "all",
  status: "all",
  selected: "",
  backTo: "/?page=my",
  notice: "",
  get hub() {
    return this.$store.orderCenter;
  },
  get owner() {
    return this.$store.account.session?.phone;
  },
  get types() {
    return ORDER_TYPES;
  },
  get statuses() {
    return ORDER_STATES;
  },
  get typed() {
    return this.hub.all.filter(
      (o) => this.type === "all" || o.type === this.type,
    );
  },
  count(status) {
    return this.typed.filter((o) => status === "all" || o.state === status)
      .length;
  },
  get list() {
    return this.typed.filter(
      (o) => this.status === "all" || o.state === this.status,
    );
  },
  get emptyTitle() {
    if (!this.hub.ready && !this.hub.errors.length) return "正在读取订单";
    if (this.hub.errors.length) return "订单暂时无法加载";
    if (this.status !== "all") return `暂无${this.stateName(this.status)}订单`;
    if (this.type !== "all") return `暂无${this.typeName(this.type)}订单`;
    return "暂无订单";
  },
  get emptyDescription() {
    if (this.hub.errors.length) return "请重试加载后查看完整订单";
    if (!this.hub.ready) return "";
    if (!this.hub.count) return "购买的服务将在这里展示";
    return "可切换订单状态或类型查看";
  },
  get current() {
    return this.hub.all.find((o) => o.key === this.selected) || null;
  },
  typeName(type) {
    return ORDER_TYPES.find((t) => t.id === type)?.label || "订单";
  },
  stateName(state) {
    return ORDER_STATES.find((t) => t.id === state)?.label || "待付款";
  },
  money,
  orderTime,
  init() {
    this.onRoute = () => this.sync();
    window.addEventListener("zhipai-route", this.onRoute);
    window.addEventListener("popstate", this.onRoute);
    this.sync();
  },
  destroy() {
    window.removeEventListener("zhipai-route", this.onRoute);
    window.removeEventListener("popstate", this.onRoute);
    this.$store.orderUi.opened = false;
  },
  sync() {
    if (this.paymentBusy) {
      if (location.pathname + location.search !== this.paymentReturn)
        orderNavigate(this.paymentReturn, true);
      return;
    }
    if (this.paymentOpen) this.closePayment();
    const q = new URLSearchParams(location.search);
    if (q.get("page") !== "orders") return;
    this.type = ORDER_TYPES.some((t) => t.id === q.get("type"))
      ? q.get("type")
      : "all";
    this.status = ORDER_STATES.some((t) => t.id === q.get("status"))
      ? q.get("status")
      : "all";
    this.selected = q.get("id") || "";
    this.backTo = safeOrderPath(q.get("back"), "/?page=my");
    if (
      new URL(this.backTo, location.origin).searchParams.get("page") ===
      "orders"
    )
      this.backTo = "/?page=my";
    this.notice = "";
    this.hub.refresh();
  },
  url(id = this.selected) {
    const q = new URLSearchParams({
      page: "orders",
      type: this.type,
      status: this.status,
      back: this.backTo,
    });
    if (id) q.set("id", id);
    return "/?" + q;
  },
  filter(type, status) {
    this.type = type;
    this.status = status;
    orderNavigate(this.url(""), true);
  },
  open(order) {
    orderNavigate(this.url(order.key));
  },
  back() {
    if (this.paymentBusy) return;
    orderNavigate(this.selected ? this.url("") : this.backTo);
  },
  login() {
    accountRoute("welcome", this.url());
  },
  continue(order = this.current) {
    if (!order || order.type === "print" || !order.action) return;
    if (this.current?.key !== order.key) return;
    this.paymentError = "";
    this.paymentMethod = order.method || "wechat";
    this.paymentOutcome = "success";
    this.paymentReturn = this.url(order.key);
    this.paymentFocus =
      typeof document === "undefined" ? null : document.activeElement;
    this.paymentOpen = true;
    this.$store.orderUi.opened = true;
  },
  closePayment() {
    if (this.paymentBusy) return;
    this.paymentOpen = false;
    this.$store.orderUi.opened = false;
    const focus = this.paymentFocus;
    this.paymentFocus = null;
    setTimeout(() => focus?.isConnected && focus.focus(), 0);
  },
  async pay() {
    const order = this.current;
    if (!this.paymentOpen || this.paymentBusy || !order?.action) return;
    this.paymentBusy = true;
    this.paymentError = "";
    this.notice = "";
    try {
      const status = await transactOrder(order, {
        method: this.paymentMethod,
        outcome: this.paymentOutcome,
        query: order.state === "verifying",
      });
      await this.hub.refresh();
      if (status === "paid") {
        this.paymentBusy = false;
        this.closePayment();
        this.notice = "付款成功";
      } else
        this.paymentError =
          status === "verifying"
            ? "付款结果待确认，请查询付款结果，勿重复付款。"
            : "付款未完成，可重新发起付款。";
    } catch (error) {
      this.paymentError = error.message || "付款结果未能确认，请稍后查询。";
      await this.hub.refresh();
    } finally {
      this.paymentBusy = false;
    }
  },
}));
