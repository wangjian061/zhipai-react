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
  createHandoff, finishHandoff, handoffStatus, lockPayment,
  paymentReturnBlocked, presentHandoff,
} from "./payment-handoff.js";
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
  loadKeepsakeFrame,
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
  previewRevision: 0,
  previewFrames: new Map(),
  previewFrame: null,
  previewRequest: null,
  previewLoading: false,
  previewError: "",
  checkoutFromPreview: false,
  cameraPreviewReturn: null,
  get isProductView() {
    return this.view === "work" || this.view === "templates";
  },
  get previewReady() {
    return !!(this.photo && this.image && !this.previewLoading && !this.previewError &&
      this.previewFrame?.templateId === this.templateId);
  },
  get canContinue() {
    return this.previewReady && !this.locked && !this.purchaseLocked;
  },
  stampView: "inner",
  studentProof: null,
  studentProofURL: "",
  proofError: "",
  proofReading: false,
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
  checkoutResolution: "unknown",
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
        !this.isProductView ||
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
      return this.startPhotoPreview(photo, "finished");
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
        this.resetPreview();
        this.selectionId = this.candidateId = null;
        this.release();
        this.photo = null;
        this.image = null;
        this.setStudentProof(null);
        this.proofReading = this.busy = false;
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
    this.setStudentProof(null);
    this.resetPreview();
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
    if (paymentReturnBlocked()) return;
    if (event?.type === "popstate" && this.detachedCropPath) {
      if (location.pathname + location.search === this.detachedCropPath) {
        const url = new URL(location.href);
        url.searchParams.delete("order");
        history.replaceState(history.state, "", url.pathname + url.search);
      }
      this.detachedCropPath = null;
    }
    if (event?.type === "popstate" && this.cropDraft) {
      const sameProduct = location.pathname + location.search === this.panelReturn;
      if (sameProduct && history.state?.keepsakeCrop && !history.state.keepsakePicker) {
        if (this.panel === "album") this.dismissPreviewPicker(false);
        return;
      }
      this.close(false);
      if (sameProduct) return;
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
      if (q.get("page") !== "camera") {
        this.selectionId = null;
        this.cameraPreviewReturn = null;
      }
      if (this.previewLoading) {
        this.previewRevision++;
        this.previewLoading = false;
      }
      if (this.busy) {
        this.token++;
        this.proofReading = this.busy = false;
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
      this.proofReading = this.busy = false;
    }
    if (kind !== this.kind) {
      this.token++;
      this.resetPreview();
      this.selectionId = null;
      this.release();
      this.kind = kind;
      this.templateId = this.templates[0].id;
      this.setStudentProof(null);
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
        this.resetPreview();
        this.orderId = o.id;
        this.templateId = templateFor(o.templateId)?.id || this.templates[0].id;
        this.setStudentProof(o.studentProof);
        this.cornerTransform = { ...freshTransform(), ...o.cornerTransform };
        this.image = null;
        this.photo = o.photo;
        this.transform = { ...freshTransform(), ...o.transform };
        this.release();
        this.output = o.output;
        this.outputURL = URL.createObjectURL(o.output);
        this.addressId = o.addressId;
        if (this.isProductView && !this.purchaseLocked && this.photo)
          void this.restoreOrderPhoto();
      } else {
        this.resetPreview();
        this.orderId = null;
        this.release();
        this.setStudentProof(null);
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
    if (this.cameraPreviewReturn === location.pathname + location.search && this.isProductView) {
      this.cameraPreviewReturn = null;
      this.editComposition();
    } else if (event?.type === "popstate" && history.state?.keepsakeCrop) {
      this.editComposition(false);
    }
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
    this.resetPreview();
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
    this.setStudentProof(null);
    this.stampView = "inner";
    if (kind === "postcard" && templateFor(templateId)?.kind === kind)
      this.templateId = templateId;
    this.route("work");
    if (photo) await this.startPhotoPreview(photo, "finished");
  },
  chooseTemplate(value) {
    if ((this.panel && this.panel !== "keepsakeCrop") || this.locked || this.purchaseLocked) return;
    const t = templateFor(value);
    if (
      !t ||
      t.kind !== this.kind ||
      (value === this.templateId && this.isProductView)
    )
      return;
    this.templateId = value;
    this.invalidateComposition();
    this.error = "";
    if (!this.isProductView) this.route("work");
    if (this.image || this.previewRequest) void this.loadPreview();
  },
  pick() {
    if (!this.isProductView || this.locked || this.purchaseLocked) return;
    this.error = "";
    this.candidateId = this.photo?.id || null;
    if (this.panel === "keepsakeCrop") {
      history.pushState({ ...history.state, keepsakeCrop: true, keepsakePicker: true }, "", this.panelReturn);
      this.gesture = null;
      this.pointers.clear();
    }
    this.open("album");
  },
  dismissPreviewPicker(pop = true) {
    this.candidateId = null;
    this.panel = "keepsakeCrop";
    if (pop && history.state?.keepsakePicker) history.back();
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
    await this.startPhotoPreview(photo, "finished");
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
    await this.startPhotoPreview(photo, "phone");
  },
  makePhoto() {
    if (
      this.panel !== "album" ||
      this.locked ||
      this.purchaseLocked ||
      !this.$store.photoLibrary.ready
    )
      return;
    if (history.state?.keepsakePicker) {
      const { keepsakePicker, keepsakeCrop, ...state } = history.state;
      history.replaceState(state, "", location.href);
    }
    const returnToPreview = !!this.cropDraft;
    this.close(false);
    if (returnToPreview) this.cameraPreviewReturn = location.pathname + location.search;
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
  resetPreview() {
    this.previewRevision++;
    this.detachedCropPath = null;
    this.previewFrame = this.previewRequest = null;
    this.previewLoading = false;
    this.previewError = "";
    this.checkoutFromPreview = false;
    this.cameraPreviewReturn = null;
  },
  async startPhotoPreview(photo, kind) {
    if (this.locked || this.purchaseLocked) return;
    if (kind === "finished") {
      photo = this.$store.photoLibrary.finished.find((item) => item.id === photo?.id && item.blob);
    }
    if (!photo) return;
    const samePhoto = photo.id === this.photo?.id && photo.blob === this.photo.blob && this.image;
    this.previewRequest = samePhoto ? null : { photo, kind };
    this.candidateId = null;
    if (this.panel === "album" && this.cropDraft) {
      this.dismissPreviewPicker();
    } else {
      if (this.panel === "album") this.close(false);
      this.editComposition(true, false);
    }
    return this.loadPreview();
  },
  loadPreviewFrame(template) {
    const cached = this.previewFrames.get(template.id);
    if (cached) return cached;
    const pending = loadKeepsakeFrame(template).catch((error) => {
      this.previewFrames.delete(template.id);
      throw error;
    });
    this.previewFrames.set(template.id, pending);
    return pending;
  },
  async loadPreview() {
    const request = this.previewRequest;
    const template = this.template;
    const revision = ++this.previewRevision;
    this.gesture = null;
    this.pointers.clear();
    this.previewError = "";
    this.previewLoading = true;
    try {
      const photo = request?.photo || this.photo;
      if (!photo) throw Error("请重新选取照片。");
      const frame = this.previewFrame?.templateId === template.id
        ? this.previewFrame.data
        : this.loadPreviewFrame(template);
      const [image, frameData] = await Promise.all([
        request || !this.image ? photoData(photo) : this.image,
        frame,
      ]);
      if (revision !== this.previewRevision) return false;
      if (request) {
        this.invalidateComposition();
        this.photo = request.kind === "phone" ? { ...photo, width: image.width, height: image.height } : photo;
        this.transform = freshTransform();
        this.cornerTransform = freshTransform();
        if (this.cropDraft) this.cropDraft = { center: freshTransform(), corners: freshTransform() };
      }
      this.image = image;
      this.previewFrame = { templateId: template.id, data: frameData };
      this.previewRequest = null;
      return true;
    } catch (error) {
      if (revision === this.previewRevision)
        this.previewError = error.message || "定制效果生成失败，请重试。";
      return false;
    } finally {
      if (revision === this.previewRevision) this.previewLoading = false;
    }
  },
  setStudentProof(file = null) {
    const proof = file instanceof Blob ? file : null;
    const url = proof ? URL.createObjectURL(proof) : "";
    if (this.studentProofURL) URL.revokeObjectURL(this.studentProofURL);
    this.studentProof = proof;
    this.studentProofURL = url;
    this.proofError = "";
  },
  async acceptProof(file) {
    if (!file || this.kind !== "stamp" || this.view !== "confirm" || this.locked || this.purchaseLocked)
      return;
    const token = ++this.token;
    const owner = this.$store.account.session?.phone;
    const orderId = this.order?.id;
    const path = location.pathname + location.search;
    const isCurrent = () =>
      token === this.token && path === location.pathname + location.search &&
      this.view === "confirm" && this.kind === "stamp" &&
      this.order?.id === orderId && this.$store.account.session?.phone === owner;
    this.proofReading = this.busy = true;
    this.proofError = "";
    try {
      await decodeKeepsakePhoto({ blob: file });
      if (!isCurrent() || this.purchaseLocked) return;
      if (orderId) {
        await this.orders.commit((items) => {
          const order = items.find((item) => item.id === orderId && item.owner === owner);
          if (!isCurrent() || order?.status !== "pending")
            throw Error("订单状态已变化，请重新查看。");
          order.studentProof = file;
        });
      }
      if (isCurrent()) this.setStudentProof(file);
    } catch (error) {
      if (isCurrent()) this.proofError = error.message || "学生身份凭证读取失败，请重新上传。";
    } finally {
      if (token === this.token) this.proofReading = this.busy = false;
    }
  },
  editComposition(addHistory = true, load = true) {
    if (
      !this.isProductView ||
      (!this.photo && !this.previewRequest) ||
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
    if (addHistory && !history.state?.keepsakeCrop)
      history.pushState(
        { ...history.state, keepsakeCrop: true },
        "",
        this.panelReturn,
      );
    if (load && !this.previewReady && !this.previewLoading && !this.previewError)
      void this.loadPreview();
  },
  invalidateComposition() {
    if (this.orderId && new URLSearchParams(location.search).get("order") === this.orderId) {
      const url = new URL(location.href);
      this.detachedCropPath = url.pathname + url.search;
      url.searchParams.delete("order");
      history.replaceState(history.state, "", url.pathname + url.search);
      if (this.panel) this.panelReturn = url.pathname + url.search;
    }
    this.release();
    this.orderId = null;
  },
  commitComposition() {
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
      this.transform = center;
      this.cornerTransform = corners;
      this.invalidateComposition();
    }
  },
  setTransform(next) {
    if (this.locked || this.purchaseLocked) return;
    const value = {
      scale: Math.max(1, Math.min(3, Number(next.scale) || 1)),
      offsetX: Math.max(-100, Math.min(100, Number(next.offsetX) || 0)),
      offsetY: Math.max(-100, Math.min(100, Number(next.offsetY) || 0)),
    };
    if ([90, 180, 270].includes(next.rotation))
      value.rotation = next.rotation;
    if (this.panel === "keepsakeCrop" && this.cropDraft)
      this.cropDraft[this.activeSlot] = value;
  },
  turnPhoto(clockwise) {
    if (this.panel !== "keepsakeCrop" || !this.cropDraft || this.locked || this.purchaseLocked)
      return;
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
  selectCropSlot(slot) {
    this.activeSlot = slot;
    this.gesture = null;
    this.pointers.clear();
  },
  cropGeometry(point, rect) {
    const geometry = templateGeometry(this.template);
    const viewport = this.kind === "stamp" ? STAMP_PANE : geometry;
    const x = (viewport.x ?? 0) + ((point.x - rect.left) * viewport.width) / rect.width;
    const y = (viewport.y ?? 0) + ((point.y - rect.top) * viewport.height) / rect.height;
    const hit = geometry.slots.find((slot) =>
      x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h);
    const slot = hit || geometry.slots.find((item) => item.group === this.activeSlot) || geometry.slots[0];
    return { slot, viewport };
  },
  moveComposition(from, scale, start, end, { rect, slot, viewport }) {
    const oriented = orientedPhoto(this.image, from.rotation);
    const next = { ...from, scale: Math.max(1, Math.min(3, scale)) };
    const previous = photoCropBounds(oriented.width, oriented.height, slot.w, slot.h, from);
    const crop = photoCropBounds(oriented.width, oriented.height, slot.w, slot.h, next);
    const origin = {
      x: ((viewport.x ?? 0) - slot.x) / slot.w,
      y: ((viewport.y ?? 0) - slot.y) / slot.h,
    };
    const fraction = (point, axis) => axis === "x"
      ? origin.x + ((point.x - rect.left) * viewport.width) / (rect.width * slot.w)
      : origin.y + ((point.y - rect.top) * viewport.height) / (rect.height * slot.h);
    const offset = (axis, size, dimension) => {
      const travel = dimension - crop[size];
      if (travel <= 0) return 0;
      const position = previous[axis] + fraction(start, axis) * previous[size] - fraction(end, axis) * crop[size];
      return (position / travel) * 200 - 100;
    };
    this.setTransform({
      ...next, offsetX: offset("x", "w", oriented.width), offsetY: offset("y", "h", oriented.height),
    });
  },
  zoomCrop(point, rect, { factor, toggle = false } = {}) {
    if (!this.cropDraft || !this.image || this.locked || this.purchaseLocked) return;
    const geometry = this.cropGeometry(point, rect);
    if (geometry.slot.group) this.activeSlot = geometry.slot.group;
    const from = this.activeTransform;
    if (toggle && from.scale > 1) this.setTransform({ ...from, scale: 1, offsetX: 0, offsetY: 0 });
    else this.moveComposition(from, toggle ? 2 : from.scale * factor, point, point, { ...geometry, rect });
  },
  pointerDown(e) {
    if (!this.image || this.locked || this.purchaseLocked || this.pointers.size >= 2 || !this.cropDraft) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX, y: e.clientY };
    const geometry = this.pointers.size ? this.gesture : this.cropGeometry(point, rect);
    if (geometry.slot.group) this.activeSlot = geometry.slot.group;
    e.currentTarget.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, point);
    this.gesture = {
      rect, slot: geometry.slot, viewport: geometry.viewport,
      transform: { ...this.activeTransform }, points: [...this.pointers.values()],
    };
  },
  pointerMove(e) {
    if (!this.gesture || !this.pointers.has(e.pointerId) || this.locked) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...this.pointers.values()];
    const g = this.gesture;
    if (points.length === 2) {
      const distance = ([a, b]) => Math.hypot(b.x - a.x, b.y - a.y);
      const middle = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const scale = (g.transform.scale * distance(points)) / Math.max(1, distance(g.points));
      this.moveComposition(g.transform, scale, middle(g.points), middle(points), g);
    } else {
      this.moveComposition(g.transform, g.transform.scale, g.points[0], points[0], g);
    }
  },
  pointerUp(e) {
    if (!this.pointers.delete(e.pointerId)) return;
    this.gesture = this.pointers.size ? {
      ...this.gesture, transform: { ...this.activeTransform }, points: [...this.pointers.values()],
    } : null;
  },
  async confirm() {
    if (this.order?.status === "paid") {
      this.route("result", true);
      return;
    }
    const fromPreview = this.panel === "keepsakeCrop";
    if (!this.isProductView || (this.panel && !fromPreview) || !this.canContinue)
      return;
    if (this.order?.status === "verifying") {
      this.open("resolution");
      return;
    }
    if (fromPreview) this.commitComposition();
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
        this.previewFrame.data,
      );
      if (
        token !== this.token ||
        !this.isProductView ||
        (fromPreview && this.panel !== "keepsakeCrop") ||
        path !== location.pathname + location.search ||
        template !== this.template ||
        photo !== this.photo
      )
        return;
      this.release();
      this.output = blob;
      this.outputURL = URL.createObjectURL(blob);
      this.checkoutFromPreview = fromPreview;
      if (fromPreview) this.close(false);
      this.route("confirm");
    } catch (e) {
      if (token === this.token && (!fromPreview || this.panel === "keepsakeCrop"))
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
    if (this.panel === "album") {
      this.candidateId = null;
      this.error = "";
      if (popCrop && this.cropDraft) {
        this.dismissPreviewPicker();
        return;
      }
      if (this.cropDraft) this.panel = "keepsakeCrop";
    }
    const returnToProduct = popCrop && this.panel === "keepsakeCrop" && history.state?.keepsakeCrop;
    if (this.panel === "keepsakeCrop") {
      if (this.previewLoading && !this.image) {
        this.previewRevision++;
        this.previewLoading = false;
        this.previewRequest = null;
      }
      this.commitComposition();
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
  requestPayment({ handoff = false } = {}) {
    if (!this.canPay) return;
    const owner = requireOrderAccount();
    if (!owner) return;
    if (this.order?.status === "paid") {
      this.route("result");
      return;
    }
    if (handoff) {
      if (this.order?.status === "verifying")
        return this.order.handoff ? this.resolvePayment() : this.open("resolution");
      return this.pay(this.demoOutcome, { handoff: true });
    }
    this.open(this.order?.status === "verifying" ? "resolution" : "payment");
  },
  async pay(outcome = this.demoOutcome, { handoff = false } = {}) {
    if (
      !this.canPay ||
      this.paying ||
      (!handoff && this.panel !== "payment") ||
      (!handoff && !["success", "failure", "cancel", "unknown"].includes(outcome))
    )
      return;
    const owner = requireOrderAccount();
    if (!owner) return;
    const attempt = handoff ? createHandoff(this.kind, this.paymentMethod, outcome) : null;
    let path = location.pathname + location.search;
    const isHere = () => path === location.pathname + location.search &&
      getStore("account")?.session?.phone === owner;
    this.paying = true;
    this.error = "";
    this.checkoutResolution = "unknown";
    let unlock;
    try {
      let current = this.order;
      if (current?.status === "paid") {
        this.paying = false;
        this.close();
        this.route("result");
        return;
      }
      const orderId = this.orderId || id();
      if (attempt) unlock = lockPayment(this.kind + ":" + orderId);
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
        if (!isHere()) return;
        this.orderId = orderId;
      }
      let status = outcome === "success" ? "paid" : outcome === "unknown" ? "verifying" : "pending";
      if (attempt) {
        const query = new URLSearchParams(location.search);
        query.set("order", orderId);
        path = location.pathname + "?" + query;
        history.replaceState(history.state, "", path);
        const amount = this.order.total;
        await this.orders.commit((items) => {
          const order = items.find((x) => x.id === orderId && x.owner === owner);
          if (order?.status !== "pending") throw Error("订单状态已变化。");
          order.status = "verifying";
          order.handoff = attempt;
          order.method = attempt.method;
          order.paymentResult = paymentResult("verifying");
        });
        status = isHere() ? await presentHandoff(attempt, { id: orderId, owner, amount }) : "verifying";
        if (status === "verifying") {
          this.paying = false;
          if (isHere()) this.close();
          return;
        }
      }
      await this.orders.commit((items) => {
        const o = items.find((x) => x.id === orderId && x.owner === owner);
        if (o?.status !== (attempt ? "verifying" : "pending") || (attempt && o.handoff?.id !== attempt.id))
          throw Error("订单状态已变化。");
        if (getStore("account")?.session?.phone !== owner)
          throw Error("账号已变化，请重新登录确认。");
        o.method = attempt?.method || this.paymentMethod;
        o.status = status;
        o.paymentResult = paymentResult(o.status, outcome);
        if (o.status === "paid") {
          markPaid(o);
        }
      });
      if (status !== "verifying") finishHandoff(orderId, attempt);
      this.paying = false;
      if (!isHere()) return;
      this.close();
      if (this.order?.status === "paid") this.route("result");
      else {
        this.route("confirm", true);
        if (!attempt && outcome === "unknown") this.open("resolution");
        else if (!attempt)
          this.error =
            outcome === "cancel"
              ? "已取消付款，照片、模板与地址已保留。"
              : "付款未完成，可使用本单重试。";
      }
    } catch (e) {
      if (isHere()) this.error = e.message || "付款结果记录失败，请查询原单后再重试。";
    } finally {
      unlock?.();
      this.paying = false;
    }
  },
  async resolvePayment({ automatic = false } = {}) {
    if (this.order?.status !== "verifying" || this.locked) return;
    if (navigator.onLine === false) {
      if (!automatic) this.error = "网络不可用，请恢复连接后查询。";
      return;
    }
    const { id, handoff } = this.order;
    const path = location.pathname + location.search;
    const owner = this.$store.account.session?.phone;
    const isHere = () => this.order?.id === id && path === location.pathname + location.search;
    const status = handoff
      ? handoffStatus(handoff, { query: true, resolution: automatic ? "unknown" : this.checkoutResolution })
      : this.resolution === "unknown" ? "verifying" : this.resolution === "paid" ? "paid" : "pending";
    if (status === "verifying") {
      if (!handoff) this.error = "付款结果仍未确认，请稍后继续查询本单。";
      return;
    }
    this.paying = true;
    this.error = "";
    let unlock;
    try {
      if (handoff) unlock = lockPayment(this.kind + ":" + id);
      await this.orders.commit((items) => {
        const o = items.find((x) => x.id === id && x.owner === owner);
        if (
          getStore("account")?.session?.phone !== owner ||
          !o ||
          o.status !== "verifying" ||
          (handoff && o.handoff?.id !== handoff.id)
        )
          throw Error("订单状态已变化。");
        o.status = status;
        o.paymentResult = paymentResult(
          o.status,
          handoff?.outcome || (status === "paid" ? "success" : "failure"),
        );
        if (o.status === "paid") {
          markPaid(o);
        }
      });
      finishHandoff(id, handoff);
      this.paying = false;
      if (isHere()) {
        this.close();
        this.route(this.order?.status === "paid" ? "result" : "confirm", true);
      }
    } catch (e) {
      if (isHere()) this.error = e.message || "查询失败，请重试。";
    } finally {
      unlock?.();
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
      if (this.orderId === orderId && this.$store.account.session?.phone === owner)
        this.setStudentProof(null);
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
      const template = this.template;
      const [image, frame] = await Promise.all([photoData(this.photo), this.loadPreviewFrame(template)]);
      if (token !== this.token) return false;
      this.image = image;
      this.previewFrame = { templateId: template.id, data: frame };
      this.previewError = "";
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
      if (this.checkoutFromPreview) history.back();
      else this.route("work");
    } else orderNavigate(safeOrderPath(this.returnTo));
  },
}));
