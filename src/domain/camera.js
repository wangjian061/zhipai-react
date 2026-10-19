import { requireOrderAccount, returnToOrderCenter } from "./order-routing.js";
import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";
import {
  uploadedPhoto,
  albumPhotoId,
  renderPhotoBlob,
  downloadAlbumBlob,
} from "./album.js";
import {
  cameraAwait,
  makeCameraPhotoStep,
  renderCameraPhoto,
} from "./photo-making.js";
// Personal photo production owns its stream and durable unlock session.
let liveCameraStream = null;
let cameraDatabase;
function openCameraDatabase() {
  if (!cameraDatabase)
    cameraDatabase = new Promise((resolve, reject) => {
      const r = indexedDB.open("zhipai-electronic-photos", 2);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains("sessions"))
          r.result.createObjectStore("sessions", { keyPath: "id" });
        if (!r.result.objectStoreNames.contains("orders"))
          r.result.createObjectStore("orders", { keyPath: "id" });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(Error("database blocked"));
    }).catch((e) => {
      cameraDatabase = null;
      throw e;
    });
  return cameraDatabase;
}
async function readCameraSession(id) {
  const db = await openCameraDatabase();
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("sessions", "readonly")
      .objectStore("sessions")
      .get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function deleteCameraSession(id) {
  const db = await openCameraDatabase();
  return new Promise((resolve, reject) => {
    const t = db.transaction(["sessions", "orders"], "readwrite");
    const request = t.objectStore("sessions").get(id);
    request.onsuccess = () => {
      const order = request.result?.draft?.order;
      if (order?.owner) {
        const receipt = t.objectStore("orders").get(order.id);
        receipt.onsuccess = () => {
          if (receipt.result)
            t.objectStore("orders").put({
              ...receipt.result,
              sessionAvailable: false,
              status: order.status === "pending" ? "cancelled" : order.status,
            });
        };
      }
      t.objectStore("sessions").delete(id);
    };
    t.oncomplete = () => {
      window.dispatchEvent(new Event("zhipai-orders-updated"));
      resolve();
    };
    t.onerror = () => reject(t.error);
  });
}
async function writeCameraSession(record) {
  const db = await openCameraDatabase();
  return new Promise((resolve, reject) => {
    const t = db.transaction(["sessions", "orders"], "readwrite");
    t.objectStore("sessions").put(storageValue(record));
    if (record.draft.order?.owner)
      t.objectStore("orders").put(
        storageValue({
          ...record.draft.order,
          sessionId: record.id,
          sessionAvailable: true,
          savedId: record.draft.savedId || null,
          specification:
            record.draft.outputWidth +
            " × " +
            record.draft.outputHeight +
            " px",
          photo: { blob: record.output || record.photo?.blob },
        }),
      );
    t.oncomplete = () => {
      window.dispatchEvent(new Event("zhipai-orders-updated"));
      resolve();
    };
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
async function readElectronicOrders() {
  const db = await openCameraDatabase();
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("orders", "readonly")
      .objectStore("orders")
      .getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
// Local payment adapter; a production adapter must replace both pay and query.
async function cameraPaymentResult(order, outcome = "success") {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return outcome === "unknown"
    ? "verifying"
    : outcome === "success"
      ? "paid"
      : "pending";
}
registerController("cameraStudio", () => ({
  step: "capture",
  lens: "front",
  cameraAllowed: false,
  cameraReady: false,
  cameraStarting: false,
  cameraError: "",
  cameraGeneration: 0,
  captureBusy: false,
  sourcePhoto: null,
  sourceURL: "",
  previewURL: "",
  standardURL: "",
  standardBlob: null,
  standardWidth: 0,
  standardHeight: 0,
  outputBlob: null,
  draft: null,
  previewing: false,
  renderTask: 0,
  editRevision: 0,
  cropPointers: {},
  cropGesture: null,
  fields: {},
  restoring: false,
  restoreId: null,
  task: 0,
  returnTo: "/?page=home",
  editingFrom: "camera",
  creationContext: null,
  phoneContext: null,
  panel: null,
  previousFocus: null,
  paymentMethod: "wechat",
  paymentOutcome: "success",
  paying: false,
  saving: false,
  error: "",
  notice: "",
  noticeTimer: null,
  routeHandler: null,
  openHandler: null,
  chosenHandler: null,
  phoneHandler: null,
  intentHandler: null,
  visibilityHandler: null,
  specs: [
    {
      id: "one",
      name: "一寸",
      mm: "25 × 35 mm",
      width: 295,
      height: 413,
    },
    {
      id: "two",
      name: "二寸",
      mm: "35 × 49 mm",
      width: 413,
      height: 579,
    },
    {
      id: "small-two",
      name: "小二寸",
      mm: "35 × 45 mm",
      width: 413,
      height: 531,
    },
  ],
  colors: [
    {
      name: "蓝色",
      value: "#438bc6",
    },
    {
      name: "白色",
      value: "#ffffff",
    },
    {
      name: "红色",
      value: "#d6383d",
    },
    {
      name: "灰色",
      value: "#d5d9e0",
    },
    {
      name: "透明",
      value: "transparent",
    },
  ],
  init() {
    this.routeHandler = () => this.syncLocation();
    this.openHandler = (e) => {
      this.reset();
      this.returnTo = e.detail.returnTo || "/?page=home";
      this.cameraAllowed = true;
    };
    this.intentHandler = (e) => {
      this.editingFrom =
        e.detail.intent === "toolStudio"
          ? "tool-create"
          : e.detail.intent || "camera";
      this.creationContext = {
        ...e.detail,
      };
    };
    this.chosenHandler = (e) => {
      const { context, photo, kind } = e.detail;
      if (["print", "toolStudio"].includes(context.intent)) return;
      this.returnTo = context.exitTo || context.returnTo || "/?page=album";
      this.editingFrom = context.cameraCaller || context.intent || "camera";
      if (context.cameraCreationContext)
        this.creationContext = {
          ...context.cameraCreationContext,
        };
      this.newDraft(kind, photo);
    };
    this.phoneHandler = (e) => {
      this.phoneContext = {
        ...e.detail,
      };
      this.$refs.sourceInput.click();
    };
    this.visibilityHandler = () => {
      if (document.hidden) this.stopCamera();
      else if (this.active && this.step === "capture" && this.cameraAllowed)
        this.startCamera();
    };
    window.addEventListener("zhipai-route", this.routeHandler);
    window.addEventListener("popstate", this.routeHandler);
    window.addEventListener("zhipai-camera-open", this.openHandler);
    window.addEventListener("zhipai-camera-intent", this.intentHandler);
    window.addEventListener("zhipai-photo-chosen", this.chosenHandler);
    window.addEventListener("zhipai-phone-picker", this.phoneHandler);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.syncLocation();
  },
  destroy() {
    window.removeEventListener("zhipai-route", this.routeHandler);
    window.removeEventListener("popstate", this.routeHandler);
    window.removeEventListener("zhipai-camera-open", this.openHandler);
    window.removeEventListener("zhipai-camera-intent", this.intentHandler);
    window.removeEventListener("zhipai-photo-chosen", this.chosenHandler);
    window.removeEventListener("zhipai-phone-picker", this.phoneHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.task++;
    this.stopCamera();
    this.releaseURLs();
    clearTimeout(this.noticeTimer);
  },
  get active() {
    return new URLSearchParams(location.search).get("page") === "camera";
  },
  get processing() {
    return ["processing", "awaiting_result"].includes(this.draft?.status);
  },
  get busy() {
    return (
      this.processing ||
      this.previewing ||
      Object.keys(this.cropPointers).length > 0 ||
      this.paying ||
      this.saving ||
      this.restoring ||
      this.captureBusy
    );
  },
  get spec() {
    return this.specFor(this.draft);
  },
  specFor(settings) {
    if (settings?.specId === "custom") {
      const w = Number(settings.ratioWidth) || 3,
        h = Number(settings.ratioHeight) || 4,
        ratio = w / h,
        long = 1200;
      return {
        id: "custom",
        name: "自定义",
        mm: w + " : " + h,
        width: Math.max(1, Math.round(ratio >= 1 ? long : long * ratio)),
        height: Math.max(1, Math.round(ratio >= 1 ? long / ratio : long)),
      };
    }
    return this.specs.find((s) => s.id === settings?.specId) || this.specs[1];
  },
  get panelSpec() {
    return this.specFor(this.fields);
  },
  get photoStyle() {
    return this.placementStyle(this.draft);
  },
  get panelPhotoStyle() {
    return this.placementStyle(this.fields);
  },
  placementStyle(settings) {
    return `transform:translate(${Number(settings?.offsetX) || 0}%,${Number(settings?.offsetY) || 0}%) scale(${Number(settings?.scale) || 1});`;
  },
  get unlocked() {
    return (
      this.draft?.order?.status === "paid" &&
      !!this.draft.order.owner &&
      this.draft.order.owner === getStore("account")?.session?.phone
    );
  },
  get canSave() {
    return !!(
      this.active &&
      this.outputBlob &&
      this.draft?.status === "ready" &&
      this.unlocked &&
      !this.busy &&
      this.draft.renderRevision === this.editRevision &&
      !this.draft.savedId &&
      this.$store.photoLibrary.ready &&
      !this.$store.photoLibrary.busy
    );
  },
  get electronicAmount() {
    const order = this.draft?.order;
    return order && ["paid", "verifying"].includes(order.status)
      ? order.amount
      : 980;
  },
  get electronicPrice() {
    return (this.electronicAmount / 100).toFixed(2);
  },
  get paymentLabel() {
    return this.paying
      ? "正在确认…"
      : this.draft?.order?.status === "verifying"
        ? "查询付款结果"
        : "确认付款 ¥" + this.electronicPrice;
  },
  get primaryLabel() {
    return this.processing
      ? "标准化处理中…"
      : this.saving
        ? "保存中…"
        : this.draft?.savedId
          ? "查看照片"
          : this.unlocked
            ? "保存到知拍相册"
            : this.draft?.order?.status === "verifying"
              ? "查询解锁状态"
              : "解锁并保存";
  },
  reset() {
    this.task++;
    this.stopCamera();
    this.releaseURLs();
    this.draft = null;
    this.sourcePhoto = null;
    this.standardBlob = null;
    this.standardWidth = 0;
    this.standardHeight = 0;
    this.outputBlob = null;
    this.previewing = false;
    this.renderTask++;
    this.editRevision = 0;
    this.fields = {};
    this.cropPointers = {};
    this.panel = null;
    this.error = "";
    this.cameraError = "";
    this.editingFrom = "camera";
    this.creationContext = null;
    this.step = "capture";
    this.restoring = false;
    this.restoreId = null;
  },
  releaseURLs() {
    for (const key of ["sourceURL", "previewURL", "standardURL"]) {
      if (this[key]) URL.revokeObjectURL(this[key]);
      this[key] = "";
    }
  },
  snapshot(draft = this.draft, output = this.outputBlob) {
    return {
      id: draft.id,
      draft: {
        ...draft,
        order: draft.order
          ? {
              ...draft.order,
            }
          : null,
      },
      photo: {
        ...this.sourcePhoto,
      },
      standard: this.standardBlob,
      standardWidth: this.standardWidth,
      standardHeight: this.standardHeight,
      output,
      returnTo: this.returnTo,
      editingFrom: this.editingFrom,
      creationContext: this.creationContext
        ? {
            ...this.creationContext,
          }
        : null,
    };
  },
  async syncLocation() {
    const q = new URLSearchParams(location.search);
    if (q.get("page") !== "camera") {
      this.task++;
      this.renderTask++;
      this.previewing = false;
      this.restoring = false;
      this.restoreId = null;
      if (this.processing) this.draft.status = "queued";
      this.stopCamera();
      this.panel = null;
      return;
    }
    const requested = q.get("camera") || "capture",
      next = ["capture", "confirm", "processing", "editor", "saved"].includes(
        requested,
      )
        ? requested === "processing"
          ? "confirm"
          : requested
        : "capture";
    if (this.processing && next !== "confirm") {
      this.task++;
      this.renderTask++;
      this.previewing = false;
      this.panel = null;
      this.draft.status = "queued";
    }
    const id = q.get("session");
    if (
      id &&
      (id !== this.draft?.id ||
        (this.draft?.order &&
          this.draft.order.owner !== getStore("account")?.session?.phone))
    ) {
      await this.restore(id, next);
      return;
    }
    this.step = next !== "capture" && !this.draft ? "capture" : next;
    this.cameraStep = this.step;
    if (requested === "processing") this.route(this.step, true);
    if (this.step !== "capture") this.stopCamera();
    else if (this.cameraAllowed && !liveCameraStream && !this.cameraStarting)
      this.$nextTick(() => this.startCamera());
  },
  async restore(id, next) {
    if (this.restoring && this.restoreId === id) return;
    const token = ++this.task;
    this.restoring = true;
    this.restoreId = id;
    this.panel = null;
    this.renderTask++;
    this.stopCamera();
    this.error = "";
    try {
      const record = await readCameraSession(id);
      if (
        token !== this.task ||
        !this.active ||
        new URLSearchParams(location.search).get("session") !== id
      )
        return;
      if (!record?.photo?.blob) throw Error("missing");
      if (
        record.draft?.order &&
        record.draft.order.owner !== getStore("account")?.session?.phone
      )
        throw Error("owner");
      this.releaseURLs();
      this.draft = {
        background: "#438bc6",
        ratioWidth: 3,
        ratioHeight: 4,
        ...record.draft,
        order: record.draft.order
          ? {
              ...record.draft.order,
            }
          : null,
      };
      this.sourcePhoto = record.photo;
      this.outputBlob = record.output || null;
      this.standardBlob = record.standard || record.output || null;
      this.standardWidth = record.standardWidth || record.draft.outputWidth;
      this.standardHeight = record.standardHeight || record.draft.outputHeight;
      this.editRevision = record.draft.renderRevision || 0;
      this.draft.renderRevision = this.editRevision;
      if (this.standardBlob)
        this.standardURL = URL.createObjectURL(this.standardBlob);
      this.sourceURL = URL.createObjectURL(record.photo.blob);
      if (this.outputBlob)
        this.previewURL = URL.createObjectURL(this.outputBlob);
      this.returnTo = record.returnTo;
      this.editingFrom = record.editingFrom;
      this.creationContext = record.creationContext;
      this.error = this.draft.failureReason || "";
      // An explicit prototype link may revisit confirmation after a successful draft.
      const previewFailure =
        next === "confirm" &&
        new URLSearchParams(location.search).get("makingResult") === "failure";
      this.step =
        previewFailure || this.draft.status === "failed"
          ? "confirm"
          : this.outputBlob
            ? this.draft.savedId
              ? "saved"
              : "editor"
            : "confirm";
      this.cameraStep = this.step;
      if (this.processing) this.draft.status = "queued";
      this.route(this.step, true);
    } catch (_) {
      if (
        token === this.task &&
        this.active &&
        new URLSearchParams(location.search).get("session") === id
      ) {
        this.reset();
        this.step = "capture";
        this.error = "照片未能恢复，请重新拍摄。";
        this.route("capture", true);
      }
    } finally {
      if (token === this.task) {
        this.restoring = false;
        this.restoreId = null;
      }
    }
  },
  route(next, replace = false) {
    const u = new URL(location.href);
    const orderBack = u.searchParams.get("orderBack");
    const fixture = next === "confirm" ? new URLSearchParams(u.search) : null;
    u.search = "";
    for (const key of ["makingResult", "makingReason"]) {
      if (fixture?.has(key)) u.searchParams.set(key, fixture.get(key));
    }
    if (orderBack) u.searchParams.set("orderBack", orderBack);
    u.searchParams.set("page", "camera");
    u.searchParams.set("camera", next);
    if (next !== "capture" && this.draft)
      u.searchParams.set("session", this.draft.id);
    history[replace ? "replaceState" : "pushState"]({}, "", u);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  exit() {
    if (this.paying || this.saving) return;
    if (
      this.editingFrom === "print" &&
      this.$store.photoChoice.printReturnContext
    ) {
      this.$store.photoChoice.resumePrint();
      return;
    }
    const u = new URL(this.returnTo || "/?page=home", location.origin);
    history.pushState({}, "", u.origin === location.origin ? u : "/?page=home");
    window.dispatchEvent(new Event("zhipai-route"));
  },
  back() {
    if (this.step === "confirm" && this.busy) return;
    if (!this.busy && !this.panel && returnToOrderCenter()) return;
    if (this.paying || this.saving) return;
    if (this.panel) {
      this.closePanel();
      return;
    }
    if (["editor", "processing"].includes(this.step)) {
      this.task++;
      this.renderTask++;
      this.previewing = false;
      this.draft.status = this.outputBlob ? "ready" : "queued";
      this.route("confirm");
      return;
    }
    if (this.step === "confirm") {
      this.retake();
      return;
    }
    this.exit();
  },
  openPicker() {
    if (this.busy) return;
    this.phoneContext = {
      exitTo: this.returnTo,
      intent: "camera",
      cameraCaller: this.editingFrom,
      cameraCreationContext: this.creationContext
        ? {
            ...this.creationContext,
          }
        : null,
      returnTo: location.pathname + location.search,
    };
    this.$refs.sourceInput.value = "";
    this.$refs.sourceInput.click();
  },
  async phoneSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const sourceRoute = location.pathname + location.search,
      context = this.phoneContext || {
        intent: this.editingFrom,
        returnTo: this.returnTo,
      };
    this.phoneContext = null;
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 30 * 1048576
      )
        throw Error("file");
      const photo = await uploadedPhoto(file);
      if (sourceRoute !== location.pathname + location.search) return;
      if (["print", "toolStudio"].includes(context.intent)) {
        window.dispatchEvent(
          new CustomEvent("zhipai-photo-chosen", {
            detail: {
              context,
              kind: "phone",
              photo,
            },
          }),
        );
        return;
      }
      this.returnTo = context.exitTo || context.returnTo || this.returnTo;
      this.editingFrom = context.cameraCaller || context.intent || "camera";
      if (context.cameraCreationContext)
        this.creationContext = {
          ...context.cameraCreationContext,
        };
      await this.newDraft("phone", photo);
    } catch (_) {
      const message = "照片无法读取，请选择30 MB以内的 JPG、PNG 或 WebP。";
      if (context.intent === "toolStudio")
        window.dispatchEvent(
          new CustomEvent("zhipai-phone-error", {
            detail: {
              context,
              message,
            },
          }),
        );
      else this.toast(message);
    }
  },
  async startCamera() {
    if (
      this.cameraStarting ||
      !this.active ||
      this.step !== "capture" ||
      document.hidden
    )
      return;
    this.cameraAllowed = true;
    this.cameraStarting = true;
    this.cameraError = "";
    const generation = ++this.cameraGeneration;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: this.lens === "front" ? "user" : "environment",
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1440,
          },
        },
      });
      if (
        generation !== this.cameraGeneration ||
        !this.active ||
        this.step !== "capture"
      ) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      liveCameraStream = stream;
      const video = this.$refs.liveVideo;
      video.srcObject = stream;
      await video.play();
      if (generation === this.cameraGeneration) this.cameraReady = true;
    } catch (e) {
      if (generation === this.cameraGeneration) {
        this.stopCamera();
        this.cameraError =
          e.name === "NotAllowedError"
            ? "请在浏览器设置中允许使用相机。"
            : "相机暂时无法开启，可以使用设备拍照。";
      }
    } finally {
      if (generation === this.cameraGeneration) this.cameraStarting = false;
    }
  },
  stopCamera() {
    this.cameraGeneration++;
    liveCameraStream?.getTracks().forEach((t) => t.stop());
    liveCameraStream = null;
    if (this.$refs.liveVideo) this.$refs.liveVideo.srcObject = null;
    this.cameraReady = false;
    this.cameraStarting = false;
  },
  switchLens() {
    if (this.cameraStarting || this.captureBusy) return;
    this.lens = this.lens === "front" ? "back" : "front";
    this.stopCamera();
    this.startCamera();
  },
  deviceCapture() {
    this.phoneContext = {
      intent: "camera",
      cameraCaller: this.editingFrom,
      cameraCreationContext: this.creationContext
        ? {
            ...this.creationContext,
          }
        : null,
      returnTo: this.returnTo,
    };
    this.$refs.captureInput.click();
  },
  async capture() {
    if (!this.cameraReady || this.busy) return;
    const video = this.$refs.liveVideo;
    if (!video.videoWidth || !video.videoHeight) return;
    this.captureBusy = true;
    const generation = this.cameraGeneration;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("capture"))),
          "image/jpeg",
          0.95,
        ),
      );
      if (generation !== this.cameraGeneration || !this.active) return;
      await this.newDraft("camera", {
        id: "capture-" + albumPhotoId(),
        name: "拍摄照片.jpg",
        width: canvas.width,
        height: canvas.height,
        type: blob.type,
        size: blob.size,
        blob,
        origin: "camera",
        createdAt: Date.now(),
      });
    } catch (_) {
      this.toast("拍摄未完成，请再试一次。");
    } finally {
      this.captureBusy = false;
    }
  },
  async newDraft(source, photo) {
    if (!photo?.blob) {
      this.toast("照片文件不可用，请重新选图。");
      return;
    }
    this.task++;
    this.releaseURLs();
    this.sourcePhoto = photo;
    this.sourceURL = URL.createObjectURL(photo.blob);
    this.outputBlob = null;
    this.standardBlob = null;
    this.standardWidth = 0;
    this.standardHeight = 0;
    this.previewing = false;
    this.renderTask++;
    this.editRevision = 0;
    this.error = "";
    this.draft = {
      id: albumPhotoId(),
      source,
      status: "queued",
      specId: "two",
      outputWidth: 413,
      outputHeight: 579,
      format: "jpeg",
      background: "#438bc6",
      ratioWidth: 3,
      ratioHeight: 4,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      renderRevision: 0,
      savedId: null,
      order: null,
    };
    this.route("confirm");
    try {
      await writeCameraSession(this.snapshot());
    } catch (_) {
      this.error = "照片暂未能备份，请保持当前页面并继续。";
    }
  },
  chooseSpec(id) {
    if (!this.draft || this.busy) return;
    this.openPanel("spec");
    this.fields.specId = id;
    this.fields.scale = 1;
    this.fields.offsetX = 0;
    this.fields.offsetY = 0;
  },
  async processDraft() {
    if (!this.sourcePhoto?.blob || this.busy || this.step !== "confirm") return;
    const token = ++this.task;
    this.renderTask++;
    this.draft.status = "processing";
    this.error = "";
    this.panel = null;
    this.draft.failureReason = "";
    await new Promise((resolve) => setTimeout(resolve, 1600));
    if (token !== this.task || !this.active || this.step !== "confirm") return;
    this.draft.status = "awaiting_result";
    this.previousFocus = document.activeElement;
    this.panel = "makingResult";
    this.focusCameraDialog();
  },
  focusCameraDialog() {
    this.$nextTick(() =>
      this.$refs.cameraDialog
        ?.querySelector("button:not([disabled])")
        ?.focus({ preventScroll: true }),
    );
  },
  openFailureReason() {
    if (this.busy || this.draft?.status !== "failed") return;
    this.previousFocus = document.activeElement;
    this.panel = "failureReason";
    this.focusCameraDialog();
  },
  async chooseMakingResult(outcome) {
    if (
      this.panel !== "makingResult" ||
      this.draft?.status !== "awaiting_result" ||
      !this.active ||
      this.step !== "confirm" ||
      !["success", "failure"].includes(outcome)
    )
      return;
    const token = ++this.task;
    this.panel = null;
    this.draft.status = "processing";
    try {
      const result = await cameraAwait(
        makeCameraPhotoStep(this.sourcePhoto, {
          outcome,
          failureReason:
            "照片制作服务暂时不可用，本次处理未完成。请重新制作；若仍未成功，可重新拍摄后再试。",
        }),
        25000,
      );
      if (token !== this.task || !this.active || this.step !== "confirm")
        return;
      this.standardBlob = result.blob;
      this.standardWidth = result.width;
      this.standardHeight = result.height;
      if (this.standardURL) URL.revokeObjectURL(this.standardURL);
      this.standardURL = URL.createObjectURL(result.blob);
      if (this.creationContext?.intent === "collectionCapture") {
        const context = {
          ...this.creationContext,
        };
        const blob = await renderPhotoBlob(result.blob, {
          outputWidth: 295,
          outputHeight: 413,
          scale: 1,
          format: "jpeg",
        });
        if (token !== this.task || !this.active || this.step !== "confirm")
          return;
        const photo = {
          id: "collection-" + this.draft.id,
          name: "采集照片.jpg",
          width: 295,
          height: 413,
          type: blob.type,
          size: blob.size,
          blob,
          createdAt: Date.now(),
        };
        this.draft.status = "ready";
        const u = new URL(context.returnTo, location.origin);
        history.pushState(
          {},
          "",
          u.origin === location.origin ? u : "/?page=collection",
        );
        window.dispatchEvent(new Event("zhipai-route"));
        window.dispatchEvent(
          new CustomEvent("zhipai-collection-photo", {
            detail: {
              recordId: context.recordId,
              photo,
            },
          }),
        );
        return;
      }
      await this.renderResult();
      if (token !== this.task || !this.active || this.step !== "confirm")
        return;
      if (this.error) {
        this.draft.status = "failed";
        this.draft.failureReason = this.error;
        await writeCameraSession(this.snapshot()).catch(() => {});
        return;
      }
      this.route("editor");
    } catch (error) {
      if (token === this.task) {
        this.draft.status = "failed";
        this.error =
          error.code === "PROCESS_TIMEOUT"
            ? "照片处理超时，原照片已保留，请重新制作。"
            : error.code === "PROTOTYPE_FAILURE"
              ? error.message
              : "照片文件未能完成处理，请重新制作或重新拍摄。";
        this.draft.failureReason = this.error;
        await writeCameraSession(this.snapshot()).catch(() => {});
      }
    } finally {
      if (token === this.task && this.active) {
        this.$nextTick(() =>
          document
            .querySelector(
              "#camera-page .camera-stage-actions .primary-button:not([disabled])",
            )
            ?.focus({ preventScroll: true }),
        );
      }
    }
  },
  async renderResult() {
    if (!this.standardBlob || !this.draft || this.paying || this.saving) return;
    const token = ++this.renderTask,
      sessionId = this.draft.id,
      revision = ++this.editRevision,
      spec = {
        ...this.spec,
      },
      draft = {
        ...this.draft,
        order: this.draft.order
          ? {
              ...this.draft.order,
            }
          : null,
      };
    draft.outputWidth = spec.width;
    draft.outputHeight = spec.height;
    draft.format = draft.background === "transparent" ? "png" : "jpeg";
    draft.renderRevision = revision;
    draft.status = "ready";
    this.previewing = true;
    this.error = "";
    try {
      const blob = await cameraAwait(
        renderCameraPhoto(this.standardBlob, draft),
        15000,
      );
      if (
        token !== this.renderTask ||
        sessionId !== this.draft?.id ||
        !this.active
      )
        return;
      await writeCameraSession(this.snapshot(draft, blob));
      if (
        token !== this.renderTask ||
        sessionId !== this.draft?.id ||
        !this.active
      )
        return;
      this.outputBlob = blob;
      if (this.previewURL) URL.revokeObjectURL(this.previewURL);
      this.previewURL = URL.createObjectURL(blob);
      this.draft = draft;
    } catch (_) {
      if (token === this.renderTask) this.error = "照片预览未能更新，请重试。";
    } finally {
      if (token === this.renderTask) this.previewing = false;
    }
  },
  openPanel(name) {
    if (this.busy || !this.draft || this.draft.status !== "ready") return;
    this.error = "";
    this.previousFocus = document.activeElement;
    this.fields = {
      ...this.draft,
    };
    this.panel = name;
    this.$nextTick(() =>
      this.$refs.cameraDialog.querySelector("button:not([disabled])")?.focus({
        preventScroll: true,
      }),
    );
  },
  closePanel() {
    if (this.paying || this.saving) return;
    if (
      this.panel === "makingResult" &&
      this.draft?.status === "awaiting_result"
    ) {
      this.draft.status = "queued";
    }
    this.panel = null;
    this.cropPointers = {};
    this.$nextTick(() =>
      this.previousFocus?.focus({
        preventScroll: true,
      }),
    );
  },
  async applyPanel() {
    if (this.busy || !["spec", "background"].includes(this.panel)) return;
    if (
      this.fields.specId === "custom" &&
      (!Number.isFinite(Number(this.fields.ratioWidth)) ||
        !Number.isFinite(Number(this.fields.ratioHeight)) ||
        this.fields.ratioWidth < 0.1 ||
        this.fields.ratioHeight < 0.1 ||
        this.fields.ratioWidth > 100 ||
        this.fields.ratioHeight > 100)
    ) {
      this.error = "自定义比例需为 0.1–100 之间的数值。";
      return;
    }
    for (const key of [
      "specId",
      "ratioWidth",
      "ratioHeight",
      "scale",
      "offsetX",
      "offsetY",
      "background",
    ])
      this.draft[key] = this.fields[key];
    this.closePanel();
    await this.renderResult();
  },
  setPanelSpec(id) {
    this.fields.specId = id;
    this.fields.scale = 1;
    this.fields.offsetX = 0;
    this.fields.offsetY = 0;
    this.cropPointers = {};
  },
  cropSettings() {
    return this.panel === "spec" ? this.fields : this.draft;
  },
  startCropGesture(e) {
    if (this.paying || this.saving || !this.standardBlob || this.previewing)
      return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    this.cropPointers[e.pointerId] = {
      x: e.clientX,
      y: e.clientY,
    };
    this.resetCropGesture();
  },
  resetCropGesture() {
    const p = Object.values(this.cropPointers),
      s = this.cropSettings();
    this.cropGesture = p.length
      ? {
          x: p[0].x,
          y: p[0].y,
          offsetX: s.offsetX,
          offsetY: s.offsetY,
          scale: s.scale,
          distance:
            p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0,
        }
      : null;
  },
  moveCropGesture(e) {
    if (!this.cropPointers[e.pointerId] || !this.cropGesture) return;
    e.preventDefault();
    this.cropPointers[e.pointerId] = {
      x: e.clientX,
      y: e.clientY,
    };
    const p = Object.values(this.cropPointers),
      g = this.cropGesture,
      s = this.cropSettings(),
      r = e.currentTarget.getBoundingClientRect();
    if (p.length > 1 && g.distance)
      s.scale = Math.max(
        0.5,
        Math.min(
          4,
          (g.scale * Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)) / g.distance,
        ),
      );
    else {
      s.offsetX = Math.max(
        -100,
        Math.min(100, g.offsetX + ((e.clientX - g.x) / r.width) * 100),
      );
      s.offsetY = Math.max(
        -100,
        Math.min(100, g.offsetY + ((e.clientY - g.y) / r.height) * 100),
      );
    }
  },
  endCropGesture(e) {
    if (!this.cropPointers[e.pointerId]) return;
    delete this.cropPointers[e.pointerId];
    this.resetCropGesture();
    if (!Object.keys(this.cropPointers).length && this.panel !== "spec")
      this.renderResult();
  },
  resetCrop() {
    const s = this.cropSettings();
    s.scale = 1;
    s.offsetX = 0;
    s.offsetY = 0;
    if (this.panel !== "spec") this.renderResult();
  },
  async discardPhoto() {
    if (this.paying || this.saving || !this.draft) return;
    if (this.draft.order?.status === "verifying") {
      this.error = "请先查询付款结果，再丢弃照片。";
      return;
    }
    const id = this.draft.id;
    this.saving = true;
    this.error = "";
    try {
      await deleteCameraSession(id);
      this.saving = false;
      this.exit();
      this.reset();
    } catch (_) {
      this.saving = false;
      this.error = "照片未能丢弃，请重试。";
    }
  },
  retake() {
    if (this.busy) return;
    const from = this.editingFrom,
      context = this.creationContext;
    this.reset();
    this.editingFrom = from;
    this.creationContext = context;
    this.cameraAllowed = true;
    this.route("capture");
  },
  continueEditing() {
    if (!this.draft) return;
    this.route(this.outputBlob ? "editor" : "confirm");
  },
  toast(message) {
    this.notice = message;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.notice = "";
    }, 2800);
  },
  openPayment() {
    if (!requireOrderAccount()) return;
    if (
      this.busy ||
      !this.outputBlob ||
      this.draft?.status !== "ready" ||
      this.draft.renderRevision !== this.editRevision
    )
      return;
    this.openPanel("payment");
  },
  closePayment() {
    this.closePanel();
  },
  trapFocus(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.closePayment();
      return;
    }
    if (e.key !== "Tab") return;
    const list = [
      ...this.$refs.cameraDialog.querySelectorAll(
        "button:not([disabled]),input:not([disabled]),select:not([disabled])",
      ),
    ].filter((x) => x.getClientRects().length);
    const first = list[0],
      last = list.at(-1);
    if (!first) {
      e.preventDefault();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },
  async pay() {
    const owner = requireOrderAccount();
    if (!owner || (this.draft?.order && this.draft.order.owner !== owner))
      return;
    if (this.draft?.order?.status === "verifying") {
      await this.queryPayment();
      return;
    }
    if (
      this.busy ||
      !this.outputBlob ||
      this.unlocked ||
      this.draft?.status !== "ready"
    )
      return;
    this.paying = true;
    this.error = "";
    const token = this.task,
      session = this.snapshot();
    try {
      if (!session.draft.order)
        session.draft.order = {
          id: "electronic-" + session.id,
          owner,
          amount: 980,
          status: "pending",
          method: this.paymentMethod,
          createdAt: Date.now(),
        };
      if (session.draft.order.status === "pending")
        session.draft.order.amount = 980;
      const order = session.draft.order;
      order.status = "verifying";
      // Persist the same order before contacting payment; retries never create a second order.
      await writeCameraSession(session);
      if (token === this.task)
        this.draft.order = {
          ...order,
        };
      const status = await cameraPaymentResult(order, this.paymentOutcome);
      order.status = status;
      order.method = this.paymentMethod;
      if (status === "paid") order.paidAt = Date.now();
      await writeCameraSession(session);
      if (
        token !== this.task ||
        !this.active ||
        order.owner !== getStore("account")?.session?.phone
      )
        return;
      this.draft.order = {
        ...order,
      };
      if (status === "paid") {
        this.panel = null;
        this.toast("电子照片已解锁");
      } else
        this.error =
          status === "verifying"
            ? "付款结果待确认，请查询解锁状态。"
            : this.paymentOutcome === "cancel"
              ? "已取消付款，照片已保留。"
              : "付款未完成，请重试。";
    } catch (_) {
      if (token === this.task) {
        if (this.draft.order) this.draft.order.status = "verifying";
        this.error = "付款状态未能确认，请查询解锁状态。";
      }
    } finally {
      this.paying = false;
    }
    if (token === this.task && this.active && this.unlocked)
      await this.saveFinished();
  },
  async queryPayment() {
    if (
      !this.draft?.order?.owner ||
      this.draft.order.owner !== getStore("account")?.session?.phone
    )
      return;
    if (this.busy || this.draft?.order?.status !== "verifying") return;
    this.paying = true;
    this.error = "";
    const token = this.task,
      session = this.snapshot();
    try {
      const status = await cameraPaymentResult(session.draft.order, "success");
      session.draft.order.status = status;
      session.draft.order.paidAt = Date.now();
      await writeCameraSession(session);
      if (
        token === this.task &&
        this.active &&
        session.draft.order.owner === getStore("account")?.session?.phone
      ) {
        this.draft.order = {
          ...session.draft.order,
        };
        this.panel = null;
        this.toast("电子照片已解锁");
      }
    } catch (_) {
      if (token === this.task) this.error = "暂时无法查询付款结果，请重试。";
    } finally {
      this.paying = false;
    }
    if (token === this.task && this.active && this.unlocked)
      await this.saveFinished();
  },
  primary() {
    if (this.draft?.savedId) {
      this.viewSaved();
      return;
    }
    if (this.canSave) {
      this.saveFinished();
      return;
    }
    this.openPayment();
  },
  async saveFinished() {
    if (
      !this.canSave ||
      this.draft?.order?.owner !== getStore("account")?.session?.phone
    )
      return;
    this.saving = true;
    this.error = "";
    const token = this.task,
      draft = {
        ...this.draft,
        order: {
          ...this.draft.order,
        },
      },
      spec = {
        ...this.spec,
      },
      session = this.snapshot(),
      store = this.$store.photoLibrary;
    try {
      const record = {
        id: "made-" + draft.id,
        name: `知拍-${spec.name}-${draft.id.slice(0, 8)}.${draft.format === "png" ? "png" : "jpg"}`,
        width: draft.outputWidth,
        height: draft.outputHeight,
        type: this.outputBlob.type,
        size: this.outputBlob.size,
        spec: spec.id === "custom" ? "" : spec.name + " · " + spec.mm,
        blob: this.outputBlob,
        rawBlob: this.sourcePhoto.blob,
        sourceId: this.sourcePhoto.id,
        origin: "made",
        createdAt: Date.now(),
      };
      const next = store.snapshot();
      if (!next.finished.some((p) => p.id === record.id))
        next.finished.unshift(record);
      await store.commit(next);
      session.draft.savedId = record.id;
      await writeCameraSession(session);
      if (token !== this.task || !this.active) return;
      this.draft.savedId = record.id;
      this.route("saved");
    } catch (_) {
      if (token === this.task)
        this.error = "保存未完成，已解锁的照片已保留，请重试。";
    } finally {
      this.saving = false;
    }
  },
  download() {
    if (!this.unlocked || !this.outputBlob || this.busy) return;
    downloadAlbumBlob(
      this.outputBlob,
      "知拍-" +
        this.spec.name +
        (this.outputBlob.type === "image/png" ? ".png" : ".jpg"),
    );
    this.toast("已发起照片下载");
  },
  viewSaved() {
    if (!this.draft?.savedId) return;
    const u = new URL(location.href);
    u.search = "";
    u.searchParams.set("page", "album");
    u.searchParams.set("photo", this.draft.savedId);
    u.searchParams.set("from", "library");
    history.pushState({}, "", u);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  finish() {
    if (this.editingFrom === "tool-create" && this.creationContext) {
      const context = {
          ...this.creationContext,
        },
        photo = this.$store.photoLibrary.finished.find(
          (p) => p.id === this.draft.savedId,
        ),
        u = new URL(context.returnTo, location.origin);
      history.pushState(
        {},
        "",
        u.origin === location.origin ? u : "/?page=home",
      );
      window.dispatchEvent(new Event("zhipai-route"));
      if (photo)
        window.dispatchEvent(
          new CustomEvent("zhipai-photo-chosen", {
            detail: {
              context,
              kind: "finished",
              photo,
            },
          }),
        );
      return;
    }
    if (this.editingFrom === "print") {
      this.$store.photoChoice.resumePrint();
      return;
    }
    this.go("album");
  },
}));
export {
  readElectronicOrders,
  liveCameraStream,
  cameraDatabase,
  openCameraDatabase,
  readCameraSession,
  deleteCameraSession,
  writeCameraSession,
  cameraPaymentResult,
};
