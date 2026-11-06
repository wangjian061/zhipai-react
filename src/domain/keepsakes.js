import {
  cleanShippingAddress,
  shippingAddressError,
} from "./shipping-address.js";
import {
  registerStore,
  registerController,
  getStore,
  storageValue,
} from "../runtime/state.js";
import { photoCropBounds } from "./album.js";
import {
  requireOrderAccount,
  orderNavigate,
  openOrderCenter,
  safeOrderPath,
} from "./order-routing.js";
import {
  paymentResult,
  transactionState,
  printFulfillment,
} from "./order-status.js";
import {
  STAMP_PANE,
  KEEPSAKE_PRODUCTS,
  KEEPSAKE_TEMPLATES,
  templateFor,
  photoData,
  decodeKeepsakePhoto,
  renderKeepsake,
  templateGeometry,
  orientedPhoto,
} from "./keepsake-templates.js";

let dbPromise;
function db() {
  return (dbPromise ||= new Promise((resolve, reject) => {
    const q = indexedDB.open("zhipai-keepsake-orders", 1);
    q.onupgradeneeded = () => q.result.createObjectStore("orders");
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
    q.onblocked = () => reject(Error("订单存储被占用"));
  }).catch((e) => {
    dbPromise = null;
    throw e;
  }));
}
async function read() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const q = d.transaction("orders").objectStore("orders").get("all");
    q.onsuccess = () => resolve(q.result || []);
    q.onerror = () => reject(q.error);
  });
}
// Read the latest snapshot and change it in one IndexedDB transaction, including across tabs.
async function updateOrders(update) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("orders", "readwrite"),
      store = tx.objectStore("orders");
    let next, failure;
    const request = store.get("all");
    request.onsuccess = () => {
      try {
        next = request.result || [];
        update(next);
        store.put(storageValue(next), "all");
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(failure || tx.error || Error("订单更新失败"));
    tx.onerror = () => reject(failure || tx.error);
  });
}
function markPaid(order) {
  order.paidAt = Date.now();
  if (order.kind === "stamp" && order.studentProof) {
    order.review = "pending";
    order.fulfillment = null;
  } else order.fulfillment = { status: "producing" };
}
const freshTransform = () => ({ scale: 1, offsetX: 0, offsetY: 0 });
registerStore("keepsakeUi", { opened: false });
registerStore("keepsakeOrders", {
  items: [],
  ready: false,
  busy: false,
  error: "",
  loading: null,
  refundTimer: null,
  init() {
    this.loading = this.load();
  },
  async load() {
    this.error = "";
    try {
      this.items = await read();
      this.ready = true;
      this.scheduleRefunds();
    } catch {
      this.error = "定制订单读取失败，请重试。";
    }
  },
  async commit(update) {
    if (!this.ready || this.busy) throw Error("订单尚未就绪，请重试。");
    this.busy = true;
    try {
      this.items = await updateOrders(update);
      window.dispatchEvent(new Event("zhipai-orders-updated"));
    } finally {
      this.busy = false;
      this.scheduleRefunds();
    }
  },
  scheduleRefunds() {
    clearTimeout(this.refundTimer);
    const due = this.items.filter(
      (o) =>
        o.demo &&
        o.review === "rejected" &&
        o.refund?.status === "refunding" &&
        o.refund.demoDueAt,
    );
    if (!due.length) return;
    this.refundTimer = setTimeout(
      async () => {
        if (this.busy) {
          this.scheduleRefunds();
          return;
        }
        try {
          await this.commit((items) => {
            const now = Date.now();
            for (const o of items)
              if (
                o.demo &&
                o.review === "rejected" &&
                o.refund?.status === "refunding" &&
                o.refund.demoDueAt <= now
              ) {
                o.refund = { ...o.refund, status: "refunded", refundedAt: now };
              }
          });
        } catch {
          clearTimeout(this.refundTimer);
          this.error = "退款结果暂未更新，请重新读取原单。";
        }
      },
      Math.max(
        250,
        Math.min(...due.map((o) => o.refund.demoDueAt)) - Date.now(),
      ),
    );
  },
});
export async function confirmKeepsakeReceipt(id, owner) {
  if (!owner || getStore("account")?.session?.phone !== owner)
    throw Error("请重新登录后查看订单。");
  if (navigator.onLine === false) throw Error("网络不可用，请恢复连接后重试。");
  await getStore("keepsakeOrders").commit((items) => {
    const o = items.find((x) => x.id === id && x.owner === owner && !x.fixture);
    if (
      !o ||
      transactionState(o) !== "paid" ||
      (o.review && o.review !== "approved")
    )
      throw Error("订单状态已变化，请重新查看。");
    if (printFulfillment(o)?.id === "received") return;
    if (printFulfillment(o)?.id !== "delivered")
      throw Error("商品尚未送达，暂不能确认收货。");
    o.fulfillment = {
      status: "received",
      confirmedAt: new Date().toISOString(),
    };
  });
}
export function openKeepsake(kind, photo = null, templateId = null) {
  if (!KEEPSAKE_PRODUCTS[kind]) return;
  window.dispatchEvent(
    new CustomEvent("zhipai-keepsake-open", {
      detail: {
        kind,
        photo,
        templateId,
        returnTo: location.pathname + location.search,
      },
    }),
  );
}
const id = () => crypto.randomUUID();
registerController("keepsakeStudio", () => ({
  kind: "postcard",
  view: "templates",
  templateId: "postcard-enrollment",
  photo: null,
  image: null,
  transform: freshTransform(),
  cornerTransform: freshTransform(),
  activeSlot: "center",
  cropDraft: null,
  detachedCropPath: null,
  stampView: "inner",
  studentProof: null,
  get activeTransform() {
    if (this.cropDraft) return this.cropDraft[this.activeSlot];
    return this.kind === "stamp" && this.activeSlot === "corners"
      ? this.cornerTransform
      : this.transform;
  },
  get composition() {
    return this.kind === "stamp"
      ? { center: this.transform, corners: this.cornerTransform }
      : this.transform;
  },
  get proofReady() {
    return this.kind !== "stamp" || !!this.studentProof;
  },
  output: null,
  outputURL: "",
  panel: null,
  panelReturn: "",
  error: "",
  notice: "",
  busy: false,
  paying: false,
  returnTo: "/?page=home",
  orderId: null,
  token: 0,
  entryRevision: 0,
  selectionId: null,
  candidateId: null,
  gesture: null,
  pointers: new Map(),
  addressId: null,
  addressFields: {
    name: "",
    phone: "",
    region: "",
    street: "",
    postal: "",
    default: false,
  },
  paymentMethod: "wechat",
  demoOutcome: "success",
  resolution: "paid",
  get orders() {
    return this.$store.keepsakeOrders;
  },
  get product() {
    return KEEPSAKE_PRODUCTS[this.kind];
  },
  get template() {
    return templateFor(this.templateId);
  },
  get templates() {
    return KEEPSAKE_TEMPLATES.filter((x) => x.kind === this.kind);
  },
  get order() {
    return this.orders.items.find(
      (x) =>
        x.id === this.orderId && x.owner === this.$store.account.session?.phone,
    );
  },
  get address() {
    const order = this.order;
    if (order && ["verifying", "paid"].includes(order.status))
      return order.address || null;
    return (
      this.$store.printLibrary.addresses.find((x) => x.id === this.addressId) ||
      null
    );
  },
  get total() {
    return this.order?.total ?? this.product.price + this.product.shipping;
  },
  get purchaseLocked() {
    return ["verifying", "paid"].includes(this.order?.status);
  },
  get locked() {
    return this.busy || this.paying || this.orders.busy;
  },
  get canPay() {
    if (this.order?.status === "verifying")
      return (
        this.view === "confirm" &&
        this.orders.ready &&
        !this.locked &&
        navigator.onLine !== false
      );
    return !!(
      this.view === "confirm" &&
      this.photo &&
      this.output &&
      this.proofReady &&
      this.address &&
      this.orders.ready &&
      !this.locked &&
      navigator.onLine !== false
    );
  },
  init() {
    this.onOpen = (e) => this.enter(e.detail);
    this.onRoute = (event) => this.sync(event);
    this.onTemplate = (e) => this.chooseTemplate(e.detail);
    this.onCreatedPhoto = ({ detail: { context, photo } }) => {
      if (
        this.page !== "keepsake" ||
        this.view !== "work" ||
        this.locked ||
        this.purchaseLocked ||
        context.intent !== "keepsake" ||
        context.action !== this.kind ||
        context.returnTo !== location.pathname + location.search ||
        !context.selectionId ||
        (this.selectionId && this.selectionId !== context.selectionId)
      )
        return;
      // Camera sessions retain the source template even if the page was refreshed during production.
      if (templateFor(context.templateId)?.kind === this.kind)
        this.templateId = context.templateId;
      this.selectionId = null;
      if (!photo?.blob) {
        this.error = "新制作的照片暂不可用，请重新选取。";
        return;
      }
      return this.accept(photo, "finished");
    };
    window.addEventListener("zhipai-keepsake-open", this.onOpen);
    window.addEventListener("zhipai-keepsake-template", this.onTemplate);
    window.addEventListener("zhipai-route", this.onRoute);
    window.addEventListener("popstate", this.onRoute);
    window.addEventListener("zhipai-keepsake-created", this.onCreatedPhoto);
    this.$watch("$store.keepsakeOrders.ready", () => this.sync());
    this.$watch("$store.account.session.phone", (phone, previous) => {
      if (previous && previous !== phone) {
        this.token++;
        this.selectionId = this.candidateId = null;
        this.release();
        this.photo = null;
        this.image = null;
        this.studentProof = null;
        this.busy = false;
        this.error = "";
        this.orderId = null;
        this.cropDraft = null;
        this.gesture = null;
        this.pointers.clear();
        this.panel = null;
        this.$store.keepsakeUi.opened = false;
      }
    });
    this.sync();
  },
  destroy() {
    this.token++;
    this.release();
    window.removeEventListener("zhipai-keepsake-open", this.onOpen);
    window.removeEventListener("zhipai-keepsake-template", this.onTemplate);
    window.removeEventListener("zhipai-route", this.onRoute);
    window.removeEventListener("popstate", this.onRoute);
    window.removeEventListener("zhipai-keepsake-created", this.onCreatedPhoto);
    this.$store.keepsakeUi.opened = false;
  },
  release() {
    if (this.outputURL) URL.revokeObjectURL(this.outputURL);
    this.outputURL = "";
    this.output = null;
  },
  route(view, replace = false) {
    this.view = view;
    const q = new URLSearchParams({
      page: "keepsake",
      kind: this.kind,
      view,
      back: safeOrderPath(this.returnTo),
    });
    if (this.orderId) q.set("order", this.orderId);
    orderNavigate("/?" + q, replace);
  },
  sync(event) {
    if (event?.type === "popstate" && this.detachedCropPath) {
      if (location.pathname + location.search === this.detachedCropPath) {
        const url = new URL(location.href);
        url.searchParams.delete("order");
        history.replaceState(history.state, "", url.pathname + url.search);
      }
      this.detachedCropPath = null;
    }
    if (this.panel === "keepsakeCrop" && event?.type === "popstate") {
      this.close(false);
      if (location.pathname + location.search === this.panelReturn) return;
    }
    if (
      this.panel &&
      this.panelReturn &&
      location.pathname + location.search !== this.panelReturn
    ) {
      const target = this.panelReturn;
      if (!this.paying) {
        if (this.panel === "album" && this.busy) {
          this.token++;
          this.busy = false;
        }
        this.close();
      }
      orderNavigate(target, true);
      return;
    }
    const q = new URLSearchParams(location.search);
    if (q.get("page") !== "keepsake") {
      if (q.get("page") !== "camera") this.selectionId = null;
      if (this.busy) {
        this.token++;
        this.busy = false;
      }
      this.close();
      return;
    }
    if (this.paying) return;
    const kind = KEEPSAKE_PRODUCTS[q.get("kind")] ? q.get("kind") : "postcard";
    const nextView = ["templates", "work", "confirm", "result"].includes(
      q.get("view"),
    )
      ? q.get("view")
      : "templates";
    if (this.busy && (kind !== this.kind || nextView !== this.view)) {
      this.token++;
      this.busy = false;
    }
    if (kind !== this.kind) {
      this.token++;
      this.selectionId = null;
      this.release();
      this.kind = kind;
      this.templateId = this.templates[0].id;
      this.studentProof = null;
      this.cornerTransform = freshTransform();
      this.activeSlot = "center";
      this.stampView = "inner";
      this.photo = null;
      this.image = null;
      this.orderId = null;
    }
    this.returnTo = safeOrderPath(q.get("back") || this.returnTo);
    this.view = nextView;
    const requested = q.get("order");
    if (requested && requested !== this.orderId && this.orders.ready) {
      const o = this.orders.items.find(
        (x) =>
          x.id === requested &&
          x.kind === kind &&
          x.owner === this.$store.account.session?.phone,
      );
      if (o) {
        this.orderId = o.id;
        this.templateId = templateFor(o.templateId)?.id || this.templates[0].id;
        this.studentProof = o.studentProof || null;
        this.cornerTransform = { ...freshTransform(), ...o.cornerTransform };
        this.image = null;
        this.photo = o.photo;
        this.transform = { ...freshTransform(), ...o.transform };
        this.release();
        this.output = o.output;
        this.outputURL = URL.createObjectURL(o.output);
        this.addressId = o.addressId;
        if (nextView === "work" && !this.purchaseLocked && this.photo)
          void this.restoreOrderPhoto();
      } else {
        this.orderId = null;
        this.release();
        this.studentProof = null;
        this.photo = null;
        this.image = null;
        this.error = "订单不存在或不属于当前账号。";
        this.route("work", true);
        return;
      }
    }
    if (this.order?.status === "paid" && this.view !== "result") {
      this.route("result", true);
      return;
    }
    if (this.order?.status === "verifying" && this.view !== "confirm") {
      this.route("confirm", true);
      return;
    }
    if (this.view === "result" && this.order?.status !== "paid")
      this.view = this.output ? "confirm" : "work";
    if (this.view === "confirm" && !this.output) this.view = "work";
    if (nextView === "templates") this.route("work", true);
    if (event?.type === "popstate" && history.state?.keepsakeCrop)
      this.editComposition(false);
  },
  async enter({ kind, photo, returnTo, templateId }) {
    if (this.locked || !KEEPSAKE_PRODUCTS[kind]) return;
    const revision = ++this.entryRevision,
      source = location.pathname + location.search;
    await this.orders.loading;
    if (
      revision !== this.entryRevision ||
      source !== location.pathname + location.search
    )
      return;
    if (!this.orders.ready) {
      this.kind = kind;
      this.templateId = this.templates[0].id;
      this.error = "定制订单尚未就绪，请重试。";
      this.returnTo = safeOrderPath(returnTo);
      this.route("work");
      return;
    }
    const pending = this.orders.items.find(
      (o) =>
        o.owner === this.$store.account.session?.phone &&
        o.kind === kind &&
        o.status === "verifying",
    );
    if (pending) {
      this.orderId = null;
      this.returnTo = safeOrderPath(returnTo);
      orderNavigate(
        "/?" +
          new URLSearchParams({
            page: "keepsake",
            kind,
            view: "confirm",
            order: pending.id,
            back: this.returnTo,
          }),
      );
      this.open("resolution");
      return;
    }
    this.token++;
    this.selectionId = null;
    this.release();
    this.kind = kind;
    this.templateId = this.templates[0].id;
    this.photo = null;
    this.image = null;
    this.orderId = null;
    this.error = "";
    this.notice = "";
    this.returnTo = safeOrderPath(returnTo);
    this.addressId =
      this.$store.printLibrary.addresses.find((a) => a.default)?.id || null;
    this.transform = freshTransform();
    this.cornerTransform = freshTransform();
    this.activeSlot = "center";
    this.studentProof = null;
    this.stampView = "inner";
    if (kind === "postcard" && templateFor(templateId)?.kind === kind)
      this.templateId = templateId;
    this.route("work");
    if (photo) await this.accept(photo, "finished");
  },
  chooseTemplate(value) {
    if (this.panel || this.locked || this.purchaseLocked) return;
    const t = templateFor(value);
    if (
      !t ||
      t.kind !== this.kind ||
      (value === this.templateId && this.view === "work")
    )
      return;
    this.templateId = value;
    this.orderId = null;
    this.release();
    this.error = "";
    if (this.view !== "work") this.route("work");
  },
  pick() {
    if (this.view !== "work" || this.locked || this.purchaseLocked) return;
    this.error = "";
    this.candidateId = this.photo?.id || null;
    this.open("album");
  },
  selectCandidate(value) {
    if (this.panel !== "album" || this.locked) return;
    if (this.$store.photoLibrary.finished.some((p) => p.id === value && p.blob))
      this.candidateId = value;
  },
  async useCandidate() {
    const library = this.$store.photoLibrary;
    if (
      !library.ready ||
      library.busy ||
      this.panel !== "album" ||
      this.locked ||
      this.purchaseLocked
    )
      return;
    const photo = library.finished.find(
      (p) => p.id === this.candidateId && p.blob,
    );
    if (!photo) return;
    if (
      photo.id === this.photo?.id &&
      photo.blob === this.photo.blob &&
      this.image
    ) {
      this.close();
      return;
    }
    if (await this.accept(photo, "finished")) this.close();
  },
  async usePhoneFile(file) {
    if (!file || this.panel !== "album" || this.locked || this.purchaseLocked)
      return;
    const photo = {
      id: "keepsake-upload-" + id(),
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
    };
    if (await this.accept(photo, "phone")) this.close();
  },
  makePhoto() {
    if (
      this.panel !== "album" ||
      this.locked ||
      this.purchaseLocked ||
      !this.$store.photoLibrary.ready
    )
      return;
    this.close();
    this.selectionId = id();
    const context = {
      intent: "keepsake",
      action: this.kind,
      selectionId: this.selectionId,
      returnTo: location.pathname + location.search,
      templateId: this.templateId,
    };
    window.dispatchEvent(
      new CustomEvent("zhipai-camera-open", {
        detail: { returnTo: context.returnTo },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("zhipai-camera-intent", { detail: context }),
    );
    this.go("camera");
  },
  async accept(photo, kind) {
    if (
      this.locked ||
      this.purchaseLocked ||
      !["phone", "finished"].includes(kind)
    )
      return;
    if (kind === "finished")
      photo = this.$store.photoLibrary.finished.find(
        (x) => x.id === photo?.id && x.blob,
      );
    if (!photo) return;
    const token = ++this.token;
    this.busy = true;
    this.error = "";
    try {
      const image = await photoData(photo);
      if (token !== this.token) return;
      this.photo =
        kind === "phone"
          ? { ...photo, width: image.width, height: image.height }
          : photo;
      this.image = image;
      this.transform = freshTransform();
      this.cornerTransform = freshTransform();
      this.release();
      this.orderId = null;
      return true;
    } catch (e) {
      if (token === this.token)
        this.error = e.message || "照片读取失败，请更换照片。";
    } finally {
      if (token === this.token) this.busy = false;
    }
  },
  async acceptProof(file) {
    if (
      !file ||
      this.kind !== "stamp" ||
      this.view !== "work" ||
      this.locked ||
      this.purchaseLocked
    )
      return;
    const token = ++this.token;
    this.busy = true;
    this.error = "";
    try {
      await decodeKeepsakePhoto({ blob: file });
      if (token !== this.token) return;
      this.studentProof = file;
      this.orderId = null;
    } catch (error) {
      if (token === this.token)
        this.error = error.message || "学生证图片读取失败，请重新上传。";
    } finally {
      if (token === this.token) this.busy = false;
    }
  },
  editComposition(addHistory = true) {
    if (
      this.view !== "work" ||
      !this.image ||
      this.panel ||
      this.locked ||
      this.purchaseLocked
    )
      return;
    this.cropDraft = {
      center: { ...this.transform },
      corners: { ...this.cornerTransform },
    };
    this.activeSlot = "center";
    this.open("keepsakeCrop");
    if (addHistory)
      history.pushState(
        { ...history.state, keepsakeCrop: true },
        "",
        this.panelReturn,
      );
  },
  applyCrop() {
    if (
      !this.cropDraft ||
      this.panel !== "keepsakeCrop" ||
      this.locked ||
      this.purchaseLocked
    )
      return;
    const { center, corners } = this.cropDraft;
    const changed = [this.transform, this.cornerTransform].some(
      (saved, index) => {
        const draft = index === 0 ? center : corners;
        return (
          saved.scale !== draft.scale ||
          saved.offsetX !== draft.offsetX ||
          saved.offsetY !== draft.offsetY ||
          (saved.rotation || 0) !== (draft.rotation || 0)
        );
      },
    );
    if (changed) {
      if (
        this.orderId &&
        new URLSearchParams(location.search).get("order") === this.orderId
      )
        this.detachedCropPath = this.panelReturn;
      this.transform = center;
      this.cornerTransform = corners;
      this.release();
      this.orderId = null;
    }
    this.close();
  },
  setTransform(next) {
    if (this.locked || this.purchaseLocked) return;
    const value = {
      scale: Math.max(1, Math.min(3, Number(next.scale) || 1)),
      offsetX: Math.max(-100, Math.min(100, Number(next.offsetX) || 0)),
      offsetY: Math.max(-100, Math.min(100, Number(next.offsetY) || 0)),
    };
    if (this.kind === "postcard" && [90, 180, 270].includes(next.rotation))
      value.rotation = next.rotation;
    if (this.panel === "keepsakeCrop" && this.cropDraft)
      this.cropDraft[this.activeSlot] = value;
  },
  turnPostcard(clockwise) {
    if (this.kind !== "postcard" || !this.cropDraft) return;
    this.pointers.clear();
    this.gesture = null;
    const t = this.activeTransform;
    const direction = clockwise ? 1 : -1;
    this.setTransform({
      ...t, rotation: ((t.rotation || 0) + 360 + direction * 90) % 360,
      offsetX: -direction * t.offsetY, offsetY: direction * t.offsetX,
    });
  },
  resetTransform() {
    this.setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  },
  pointerDown(e) {
    if (
      !this.image ||
      this.locked ||
      this.purchaseLocked ||
      this.pointers.size >= 2 ||
      !this.cropDraft
    )
      return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!this.pointers.size) {
      const geometry = templateGeometry(this.template);
      const { slots } = geometry;
      const viewport = this.kind === "stamp" ? STAMP_PANE : geometry;
      const x =
        (viewport.x ?? 0) +
        ((e.clientX - rect.left) * viewport.width) / rect.width;
      const y =
        (viewport.y ?? 0) +
        ((e.clientY - rect.top) * viewport.height) / rect.height;
      const slot = slots.find(
        (s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h,
      );
      if (!slot) return;
      if (slot.group) this.activeSlot = slot.group;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.gesture = {
      transform: { ...this.activeTransform },
      points: [...this.pointers.values()],
      rect,
    };
  },
  pointerMove(e) {
    if (!this.gesture || !this.pointers.has(e.pointerId) || this.locked) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...this.pointers.values()],
      g = this.gesture;
    if (points.length === 2 && g.points.length === 2) {
      const d = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        ),
        old = Math.hypot(
          g.points[0].x - g.points[1].x,
          g.points[0].y - g.points[1].y,
        );
      this.setTransform({
        ...g.transform,
        scale: (g.transform.scale * d) / Math.max(1, old),
      });
    } else if (points.length === 1 && this.image) {
      const geometry = templateGeometry(this.template);
      const slot =
        geometry.slots.find((item) => item.group === this.activeSlot) ||
        geometry.slots[0];
      const oriented = orientedPhoto(this.image, g.transform.rotation);
      const crop = photoCropBounds(
        oriented.width,
        oriented.height,
        slot.w,
        slot.h,
        g.transform,
      );
      const width = this.kind === "stamp" ? STAMP_PANE.width : geometry.width;
      const photoScale = ((g.rect.width / width) * slot.w) / crop.w;
      const travelX = (oriented.width - crop.w) * photoScale;
      const travelY = (oriented.height - crop.h) * photoScale;
      this.setTransform({
        ...g.transform,
        offsetX:
          travelX > 0
            ? g.transform.offsetX -
              ((points[0].x - g.points[0].x) * 200) / travelX
            : g.transform.offsetX,
        offsetY:
          travelY > 0
            ? g.transform.offsetY -
              ((points[0].y - g.points[0].y) * 200) / travelY
            : g.transform.offsetY,
      });
    }
  },
  pointerUp(e) {
    if (!this.pointers.delete(e.pointerId)) return;
    this.gesture = this.pointers.size
      ? {
          transform: { ...this.activeTransform },
          points: [...this.pointers.values()],
          rect: e.currentTarget.getBoundingClientRect(),
        }
      : null;
  },
  async confirm() {
    if (this.order?.status === "paid") {
      this.route("result", true);
      return;
    }
    if (
      this.view !== "work" ||
      !this.photo ||
      !this.image ||
      !this.proofReady ||
      this.panel ||
      this.locked
    )
      return;
    if (this.order?.status === "verifying") {
      this.open("resolution");
      return;
    }
    const token = ++this.token;
    const path = location.pathname + location.search;
    const template = this.template,
      photo = this.photo;
    this.busy = true;
    this.error = "";
    try {
      const blob = await renderKeepsake(
        this.template,
        this.image,
        this.composition,
      );
      if (
        token !== this.token ||
        this.view !== "work" ||
        path !== location.pathname + location.search ||
        template !== this.template ||
        photo !== this.photo
      )
        return;
      this.release();
      this.output = blob;
      this.outputURL = URL.createObjectURL(blob);
      this.route("confirm");
    } catch (e) {
      if (token === this.token)
        this.error = e.message || "成品生成失败，请重试。";
    } finally {
      if (token === this.token) this.busy = false;
    }
  },
  open(panel) {
    if (
      this.locked ||
      (this.purchaseLocked &&
        ["addresses", "addressEdit", "payment"].includes(panel))
    )
      return;
    this.panelReturn = location.pathname + location.search;
    this.panel = panel;
    this.$store.keepsakeUi.opened = true;
  },
  close(popCrop = true) {
    if (this.paying) return;
    const returnToProduct =
      popCrop && this.panel === "keepsakeCrop" && history.state?.keepsakeCrop;
    if (this.panel === "album") {
      this.candidateId = null;
      this.error = "";
    }
    if (this.panel === "keepsakeCrop") {
      this.cropDraft = null;
      this.gesture = null;
      this.pointers.clear();
    }
    this.panel = null;
    this.$store.keepsakeUi.opened = false;
    if (returnToProduct) history.back();
  },
  chooseAddress(value) {
    if (this.locked || this.purchaseLocked) return;
    if (!this.$store.printLibrary.addresses.some((a) => a.id === value)) return;
    if (this.addressId !== value && this.order?.status === "pending")
      this.orderId = null;
    this.addressId = value;
    this.close();
    this.route("confirm", true);
  },
  async saveAddress() {
    if (this.locked || this.purchaseLocked) return;
    const address = cleanShippingAddress(this.addressFields, id());
    this.error = shippingAddressError(address);
    if (this.error) return;
    this.busy = true;
    try {
      await this.$store.printLibrary.commit((s) => {
        if (address.default)
          s.addresses.forEach((a) => {
            a.default = false;
          });
        s.addresses.push(address);
      });
      this.orderId = null;
      this.addressId = address.id;
      this.error = "";
      this.busy = false;
      this.close();
      this.route("confirm", true);
    } catch {
      this.error = "地址保存失败，请重试。";
    } finally {
      this.busy = false;
    }
  },
  requestPayment() {
    if (!this.canPay) return;
    const owner = requireOrderAccount();
    if (!owner) return;
    if (this.order?.status === "paid") {
      this.route("result");
      return;
    }
    this.open(this.order?.status === "verifying" ? "resolution" : "payment");
  },
  async pay(outcome = this.demoOutcome) {
    if (
      !this.canPay ||
      this.paying ||
      this.panel !== "payment" ||
      !["success", "failure", "cancel", "unknown"].includes(outcome)
    )
      return;
    const owner = requireOrderAccount();
    if (!owner) return;
    this.paying = true;
    this.error = "";
    try {
      let current = this.order;
      if (current?.status === "paid") {
        this.paying = false;
        this.close();
        this.route("result");
        return;
      }
      const orderId = this.orderId || id();
      if (!current) {
        const t = this.template,
          product = this.product;
        const snapshot = {
          id: orderId,
          number: "ZP" + Date.now() + orderId.slice(0, 6),
          owner,
          kind: this.kind,
          templateId: t.id,
          templateName: t.name,
          ...(this.kind === "postcard"
            ? { material: product.material, size: product.size }
            : {}),
          price: product.price,
          shipping: product.shipping,
          total: product.price + product.shipping,
          quantity: 1,
          count: product.count,
          unit: product.unit,
          photo: { ...this.photo },
          transform: { ...this.transform },
          ...(this.kind === "stamp"
            ? {
                cornerTransform: { ...this.cornerTransform },
                studentProof: this.studentProof,
              }
            : {}),
          output: this.output,
          addressId: this.addressId,
          address: { ...this.address },
          createdAt: Date.now(),
          status: "pending",
          demo: true,
        };
        await this.orders.commit((items) => items.unshift(snapshot));
        this.orderId = orderId;
      }
      await this.orders.commit((items) => {
        const o = items.find((x) => x.id === orderId && x.owner === owner);
        if (!o || o.status === "paid" || o.status === "verifying") return;
        if (getStore("account")?.session?.phone !== owner)
          throw Error("账号已变化，请重新登录确认。");
        o.method = this.paymentMethod;
        o.status =
          outcome === "success"
            ? "paid"
            : outcome === "unknown"
              ? "verifying"
              : "pending";
        o.paymentResult = paymentResult(o.status, outcome);
        if (o.status === "paid") {
          markPaid(o);
        }
      });
      this.paying = false;
      this.close();
      if (this.order?.status === "paid") this.route("result");
      else {
        this.route("confirm", true);
        if (outcome === "unknown") this.open("resolution");
        else
          this.error =
            outcome === "cancel"
              ? "已取消付款，照片、模板与地址已保留。"
              : "付款未完成，可使用本单重试。";
      }
    } catch (e) {
      this.error = e.message || "付款结果记录失败，请查询原单后再重试。";
    } finally {
      this.paying = false;
    }
  },
  async resolvePayment() {
    if (this.order?.status !== "verifying" || this.locked) return;
    this.paying = true;
    try {
      const owner = this.$store.account.session?.phone;
      await this.orders.commit((items) => {
        const o = items.find((x) => x.id === this.orderId && x.owner === owner);
        if (
          getStore("account")?.session?.phone !== owner ||
          !o ||
          o.status !== "verifying"
        )
          throw Error("订单状态已变化。");
        if (this.resolution === "unknown") return;
        o.status = this.resolution === "paid" ? "paid" : "pending";
        o.paymentResult = paymentResult(
          o.status,
          this.resolution === "paid" ? "success" : "failure",
        );
        if (o.status === "paid") {
          markPaid(o);
        }
      });
      this.paying = false;
      if (this.resolution !== "unknown") {
        this.close();
        this.route(this.order?.status === "paid" ? "result" : "confirm", true);
      } else this.error = "付款结果仍未确认，请稍后继续查询本单。";
    } catch (e) {
      this.error = e.message || "查询失败，请重试。";
    } finally {
      this.paying = false;
    }
  },
  async demoReview(outcome) {
    if (
      !["approved", "rejected"].includes(outcome) ||
      this.locked ||
      this.order?.review !== "pending"
    )
      return;
    const owner = this.$store.account.session?.phone,
      orderId = this.orderId;
    this.error = "";
    try {
      await this.orders.commit((items) => {
        const o = items.find((x) => x.id === orderId && x.owner === owner);
        if (
          !o?.demo ||
          o.status !== "paid" ||
          o.review !== "pending" ||
          getStore("account").session?.phone !== owner
        )
          throw Error("审核状态已变化，请重新查看。");
        o.review = outcome;
        o.reviewedAt = Date.now();
        delete o.studentProof;
        if (outcome === "approved") {
          o.fulfillment = { status: "producing" };
          return;
        }
        o.cancelledAt = o.reviewedAt;
        o.refund = {
          method: "original",
          amount: o.total,
          status: "refunding",
          requestedAt: o.reviewedAt,
          demoDueAt: o.reviewedAt + 2200,
        };
      });
      this.studentProof = null;
    } catch (error) {
      this.error = error.message || "审核结果保存失败，请重试。";
    }
  },
  viewOrder() {
    if (!this.order) return;
    const q = new URLSearchParams({
      page: "orders",
      type: this.kind,
      status: "all",
      id: this.kind + ":" + this.order.id,
      back: "/?page=my",
    });
    orderNavigate("/?" + q);
  },
  async restoreOrderPhoto() {
    const token = ++this.token;
    this.busy = true;
    this.error = "";
    try {
      const image = await photoData(this.photo);
      if (token !== this.token) return false;
      this.image = image;
      return true;
    } catch (error) {
      if (token === this.token) this.error = error.message;
      return false;
    } finally {
      if (token === this.token) this.busy = false;
    }
  },
  async back() {
    if (this.locked) return;
    if (this.panel) {
      this.close();
      return;
    }
    if (this.order?.status === "verifying") {
      this.open("resolution");
      return;
    }
    if (this.view === "confirm") {
      if (!this.image && this.photo && !(await this.restoreOrderPhoto()))
        return;
      this.route("work");
    } else orderNavigate(safeOrderPath(this.returnTo));
  },
}));
