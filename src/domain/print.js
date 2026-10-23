import {
  openOrderCenter,
  printOrderPath,
  orderNavigate,
  requireOrderAccount,
  returnToOrderCenter,
} from "./order-routing.js";
import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";
import {
  decodePhotoBlob,
  actualPhotoURL,
  photoCropBounds,
  renderPhotoBlob,
} from "./album.js";
import { openZhipaiShare } from "./my.js";
import {
  paymentResult,
  printFulfillment,
  transactionState,
} from "./order-status.js";
const receiptUpdates = new Set();
export async function confirmPrintReceipt(id, owner) {
  if (!owner || getStore("account")?.session?.phone !== owner)
    throw Error("请重新登录后查看订单。");
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    throw Error("网络不可用，请恢复连接后重试。");
  if (receiptUpdates.has(id)) return;
  receiptUpdates.add(id);
  try {
    await getStore("printLibrary").commit((state) => {
      const order = state.orders.find(
        (o) => o.id === id && o.owner === owner && !o.fixture,
      );
      if (
        getStore("account")?.session?.phone !== owner ||
        !order ||
        transactionState(order, "print") !== "paid"
      )
        throw Error("订单状态已变化，请重新查看。");
      if (printFulfillment(order)?.id === "received") return;
      if (printFulfillment(order)?.id !== "delivered")
        throw Error("照片尚未送达，暂不能确认收货。");
      const now = new Date().toISOString();
      order.fulfillment = {
        ...order.fulfillment,
        status: "received",
        confirmedAt: now,
      };
      order.status = "completed";
      (order.events ||= []).push({ title: "用户确认收货", time: now });
    });
  } finally {
    receiptUpdates.delete(id);
  }
}
function printId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const PRINT_LAYOUTS = [
  {
    id: "adhesive-mixed-4-8",
    name: "4大8小",
    description: "二寸4张＋一寸8张",
    count: 12,
    paperLabel: "背胶模切排版照 · 免剪裁",
    paperWidth: 102,
    paperHeight: 152,
    slots: [
      ...Array.from({ length: 8 }, (_, i) => ({
        x: 1 + (i % 4) * 25,
        y: 1 + Math.floor(i / 4) * 35,
        w: 25,
        h: 35,
        rotated: false,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        x: 2 + (i % 2) * 49,
        y: 71 + Math.floor(i / 2) * 35,
        w: 49,
        h: 35,
        rotated: true,
      })),
    ],
  },
  {
    id: "adhesive-two-8",
    name: "8大",
    description: "二寸8张",
    count: 8,
    paperLabel: "背胶模切排版照 · 免剪裁",
    paperWidth: 102,
    paperHeight: 152,
    slots: Array.from({ length: 8 }, (_, i) => ({
      x: 2 + (i % 2) * 49,
      y: 1 + Math.floor(i / 2) * 35,
      w: 49,
      h: 35,
      rotated: true,
    })),
  },
];
// Frontend-only adapter. Replace this function with the backend response later.
// Each option carries its own preview, paper size, physical slots and stable ID.
function printLayoutCopy(item) {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    count: item.count,
    paperLabel: item.paperLabel,
    paperWidth: item.paperWidth,
    paperHeight: item.paperHeight,
    slots: (item.slots || []).map((s) => ({
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      rotated: !!s.rotated,
    })),
  };
}
function isPrintRatio(photo) {
  return !!(
    Number.isFinite(photo?.width) &&
    photo.width > 0 &&
    Number.isFinite(photo?.height) &&
    photo.height > 0 &&
    // Allow a one-pixel rounding difference in common photo dimensions.
    Math.abs(photo.width * 7 - photo.height * 5) <= 7
  );
}
async function requestPrintLayouts(photo) {
  if (!photo?.blob) return { options: [], message: "请先选择一张照片。" };
  if (!isPrintRatio(photo))
    return { options: [], message: "请先将照片裁剪为一寸比例（5∶7）。" };
  const image = await decodePhotoBlob(photo.blob);
  if (!image.naturalWidth || !image.naturalHeight)
    throw new Error("invalid image");
  const options = PRINT_LAYOUTS.map(printLayoutCopy);
  for (const option of options) {
    const canvas = document.createElement("canvas");
    const scale = 6;
    canvas.width = option.paperWidth * scale;
    canvas.height = option.paperHeight * scale;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("preview unavailable");
    c.scale(scale, scale);
    c.fillStyle = "#fff";
    c.fillRect(0, 0, option.paperWidth, option.paperHeight);
    for (const slot of option.slots) {
      c.save();
      c.translate(slot.x, slot.y + (slot.rotated ? slot.h : 0));
      if (slot.rotated) c.rotate(-Math.PI / 2);
      const width = slot.rotated ? slot.h : slot.w;
      const height = slot.rotated ? slot.w : slot.h;
      const fit = Math.min(
        width / image.naturalWidth,
        height / image.naturalHeight,
      );
      const w = image.naturalWidth * fit,
        h = image.naturalHeight * fit;
      c.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
      c.restore();
    }
    c.fillStyle = "#173358";
    c.font = "bold 4px sans-serif";
    c.fillText("知拍", 3, 146);
    c.font = "2.5px sans-serif";
    c.fillText("免剪裁 · 自带胶 · 背胶模切", 19, 145);
    c.fillText(option.description, 19, 149);
    option.previewBlob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("preview encoding failed"))),
        "image/jpeg",
        0.92,
      ),
    );
  }
  return { options, message: "" };
}
const PRINT_PRICES = { base: 1980, shipping: 1000 };
// Fixed product contract shared by quoting and payment validation.
export function isCurrentPrintOrder(order) {
  return (
    PRINT_LAYOUTS.some((l) => l.id === order?.layout) &&
    order.quantity === 1 &&
    !order.addon &&
    order.base === PRINT_PRICES.base &&
    order.shipping === PRINT_PRICES.shipping &&
    order.total === PRINT_PRICES.base + PRINT_PRICES.shipping
  );
}
// Transaction-only writes retain the checkout fulfillment and draft semantics.
export async function updatePrintTransaction(id, owner, expectedStatus, patch) {
  const store = getStore("printLibrary");
  await store.commit((state) => {
    const order = state.orders.find(
      (r) => r.id === id && r.owner === owner && !r.fixture,
    );
    if (
      getStore("account")?.session?.phone !== owner ||
      !order ||
      order.status !== expectedStatus
    )
      throw Error("订单状态已变化，请刷新后重试。");
    const now = new Date().toISOString();
    Object.assign(order, patch);
    if (patch.status === "paid") {
      order.status = "producing";
      order.attempt = "success";
      order.paidAt = patch.paidAt || now;
      order.fulfillment = { status: "producing" };
      (order.events ||= []).push({ title: "支付成功，等待制作", time: now });
      if (state.draft.orderId === id) {
        state.draft.completedOrderId = id;
        state.draft.orderId = null;
        state.draft.token = printId();
      }
    } else if (patch.status === "cancelled") {
      (order.events ||= []).push({ title: "订单已取消", time: now });
      if (state.draft.orderId === id) {
        state.draft.orderId = null;
        state.draft.token = printId();
      }
    }
  });
}
async function requestPrintQuote(layout, quantity, address) {
  if (!PRINT_LAYOUTS.some((l) => l.id === layout?.id) || quantity !== 1)
    throw new Error("invalid quote");
  return {
    layoutId: layout.id,
    quantity: 1,
    unitPrice: PRINT_PRICES.base,
    subtotal: PRINT_PRICES.base,
    shipping: PRINT_PRICES.shipping,
    total: PRINT_PRICES.base + PRINT_PRICES.shipping,
    serviceable: !!address,
    carrier: "快递配送",
    isDemo: true,
  };
}
const printDraftSeed = () => ({
  token: printId(),
  photo: null,
  kind: null,
  layout: null,
  layoutSnapshot: null,
  quantity: 1,
  addon: 0,
  addressId: null,
  orderId: null,
  completedOrderId: null,
  entry: "home",
  returnTo: "/?page=home",
});
const printStateSeed = () => ({
  draft: printDraftSeed(),
  addresses: [],
  orders: [],
});
let printDatabase;
function printPhotoCopy(photo) {
  return photo
    ? {
        id: photo.id,
        name: photo.name,
        width: photo.width,
        height: photo.height,
        type: photo.type,
        spec: photo.spec || "",
        blob: photo.blob || null,
      }
    : null;
}
function printAddressCopy(address) {
  return address
    ? {
        id: address.id,
        name: address.name,
        phone: address.phone,
        region: address.region,
        street: address.street,
        postal: address.postal || "",
        default: !!address.default,
      }
    : null;
}
function plainPrintState(state) {
  const d = state.draft;
  return {
    draft: {
      token: d.token,
      photo: printPhotoCopy(d.photo),
      kind: d.kind,
      layout: d.layout,
      layoutSnapshot: printLayoutCopy(d.layoutSnapshot),
      quantity: 1,
      addon: 0,
      addressId: d.addressId,
      orderId: d.orderId,
      completedOrderId: d.completedOrderId || null,
      entry: d.entry === "album" ? "album" : "home",
      returnTo: d.returnTo,
    },
    addresses: state.addresses.map(printAddressCopy),
    orders: state.orders.map((o) => ({
      id: o.id,
      owner: o.owner || null,
      number: o.number,
      token: o.token,
      status: o.status,
      photo: printPhotoCopy(o.photo),
      kind: o.kind,
      layout: o.layout,
      layoutSnapshot: printLayoutCopy(o.layoutSnapshot),
      quantity: o.quantity,
      addon: o.addon,
      address: printAddressCopy(o.address),
      base: o.base,
      addonPrice: o.addonPrice,
      shipping: o.shipping,
      total: o.total,
      method: o.method || null,
      attempt: o.attempt || null,
      paymentResult: o.paymentResult ? storageValue(o.paymentResult) : null,
      refund: o.refund ? storageValue(o.refund) : null,
      fulfillment: o.fulfillment ? storageValue(o.fulfillment) : null,
      createdAt: o.createdAt,
      paidAt: o.paidAt || null,
      events: (o.events || []).map((e) => ({
        title: e.title,
        time: e.time,
      })),
      tracking: o.tracking
        ? {
            carrier: o.tracking.carrier,
            number: o.tracking.number,
          }
        : null,
    })),
  };
}
function openPrintDatabase() {
  if (printDatabase) return printDatabase;
  printDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open("zhipai-print-orders", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("database blocked"));
  }).catch((error) => {
    printDatabase = null;
    throw error;
  });
  return printDatabase;
}
async function readPrintState() {
  const db = await openPrintDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("state", "readonly")
      .objectStore("state")
      .get("library");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function writePrintState(state) {
  const db = await openPrintDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(storageValue(state), "library");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("save aborted"));
  });
}
function printSlots(layout) {
  if (layout && typeof layout === "object") return layout.slots || [];
  const current = PRINT_LAYOUTS.find((l) => l.id === layout);
  if (current) return current.slots;
  if (layout === "two")
    return Array.from(
      {
        length: 4,
      },
      (_, i) => ({
        x: 39 + (i % 2) * 39,
        y: 1 + Math.floor(i / 2) * 51,
        w: 35,
        h: 49,
      }),
    );
  const small = Array.from(
    {
      length: 8,
    },
    (_, i) => ({
      x: (layout === "mixed" ? 6 : 20) + (i % 4) * 29,
      y: 14 + Math.floor(i / 4) * 39,
      w: 25,
      h: 35,
    }),
  );
  if (layout === "mixed")
    small.push(
      {
        x: 123,
        y: 1,
        w: 25,
        h: 35,
      },
      {
        x: 123,
        y: 40,
        w: 25,
        h: 35,
      },
    );
  // Mixed sheets use 35×49 mm portraits at the right; the one-inch group is
  // compacted to leave a full-width two-inch column without stretching photos.
  if (layout === "mixed") {
    small.splice(
      8,
      2,
      {
        x: 113,
        y: 1,
        w: 35,
        h: 49,
      },
      {
        x: 113,
        y: 52,
        w: 35,
        h: 49,
      },
    );
    small.slice(0, 8).forEach((slot, i) => {
      slot.x = 4 + (i % 4) * 26;
    });
  }
  return small;
}
function printSheetMarkup(layout, url = "", landscape = false) {
  const plan =
    typeof layout === "object"
      ? layout
      : PRINT_LAYOUTS.find((l) => l.id === layout);
  const width = plan?.paperWidth || 152,
    height = plan?.paperHeight || 102;
  const escape = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const portraits = printSlots(layout)
    .map((s) => {
      const w = s.rotated ? s.h : s.w,
        h = s.rotated ? s.w : s.h;
      const transform = `translate(${s.x} ${s.y + (s.rotated ? s.h : 0)})${s.rotated ? " rotate(-90)" : ""}`;
      return `<g transform="${transform}">${
        url
          ? `<image href="${escape(url)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`
          : `<rect width="${w}" height="${h}" fill="#edf0f5"/>`
      }</g>`;
    })
    .join("");
  const footer = plan?.paperWidth
    ? `<g fill="#173358" font-family="sans-serif"><text x="3" y="146" font-size="4" font-weight="700">知拍</text><text x="19" y="145" font-size="2.5">免剪裁 · 自带胶 · 背胶模切</text><text x="19" y="149" font-size="2.5">${escape(plan.description || "")}</text></g>`
    : "";
  const content = `<rect width="${width}" height="${height}" fill="white"/>${portraits}${footer}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${landscape ? `${height} ${width}` : `${width} ${height}`}" role="img" aria-label="背胶模切排版预览">${landscape ? `<g transform="translate(${height} 0) rotate(90)">${content}</g>` : content}</svg>`;
}
registerStore("printUi", {
  opened: false,
});
registerStore("printLibrary", {
  ...printStateSeed(),
  ready: false,
  busy: false,
  error: "",
  loading: null,
  init() {
    this.loading = this.load();
  },
  async load() {
    this.busy = true;
    this.error = "";
    try {
      const state = await readPrintState();
      if (state) {
        if (
          !state.draft ||
          !Array.isArray(state.addresses) ||
          !Array.isArray(state.orders)
        )
          throw new Error("invalid state");
        Object.assign(this, plainPrintState(state));
      }
      this.ready = true;
    } catch (_) {
      this.ready = false;
      this.error = "冲印数据暂时无法读取，请重试。";
    } finally {
      this.busy = false;
    }
  },
  async commit(mutate) {
    if (!this.ready || this.busy) throw new Error("store unavailable");
    this.busy = true;
    try {
      const next = plainPrintState(this);
      mutate(next);
      const clean = plainPrintState(next);
      await writePrintState(clean);
      Object.assign(this, clean);
    } finally {
      this.busy = false;
    }
  },
});
registerController("printStudio", () => ({
  view: "select",
  entryPhotoId: null,
  entryPhoto: null,
  entryKind: null,
  selectionId: null,
  flowCompleted: false,
  checkoutPayment: false,
  orderId: null,
  orderListReturn: null,
  filter: "all",
  modal: null,
  message: "",
  error: "",
  moreOpen: false,
  candidatePhotoId: null,
  quote: null,
  quoteLoading: false,
  quoteError: "",
  quoteRequest: 0,
  loadedQuoteKey: "",
  layoutOptions: [],
  layoutsLoading: false,
  layoutError: "",
  layoutRequest: 0,
  loadedPhotoKey: "",
  requestedPhotoKey: "",
  onResume: null,
  paymentMethod: "wechat",
  demoOutcome: "success",
  resolution: "paid",
  processing: false,
  crop: { scale: 1, offsetX: 0, offsetY: 0 },
  cropTask: 0,
  addonExpanded: false,
  layoutExpanded: false,
  addressFields: {},
  addressError: "",
  addressReturn: "confirm",
  online: navigator.onLine,
  previousFocus: null,
  onRoute: null,
  onOpen: null,
  onPhoto: null,
  onPhoneError: null,
  onNetwork: null,
  init() {
    this.onRoute = () => this.syncLocation();
    this.onOpen = (event) => this.enter(event.detail);
    this.onPhoto = (event) => {
      if (
        event.detail.context.intent === "print" &&
        (!event.detail.context.selectionId ||
          event.detail.context.selectionId === this.selectionId)
      )
        this.choosePhoto(
          event.detail.photo,
          event.detail.kind,
          event.detail.context.returnTo,
        );
    };
    this.onPhoneError = (event) => {
      if (
        this.page === "print" &&
        event.detail.context.intent === "print" &&
        event.detail.context.selectionId === this.selectionId
      )
        this.error = event.detail.message;
    };
    this.onNetwork = () => {
      this.online = navigator.onLine;
    };
    this.onResume = (event) => this.resumePrint(event.detail);
    window.addEventListener("zhipai-print-resume", this.onResume);
    this.$watch("photoKey", () => {
      if (this.page === "print") this.loadLayouts();
    });
    this.$watch("quoteKey", () => {
      if (this.page === "print" && this.view === "confirm") this.loadQuote();
    });
    this.$watch("$store.photoLibrary.ready", () => this.syncCandidate());
    window.addEventListener("zhipai-route", this.onRoute);
    window.addEventListener("popstate", this.onRoute);
    window.addEventListener("zhipai-print-open", this.onOpen);
    window.addEventListener("zhipai-photo-chosen", this.onPhoto);
    window.addEventListener("zhipai-phone-error", this.onPhoneError);
    window.addEventListener("online", this.onNetwork);
    window.addEventListener("offline", this.onNetwork);
    this.$watch("$store.printLibrary.ready", (ready) => {
      if (ready && this.page === "print") this.syncLocation();
    });
    this.syncLocation();
  },
  destroy() {
    this.cropTask++;
    window.removeEventListener("zhipai-route", this.onRoute);
    window.removeEventListener("popstate", this.onRoute);
    window.removeEventListener("zhipai-print-open", this.onOpen);
    window.removeEventListener("zhipai-photo-chosen", this.onPhoto);
    window.removeEventListener("zhipai-phone-error", this.onPhoneError);
    window.removeEventListener("online", this.onNetwork);
    window.removeEventListener("offline", this.onNetwork);
    window.removeEventListener("zhipai-print-resume", this.onResume);
    this.layoutRequest++;
    this.releaseLayouts();
    this.quoteRequest++;
    this.$store.printUi.opened = false;
  },
  get store() {
    return this.$store.printLibrary;
  },
  get draft() {
    return this.store.draft;
  },
  get library() {
    return this.$store.photoLibrary;
  },
  get candidate() {
    return (
      this.library.finished.find(
        (photo) => photo.id === this.candidatePhotoId && photo.blob,
      ) || null
    );
  },
  get quoteKey() {
    return this.store.ready
      ? [
          this.photoKey,
          this.draft.layout,
          this.draft.quantity,
          this.address?.id,
          this.address?.region,
          this.address?.street,
        ].join("|")
      : "";
  },
  get canSubmit() {
    return !!(
      !this.flowCompleted &&
      ["finished", "phone"].includes(this.draft.kind) &&
      this.draft.photo?.blob &&
      isPrintRatio(this.draft.photo) &&
      this.selectedLayout &&
      this.address &&
      this.quote?.serviceable &&
      Number.isInteger(this.quote?.total) &&
      !this.quoteLoading &&
      !this.quoteError &&
      this.loadedQuoteKey === this.quoteKey &&
      !this.disabled
    );
  },
  get photoURL() {
    return this.draft.photo?.blob
      ? actualPhotoURL({
          ...this.draft.photo,
          id: "print-" + this.draft.photo.id,
        })
      : "";
  },
  get fulfillmentIndex() {
    return [
      "producing",
      "printing",
      "shipped",
      "delivered",
      "completed",
    ].indexOf(this.order?.status);
  },
  get disabled() {
    return (
      !this.store.ready ||
      this.store.busy ||
      this.processing ||
      this.layoutsLoading
    );
  },
  get layout() {
    return (
      this.selectedLayout ||
      this.draft.layoutSnapshot ||
      PRINT_LAYOUTS.find((l) => l.id === this.draft.layout) || {
        name: "",
        description: "",
      }
    );
  },
  get layouts() {
    return this.layoutOptions;
  },
  get selectedLayout() {
    return this.layoutOptions.find((l) => l.id === this.draft.layout) || null;
  },
  get photoKey() {
    const p = this.draft.photo;
    return this.store.ready && p
      ? [p.id, p.width, p.height, p.spec, p.blob?.size].join("|")
      : "";
  },
  get address() {
    return (
      this.store.addresses.find((a) => a.id === this.draft.addressId) || null
    );
  },
  get total() {
    return this.quote?.total ?? null;
  },
  get order() {
    return (
      this.store.orders.find(
        (o) =>
          o.id === this.orderId &&
          o.owner &&
          o.owner === getStore("account")?.session?.phone,
      ) || null
    );
  },
  get orders() {
    return this.store.orders
      .filter((o) => o.owner && o.owner === getStore("account")?.session?.phone)
      .filter(
        (o) =>
          this.filter === "all" ||
          (this.filter === "pending"
            ? ["pending", "verifying"].includes(o.status)
            : this.filter === "production"
              ? ["producing", "printing"].includes(o.status)
              : o.status === this.filter),
      );
  },
  get title() {
    return {
      preview: "冲印服务",
      select: "选择照片",
      crop: "裁剪照片",
      layouts: "选择排版",
      confirm: "确认订单",
      addresses: "收货地址",
      address: "编辑收货地址",
      orders: "冲印订单",
      order: "订单详情",
      result: "订单详情",
    }[this.view];
  },
  get modalTitle() {
    return (
      {
        album: "选择一张照片",
        payment: "请选择支付方式",
        resolution: "查询支付结果",
        cancel: "取消这笔订单？",
      }[this.modal] || ""
    );
  },
  money(cents) {
    return "¥" + (cents / 100).toFixed(2);
  },
  statusName(status) {
    return (
      {
        pending: "待付款",
        verifying: "付款确认中",
        producing: "待制作",
        printing: "制作中",
        shipped: "邮寄中",
        delivered: "待签收",
        completed: "已签收",
        cancelled: "已取消",
      }[status] || "状态未知"
    );
  },
  statusCopy(status) {
    return (
      {
        pending: "订单已保留，完成付款后安排制作。",
        verifying: "正在确认付款结果，请先查询，避免重复支付。",
        producing: "付款已确认，等待安排照片制作。",
        printing: "照片正在制作，发货后可在这里查看物流。",
        shipped: "照片已交由快递配送，可查看运单信息。",
        delivered: "照片已送达，等待你确认收货。",
        completed: "照片已签收，本次冲印已完成。",
        cancelled: "订单已取消，你可以重新选择照片冲印。",
      }[status] || ""
    );
  },
  orderCount(order) {
    return (
      (order.layoutSnapshot?.count ||
        PRINT_LAYOUTS.find((item) => item.id === order.layout)?.count ||
        0) * order.quantity
    );
  },
  time(value) {
    return value
      ? new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(value))
      : "";
  },
  layoutName(id) {
    return (
      this.layoutOptions.find((l) => l.id === id)?.name ||
      this.store.orders.find((o) => o.layout === id)?.layoutSnapshot?.name ||
      PRINT_LAYOUTS.find((l) => l.id === id)?.name ||
      ""
    );
  },
  sheet(layout, selected = true, landscape = false) {
    const photo = this.draft.photo;
    const plan =
      layout === this.draft.layout
        ? this.draft.layoutSnapshot || layout
        : this.layoutOptions.find((l) => l.id === layout) || layout;
    return printSheetMarkup(
      plan,
      selected && photo?.blob
        ? actualPhotoURL({
            ...photo,
            id: "print-" + photo.id,
          })
        : "",
      landscape,
    );
  },
  releaseLayouts() {
    for (const item of this.layoutOptions)
      if (item.previewURL) URL.revokeObjectURL(item.previewURL);
    this.layoutOptions = [];
  },
  async loadLayouts(force = false) {
    if (!this.store.ready || !["layouts", "confirm"].includes(this.view))
      return;
    if (this.draft.photo && !isPrintRatio(this.draft.photo)) {
      this.route("crop", {}, true);
      return;
    }
    const key = this.photoKey;
    if (
      !force &&
      (key === this.loadedPhotoKey ||
        (this.layoutsLoading && key === this.requestedPhotoKey))
    )
      return;
    const request = ++this.layoutRequest,
      photo = this.draft.photo;
    this.releaseLayouts();
    this.layoutError = "";
    this.loadedPhotoKey = "";
    this.requestedPhotoKey = key;
    if (!photo) {
      this.layoutsLoading = false;
      this.loadedPhotoKey = "";
      return;
    }
    this.layoutsLoading = true;
    try {
      const response = await requestPrintLayouts(photo);
      if (request !== this.layoutRequest || key !== this.photoKey) return;
      this.layoutOptions = response.options.map((item) => ({
        ...printLayoutCopy(item),
        previewURL: URL.createObjectURL(item.previewBlob),
      }));
      this.layoutError = response.message || "";
      const selected =
        this.layoutOptions.find((item) => item.id === this.draft.layout) ||
        this.layoutOptions[0];
      await this.store.commit((state) => {
        state.draft.layout = selected?.id || null;
        state.draft.layoutSnapshot = printLayoutCopy(selected);
        state.draft.quantity = 1;
        state.draft.addon = 0;
      });
      if (request === this.layoutRequest) this.loadedPhotoKey = key;
    } catch (_) {
      if (request === this.layoutRequest) {
        this.releaseLayouts();
        this.layoutError = "排版方案获取失败，请重试，或重新选取照片。";
      }
    } finally {
      if (request === this.layoutRequest) {
        this.layoutsLoading = false;
        if (this.view === "confirm") this.loadQuote(true);
      }
    }
  },
  async loadQuote(force = false) {
    if (
      this.view !== "confirm" ||
      !this.store.ready ||
      this.layoutsLoading ||
      !this.selectedLayout
    )
      return;
    const key = this.quoteKey;
    if (!force && key === this.loadedQuoteKey) return;
    const request = ++this.quoteRequest;
    this.quoteLoading = true;
    this.quoteError = "";
    this.quote = null;
    try {
      const quote = await requestPrintQuote(
        this.selectedLayout,
        this.draft.quantity,
        this.address,
      );
      if (
        request !== this.quoteRequest ||
        key !== this.quoteKey ||
        this.view !== "confirm"
      )
        return;
      this.quote = quote;
      this.loadedQuoteKey = key;
      if (this.address && !quote.serviceable)
        this.quoteError = "这个地址暂不支持配送，请更换收货地址。";
    } catch (_) {
      if (request === this.quoteRequest)
        this.quoteError = "费用暂时无法获取，请重新获取。";
    } finally {
      if (request === this.quoteRequest) this.quoteLoading = false;
    }
  },
  syncCandidate() {
    if (!this.library?.ready) return;
    if (
      !this.library.finished.some((photo) => photo.id === this.candidatePhotoId)
    )
      this.candidatePhotoId = this.library.finished.some(
        (photo) => photo.id === this.draft.photo?.id,
      )
        ? this.draft.photo.id
        : null;
  },
  inputPhoto(photo, kind) {
    if (!photo?.blob) return null;
    if (kind === "phone")
      return photo.blob instanceof Blob &&
        Number.isFinite(photo.width) &&
        photo.width > 0 &&
        Number.isFinite(photo.height) &&
        photo.height > 0
        ? photo
        : null;
    return kind === "finished"
      ? this.library.finished.find(
          (item) => item.id === photo?.id && item.blob,
        ) || null
      : null;
  },
  guardPendingPayment() {
    const order = this.store.orders.find(
      (item) =>
        item.id === this.draft.orderId &&
        item.status === "verifying" &&
        item.owner &&
        item.owner === getStore("account")?.session?.phone,
    );
    if (!order) return false;
    this.route("confirm", { order: order.id }, true);
    this.orderId = order.id;
    this.showModal("resolution");
    this.message = "请先确认原订单付款结果，再发起新的冲印。";
    return true;
  },
  selectCandidate(id) {
    if (
      !this.disabled &&
      this.library.ready &&
      !this.library.busy &&
      this.library.finished.some((photo) => photo.id === id && photo.blob)
    )
      this.candidatePhotoId = id;
  },
  preparePhoto() {
    if (this.candidate) return this.choosePhoto(this.candidate, "finished");
  },
  async startPrint() {
    await this.store.loading;
    if (this.disabled || this.guardPendingPayment()) return;
    const source =
      this.entryPhoto ||
      this.library.finished.find((p) => p.id === this.entryPhotoId && p.blob) ||
      null;
    try {
      await this.store.commit((state) => {
        const previous = state.draft;
        state.draft = {
          ...printDraftSeed(),
          returnTo: previous.returnTo,
          entry: previous.entry,
          addressId:
            state.addresses.find((a) => a.default)?.id ||
            state.addresses[0]?.id ||
            null,
          photo: printPhotoCopy(source),
          kind: source ? this.entryKind || "finished" : null,
        };
      });
      this.flowCompleted = false;
      this.checkoutPayment = false;
      this.orderId = null;
      this.entryPhotoId = null;
      this.entryPhoto = null;
      this.entryKind = null;
      this.candidatePhotoId = source?.id || null;
      this.layoutRequest++;
      this.releaseLayouts();
      this.layoutsLoading = false;
      this.loadedPhotoKey = "";
      this.quote = null;
      this.loadedQuoteKey = "";
      this.error = "";
      this.message = "";
      this.crop = { scale: 1, offsetX: 0, offsetY: 0 };
      this.route("select");
    } catch (_) {
      this.error = "暂时无法开始冲印，请重试。";
    }
  },
  openAlbum() {
    if (this.view === "select" && !this.disabled && !this.library.busy) {
      this.syncCandidate();
      this.showModal("album");
    }
  },
  pickPhone() {
    if (this.disabled || this.view !== "select") return;
    this.closeModal();
    this.error = "";
    this.selectionId = printId();
    window.dispatchEvent(
      new CustomEvent("zhipai-phone-picker", {
        detail: {
          intent: "print",
          selectionId: this.selectionId,
          returnTo: location.pathname + location.search,
          sources: ["phone"],
        },
      }),
    );
  },
  nextLayouts() {
    if (
      ["finished", "phone"].includes(this.draft.kind) &&
      this.draft.photo?.blob &&
      !this.disabled
    )
      this.route(isPrintRatio(this.draft.photo) ? "layouts" : "crop");
  },
  setCrop(value) {
    if (this.disabled || this.view !== "crop") return;
    this.crop = {
      scale: Math.max(1, Math.min(3, Number(value.scale) || 1)),
      offsetX: Math.max(-100, Math.min(100, Number(value.offsetX) || 0)),
      offsetY: Math.max(-100, Math.min(100, Number(value.offsetY) || 0)),
    };
  },
  async applyCrop() {
    if (this.disabled || this.view !== "crop" || !this.draft.photo?.blob)
      return;
    if (this.guardPendingPayment()) return;
    const source = this.draft.photo,
      settings = { ...this.crop };
    const task = ++this.cropTask;
    const originalLocation = location.pathname + location.search;
    this.processing = true;
    this.error = "";
    try {
      const bounds = photoCropBounds(
        source.width,
        source.height,
        5,
        7,
        settings,
      );
      const unit = Math.max(1, Math.floor(bounds.w / 5));
      const width = unit * 5,
        height = unit * 7;
      const blob = await renderPhotoBlob(source.blob, {
        ...settings,
        outputWidth: width,
        outputHeight: height,
        format: "jpeg",
      });
      if (
        task !== this.cropTask ||
        this.view !== "crop" ||
        this.draft.photo.id !== source.id ||
        location.pathname + location.search !== originalLocation
      )
        return;
      await this.store.commit((state) => {
        state.draft.photo = printPhotoCopy({
          ...source,
          id: "print-crop-" + printId(),
          blob,
          width,
          height,
          type: "image/jpeg",
          spec: "一寸比例 · 5∶7",
        });
        state.draft.layout = null;
        state.draft.layoutSnapshot = null;
        state.draft.orderId = null;
        state.draft.completedOrderId = null;
        state.draft.token = printId();
      });
      // Every preview must be rebuilt from the committed crop, never the previous source.
      this.layoutRequest++;
      this.releaseLayouts();
      this.layoutsLoading = false;
      this.loadedPhotoKey = "";
      this.requestedPhotoKey = "";
      this.quote = null;
      this.loadedQuoteKey = "";
      if (
        task === this.cropTask &&
        this.view === "crop" &&
        location.pathname + location.search === originalLocation
      )
        this.route("layouts");
    } catch (_) {
      if (task === this.cropTask)
        this.error = "裁剪未完成，调整已保留，请重试。";
    } finally {
      if (task === this.cropTask) this.processing = false;
    }
  },
  resumePrint(context = {}) {
    this.route("select");
    return this.$nextTick(() => {
      const photo = Array.isArray(context.knownPhotoIds)
        ? this.library.finished.find(
            (p) => p.blob && !context.knownPhotoIds.includes(p.id),
          )
        : null;
      if (photo) return this.choosePhoto(photo, "finished");
      this.syncCandidate();
    });
  },
  returnContext() {
    return {
      knownPhotoIds: this.library.finished.map((p) => p.id),
      intent: "print",
      action: "edit",
      returnTo: "/?page=print&print=select",
      exitTo: "/?page=print&print=select",
      sources: ["finished"],
    };
  },
  makePhoto() {
    if (this.processing || !this.library.ready) return;
    this.closeModal();
    const context = this.returnContext();
    this.$store.photoChoice.printReturnContext = context;
    window.dispatchEvent(
      new CustomEvent("zhipai-camera-open", {
        detail: {
          returnTo: context.returnTo,
        },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("zhipai-camera-intent", {
        detail: context,
      }),
    );
    this.go("camera");
  },
  async selectLayout(id) {
    if (this.disabled) return;
    const item = this.layouts.find((l) => l.id === id);
    if (!item) return;
    try {
      await this.store.commit((state) => {
        state.draft.layout = id;
        state.draft.layoutSnapshot = printLayoutCopy(item);
      });
      this.error = "";
    } catch (_) {
      this.error = "版式选择未保存，请重试。";
    }
  },
  addressText(address) {
    return address ? address.region + " " + address.street : "";
  },
  openOrderList() {
    if (!this.processing) openOrderCenter("print");
  },
  syncLocation() {
    const q = new URLSearchParams(location.search);
    if (this.view === "crop" && q.get("print") !== "crop") {
      this.cropTask++;
      this.processing = false;
    }
    this.modal = null;
    this.moreOpen = false;
    this.$store.printUi.opened = false;
    this.message = "";
    this.error = "";
    if (q.get("page") === "orders" && q.get("id")?.startsWith("print:")) {
      this.view = "order";
      this.orderId = q.get("id").slice("print:".length);
      this.checkoutPayment = false;
      return;
    }
    if (q.get("page") !== "print") {
      this.cropTask++;
      this.processing = false;
      this.selectionId = null;
      return;
    }
    const requested = q.get("print");
    const next = !requested || requested === "preview" ? "select" : requested;
    if (["order", "result"].includes(next)) {
      orderNavigate(
        printOrderPath(q.get("order") || "", this.draft.returnTo),
        true,
      );
      return;
    }
    if (next === "orders") {
      openOrderCenter("print", "/?page=print&print=preview");
      return;
    }
    this.view = [
      "preview",
      "select",
      "crop",
      "layouts",
      "confirm",
      "addresses",
      "address",
      "orders",
      "order",
      "result",
    ].includes(next)
      ? next
      : "select";
    if (
      ["crop", "layouts", "confirm"].includes(this.view) &&
      this.store.ready &&
      (!this.draft.photo || !["finished", "phone"].includes(this.draft.kind))
    ) {
      this.route("select", {}, true);
      return;
    }
    if (
      ["layouts", "confirm"].includes(this.view) &&
      this.store.ready &&
      !isPrintRatio(this.draft.photo)
    ) {
      this.route("crop", {}, true);
      return;
    }
    this.orderId = q.get("order");
    this.flowCompleted =
      this.view === "confirm" &&
      !!this.store.orders.find(
        (o) =>
          o.id === this.draft.completedOrderId &&
          o.owner &&
          o.owner === getStore("account")?.session?.phone &&
          [
            "producing",
            "printing",
            "shipped",
            "delivered",
            "completed",
          ].includes(o.status),
      );
    if (this.view === "orders")
      this.orderListReturn = [
        "preview",
        "select",
        "layouts",
        "confirm",
      ].includes(q.get("back"))
        ? q.get("back")
        : null;
    if (this.view === "address") this.readAddressFields(q.get("address"));
    if (this.view === "addresses" || this.view === "address")
      this.addressReturn = q.get("back") === "preview" ? "preview" : "confirm";
    if (this.store.ready && !this.flowCompleted) this.loadLayouts();
    if (this.view === "confirm" && !this.flowCompleted) this.loadQuote();
    if (this.view === "select") this.syncCandidate();
    this.$nextTick(() => {
      this.$el
        .querySelectorAll(".print-body")
        .forEach((el) => (el.scrollTop = 0));
    });
  },
  route(view, extras = {}, replace = false) {
    if (["order", "result"].includes(view)) {
      orderNavigate(
        printOrderPath(extras.order || this.orderId || "", this.draft.returnTo),
        replace,
      );
      return;
    }
    if (view === "preview") view = "select";
    const url = new URL(location.href);
    const orderBack = url.searchParams.get("orderBack");
    url.search = "";
    if (orderBack) url.searchParams.set("orderBack", orderBack);
    url.searchParams.set("page", "print");
    url.searchParams.set("print", view);
    Object.entries(extras).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    history[replace ? "replaceState" : "pushState"]({}, "", url);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  async enter(detail) {
    this.selectionId = null;
    this.$store.photoChoice.printReturnContext = null;
    if (detail.view === "orders") {
      this.filter = "all";
      openOrderCenter("print", detail.returnTo || "/?page=my");
      return;
    }
    await this.store.loading;
    const source = this.inputPhoto(detail.photo, detail.kind);
    this.entryPhotoId = source?.id || null;
    this.entryPhoto = source;
    this.entryKind = source ? detail.kind : null;
    this.flowCompleted = false;
    this.checkoutPayment = false;
    try {
      await this.store.commit((state) => {
        state.draft.returnTo = detail.returnTo || "/?page=home";
        state.draft.entry = detail.entry === "album" ? "album" : "home";
      });
      await this.startPrint();
    } catch (_) {
      this.route("select");
      this.error = "暂时无法读取冲印服务，请重试。";
    }
  },
  back() {
    if (!this.processing && this.view === "order" && returnToOrderCenter())
      return;
    if (this.processing || this.store.busy) return;
    if (this.modal) {
      this.closeModal();
      return;
    }
    if (
      ["preview", "select", "crop", "layouts", "confirm"].includes(this.view)
    ) {
      const url = new URL(
        this.draft.returnTo || "/?page=home",
        location.origin,
      );
      history.pushState(
        {},
        "",
        url.origin === location.origin &&
          url.searchParams.get("page") !== "print"
          ? url
          : "/?page=home",
      );
      window.dispatchEvent(new Event("zhipai-route"));
      return;
    }
    if (this.view === "address") {
      this.route("addresses", {
        back: this.addressReturn,
      });
      return;
    }
    if (this.view === "addresses") {
      this.route(this.addressReturn);
      return;
    }
    if (this.view === "orders") {
      if (this.orderListReturn) this.route(this.orderListReturn);
      else this.go("my");
      return;
    }
    openOrderCenter("print", "/?page=print&print=preview");
  },
  previousStep() {
    if (this.disabled || this.modal || this.flowCompleted) return;
    if (!["crop", "layouts", "confirm"].includes(this.view)) return;
    if (this.guardPendingPayment()) return;
    this.route(this.view === "confirm" ? "layouts" : "select");
  },
  async changeDraft(key, value) {
    if (this.disabled || ["quantity", "addon"].includes(key)) return;
    this.error = "";
    try {
      await this.store.commit((state) => {
        state.draft[key] = value;
      });
    } catch (_) {
      this.error = "修改未保存，请重试。";
    }
  },
  openMore() {
    this.moreOpen = true;
    this.$nextTick(() =>
      this.$refs.printShareAction.focus({
        preventScroll: true,
      }),
    );
  },
  toggleMore() {
    if (this.moreOpen) this.closeMore(true);
    else this.openMore();
  },
  closeMore(restoreFocus = false) {
    this.moreOpen = false;
    if (restoreFocus)
      this.$refs.printMoreToggle?.focus({
        preventScroll: true,
      });
  },
  share() {
    if (this.disabled) return;
    this.closeMore();
    openZhipaiShare("print");
  },
  pick() {
    this.openAlbum();
  },
  async choosePhoto(photo, kind, returnTo = "/?page=print&print=preview") {
    photo = this.inputPhoto(photo, kind);
    if (!photo) return;
    await this.store.loading;
    if (this.disabled) return;
    if (this.guardPendingPayment()) return;
    if (this.view !== "select") this.route("select", {}, true);
    const originalLocation = location.pathname + location.search;
    this.selectionId = null;
    const samePhoto =
      this.draft.photo?.id === photo.id &&
      this.draft.photo.blob === photo.blob &&
      this.draft.kind === kind;
    this.processing = true;
    try {
      await this.store.commit((state) => {
        const d = state.draft;
        if (d.photo?.id !== photo.id || d.completedOrderId) {
          d.completedOrderId = null;
          d.layout = null;
          d.layoutSnapshot = null;
          d.orderId = null;
          d.token = printId();
        }
        d.photo = printPhotoCopy(photo);
        d.kind = kind;
      });
      this.processing = false;
      if (location.pathname + location.search === originalLocation) {
        this.closeModal();
        if (!samePhoto) this.crop = { scale: 1, offsetX: 0, offsetY: 0 };
      }
    } catch (_) {
      this.error = "照片准备失败，选择已保留，请重试。";
    } finally {
      this.processing = false;
    }
  },
  confirm() {
    if (
      this.draft.photo &&
      isPrintRatio(this.draft.photo) &&
      this.selectedLayout &&
      !this.layoutError &&
      !this.disabled
    )
      this.route("confirm");
  },
  openAddresses() {
    if (!this.disabled)
      this.route("addresses", {
        back: "confirm",
      });
  },
  readAddressFields(id) {
    const address = this.store.addresses.find((a) => a.id === id);
    this.addressFields = address
      ? {
          ...address,
        }
      : {
          id: null,
          name: "",
          phone: "",
          region: "",
          street: "",
          postal: "",
          default: this.store.addresses.length === 0,
        };
    this.addressError = "";
  },
  editAddress(id = null) {
    this.route("address", {
      address: id,
      back: this.addressReturn,
    });
  },
  async saveAddress() {
    if (this.disabled) return;
    const f = this.addressFields;
    const clean = {
      id: f.id || printId(),
      name: f.name.trim(),
      phone: f.phone.trim(),
      region: f.region.trim(),
      street: f.street.trim(),
      postal: f.postal.trim(),
      default: !!f.default,
    };
    if (!clean.name || clean.name.length > 30) {
      this.addressError = "请填写收件人姓名，最多30字。";
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(clean.phone)) {
      this.addressError = "请填写正确的11位手机号码。";
      return;
    }
    if (clean.region.length < 4 || clean.street.length < 5) {
      this.addressError = "请补齐省市区与详细地址。";
      return;
    }
    if (clean.postal && !/^\d{6}$/.test(clean.postal)) {
      this.addressError = "邮政编码应为6位数字，也可以留空。";
      return;
    }
    try {
      await this.store.commit((state) => {
        if (clean.default)
          state.addresses.forEach((a) => {
            a.default = false;
          });
        const index = state.addresses.findIndex((a) => a.id === clean.id);
        if (index < 0) state.addresses.push(clean);
        else state.addresses[index] = clean;
        state.draft.addressId = clean.id;
      });
      this.route(this.addressReturn);
    } catch (_) {
      this.addressError = "地址保存失败，填写内容已保留，请重试。";
    }
  },
  async selectAddress(id) {
    await this.changeDraft("addressId", id);
    if (this.draft.addressId === id) this.route(this.addressReturn);
  },
  showModal(name) {
    this.previousFocus = document.activeElement;
    this.modal = name;
    this.message = "";
    this.error = "";
    this.$store.printUi.opened = true;
    this.$nextTick(() =>
      this.$refs.printDialog.querySelector("button:not(:disabled)")?.focus(),
    );
  },
  closeModal() {
    if (this.processing) return;
    this.modal = null;
    this.$store.printUi.opened = false;
    this.$nextTick(
      () => this.previousFocus?.isConnected && this.previousFocus.focus(),
    );
  },
  trap(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const nodes = [
      ...this.$refs.printDialog.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select",
      ),
    ].filter((n) => n.getClientRects().length);
    if (!nodes.length) return;
    const first = nodes[0],
      last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  },
  async submitOrder() {
    if (this.disabled || this.flowCompleted) return;
    const owner = requireOrderAccount();
    if (!owner) return;
    if (!this.online) {
      this.error = "请检查网络连接后重试。";
      return;
    }
    if (this.guardPendingPayment()) return;
    if (!this.draft.photo) {
      this.error = "请先选择照片。";
      return;
    }
    if (!this.address) {
      this.error = "请先添加收货地址。";
      this.openAddresses();
      return;
    }
    if (!this.canSubmit) {
      this.error = "请先获取有效的订单费用。";
      return;
    }
    if (
      !this.selectedLayout ||
      !!this.layoutError ||
      this.draft.quantity !== 1 ||
      this.draft.addon !== 0 ||
      !PRINT_LAYOUTS.some((l) => l.id === this.selectedLayout.id)
    ) {
      this.error = "仅支持两种背胶模切版式，每单固定1版。";
      return;
    }
    let id;
    const submitLocation = location.pathname + location.search;
    const quote = {
      ...this.quote,
    };
    try {
      await this.store.commit((state) => {
        const d = state.draft;
        let order = state.orders.find(
          (o) =>
            o.id === d.orderId && o.status === "pending" && o.owner === owner,
        );
        const now = new Date().toISOString();
        if (!order) {
          order = {
            id: printId(),
            owner,
            number:
              "ZP" +
              Date.now().toString() +
              printId().slice(0, 4).toUpperCase(),
            token: d.token,
            status: "pending",
            createdAt: now,
            events: [
              {
                title: "订单已创建",
                time: now,
              },
            ],
            tracking: null,
          };
          state.orders.unshift(order);
        }
        Object.assign(order, {
          photo: printPhotoCopy(d.photo),
          kind: d.kind,
          layout: d.layout,
          layoutSnapshot: printLayoutCopy(d.layoutSnapshot),
          quantity: d.quantity,
          addon: 0,
          address: printAddressCopy(
            state.addresses.find((a) => a.id === d.addressId),
          ),
          base: quote.unitPrice,
          addonPrice: 0,
          shipping: quote.shipping,
          total: quote.total,
        });
        d.orderId = order.id;
        id = order.id;
      });
      if (location.pathname + location.search === submitLocation) {
        this.orderId = id;
        this.checkoutPayment = true;
        this.demoOutcome = "success";
        this.showModal("payment");
      }
    } catch (_) {
      this.error = "订单提交失败，请重试。未发起支付。";
    }
  },
  continuePayment() {
    if (this.order?.status !== "pending" || this.disabled) return;
    if (!isCurrentPrintOrder(this.order)) {
      this.message = "此订单使用旧冲印规格或价格，请取消后按新规格重新下单。";
      return;
    }
    this.checkoutPayment = false;
    this.paymentMethod = this.order.method || "wechat";
    this.demoOutcome = "success";
    this.showModal("payment");
  },
  async pay() {
    if (this.disabled || this.order?.status !== "pending") return;
    if (!isCurrentPrintOrder(this.order)) {
      this.message = "此订单使用旧冲印规格或价格，请取消后按新规格重新下单。";
      return;
    }
    if (!this.online) {
      this.message = "请检查网络连接后重试。";
      return;
    }
    const id = this.order.id,
      method = this.paymentMethod,
      outcome = this.demoOutcome;
    this.processing = true;
    try {
      await this.store.commit((state) => {
        const o = state.orders.find((o) => o.id === id);
        o.status = "verifying";
        o.method = method;
        o.attempt = "processing";
        o.paymentResult = paymentResult("verifying");
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (outcome === "timeout") {
        await this.store.commit((state) => {
          state.orders.find((o) => o.id === id).attempt = "timeout";
        });
        this.modal = null;
        this.$store.printUi.opened = false;
        this.message = "支付响应超时，请先查询结果，避免重复付款。";
      } else if (outcome === "success") {
        await this.completePayment(id);
        const query = new URLSearchParams(location.search);
        if (this.checkoutPayment && this.view === "confirm") {
          this.modal = null;
          this.$store.printUi.opened = false;
          this.flowCompleted = true;
          this.message = "";
        } else if (
          query.get("page") === "orders" &&
          query.get("id") === "print:" + id
        ) {
          this.modal = null;
          this.$store.printUi.opened = false;
          this.message = "付款成功。";
        } else if (query.get("page") === "print" && query.get("order") === id) {
          this.route(
            "order",
            {
              order: id,
            },
            true,
          );
          this.message = "付款成功。";
        }
      } else {
        await this.store.commit((state) => {
          const o = state.orders.find((o) => o.id === id);
          o.status = "pending";
          o.attempt = outcome;
          o.paymentResult = paymentResult("pending", outcome);
        });
        this.message =
          outcome === "cancel"
            ? "已取消本次支付，订单保留为待支付。"
            : "支付未完成，请重试。";
      }
    } catch (_) {
      this.modal = null;
      this.$store.printUi.opened = false;
      this.error = "支付结果未能保存，请查询订单状态后再操作。";
    } finally {
      this.processing = false;
    }
  },
  async completePayment(id) {
    await this.store.commit((state) => {
      const o = state.orders.find((o) => o.id === id);
      if (!o || o.status !== "verifying") throw new Error("invalid payment");
      const now = new Date().toISOString();
      o.status = "producing";
      o.attempt = "success";
      o.paymentResult = paymentResult("paid", "success");
      o.paidAt = now;
      o.fulfillment = { status: "producing" };
      o.events.push({
        title: "支付成功，等待制作",
        time: now,
      });
      if (state.draft.orderId === id) {
        state.draft.completedOrderId = id;
        state.draft.orderId = null;
        state.draft.token = printId();
      }
    });
  },
  async resolvePayment() {
    if (this.disabled || this.order?.status !== "verifying") return;
    const id = this.order.id;
    this.processing = true;
    try {
      if (this.resolution === "paid") {
        await this.completePayment(id);
        this.route(
          "order",
          {
            order: id,
          },
          true,
        );
        this.message = "付款已确认。";
      } else if (this.resolution === "unpaid") {
        await this.store.commit((state) => {
          const o = state.orders.find((o) => o.id === id);
          o.status = "pending";
          o.attempt = "unpaid";
          o.paymentResult = paymentResult("pending", "unpaid");
        });
        this.modal = null;
        this.$store.printUi.opened = false;
        this.message = "查询结果：未支付，可继续支付。";
      } else this.message = "结果仍未确认，保留订单并稍后再查询。";
    } catch (_) {
      this.message = "结果保存失败，请稍后重试。";
    } finally {
      this.processing = false;
    }
  },
  async cancelOrder() {
    if (this.disabled || this.order?.status !== "pending") return;
    const id = this.order.id;
    try {
      await this.store.commit((state) => {
        const o = state.orders.find((o) => o.id === id);
        o.status = "cancelled";
        o.events.push({
          title: "订单已取消",
          time: new Date().toISOString(),
        });
        if (state.draft.orderId === id) {
          state.draft.orderId = null;
          state.draft.token = printId();
        }
      });
      this.closeModal();
    } catch (_) {
      this.message = "取消未保存，请重试。";
    }
  },
  async advanceOrder() {
    if (
      this.disabled ||
      !["producing", "printing", "shipped"].includes(this.order?.status)
    )
      return;
    const id = this.order.id;
    try {
      await this.store.commit((state) => {
        const o = state.orders.find((o) => o.id === id);
        const now = new Date().toISOString();
        if (o.status === "producing") {
          o.status = "printing";
          o.events.push({
            title: "开始制作",
            time: now,
          });
        } else if (o.status === "printing") {
          o.status = "shipped";
          o.fulfillment = { status: "shipped", shippedAt: now };
          o.tracking = {
            carrier: "物流配送",
            number: "DEMO-" + o.number,
          };
          o.events.push({
            title: "发货",
            time: now,
          });
        } else {
          o.status = "delivered";
          o.fulfillment = {
            ...o.fulfillment,
            status: "delivered",
            deliveredAt: now,
          };
          o.events.push({
            title: "已送达，等待用户确认收货",
            time: now,
          });
        }
      });
      this.closeModal();
    } catch (_) {
      this.message = "状态修改未保存，请重试。";
    }
  },
  async copyOrder() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard");
      await navigator.clipboard.writeText(this.order.number);
      this.message = "订单编号已复制。";
    } catch (_) {
      this.message = "请长按或选中订单编号手动复制。";
    }
  },
  async copyTracking() {
    try {
      if (!navigator.clipboard?.writeText || !this.order?.tracking)
        throw new Error("clipboard");
      await navigator.clipboard.writeText(this.order.tracking.number);
      this.message = "运单号已复制。";
    } catch (_) {
      this.message = "请长按或选中运单号手动复制。";
    }
  },
}));
export {
  printId,
  PRINT_LAYOUTS,
  printLayoutCopy,
  requestPrintLayouts,
  PRINT_PRICES,
  requestPrintQuote,
  printDraftSeed,
  printStateSeed,
  printDatabase,
  printPhotoCopy,
  printAddressCopy,
  plainPrintState,
  openPrintDatabase,
  readPrintState,
  writePrintState,
  printSlots,
  printSheetMarkup,
};
