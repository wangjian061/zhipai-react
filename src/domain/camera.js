import {
  CAMERA_DETECTION_CONFIG,
  CAMERA_DETECTION_SCENARIOS,
  cameraDetectionItems,
  cameraDetectionSignature,
  evaluateCameraDetection,
  cameraReturnPath,
} from "./camera-detection.js";
import { requireOrderAccount, returnToOrderCenter } from "./order-routing.js";
import {
  PHOTO_SPECIFICATIONS,
  PHOTO_BACKGROUNDS,
  specificationSelection,
} from "./photo-specifications.js";
import {
  PHOTO_VERSIONS,
  photoVersion,
  versionPrice,
  versionIsProtected,
  failedVersion,
  makePhotoVersions,
} from "./photo-versions.js";
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
import { paymentResult } from "./order-status.js";
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
async function writeCameraSession(record, retiredOrder = null) {
  const db = await openCameraDatabase();
  return new Promise((resolve, reject) => {
    const t = db.transaction(["sessions", "orders"], "readwrite");
    t.objectStore("sessions").put(storageValue(record));
    if (retiredOrder?.owner)
      t.objectStore("orders").put(storageValue(retiredOrder));
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
// Update the receipt and matching draft atomically. Orders never own photo processing.
export async function updateElectronicReceipt(
  id,
  owner,
  expectedStatus,
  patch,
) {
  const db = await openCameraDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["sessions", "orders"], "readwrite");
    let updated, failure;
    const fail = (message) => {
      failure = Error(message);
      tx.abort();
    };
    const request = tx.objectStore("orders").get(id);
    request.onsuccess = () => {
      const receipt = request.result;
      if (
        !owner ||
        !receipt ||
        receipt.owner !== owner ||
        receipt.status !== expectedStatus
      )
        return fail("订单状态已变化，请刷新后重试。");
      updated = { ...receipt, ...patch };
      // Limit writes to payment / delivery bookkeeping, preserving the purchased version.
      if (
        Object.keys(patch).some(
          (k) =>
            ![
              "status",
              "method",
              "paidAt",
              "savedId",
              "paymentResult",
            ].includes(k),
        )
      )
        return fail("订单更新内容无效。");
      tx.objectStore("orders").put(storageValue(updated));
      if (!receipt.sessionId) return;
      const sessionRequest = tx.objectStore("sessions").get(receipt.sessionId);
      sessionRequest.onsuccess = () => {
        const session = sessionRequest.result;
        if (!session || session.draft?.order?.id !== id) return;
        if (session.draft.order.owner !== owner)
          return fail("订单归属不一致。");
        const { savedId, ...payment } = patch;
        session.draft.order = { ...session.draft.order, ...payment };
        if (savedId) session.draft.savedId = savedId;
        tx.objectStore("sessions").put(storageValue(session));
      };
    };
    tx.oncomplete = () => {
      window.dispatchEvent(new Event("zhipai-orders-updated"));
      resolve(updated);
    };
    tx.onerror = tx.onabort = () =>
      reject(failure || tx.error || Error("订单保存失败。"));
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
  versions: {},
  versionURLs: {},
  versionPreviewErrors: {},
  selectionSaving: false,
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
  replacingPhoto: false,
  detection: null,
  detectionConfig: CAMERA_DETECTION_CONFIG,
  detectionScenarios: CAMERA_DETECTION_SCENARIOS,
  confirmationWrite: null,
  confirmationRevision: 0,
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
  specs: PHOTO_SPECIFICATIONS,
  colors: PHOTO_BACKGROUNDS,
  init() {
    this.routeHandler = () => this.syncLocation();
    this.openHandler = (e) => {
      this.reset();
      this.returnTo = cameraReturnPath(e.detail.returnTo);
      const selection = specificationSelection(
        e.detail.specification?.specId,
        e.detail.specification?.background,
      );
      if (selection)
        this.creationContext = { intent: "specification", ...selection };
      this.cameraAllowed = true;
      if (selection)
        this.$nextTick(() => {
          if (this.active && this.step === "capture")
            this.$refs.captureBack?.focus();
        });
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
      if (
        context.replaceSession &&
        (context.replaceSession !== this.draft?.id ||
          (this.step !== "confirm" &&
            !(this.step === "capture" && this.replacingPhoto)) ||
          this.busy)
      )
        return;
      this.returnTo = cameraReturnPath(
        context.exitTo || context.returnTo,
        this.returnTo || "/?page=album",
      );
      this.editingFrom = context.cameraCaller || context.intent || "camera";
      if (context.cameraCreationContext)
        this.creationContext = {
          ...context.cameraCreationContext,
        };
      return this.newDraft(kind, photo, !!context.replaceSession);
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
  get confirmationFromCamera() {
    return this.draft?.source === "camera";
  },
  get confirmationReplaceLabel() {
    return this.confirmationFromCamera ? "重新拍摄" : "重新选择";
  },
  get confirmationBackLabel() {
    return "退出证件照制作";
  },
  get collectionCapture() {
    return this.creationContext?.intent === "collectionCapture";
  },
  get canConfigureConfirmation() {
    return (
      this.step === "confirm" &&
      !!this.draft &&
      !!this.sourcePhoto?.blob &&
      !this.collectionCapture &&
      !["paid", "verifying"].includes(this.draft.order?.status) &&
      !this.busy
    );
  },
  get quickSpecs() {
    return this.specs.filter((spec) =>
      ["one", "two", "small-two"].includes(spec.id),
    );
  },
  get confirmationSizeLabel() {
    const spec = this.spec;
    return spec.name + " · " + spec.mm;
  },
  get sizePanelError() {
    return this.specs.some((spec) => spec.id === this.fields.specId)
      ? ""
      : "请选择预设规格。";
  },
  get panelPreviewURL() {
    return this.step === "confirm" ? this.sourceURL : this.standardURL;
  },
  get workflowModal() {
    return [
      "detectionScenario",
      "making",
      "makingResult",
      "discardResult",
    ].includes(this.panel);
  },
  get taskSheet() {
    return ["photoCheck", "makingFailure"].includes(this.panel);
  },
  get checking() {
    return this.draft?.status === "checking";
  },
  get validDetection() {
    const signature = cameraDetectionSignature(this.detectionConfig);
    const proof = this.draft?.detectionProof;
    return !!(
      signature &&
      proof?.signature === signature &&
      proof.sessionId === this.draft?.id &&
      proof.sourceId === (this.sourcePhoto?.id || this.draft?.id)
    );
  },
  get processing() {
    return (
      ["making", "makingResult"].includes(this.panel) ||
      ["processing", "awaiting_result"].includes(this.draft?.status)
    );
  },
  get busy() {
    return (
      this.processing ||
      this.checking ||
      this.previewing ||
      Object.keys(this.cropPointers).length > 0 ||
      this.paying ||
      this.saving ||
      this.selectionSaving ||
      this.restoring ||
      this.captureBusy
    );
  },
  get spec() {
    if (
      this.outputBlob &&
      ["paid", "verifying"].includes(this.draft?.order?.status) &&
      !this.specs.some((spec) => spec.id === this.draft?.specId)
    )
      return {
        id: "legacy-result",
        name: "证件照",
        mm: this.draft.outputWidth + " × " + this.draft.outputHeight + " px",
        width: this.draft.outputWidth,
        height: this.draft.outputHeight,
      };
    return this.specFor(this.draft);
  },
  specFor(settings) {
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
      (!this.dualResults ||
        (!!this.selectedVersion &&
          this.draft.order?.versionId === this.selectedVersion.id &&
          this.versions[this.selectedVersion.id]?.blob === this.outputBlob)) &&
      !this.draft.savedId &&
      this.$store.photoLibrary.ready &&
      !this.$store.photoLibrary.busy
    );
  },
  get dualResults() {
    return this.draft?.resultMode === "dual";
  },
  get versionLocked() {
    return versionIsProtected(this.draft);
  },
  get selectedVersion() {
    return photoVersion(
      this.draft?.order?.versionId || this.draft?.selectedVersionId,
    );
  },
  get purchasedVersionName() {
    return this.selectedVersion?.name || "无水印电子照片";
  },
  get hasResults() {
    return (
      !!this.outputBlob ||
      Object.values(this.versions).some((v) => v.status === "ready" && v.blob)
    );
  },
  get resultVersions() {
    return PHOTO_VERSIONS.map((version) => ({
      ...version,
      ...this.versions[version.id],
      price: versionPrice(version.id),
      url: this.versionURLs[version.id] || "",
      previewError: !!this.versionPreviewErrors[version.id],
      selected: this.selectedVersion?.id === version.id,
    }));
  },
  get canPurchaseVersion() {
    return (
      !this.dualResults ||
      !!(
        this.selectedVersion &&
        this.versions[this.selectedVersion.id]?.status === "ready" &&
        (this.versionLocked ||
          !this.versionPreviewErrors[this.selectedVersion.id])
      )
    );
  },
  get backgroundLabel() {
    return (
      this.colors.find((color) => color.value === this.draft?.background)
        ?.name ||
      this.colors.find((color) => color.value === this.draft?.background)
        ?.label ||
      "已选底色"
    );
  },
  clearVersions() {
    for (const url of Object.values(this.versionURLs))
      if (url) URL.revokeObjectURL(url);
    this.versions = {};
    this.versionURLs = {};
    this.versionPreviewErrors = {};
  },
  setVersionResults(results) {
    this.clearVersions();
    this.versions = results || {};
    this.versionURLs = Object.fromEntries(
      Object.entries(this.versions)
        .filter(([, result]) => result.status === "ready" && result.blob)
        .map(([id, result]) => [id, URL.createObjectURL(result.blob)]),
    );
  },
  setVersionPreviewError(id, failed) {
    this.versionPreviewErrors = { ...this.versionPreviewErrors, [id]: failed };
  },
  reloadVersionPreview(id) {
    const result = this.versions[id];
    if (!result?.blob) return;
    if (this.versionURLs[id]) URL.revokeObjectURL(this.versionURLs[id]);
    this.versionURLs = {
      ...this.versionURLs,
      [id]: URL.createObjectURL(result.blob),
    };
    this.setVersionPreviewError(id, false);
  },
  openComparison() {
    if (this.busy || this.panel || !this.hasResults) return;
    this.previousFocus = document.activeElement;
    this.panel = "compare";
  },
  async selectVersion(id) {
    const version = photoVersion(id),
      result = this.versions[id];
    if (
      !this.dualResults ||
      !version ||
      result?.status !== "ready" ||
      !result.blob ||
      this.busy ||
      this.panel ||
      this.versionLocked ||
      this.versionPreviewErrors[id] ||
      id === this.draft.selectedVersionId
    )
      return;
    if (
      this.draft.order?.owner &&
      this.draft.order.owner !== getStore("account")?.session?.phone
    ) {
      this.error = "请使用原付款账号处理这次制作结果。";
      return;
    }
    const token = this.task;
    const draft = { ...this.draft, selectedVersionId: id, order: null };
    const retired = this.draft.order?.owner
      ? {
          ...this.draft.order,
          sessionId: this.draft.id,
          sessionAvailable: false,
          status: "cancelled",
          photo: { blob: this.outputBlob },
          savedId: null,
        }
      : null;
    this.selectionSaving = true;
    this.error = "";
    try {
      await writeCameraSession(this.snapshot(draft, result.blob), retired);
      if (token !== this.task || !this.active) return;
      this.draft = draft;
      this.outputBlob = result.blob;
      if (this.previewURL) URL.revokeObjectURL(this.previewURL);
      this.previewURL = URL.createObjectURL(result.blob);
    } catch (_) {
      if (token === this.task) this.error = "选择暂未保存，请重新选择。";
    } finally {
      this.selectionSaving = false;
    }
  },
  get electronicAmount() {
    const order = this.draft?.order;
    return order && ["paid", "verifying"].includes(order.status)
      ? order.amount
      : this.dualResults
        ? this.selectedVersion?.amount || 0
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
      ? "正在制作…"
      : this.saving
        ? "保存中…"
        : this.selectionSaving
          ? "正在选择…"
          : this.draft?.savedId
            ? "查看照片"
            : this.unlocked
              ? "保存到知拍相册"
              : this.draft?.order?.status === "verifying"
                ? "查询解锁状态"
                : this.dualResults
                  ? this.selectedVersion
                    ? "解锁" +
                      this.selectedVersion.shortName +
                      " ¥" +
                      this.electronicPrice
                    : "请选择一个照片版本"
                  : "解锁并保存";
  },
  reset() {
    this.task++;
    this.stopCamera();
    this.releaseURLs();
    this.draft = null;
    this.replacingPhoto = false;
    this.detection = null;
    this.confirmationWrite = null;
    this.confirmationRevision = 0;
    this.sourcePhoto = null;
    this.standardBlob = null;
    this.standardWidth = 0;
    this.standardHeight = 0;
    this.outputBlob = null;
    this.selectionSaving = false;
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
    this.clearVersions();
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
      versions: Object.fromEntries(
        Object.entries(this.versions).map(([id, value]) => [id, { ...value }]),
      ),
      returnTo: cameraReturnPath(this.returnTo, this.creationContext?.returnTo),
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
    if (
      this.draft &&
      !this.restoring &&
      !this.processing &&
      !this.paying &&
      !this.saving &&
      !this.selectionSaving
    ) {
      const moved =
        q.get("page") !== "camera" ||
        q.get("camera") !== this.step ||
        (this.step !== "capture" && q.get("session") !== this.draft.id);
      if (moved && (this.taskSheet || this.panel === "detectionScenario")) {
        this.closePanel();
        this.route("confirm", true);
        return;
      }
      if (moved && this.step === "capture" && this.replacingPhoto) {
        this.replacingPhoto = false;
        this.route("confirm", true);
        return;
      }
      if (
        moved &&
        (this.step === "confirm" ||
          (this.step === "capture" &&
            q.get("page") === "camera" &&
            q.get("camera") === "confirm"))
      ) {
        this.exit(true);
        return;
      }
    }
    if (
      this.draft &&
      !this.restoring &&
      (this.processing || this.paying || this.saving || this.selectionSaving)
    ) {
      const lockedStep =
        this.processing && !this.draft.retryVersionId ? "confirm" : this.step;
      if (
        q.get("page") !== "camera" ||
        q.get("camera") !== lockedStep ||
        q.get("session") !== this.draft.id
      )
        this.route(lockedStep, true);
      return;
    }
    if (
      !this.restoring &&
      this.step === "editor" &&
      this.hasResults &&
      (q.get("page") !== "camera" ||
        q.get("camera") !== "editor" ||
        q.get("session") !== this.draft?.id)
    ) {
      this.route("editor", true);
      this.back();
      return;
    }
    if (q.get("page") !== "camera") {
      this.task++;
      this.renderTask++;
      this.previewing = false;
      this.restoring = false;
      this.restoreId = null;
      this.stopCamera();
      this.panel = null;
      return;
    }
    const requested = q.get("camera") || "capture";
    if (requested === "capture" && !this.draft) {
      const selection = specificationSelection(
        q.get("spec"),
        q.get("background"),
        false,
      );
      if (selection) {
        this.creationContext = { intent: "specification", ...selection };
        this.returnTo = cameraReturnPath(
          q.get("back"),
          "/?page=specifications",
        );
      }
    }
    let next = ["capture", "confirm", "editor", "saved"].includes(requested)
      ? requested
      : "confirm";
    const id = q.get("session");
    if (
      id &&
      (id !== this.draft?.id ||
        (this.draft?.order &&
          getStore("orderCenter")?.electronic.some(
            (receipt) =>
              receipt.id === this.draft.order.id &&
              (receipt.status !== this.draft.order.status ||
                receipt.savedId !== (this.draft.savedId || null)),
          )) ||
        (this.draft?.order &&
          this.draft.order.owner !== getStore("account")?.session?.phone))
    ) {
      await this.restore(id, next);
      return;
    }
    if (["editor", "saved"].includes(next) && !this.hasResults)
      next = "confirm";
    if (next === "editor" && this.draft?.savedId && this.unlocked)
      next = "saved";
    this.step = next !== "capture" && !this.draft ? "capture" : next;
    this.cameraStep = this.step;
    if (requested !== this.step) this.route(this.step, true);
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
        ...record.draft,
        order: record.draft.order
          ? {
              ...record.draft.order,
            }
          : null,
      };
      const protectedResult =
        record.output &&
        ["paid", "verifying"].includes(this.draft.order?.status);
      if (
        !protectedResult &&
        !this.specs.some((spec) => spec.id === this.draft.specId)
      ) {
        const preset = this.specs[1];
        this.draft.specId = preset.id;
        this.draft.outputWidth = preset.width;
        this.draft.outputHeight = preset.height;
        this.draft.scale = 1;
        this.draft.offsetX = this.draft.offsetY = 0;
        this.draft.savedId = null;
        if (this.draft.status !== "failed") this.draft.status = "queued";
        record.output = null;
        record.standard = null;
        record.standardWidth = record.standardHeight = 0;
        record.versions = {};
        this.draft.resultMode = null;
        this.draft.selectedVersionId = null;
      }
      for (const key of [
        "customWidth",
        "customHeight",
        "ratioWidth",
        "ratioHeight",
      ])
        delete this.draft[key];
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
      this.setVersionResults(record.versions);
      if (this.dualResults) {
        for (const id of Object.keys(this.versions))
          if (
            ["processing", "awaiting_result"].includes(this.versions[id].status)
          )
            this.versions[id] = failedVersion(
              "本版本重试已中断，已完成的照片仍然保留，请重试。",
            );
        this.draft.retryVersionId = null;
        const protectedId = this.draft.order?.versionId;
        const chosen =
          this.versions[protectedId || this.draft.selectedVersionId];
        if (chosen?.status === "ready" && chosen.blob) {
          this.outputBlob = chosen.blob;
          if (this.previewURL) URL.revokeObjectURL(this.previewURL);
          this.previewURL = URL.createObjectURL(chosen.blob);
        }
      }
      this.returnTo = cameraReturnPath(
        record.returnTo,
        record.creationContext?.returnTo,
      );
      this.detection = this.draft.detectionResult || null;
      this.editingFrom = record.editingFrom;
      this.creationContext = record.creationContext;
      // Pair old unpaid previews without replacing their already rendered ordinary output.
      // Financially protected legacy records retain their original single-result contract.
      if (
        !this.dualResults &&
        this.outputBlob &&
        this.draft.status === "ready" &&
        !versionIsProtected(this.draft) &&
        !this.collectionCapture
      ) {
        const original = this.outputBlob;
        const paired = await makePhotoVersions(
          this.standardBlob || original,
          this.draft,
          (blob, settings) =>
            cameraAwait(renderCameraPhoto(blob, settings), 15000),
        );
        if (token !== this.task || !this.active) return;
        paired.ordinary = {
          status: "ready",
          blob: original,
          reason: "",
          width: this.draft.outputWidth,
          height: this.draft.outputHeight,
        };
        const retired = this.draft.order?.owner
          ? {
              ...this.draft.order,
              sessionId: this.draft.id,
              status: "cancelled",
              sessionAvailable: false,
              photo: { blob: original },
            }
          : null;
        const pairedDraft = {
          ...this.draft,
          resultMode: "dual",
          selectedVersionId: null,
          order: null,
        };
        try {
          await writeCameraSession(
            { ...this.snapshot(pairedDraft, original), versions: paired },
            retired,
          );
          if (token !== this.task || !this.active) return;
          this.setVersionResults(paired);
          this.draft = pairedDraft;
        } catch (_) {
          this.error = "双版本预览暂未恢复，原成片已保留，请重新加载。";
        }
      }
      this.error = this.draft.failureReason || "";
      if (
        this.draft.status === "failed" &&
        !["photo", "service"].includes(this.draft.failureKind)
      ) {
        this.draft.failureKind = "service";
        this.draft.failureReason = "本次制作未完成，请稍后再试。";
        this.error = this.draft.failureReason;
      }
      if (this.draft.status === "processing") {
        this.draft.status = "failed";
        this.draft.failureKind = "service";
        this.draft.failureReason =
          "本次制作已中断，原照片和设置已保留，请重新开始。";
        this.error = this.draft.failureReason;
        await this.persistConfirmationSettings();
        if (token !== this.task || !this.active) return;
      }
      if (this.draft.status === "checking") {
        this.draft.status = "check_error";
        this.draft.failureStage = "detection";
        this.detection = {
          status: "error",
          checks: [],
          reasons: ["照片检测已中断，请重新检测。原照片和设置已保留。"],
        };
        this.draft.detectionResult = this.detection;
        this.draft.detectionProof = null;
        await this.persistConfirmationSettings();
        if (token !== this.task || !this.active) return;
      }
      if (this.draft.status === "awaiting_result" && !this.validDetection) {
        this.draft.status = "queued";
        this.draft.detectionProof = null;
        this.error = "请先检测当前照片，再开始制作。";
      }
      this.step = [
        "failed",
        "awaiting_result",
        "check_failed",
        "check_error",
      ].includes(this.draft.status)
        ? "confirm"
        : this.outputBlob
          ? this.draft.savedId
            ? "saved"
            : "editor"
          : "confirm";
      this.cameraStep = this.step;
      if (["check_failed", "check_error"].includes(this.draft.status)) {
        this.panel = "photoCheck";
        if (!this.detection)
          this.detection = {
            status: "error",
            checks: [],
            reasons: ["照片检测未完成，请重新检测。"],
          };
        this.focusCameraDialog();
      } else if (this.draft.status === "awaiting_result") {
        this.panel = "makingResult";
        this.focusCameraDialog();
      } else if (this.draft.status === "failed") {
        this.panel = "makingFailure";
        this.focusCameraDialog();
      }
      this.route(this.step, true);
    } catch (_) {
      if (
        token === this.task &&
        this.active &&
        new URLSearchParams(location.search).get("session") === id
      ) {
        this.reset();
        this.step = "capture";
        this.error = "照片未能恢复，请重新选择照片。";
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
    u.search = "";
    if (orderBack) u.searchParams.set("orderBack", orderBack);
    u.searchParams.set("page", "camera");
    u.searchParams.set("camera", next);
    if (
      next === "capture" &&
      this.creationContext?.intent === "specification"
    ) {
      const selected = this.draft || this.creationContext;
      u.searchParams.set("spec", selected.specId);
      u.searchParams.set("background", selected.background);
      u.searchParams.set("back", this.returnTo);
    }
    if (next !== "capture" && this.draft)
      u.searchParams.set("session", this.draft.id);
    this.step = this.cameraStep = next;
    history[replace ? "replaceState" : "pushState"]({}, "", u);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  exit(replace = false) {
    if (this.processing || this.paying || this.saving || this.selectionSaving)
      return;
    if (this.taskSheet || this.panel === "detectionScenario") {
      this.closePanel();
      return;
    }
    this.stopCamera();
    this.step = this.cameraStep = "capture";
    this.replacingPhoto = false;
    if (
      this.editingFrom === "print" &&
      this.$store.photoChoice.printReturnContext
    ) {
      this.$store.photoChoice.resumePrint();
      return;
    }
    const target = cameraReturnPath(
      this.returnTo,
      this.creationContext?.returnTo,
    );
    history[replace ? "replaceState" : "pushState"]({}, "", target);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  back() {
    if (
      this.processing ||
      this.paying ||
      this.saving ||
      this.selectionSaving ||
      this.restoring
    )
      return;
    if (this.panel) {
      this.closePanel();
      return;
    }
    if (this.step === "editor") {
      if (
        this.draft?.order?.owner &&
        this.draft.order.owner !== getStore("account")?.session?.phone
      ) {
        this.error = "请使用原付款账号查看并保存这张照片。";
        return;
      }
      if (this.draft?.order?.status === "verifying") {
        this.openPayment();
        return;
      }
      if (this.unlocked) return this.leavePaidResult();
      this.error = "";
      this.previousFocus = document.activeElement;
      this.panel = "discardResult";
      this.focusCameraDialog();
      return;
    }
    if (this.step === "capture" && this.replacingPhoto && this.draft) {
      this.replacingPhoto = false;
      this.route("confirm");
      return;
    }
    if (!this.busy && returnToOrderCenter()) return;
    this.exit();
  },
  async leavePaidResult() {
    if (!this.unlocked || this.busy) return;
    if (!this.draft.savedId) await this.saveFinished();
    if (this.draft?.savedId) {
      this.step = this.cameraStep = "saved";
      this.finish();
    }
  },
  replaceConfirmationPhoto() {
    if (this.busy || this.step !== "confirm") return;
    if (this.confirmationFromCamera) {
      this.retake();
      return;
    }
    if (this.draft?.source === "phone") {
      this.openPicker();
      return;
    }
    this.$store.photoChoice.show({
      intent: "camera",
      sources: ["finished", "phone"],
      exitTo: this.returnTo,
      returnTo: location.pathname + location.search,
      cameraCaller: this.editingFrom,
      cameraCreationContext: this.creationContext
        ? { ...this.creationContext }
        : null,
      replaceSession: this.draft?.id,
    });
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
      replaceSession:
        this.step === "confirm" || this.replacingPhoto ? this.draft?.id : null,
    };
    this.$refs.sourceInput.value = "";
    this.$refs.sourceInput.click();
  },
  async phoneSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const sourceRoute = location.pathname + location.search,
      context = this.phoneContext || {
        intent: this.editingFrom,
        returnTo: this.returnTo,
      };
    this.phoneContext = null;
    if (!file) return;
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 30 * 1048576
      )
        throw Error("file");
      const photo = await uploadedPhoto(file);
      if (sourceRoute !== location.pathname + location.search) return;
      if (
        context.replaceSession &&
        (context.replaceSession !== this.draft?.id ||
          (this.step !== "confirm" &&
            !(this.step === "capture" && this.replacingPhoto)) ||
          this.busy)
      )
        return;
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
      this.returnTo = cameraReturnPath(
        context.exitTo || context.returnTo,
        this.returnTo,
      );
      this.editingFrom = context.cameraCaller || context.intent || "camera";
      if (context.cameraCreationContext)
        this.creationContext = {
          ...context.cameraCreationContext,
        };
      await this.newDraft(
        context.photoSource === "camera" ? "camera" : "phone",
        photo,
        !!context.replaceSession,
      );
    } catch (_) {
      const message = "照片无法读取，请选择30 MB以内的 JPG、PNG 或 WebP。";
      if (["toolStudio", "print"].includes(context.intent))
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
      photoSource: "camera",
      cameraCaller: this.editingFrom,
      cameraCreationContext: this.creationContext
        ? {
            ...this.creationContext,
          }
        : null,
      returnTo: this.returnTo,
      replaceSession: this.replacingPhoto ? this.draft?.id : null,
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
  async newDraft(source, photo, preserveSettings = false) {
    if (!photo?.blob) {
      this.toast("照片文件不可用，请重新选图。");
      return;
    }
    const selected =
      (preserveSettings || this.replacingPhoto) &&
      !this.collectionCapture &&
      this.draft
        ? { specId: this.draft.specId, background: this.draft.background }
        : !this.collectionCapture &&
            this.creationContext?.intent === "specification"
          ? {
              specId: this.creationContext.specId,
              background: this.creationContext.background,
            }
          : null;
    const preset =
      this.specs.find((item) => item.id === selected?.specId) || this.specs[1];
    this.replacingPhoto = false;
    this.detection = null;
    this.panel = null;
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
      specId: preset.id,
      outputWidth: preset.width,
      outputHeight: preset.height,
      format: selected?.background === "transparent" ? "png" : "jpeg",
      background: selected?.background || "#438bc6",
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
  async persistConfirmationSettings() {
    const record = this.snapshot(),
      task = this.task,
      revision = ++this.confirmationRevision;
    const write = (this.confirmationWrite || Promise.resolve())
      .catch(() => {})
      .then(() => {
        if (task !== this.task || record.id !== this.draft?.id) return;
        return cameraAwait(writeCameraSession(record), 15000);
      });
    this.confirmationWrite = write;
    try {
      await write;
    } catch (_) {
      if (task === this.task && revision === this.confirmationRevision)
        this.error = "照片设置暂未能备份，请保持当前页面并继续。";
    }
  },
  async commitConfirmationSettings(values) {
    if (!this.canConfigureConfirmation) return;
    const keys = ["specId", "scale", "offsetX", "offsetY", "background"];
    if (
      !keys.some(
        (key) => Object.hasOwn(values, key) && values[key] !== this.draft[key],
      )
    )
      return;
    if (
      Object.hasOwn(values, "specId") &&
      !this.specs.some((spec) => spec.id === values.specId)
    )
      return;
    if (this.draft.status !== "failed") this.error = "";
    for (const key of keys)
      if (Object.hasOwn(values, key)) this.draft[key] = values[key];
    const spec = this.spec;
    this.draft.outputWidth = spec.width;
    this.draft.outputHeight = spec.height;
    this.draft.format =
      this.draft.background === "transparent" ? "png" : "jpeg";
    if (this.draft.status === "ready") this.draft.status = "queued";
    this.draft.savedId = null;
    this.outputBlob = null;
    this.standardBlob = null;
    this.standardWidth = 0;
    this.standardHeight = 0;
    for (const key of ["previewURL", "standardURL"]) {
      if (this[key]) URL.revokeObjectURL(this[key]);
      this[key] = "";
    }
    await this.persistConfirmationSettings();
  },
  async setConfirmationSpec(id) {
    if (id === this.draft?.specId || !this.specs.some((spec) => spec.id === id))
      return;
    await this.commitConfirmationSettings({
      specId: id,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  },
  async setConfirmationBackground(value) {
    if (
      value === this.draft?.background ||
      !this.colors.some((color) => color.value === value)
    )
      return;
    await this.commitConfirmationSettings({ background: value });
  },
  chooseSpec(id) {
    if (!this.draft || this.busy || !this.specs.some((spec) => spec.id === id))
      return;
    this.openPanel("spec");
    this.fields.specId = id;
    this.fields.scale = 1;
    this.fields.offsetX = 0;
    this.fields.offsetY = 0;
  },
  async processDraft() {
    if (!this.sourcePhoto?.blob || this.busy || this.step !== "confirm") return;
    if (
      this.panel &&
      !(this.panel === "photoCheck" && this.detection?.status === "error")
    )
      return;
    if (!this.specs.some((spec) => spec.id === this.draft.specId)) {
      this.error = "请选择预设规格。";
      return;
    }
    if (["paid", "verifying"].includes(this.draft.order?.status)) {
      this.error = "请先查看当前照片的解锁与保存结果。";
      return;
    }
    this.task++;
    this.previousFocus = document.activeElement;
    this.error = "";
    this.draft.status = "queued";
    this.draft.failureReason = "";
    this.draft.failureStage = null;
    this.draft.failureKind = null;
    this.draft.detectionProof = null;
    this.draft.detectionResult = null;
    this.detection = null;
    this.panel = "detectionScenario";
    this.persistConfirmationSettings();
    this.focusCameraDialog();
  },
  async chooseDetectionScenario(scenario) {
    if (
      this.panel !== "detectionScenario" ||
      !CAMERA_DETECTION_SCENARIOS.some((item) => item.id === scenario) ||
      !this.active ||
      !this.sourcePhoto?.blob ||
      this.busy ||
      this.step !== "confirm" ||
      !this.specs.some((spec) => spec.id === this.draft?.specId) ||
      ["paid", "verifying"].includes(this.draft?.order?.status)
    )
      return;
    const token = ++this.task;
    this.error = "";
    this.draft.status = "checking";
    this.draft.failureReason = "";
    this.draft.failureStage = "detection";
    this.draft.failureKind = null;
    this.draft.detectionProof = null;
    this.detection = {
      status: "checking",
      checks: (cameraDetectionItems(this.detectionConfig) || []).map(
        (item) => ({ ...item, status: "pending" }),
      ),
      reasons: [],
    };
    this.draft.detectionResult = this.detection;
    this.panel = "photoCheck";
    this.focusCameraDialog();
    try {
      await this.persistConfirmationSettings();
      if (token !== this.task || !this.active) return;
      await cameraAwait(
        new Promise((resolve) => setTimeout(resolve, 1800)),
        10000,
      );
      if (token !== this.task || !this.active) return;
      this.detection = evaluateCameraDetection(this.detectionConfig, scenario);
      this.draft.detectionResult = this.detection;
      if (this.detection.status !== "passed") {
        this.draft.status =
          this.detection.status === "error" ? "check_error" : "check_failed";
        await this.persistConfirmationSettings();
        if (token === this.task && this.active) this.focusCameraDialog();
        return;
      }
      this.draft.detectionProof = {
        sessionId: this.draft.id,
        sourceId: this.sourcePhoto.id || this.draft.id,
        signature: cameraDetectionSignature(this.detectionConfig),
      };
      this.draft.status = "queued";
      this.draft.failureStage = null;
      await this.persistConfirmationSettings();
      if (token !== this.task || !this.active) return;
      await this.beginMaking();
    } catch (_) {
      if (token !== this.task || !this.active) return;
      this.detection = {
        status: "error",
        checks: [],
        reasons: ["检测未能完成，请检查网络后重新检测。"],
      };
      this.draft.status = "check_error";
      this.draft.detectionResult = this.detection;
      this.draft.detectionProof = null;
      await this.persistConfirmationSettings();
      this.focusCameraDialog();
    }
  },
  closeTaskSheet() {
    if (!this.taskSheet) return;
    this.task++;
    this.panel = null;
    this.draft.status = "queued";
    this.draft.failureReason = "";
    this.draft.failureStage = null;
    this.draft.failureKind = null;
    this.draft.detectionProof = null;
    this.draft.detectionResult = null;
    this.detection = null;
    this.error = "";
    this.persistConfirmationSettings();
    this.$nextTick(() => {
      if (this.previousFocus?.isConnected)
        this.previousFocus.focus({ preventScroll: true });
      else this.focusStageTitle();
    });
  },
  async beginMaking() {
    if (
      !this.validDetection ||
      this.panel !== "photoCheck" ||
      this.detection?.status !== "passed" ||
      this.draft.status !== "queued"
    )
      return;
    if (!this.sourcePhoto?.blob || this.busy || this.step !== "confirm") return;
    if (!this.specs.some((spec) => spec.id === this.draft.specId)) {
      this.error = "请选择预设规格。";
      return;
    }
    if (["paid", "verifying"].includes(this.draft.order?.status)) {
      this.error = "请先查看当前照片的解锁与保存结果。";
      return;
    }
    const token = ++this.task;
    this.renderTask++;
    this.draft.status = "processing";
    this.draft.failureReason = "";
    this.draft.failureKind = null;
    this.error = "";
    this.previousFocus = document.activeElement;
    this.panel = "making";
    this.outputBlob = this.standardBlob = null;
    this.clearVersions();
    this.draft.resultMode = null;
    this.draft.selectedVersionId = null;
    this.draft.retryVersionId = null;
    for (const key of ["previewURL", "standardURL"]) {
      if (this[key]) URL.revokeObjectURL(this[key]);
      this[key] = "";
    }
    this.draft.savedId = null;
    this.route("confirm", true);
    this.focusCameraDialog();
    try {
      await this.persistConfirmationSettings();
      if (token !== this.task || !this.active) return;
      await cameraAwait(
        new Promise((resolve) => setTimeout(resolve, 5000)),
        10000,
      );
      if (token !== this.task || !this.active) return;
      this.draft.status = "awaiting_result";
      await this.persistConfirmationSettings();
      if (token !== this.task || !this.active) return;
      this.panel = "makingResult";
      this.focusCameraDialog();
    } catch (error) {
      await this.showMakingFailure(error, token);
    }
  },
  async chooseMakingResult(outcome) {
    if (this.draft?.retryVersionId && this.step === "editor") {
      await this.chooseVersionRetryResult(outcome);
      return;
    }
    if (
      this.panel !== "makingResult" ||
      this.draft?.status !== "awaiting_result" ||
      this.step !== "confirm" ||
      !this.active ||
      ![
        "success",
        "ordinary_only",
        "retouched_only",
        "failure",
        "service_unavailable",
      ].includes(outcome) ||
      (this.collectionCapture &&
        ["ordinary_only", "retouched_only"].includes(outcome))
    )
      return;
    if (!this.validDetection) {
      this.draft.status = "queued";
      this.panel = null;
      await this.processDraft();
      return;
    }
    const token = ++this.task;
    this.draft.status = "processing";
    this.panel = "making";
    this.focusCameraDialog();
    try {
      await this.persistConfirmationSettings();
      if (token !== this.task || !this.active) return;
      const result = await cameraAwait(
        makeCameraPhotoStep(this.sourcePhoto, {
          outcome: ["ordinary_only", "retouched_only"].includes(outcome)
            ? "success"
            : outcome,
        }),
        25000,
      );
      if (token !== this.task || !this.active) return;
      this.standardBlob = result.blob;
      this.standardWidth = result.width;
      this.standardHeight = result.height;
      this.standardURL = URL.createObjectURL(result.blob);
      if (this.collectionCapture) {
        const context = { ...this.creationContext };
        const blob = await cameraAwait(
          renderPhotoBlob(result.blob, {
            outputWidth: 295,
            outputHeight: 413,
            scale: 1,
            format: "jpeg",
          }),
          15000,
        );
        if (token !== this.task || !this.active) return;
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
        this.panel = null;
        this.step = this.cameraStep = "capture";
        const u = new URL(context.returnTo, location.origin);
        history.pushState(
          {},
          "",
          u.origin === location.origin ? u : "/?page=collection",
        );
        window.dispatchEvent(new Event("zhipai-route"));
        window.dispatchEvent(
          new CustomEvent("zhipai-collection-photo", {
            detail: { recordId: context.recordId, photo },
          }),
        );
        return;
      }
      await this.renderResult(outcome);
      if (token !== this.task || !this.active) return;
      if (this.error)
        throw Object.assign(Error(this.error), { code: "RENDER_FAILED" });
      this.panel = null;
      this.route("editor", true);
      this.focusStageTitle();
    } catch (error) {
      await this.showMakingFailure(error, token);
    }
  },
  async showMakingFailure(error, token) {
    if (token !== this.task || !this.active) return;
    this.draft.status = "failed";
    this.draft.failureStage = "making";
    this.draft.detectionProof = null;
    this.draft.failureKind =
      error?.code === "PHOTO_MAKING_FAILED" ? "photo" : "service";
    this.draft.failureReason =
      error?.code === "PROCESS_TIMEOUT"
        ? "制作等待超时，请稍后再试。"
        : ["PHOTO_MAKING_FAILED", "MAKING_SERVICE_UNAVAILABLE"].includes(
              error?.code,
            )
          ? error.message ||
            (this.draft.failureKind === "photo"
              ? "当前照片未能完成制作，请调整照片后重新开始。"
              : "制作服务暂时不可用，请稍后再试。")
          : "制作服务暂时不可用，请稍后再试。";
    this.error = "";
    this.panel = "makingFailure";
    await this.persistConfirmationSettings();
    this.focusCameraDialog();
  },
  focusCameraDialog() {
    this.$nextTick(() => {
      const dialog = this.workflowModal
        ? this.$refs.cameraWorkflowDialog
        : this.taskSheet
          ? this.$refs.cameraTaskDialog
          : this.$refs.cameraDialog;
      (dialog?.querySelector("button:not([disabled])") || dialog)?.focus({
        preventScroll: true,
      });
    });
  },
  focusStageTitle() {
    this.$nextTick(() => {
      const title =
        this.step === "editor"
          ? this.$refs.cameraResultTitle
          : this.$refs.cameraConfirmTitle;
      title?.focus({ preventScroll: true });
    });
  },
  async renderResult(outcome = "success") {
    if (
      !this.standardBlob ||
      !this.draft ||
      this.paying ||
      this.saving ||
      this.panel !== "making"
    )
      return;
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
      const versions = await makePhotoVersions(
        this.standardBlob,
        draft,
        (blob, settings) =>
          cameraAwait(renderCameraPhoto(blob, settings), 15000),
        outcome,
      );
      const blob = versions.ordinary.blob || versions.retouched.blob;
      if (!blob) throw Error("no completed version");
      draft.resultMode = "dual";
      draft.selectedVersionId = null;
      draft.retryVersionId = null;
      if (
        token !== this.renderTask ||
        sessionId !== this.draft?.id ||
        !this.active
      )
        return;
      const record = { ...this.snapshot(draft, blob), versions };
      await cameraAwait(writeCameraSession(record), 15000);
      if (
        token !== this.renderTask ||
        sessionId !== this.draft?.id ||
        !this.active
      )
        return;
      this.outputBlob = blob;
      this.setVersionResults(versions);
      if (this.previewURL) URL.revokeObjectURL(this.previewURL);
      this.previewURL = URL.createObjectURL(blob);
      this.draft = draft;
    } catch (_) {
      if (token === this.renderTask) this.error = "照片预览未能更新，请重试。";
    } finally {
      if (token === this.renderTask) this.previewing = false;
    }
  },
  async retryVersion(id) {
    if (
      !this.dualResults ||
      !photoVersion(id) ||
      this.versions[id]?.status !== "failed" ||
      this.busy ||
      this.panel ||
      this.versionLocked ||
      !this.standardBlob
    )
      return;
    if (
      this.draft.order?.owner &&
      this.draft.order.owner !== getStore("account")?.session?.phone
    ) {
      this.error = "请使用原付款账号处理这次制作结果。";
      return;
    }
    if (!this.validDetection) {
      this.error = "检测规则已更新，请返回重新制作；当前成片已保留。";
      return;
    }
    const token = ++this.task;
    this.draft.retryVersionId = id;
    this.versions = {
      ...this.versions,
      [id]: { status: "processing", blob: null, reason: "" },
    };
    this.previousFocus = document.activeElement;
    this.panel = "making";
    this.error = "";
    this.focusCameraDialog();
    try {
      await writeCameraSession(this.snapshot());
      await cameraAwait(
        new Promise((resolve) => setTimeout(resolve, 5000)),
        10000,
      );
      if (token !== this.task || !this.active) return;
      this.versions = {
        ...this.versions,
        [id]: { status: "awaiting_result", blob: null, reason: "" },
      };
      await writeCameraSession(this.snapshot());
      if (token !== this.task || !this.active) return;
      this.panel = "makingResult";
      this.focusCameraDialog();
    } catch (_) {
      if (token !== this.task || !this.active) return;
      await this.finishVersionRetry(
        id,
        failedVersion("重试暂未完成，已完成的照片已保留，请重试。"),
      );
    }
  },
  async chooseVersionRetryResult(outcome) {
    const id = this.draft.retryVersionId;
    if (
      this.panel !== "makingResult" ||
      !this.active ||
      this.versionLocked ||
      this.versions[id]?.status !== "awaiting_result" ||
      !["success", "failure", "service_unavailable"].includes(outcome)
    )
      return;
    const token = ++this.task;
    this.panel = "making";
    this.focusCameraDialog();
    let result;
    try {
      if (outcome !== "success")
        throw Error(
          outcome === "failure"
            ? "本版本未能完成制作，可再次重试或选择已完成的版本。"
            : "制作服务暂时不可用，已完成的照片已保留。请稍后重试。",
        );
      const blob = await cameraAwait(
        renderCameraPhoto(this.standardBlob, {
          ...this.draft,
          finish: id,
        }),
        15000,
      );
      if (!blob?.size) throw Error("本版本暂未完成，请重试。");
      result = {
        status: "ready",
        blob,
        reason: "",
        width: this.draft.outputWidth,
        height: this.draft.outputHeight,
      };
    } catch (error) {
      result = failedVersion(error.message);
    }
    if (token !== this.task || !this.active) return;
    await this.finishVersionRetry(id, result);
  },
  async finishVersionRetry(id, result) {
    const versions = { ...this.versions, [id]: result };
    const draft = { ...this.draft, retryVersionId: null };
    try {
      await writeCameraSession({ ...this.snapshot(draft), versions });
      this.setVersionResults(versions);
      this.draft = draft;
    } catch (_) {
      this.versions = {
        ...this.versions,
        [id]: failedVersion("本版本重试结果暂未保存，请重试。"),
      };
      this.draft.retryVersionId = null;
      this.error = "已完成的照片已保留，重试结果暂未保存。";
    }
    this.panel = null;
    this.focusStageTitle();
  },
  openPanel(name) {
    if (this.busy || !this.draft) return;
    if (name === "spec") {
      if (!this.canConfigureConfirmation) return;
    } else if (
      name !== "payment" ||
      this.step !== "editor" ||
      this.draft.status !== "ready" ||
      !this.outputBlob ||
      !this.canPurchaseVersion
    )
      return;
    this.error = "";
    this.previousFocus = document.activeElement;
    this.fields = { ...this.draft };
    this.panel = name;
    this.focusCameraDialog();
  },
  closePanel() {
    if (this.taskSheet) {
      this.closeTaskSheet();
      return;
    }
    if (this.processing || this.paying || this.saving) return;
    const failed = this.panel === "makingFailure";
    if (this.panel === "spec" || failed) this.error = "";
    this.panel = null;
    if (failed) {
      this.draft.status = "queued";
      this.draft.failureReason = "";
      this.persistConfirmationSettings();
    }
    this.$nextTick(() => {
      if (this.previousFocus?.isConnected)
        this.previousFocus.focus({ preventScroll: true });
      else this.focusStageTitle();
    });
  },
  async applyPanel() {
    if (this.busy || this.panel !== "spec" || !this.canConfigureConfirmation)
      return;
    if (this.sizePanelError) {
      this.error = this.sizePanelError;
      return;
    }
    const values = { ...this.fields, scale: 1, offsetX: 0, offsetY: 0 };
    this.closePanel();
    await this.commitConfirmationSettings(values);
  },
  setPanelSpec(id) {
    if (!this.specs.some((spec) => spec.id === id)) return;
    this.error = "";
    this.fields.specId = id;
    this.fields.scale = 1;
    this.fields.offsetX = 0;
    this.fields.offsetY = 0;
    this.cropPointers = {};
  },
  async discardResult() {
    if (this.busy || this.step !== "editor" || this.panel !== "discardResult")
      return;
    if (
      this.draft?.order?.owner &&
      this.draft.order.owner !== getStore("account")?.session?.phone
    ) {
      this.error = "请使用原付款账号处理这张照片。";
      return;
    }
    if (["paid", "verifying"].includes(this.draft?.order?.status)) {
      this.panel = null;
      this.back();
      return;
    }
    const token = ++this.task;
    const draft = {
      ...this.draft,
      status: "queued",
      failureReason: "",
      failureKind: null,
      savedId: null,
      order: null,
      renderRevision: 0,
      resultMode: null,
      selectedVersionId: null,
      retryVersionId: null,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
    const retiredOrder = this.draft.order?.owner
      ? {
          ...this.draft.order,
          status: "cancelled",
          sessionId: this.draft.id,
          sessionAvailable: false,
          specification:
            this.draft.outputWidth + " × " + this.draft.outputHeight + " px",
          photo: { blob: this.outputBlob },
          savedId: null,
        }
      : null;
    const record = {
      ...this.snapshot(draft, null),
      standard: null,
      standardWidth: 0,
      standardHeight: 0,
      versions: {},
    };
    this.saving = true;
    this.error = "";
    try {
      await (this.confirmationWrite || Promise.resolve()).catch(() => {});
      await cameraAwait(writeCameraSession(record, retiredOrder), 15000);
      if (token !== this.task || !this.active) return;
      this.draft = draft;
      this.outputBlob = this.standardBlob = null;
      this.clearVersions();
      this.standardWidth = this.standardHeight = this.editRevision = 0;
      this.renderTask++;
      for (const key of ["previewURL", "standardURL"]) {
        if (this[key]) URL.revokeObjectURL(this[key]);
        this[key] = "";
      }
      this.panel = null;
      this.saving = false;
      this.route("confirm", true);
      this.focusStageTitle();
    } catch (_) {
      if (token === this.task)
        this.error = "暂时无法返回，制作结果已保留，请重试。";
    } finally {
      if (token === this.task) this.saving = false;
    }
  },
  retake() {
    if (this.busy) return;
    if (this.step === "confirm" && this.draft) {
      this.replacingPhoto = true;
      this.cameraAllowed = true;
      this.route("capture");
      return;
    }
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
    this.route(
      this.draft.savedId && this.unlocked
        ? "saved"
        : this.draft.status === "failed" || this.processing
          ? "confirm"
          : this.outputBlob
            ? "editor"
            : "confirm",
    );
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
      !this.canPurchaseVersion ||
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
      ...(this.workflowModal
        ? this.$refs.cameraWorkflowDialog
        : this.taskSheet
          ? this.$refs.cameraTaskDialog
          : this.$refs.cameraDialog
      ).querySelectorAll(
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
      !this.canPurchaseVersion ||
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
          id: "electronic-" + albumPhotoId(),
          owner,
          amount: this.electronicAmount,
          purchaseSnapshot: {
            specName: this.spec.name,
            mm: this.spec.mm,
            pixels: `${session.draft.outputWidth} × ${session.draft.outputHeight} px`,
            backgroundName:
              PHOTO_BACKGROUNDS.find(
                (item) => item.value === session.draft.background,
              )?.name || "未记录",
          },
          ...(this.dualResults
            ? {
                versionId: this.selectedVersion.id,
                versionName: this.selectedVersion.name,
              }
            : {}),
          status: "pending",
          method: this.paymentMethod,
          createdAt: Date.now(),
        };
      if (
        session.draft.order.status === "pending" &&
        this.dualResults &&
        (session.draft.order.versionId !== this.selectedVersion?.id ||
          session.draft.order.amount !== this.selectedVersion?.amount)
      )
        throw Error("version mismatch");
      const order = session.draft.order;
      order.status = "verifying";
      order.paymentResult = paymentResult("verifying");
      // Persist the same order before contacting payment; retries never create a second order.
      await writeCameraSession(session);
      if (token === this.task)
        this.draft.order = {
          ...order,
        };
      const status = await cameraPaymentResult(order, this.paymentOutcome);
      order.status = status;
      order.paymentResult = paymentResult(status, this.paymentOutcome);
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
      session.draft.order.paymentResult = paymentResult(status, "success");
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
        spec: spec.name + " · " + spec.mm,
        blob: this.outputBlob,
        rawBlob: this.sourcePhoto.blob,
        sourceId: this.sourcePhoto.id,
        origin: "made",
        ...(draft.order?.versionId
          ? {
              versionId: draft.order.versionId,
              versionName: draft.order.versionName,
              orderId: draft.order.id,
            }
          : {}),
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
