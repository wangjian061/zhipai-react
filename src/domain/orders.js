import {
  registerStore,
  registerController,
  getStore,
} from "../runtime/state.js";
import { readElectronicOrders } from "./camera.js";
import { transactOrder, cancelPrintOrder } from "./order-payment.js";
import { COLLECTION_PROJECTS } from "./collection.js";
import { accountRoute } from "./account.js";
import { orderNavigate, safeOrderPath } from "./order-routing.js";

export const ORDER_TYPES = [
  { id: "all", label: "全部" },
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
const compactSpec = (value) => value || "";
const toolSpecName = (r) =>
  compactSpec(r.purchaseSnapshot?.specName || r.photo?.spec).split(" · ")[0];
const purchaseDetails = (r, electronic = false) => {
  const p = r.purchaseSnapshot;
  if (!p)
    return electronic && r.specification ? [["文件尺寸", r.specification]] : [];
  return [
    ["照片规格", [p.specName, p.mm].filter(Boolean).join(" · ")],
    ["文件尺寸", p.pixels || r.specification],
    ["背景颜色", p.backgroundName],
  ].filter(([, value]) => value);
};
const printDescription = (r) => {
  const layout = r.layoutSnapshot;
  const name =
    layout?.description ||
    {
      "adhesive-mixed-4-8": "二寸4张＋一寸8张",
      "adhesive-two-8": "二寸8张",
    }[layout?.id || r.layout] ||
    layout?.name ||
    "排版规格未记录";
  return `${name} · ${r.quantity || 1}版`;
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
      title: ["adhesive-mixed-4-8", "adhesive-two-8"].includes(
        r.layoutSnapshot?.id || r.layout,
      )
        ? "背胶模切证件照"
        : "照片冲印",
      thumbnailBlob: thumbnail(r.photo?.blob),
      amount: r.total,
      description: printDescription(r),
      address: r.address,
      tracking: r.tracking,
      delivery:
        { shipped: "已发货", completed: "已签收" }[r.status] ||
        (["producing", "printing"].includes(r.status) ? "待发货" : ""),
      sourceStatus: r.status,
      details: [],
      fees: [
        [
          "冲印费",
          Number.isFinite(r.base)
            ? money(r.base * (r.quantity || 1))
            : "未记录",
        ],
        ...(r.addon ? [["历史附加套餐", money(r.addonPrice * r.addon)]] : []),
        ["配送费", Number.isFinite(r.shipping) ? money(r.shipping) : "未记录"],
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
      description:
        [
          toolSpecName(r),
          ...(r.action === "outfit"
            ? [r.outfit && outfitName(r.outfit).replace(" · ", "")]
            : [
                r.purchaseSnapshot?.backgroundName &&
                  `${r.purchaseSnapshot.backgroundName}背景`,
              ]),
        ]
          .filter(Boolean)
          .join(" · ") || "照片处理",
      details: [
        [
          "照片规格",
          compactSpec(
            r.purchaseSnapshot?.specification ||
              r.photo?.spec ||
              r.purchaseSnapshot?.specName,
          ),
        ],
        ...(r.action === "outfit" && r.outfit
          ? [["所选服装", outfitName(r.outfit)]]
          : []),
        ...(r.action === "repair" && r.purchaseSnapshot?.backgroundName
          ? [["背景颜色", r.purchaseSnapshot.backgroundName]]
          : []),
      ].filter(([, value]) => value),
    });
  for (const r of electronic.filter(own))
    add("electronic", r, {
      ...paymentFields(r.status),
      title: [
        "证件照制作",
        { ordinary: "普通版", retouched: "精修版" }[r.versionId] ||
          { 普通证件照: "普通版", 精修证件照: "精修版" }[r.versionName] ||
          r.versionName,
      ]
        .filter(Boolean)
        .join(" · "),
      thumbnailBlob: thumbnail(r.photo?.blob),
      amount: r.amount,
      description:
        [
          compactSpec(r.purchaseSnapshot?.specName),
          r.purchaseSnapshot?.backgroundName?.replace("色", "底"),
        ]
          .filter(Boolean)
          .join(" · ") || "电子照片",
      details: purchaseDetails(r, true),
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
        description:
          [
            payment.purchaseSnapshot?.organization || p?.organization,
            payment.purchaseSnapshot?.name || r.name,
          ]
            .filter(Boolean)
            .join(" · ") || "采集信息未记录",
        details: [],
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
  if (!value || Number.isNaN(+d)) return "未记录";
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function shortenedOrderNumber(value) {
  const text = String(value || "");
  return text.length > 20 ? `${text.slice(0, 8)}…${text.slice(-8)}` : text;
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
  get complete() {
    return this.ready && !this.errors.length;
  },
  get unavailable() {
    return this.errors.length === 4 && !this.all.length;
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
  sheet: "",
  sheetReturn: "",
  queryMode: false,
  scrollRevision: 0,
  online: typeof navigator === "undefined" || navigator.onLine !== false,
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
    this.onNetwork = () => {
      this.online = navigator.onLine !== false;
    };
    window.addEventListener("online", this.onNetwork);
    window.addEventListener("offline", this.onNetwork);
    this.sync();
  },
  destroy() {
    window.removeEventListener("zhipai-route", this.onRoute);
    window.removeEventListener("popstate", this.onRoute);
    window.removeEventListener("online", this.onNetwork);
    window.removeEventListener("offline", this.onNetwork);
    this.$store.orderUi.opened = false;
  },
  sync() {
    if (this.paymentBusy) {
      if (location.pathname + location.search !== this.paymentReturn)
        orderNavigate(this.paymentReturn, true);
      return;
    }
    if (this.sheet) {
      const restore = this.sheetReturn;
      this.closePayment();
      if (location.pathname + location.search !== restore) {
        orderNavigate(restore, true);
        return;
      }
    }
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
    this.closePayment();
    this.scrollRevision++;
    this.type = ORDER_TYPES.some((t) => t.id === type) ? type : "all";
    this.status = ORDER_STATES.some((t) => t.id === status) ? status : "all";
    orderNavigate(this.url(""), true);
  },
  open(order) {
    orderNavigate(this.url(order.key));
  },
  back() {
    if (this.paymentBusy) return;
    if (this.sheet) {
      this.closePayment();
      return;
    }
    orderNavigate(this.selected ? this.url("") : this.backTo, true);
  },
  login() {
    accountRoute("welcome", this.url());
  },
  continue(order = this.current) {
    if (!order || !order.action || !this.online) return;
    if (this.current?.key !== order.key) return;
    this.paymentError = "";
    this.paymentMethod = order.method || "wechat";
    this.paymentOutcome = "success";
    this.paymentReturn = this.url(order.key);
    this.paymentFocus =
      typeof document === "undefined" ? null : document.activeElement;
    this.queryMode = order.state === "verifying";
    this.openSheet("payment");
  },
  openSheet(kind) {
    if (this.paymentBusy || !["payment", "cancel"].includes(kind)) return;
    this.paymentError = "";
    this.sheetReturn = location.pathname + location.search;
    this.paymentReturn = this.sheetReturn;
    this.paymentFocus =
      typeof document === "undefined" ? null : document.activeElement;
    this.sheet = kind;
    this.paymentOpen = kind === "payment";
    this.$store.orderUi.opened = true;
  },
  async cancel() {
    if (this.sheet !== "cancel" || this.paymentBusy) return;
    this.paymentBusy = true;
    this.paymentError = "";
    try {
      await cancelPrintOrder(this.current);
      this.paymentBusy = false;
      this.closePayment();
      this.notice = "订单已关闭";
    } catch (error) {
      this.paymentError = error.message || "取消未保存，请重试。";
    } finally {
      this.paymentBusy = false;
    }
  },
  closePayment() {
    if (this.paymentBusy) return;
    this.paymentOpen = false;
    this.sheet = "";
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
        query: this.queryMode,
      });
      await this.hub.refresh();
      if (status === "paid") {
        this.paymentBusy = false;
        this.closePayment();
        this.notice = "付款成功";
      } else {
        const wasQuery = this.queryMode;
        this.queryMode = status === "verifying";
        this.paymentError =
          status === "verifying"
            ? wasQuery
              ? "付款结果仍待确认，请稍后再次查询。"
              : "付款结果待确认，请先查询，勿重复付款。"
            : "付款未完成，订单已保留。";
      }
    } catch (error) {
      this.paymentError = error.message || "付款结果未能确认，请稍后查询。";
      await this.hub.refresh();
      this.queryMode = this.current?.state === "verifying";
    } finally {
      this.paymentBusy = false;
    }
  },
}));
