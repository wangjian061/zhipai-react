import {
  openOrderCenter,
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
  renderPhotoBlob,
  downloadAlbumBlob,
  photoCropBounds,
} from "./album.js";
const PHOTO_TOOLS = {
  repair: {
    title: "照片精修",
    subtitle: "让不清晰的照片，更清晰",
    infoTitle: "精修照片，改善清晰度",
    description:
      "从知拍相册或手机相册选择人像证件照，通过照片检查后进行精修。支持滑杆对比精修前后效果，完成后自动保存至知拍相册。",
    headline: ["让好照片", "清晰一点"],
    icon: "repair",
    sources: ["finished", "phone"],
    requiresPortrait: true,
    service: true,
    steps: ["选照片", "AI精修", "看效果"],
  },
  outfit: {
    title: "照片换装",
    subtitle: "一张证件照，换上合适的衣服",
    infoTitle: "选择服装，生成换装照片",
    description:
      "从知拍相册或手机相册选择证件照，通过证件照检查并完成标准化处理后，按男装、女装、童装分类选择服装。选择服装后付款开始换装，完成后自动保存至知拍相册。",
    headline: ["换身衣服", "换个状态"],
    icon: "shirt",
    sources: ["finished", "phone"],
    requiresPortrait: true,
    service: true,
    steps: ["选照片", "选服装", "看效果"],
  },
  spec: {
    title: "证照规格",
    sources: [],
    steps: [],
  },
  crop: {
    title: "照片裁剪",
    subtitle: "按尺寸裁剪，也能手动调整",
    infoTitle: "按尺寸裁剪照片",
    description:
      "从知拍相册或手机相册选图，支持预设尺寸、自定义像素尺寸和拖动调整构图。裁剪结果可保存至设备。",
    headline: ["刚好尺寸", "刚好构图"],
    icon: "crop-frame",
    sources: ["finished", "phone"],
    steps: ["选照片", "裁剪", "保存"],
  },
  background: {
    title: "更换背景",
    subtitle: "标准化后，选择你需要的底色",
    infoTitle: "标准化后，更换底色",
    description:
      "从知拍相册或手机相册选择证件照，通过证件照检查并完成标准化处理后，选择蓝、红、白或灰色背景。处理结果保存至知拍相册，原照片仍然保留。",
    headline: ["换个底色", "清爽出片"],
    icon: "tool-background",
    sources: ["finished", "phone"],
    requiresPortrait: true,
    saveToAlbum: true,
    steps: ["选照片", "换背景", "保存"],
  },
  format: {
    title: "格式转换",
    subtitle: "JPG 与 PNG，轻松转换",
    infoTitle: "按需转换图片格式",
    description:
      "从知拍相册或手机相册选图，将图片转换为 JPG 或 PNG 格式。转换后的文件可保存至设备。",
    headline: ["换个格式", "方便使用"],
    icon: "tool-convert",
    sources: ["finished", "phone"],
    steps: ["选照片", "选格式", "保存"],
  },
  resize: {
    title: "修改体积",
    subtitle: "调整文件体积，满足上传要求",
    infoTitle: "调整文件体积上限",
    description:
      "从知拍相册或手机相册选图，以 KB 或 MB 设置文件体积上限。压缩时保持像素尺寸不变，结果以 JPG 格式保存至设备。",
    headline: ["体积小点", "上传轻松"],
    icon: "size",
    sources: ["finished", "phone"],
    steps: ["选照片", "调体积", "保存"],
  },
};
function photoToolId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
let photoToolDatabase;
function openToolOrders() {
  if (!photoToolDatabase)
    photoToolDatabase = new Promise((resolve, reject) => {
      const r = indexedDB.open("zhipai-tool-orders", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("orders");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(Error("database blocked"));
    }).catch((e) => {
      photoToolDatabase = null;
      throw e;
    });
  return photoToolDatabase;
}
async function readToolOrders() {
  const db = await openToolOrders();
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("orders", "readonly")
      .objectStore("orders")
      .get("items");
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}
async function writeToolOrders(items) {
  const db = await openToolOrders();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("orders", "readwrite");
    tx.objectStore("orders").put(storageValue(items), "items");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
async function toolCanvasBlob(canvas, format = "jpeg", quality = 0.94) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("照片编码失败"))),
      "image/" + format,
      quality,
    ),
  );
}
// Local approximation for prototype only; real AI adapters will replace these.
async function toolDemoResult(photo, action, options) {
  const base = options.standardBlob || photo.blob,
    image = await decodePhotoBlob(base),
    cvs = document.createElement("canvas");
  cvs.width = image.naturalWidth;
  cvs.height = image.naturalHeight;
  const c = cvs.getContext("2d");
  if (!c) throw Error("照片无法处理");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, cvs.width, cvs.height);
  if (action === "repair") c.filter = "contrast(1.06) saturate(1.03)";
  c.drawImage(image, 0, 0);
  c.filter = "none";
  if (action === "outfit") {
    const garment = new Image();
    garment.src = options.outfitImage;
    await garment.decode();
    c.drawImage(
      garment,
      cvs.width * 0.06,
      cvs.height * 0.53,
      cvs.width * 0.88,
      cvs.height * 0.49,
    );
  }
  return toolCanvasBlob(cvs);
}
// Edge-connected color replacement for simple photo backgrounds, on-device.
async function replaceToolBackground(blob, color) {
  const image = await decodePhotoBlob(blob),
    cvs = document.createElement("canvas");
  cvs.width = image.naturalWidth;
  cvs.height = image.naturalHeight;
  const c = cvs.getContext("2d", {
    willReadFrequently: true,
  });
  if (!c) throw Error("照片无法处理");
  c.drawImage(image, 0, 0);
  const pixels = c.getImageData(0, 0, cvs.width, cvs.height),
    d = pixels.data,
    w = cvs.width,
    h = cvs.height,
    n = w * h;
  const corners = [0, w - 1, (h - 1) * w, n - 1].map((i) => [
    d[i * 4],
    d[i * 4 + 1],
    d[i * 4 + 2],
  ]);
  const dominant = corners
    .map((v) => ({
      v,
      count: corners.filter(
        (c) => Math.hypot(...c.map((x, j) => x - v[j])) < 48,
      ).length,
    }))
    .sort((a, b) => b.count - a.count)[0].v;
  const rgb = color
      .slice(1)
      .match(/.{2}/g)
      .map((v) => parseInt(v, 16)),
    seen = new Uint8Array(n),
    queue = new Int32Array(n);
  let head = 0,
    tail = 0;
  const visit = (i) => {
    if (i < 0 || i >= n || seen[i]) return;
    seen[i] = 1;
    const k = i * 4;
    if (
      d[k + 3] < 40 ||
      Math.hypot(
        d[k] - dominant[0],
        d[k + 1] - dominant[1],
        d[k + 2] - dominant[2],
      ) < 48
    )
      queue[tail++] = i;
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++],
      k = i * 4;
    d[k] = rgb[0];
    d[k + 1] = rgb[1];
    d[k + 2] = rgb[2];
    d[k + 3] = 255;
    if (i % w) visit(i - 1);
    if (i % w < w - 1) visit(i + 1);
    visit(i - w);
    visit(i + w);
  }
  c.putImageData(pixels, 0, 0);
  return toolCanvasBlob(cvs, "png");
}
async function compressPhotoFile(photo, targetKB) {
  const image = await decodePhotoBlob(photo.blob),
    canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("照片无法处理，请换一张照片。");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.drawImage(image, 0, 0);
  const encode = (quality) =>
    new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("照片编码失败，请重试。")),
        "image/jpeg",
        quality,
      ),
    );
  const maxBytes = targetKB * 1024;
  let best = await encode(0.98);
  if (best.size <= maxBytes) return best;
  best = await encode(0.03);
  if (best.size > maxBytes)
    throw new Error(
      `保持当前像素尺寸，最小约为 ${Math.ceil(best.size / 1024)} KB，请增大目标体积。`,
    );
  let low = 0.03,
    high = 0.98;
  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2,
      candidate = await encode(mid);
    if (candidate.size <= maxBytes) {
      best = candidate;
      low = mid;
    } else high = mid;
  }
  return best;
}
registerStore("toolOrders", {
  items: [],
  ready: false,
  busy: false,
  error: "",
  loading: null,
  init() {
    this.loading = this.load();
  },
  async load() {
    this.error = "";
    try {
      this.items = await readToolOrders();
      this.ready = true;
    } catch (_) {
      this.error = "工具订单读取失败，请重试。";
    }
  },
  async commit(mutate) {
    if (!this.ready || this.busy) throw Error("订单尚未就绪");
    this.busy = true;
    try {
      const next = this.items.map((o) => ({
        ...o,
        photo: {
          ...o.photo,
        },
      }));
      mutate(next);
      await writeToolOrders(next);
      this.items = next;
    } finally {
      this.busy = false;
    }
  },
});
registerController("toolStudio", () => ({
  action: "crop",
  view: "work",
  stage: "empty",
  choosingPhoto: false,
  photo: null,
  sourceKind: null,
  sourceURL: "",
  outputURL: "",
  output: null,
  standardBlob: null,
  returnTo: "/?page=home",
  error: "",
  notice: "",
  panel: null,
  saving: false,
  task: 0,
  previewPending: false,
  needsPreview: false,
  selectionId: null,
  previousFocus: null,
  specId: "two",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  customWidth: 413,
  customHeight: 579,
  format: "jpeg",
  targetValue: 200,
  sizeUnit: "KB",
  background: "blue",
  backgroundEditing: false,
  flowCompleted: false,
  outfit: "men-suit",
  comparison: 50,
  standardized: false,
  portraitCheck: { status: "idle", reasons: [] },
  outfitOutputSize: null,
  serviceApplied: false,
  unlocked: false,
  paid: false,
  orderId: null,
  orderError: "",
  paymentMethod: "wechat",
  paymentOutcome: "success",
  paying: false,
  savedRecord: null,
  saveId: null,
  candidateId: null,
  outfitCategory: "men",
  cropPointers: {},
  cropGesture: null,
  entryPhoto: null,
  entryKind: null,
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
      id: "blue",
      name: "蓝色",
      value: "#438bc6",
    },
    {
      id: "white",
      name: "白色",
      value: "#ffffff",
    },
    {
      id: "red",
      name: "红色",
      value: "#d6383d",
    },
    {
      id: "gray",
      name: "浅灰",
      value: "#d9e0e8",
    },
  ],
  outfitCategories: [
    {
      id: "men",
      name: "男装",
    },
    {
      id: "women",
      name: "女装",
    },
    {
      id: "children",
      name: "童装",
    },
  ],
  outfits: ["men", "women", "children"].flatMap((category) => [
    {
      id: category + "-suit",
      name: "西装",
      category,
      image: "assets/outfit-" + category + "-suit.svg",
    },
    {
      id: category + "-shirt",
      name: "衬衫",
      category,
      image: "assets/outfit-" + category + "-shirt.svg",
    },
    {
      id: category + "-casual",
      name: "休闲装",
      category,
      image: "assets/outfit-" + category + "-casual.svg",
    },
  ]),
  init() {
    this.openHandler = (e) => this.enter(e.detail);
    this.chosenHandler = (e) => {
      if (e.detail.context.intent === "toolStudio") this.accept(e.detail);
    };
    this.failedHandler = (e) => {
      if (
        e.detail.context.intent === "toolStudio" &&
        e.detail.context.selectionId === this.selectionId
      )
        this.error = e.detail.message;
    };
    this.routeHandler = () => this.syncLocation();
    window.addEventListener("zhipai-tool-open", this.openHandler);
    window.addEventListener("zhipai-photo-chosen", this.chosenHandler);
    window.addEventListener("zhipai-phone-error", this.failedHandler);
    window.addEventListener("zhipai-route", this.routeHandler);
    window.addEventListener("popstate", this.routeHandler);
    this.syncLocation();
  },
  destroy() {
    window.removeEventListener("zhipai-tool-open", this.openHandler);
    window.removeEventListener("zhipai-photo-chosen", this.chosenHandler);
    window.removeEventListener("zhipai-phone-error", this.failedHandler);
    window.removeEventListener("zhipai-route", this.routeHandler);
    window.removeEventListener("popstate", this.routeHandler);
    this.cancelTask();
    this.releaseURLs();
  },
  get config() {
    return PHOTO_TOOLS[this.action];
  },
  get library() {
    return this.$store.photoLibrary;
  },
  get ordersStore() {
    return this.$store.toolOrders;
  },
  get diagramAlt() {
    return (
      {
        repair: "模糊照片、清晰照片、保存到知拍相册",
        outfit: "证件照、选择服装、换装照片",
        crop: "原照片、裁剪框、裁剪结果",
        background: "原照片、标准化处理、更换底色",
        format: "照片、JPG与PNG转换、保存文件",
        resize: "原文件、调节文件体积、保存文件",
      }[this.action] || ""
    );
  },
  get diagramLabels() {
    return (
      {
        repair: ["原照片", "精修效果", "知拍相册"],
        outfit: ["证件照", "选择服装", "换装照片"],
        crop: ["原照片", "裁剪设置", "裁剪照片"],
        background: ["原照片", "标准化处理", "更换底色"],
        format: ["原照片", "格式转换", "保存文件"],
        resize: ["原文件", "体积调整", "保存文件"],
      }[this.action] || []
    );
  },
  get orders() {
    return this.ordersStore.items.filter(
      (o) =>
        o.action === this.action &&
        o.owner &&
        o.owner === getStore("account")?.session?.phone,
    );
  },
  get currentOrder() {
    return (
      this.ordersStore.items.find(
        (o) =>
          o.id === this.orderId &&
          o.owner &&
          o.owner === getStore("account")?.session?.phone,
      ) || null
    );
  },
  get mascot() {
    return "assets/bear-" + this.action + ".webp";
  },
  get filteredOutfits() {
    return this.outfits.filter((o) => o.category === this.outfitCategory);
  },
  get chosenOutfit() {
    return this.outfits.find((o) => o.id === this.outfit);
  },
  get busy() {
    return (
      ["processing", "standardizing", "checking"].includes(this.stage) ||
      this.saving ||
      this.previewPending ||
      this.paying
    );
  },
  get spec() {
    return this.specId === "custom"
      ? {
          id: "custom",
          name: "自定义",
          mm: this.customWidth + " × " + this.customHeight + " px",
          width: this.customWidth,
          height: this.customHeight,
        }
      : this.specs.find((s) => s.id === this.specId) || this.specs[1];
  },
  get chosenColor() {
    return this.colors.find((c) => c.id === this.background) || this.colors[0];
  },
  get outputWidth() {
    if (this.action === "outfit")
      return this.outfitOutputSize?.width || this.photo?.width || 1;
    return this.action === "crop" ? this.spec.width : this.photo?.width || 1;
  },
  get outputHeight() {
    if (this.action === "outfit")
      return this.outfitOutputSize?.height || this.photo?.height || 1;
    return this.action === "crop" ? this.spec.height : this.photo?.height || 1;
  },
  get outputInfo() {
    return this.output
      ? `${this.outputWidth} × ${this.outputHeight} px · ${this.output.type.replace("image/", "").toUpperCase()} · ${this.size(this.output.size)}`
      : "";
  },
  get step() {
    return this.view === "saved"
      ? 2
      : !this.photo ||
          this.choosingPhoto ||
          !this.portraitEligible ||
          (this.action === "background" && !this.backgroundEditing)
        ? 0
        : this.config.service
          ? this.serviceApplied
            ? 2
            : 1
          : 1;
  },
  get canSave() {
    return !!(
      this.photo &&
      this.portraitEligible &&
      !this.flowCompleted &&
      (this.action !== "background" ||
        (this.backgroundEditing &&
          !this.flowCompleted &&
          this.view === "work")) &&
      this.output &&
      this.stage === "ready" &&
      !this.busy &&
      !this.error &&
      !this.needsPreview &&
      (!this.config.service ||
        (this.serviceApplied &&
          this.unlocked &&
          this.paid &&
          this.currentOrder?.status === "paid"))
    );
  },
  get portraitEligible() {
    return (
      !this.config.requiresPortrait || this.portraitCheck.status === "passed"
    );
  },
  get showPortraitCheck() {
    return !!(
      this.view === "work" &&
      this.config.requiresPortrait &&
      this.portraitCheck.status !== "passed" &&
      this.photo &&
      !this.choosingPhoto &&
      !this.serviceApplied &&
      (this.action !== "background" || this.step === 0)
    );
  },
  get serviceResult() {
    return !!(
      this.config.service &&
      this.serviceApplied &&
      this.paid &&
      this.currentOrder?.status === "paid"
    );
  },
  get outfitResult() {
    return this.action === "outfit" && this.serviceResult;
  },
  get repairResult() {
    return this.action === "repair" && this.serviceResult;
  },
  get savedNotice() {
    return (
      (this.action === "repair" ? "精修" : "换装") + "照片已保存到知拍相册"
    );
  },
  get savesToAlbum() {
    return !!(this.config.service || this.config.saveToAlbum);
  },
  get primaryLabel() {
    if (this.busy)
      return this.paying
        ? "正在确认…"
        : this.stage === "checking"
          ? "正在检查照片…"
          : this.stage === "standardizing"
            ? "标准化处理中…"
            : "正在处理…";
    if (this.choosingPhoto && this.photo) return "下一步";
    if (!this.photo) return "选取照片";
    if (!this.portraitEligible)
      return this.portraitCheck.status === "awaiting"
        ? "等待检查结果"
        : "下一步";
    if (this.action === "background" && !this.backgroundEditing)
      return "下一步";
    if (this.action === "repair" && !this.serviceApplied)
      return this.paid ? "开始精修" : "付款并开始精修";
    if (this.serviceResult)
      return this.savedRecord
        ? this.action === "repair"
          ? "继续精修"
          : "继续换装"
        : "重试保存";
    if (this.action === "outfit") return "开始换装";
    return this.savesToAlbum ? "保存到知拍相册" : "保存到设备";
  },
  get primaryEnabled() {
    if (this.busy) return false;
    if (!this.portraitEligible && this.photo) return false;
    if (this.choosingPhoto) return true;
    if (this.error) return this.serviceResult && !this.savedRecord;
    if (!this.photo) return true;
    if (this.action === "background" && !this.backgroundEditing) return true;
    if (this.stage === "standardize-required") return false;
    if (this.config.service && !this.serviceApplied)
      return this.action !== "outfit" || this.standardized;
    if (this.serviceResult && this.savedRecord) return true;
    return this.canSave;
  },
  size(bytes) {
    return bytes >= 1048576
      ? (bytes / 1048576).toFixed(2) + " MB"
      : Math.ceil(bytes / 1024) + " KB";
  },
  money(cents) {
    return "¥" + (cents / 100).toFixed(2);
  },
  time(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  },
  orderStatus(o) {
    return o.status === "paid"
      ? o.savedId
        ? "已保存"
        : o.output
          ? "已完成"
          : "待处理"
      : "待付款";
  },
  orderURL(o) {
    return actualPhotoURL({
      ...o.photo,
      id: "tool-order-" + o.id,
    });
  },
  cancelTask() {
    this.task++;
    this.previewPending = false;
    if (["checking", "awaiting"].includes(this.portraitCheck.status))
      this.portraitCheck = {
        status: "error",
        reasons: [
          { code: "interrupted", message: "本次照片检查未完成，请重新检查。" },
        ],
      };
  },
  releaseURLs() {
    for (const key of ["sourceURL", "outputURL"]) {
      if (this[key]) URL.revokeObjectURL(this[key]);
      this[key] = "";
    }
  },
  reset() {
    this.cancelTask();
    this.releaseURLs();
    Object.assign(this, {
      stage: "empty",
      choosingPhoto: false,
      photo: null,
      output: null,
      standardBlob: null,
      panel: null,
      error: "",
      notice: "",
      specId: "two",
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      format: "jpeg",
      targetValue: 200,
      sizeUnit: "KB",
      background: "blue",
      backgroundEditing: false,
      flowCompleted: false,
      outfit: "men-suit",
      outfitCategory: "men",
      standardized: false,
      portraitCheck: { status: "idle", reasons: [] },
      outfitOutputSize: null,
      serviceApplied: false,
      unlocked: false,
      paid: false,
      orderId: null,
      savedRecord: null,
      saveId: null,
      candidateId: null,
      paying: false,
      saving: false,
      needsPreview: false,
      selectionId: null,
      comparison: 50,
      customWidth: 413,
      customHeight: 579,
    });
    this.cropPointers = {};
    this.cropGesture = null;
  },
  route(view) {
    const url = new URL(location.href);
    const orderBack = url.searchParams.get("orderBack");
    url.search = "";
    if (orderBack) url.searchParams.set("orderBack", orderBack);
    url.searchParams.set("page", "tool");
    url.searchParams.set("tool", this.action);
    if (view !== "home") url.searchParams.set("view", view);
    history.pushState({}, "", url);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  enter(detail) {
    if (!PHOTO_TOOLS[detail.action] || detail.action === "spec") return;
    this.reset();
    this.action = detail.action;
    this.entryPhoto = detail.photo;
    this.entryKind = detail.kind;
    this.returnTo = detail.returnTo || "/?page=home";
    return this.start();
  },
  syncLocation() {
    const q = new URLSearchParams(location.search);
    if (q.get("page") !== "tool") {
      this.cancelTask();
      this.paying = false;
      this.saving = false;
      this.panel = null;
      if (["processing", "standardizing", "checking"].includes(this.stage))
        this.restoreInterruptedStage();
      return;
    }
    if (this.orderId && this.ordersStore.ready && !this.currentOrder)
      this.reset();
    const action = PHOTO_TOOLS[q.get("tool")] ? q.get("tool") : "crop";
    if (action !== this.action) {
      this.reset();
      this.action = action;
    }
    const requested = q.get("view");
    const next = !requested || requested === "home" ? "work" : requested;
    if (next === "orders") {
      openOrderCenter(action, "/?page=tool&tool=" + action);
      return;
    }
    if (next !== this.view && this.busy) {
      this.cancelTask();
      this.paying = false;
      this.saving = false;
      if (["processing", "standardizing", "checking"].includes(this.stage))
        this.restoreInterruptedStage();
    }
    this.view =
      action === "spec"
        ? "home"
        : ["work", "saved", "orders"].includes(next)
          ? next
          : "work";
    if (!this.photo && this.view === "saved") this.view = "work";
    if (this.view === "work" && this.flowCompleted) this.reset();
    const resume = q.get("resume");
    if (resume && resume !== this.resumeRequest) {
      this.resumeRequest = resume;
      const token = this.task;
      Promise.resolve(this.ordersStore.loading).then(() => {
        if (
          token !== this.task ||
          new URLSearchParams(location.search).get("resume") !== resume
        )
          return;
        const order = this.ordersStore.items.find(
          (o) =>
            o.id === resume && o.owner === getStore("account")?.session?.phone,
        );
        if (order) this.resumeOrder(order);
        else this.error = "订单不存在或不属于当前账号";
      });
    } else if (!resume) this.resumeRequest = null;
  },
  restoreInterruptedStage() {
    const needsPreparation =
      this.photo &&
      (this.action === "outfit" ||
        (this.action === "background" && this.backgroundEditing)) &&
      !this.standardized;
    this.stage = needsPreparation
      ? "standardize-required"
      : this.photo
        ? "ready"
        : "empty";
    if (needsPreparation && this.portraitEligible)
      this.error = "照片准备未完成，照片已保留，请重试。";
  },
  async start() {
    if (this.busy || this.action === "spec") return;
    const photo = this.entryPhoto,
      kind = this.entryKind;
    this.reset();
    this.entryPhoto = null;
    this.entryKind = null;
    this.route("work");
    if (photo)
      await this.accept({
        photo,
        kind,
        context: {
          action: this.action,
        },
      });
  },
  openPanel(name) {
    if (this.busy) return;
    this.previousFocus = document.activeElement;
    this.panel = name;
    this.$nextTick(() =>
      this.$refs.toolDialog
        .querySelector("button:not([disabled]),input:not([disabled])")
        ?.focus({
          preventScroll: true,
        }),
    );
  },
  closePanel() {
    if (this.paying || this.saving) return;
    if (
      this.panel === "portraitOutcome" &&
      this.portraitCheck.status === "awaiting"
    )
      this.portraitCheck = {
        status: "error",
        reasons: [
          { code: "interrupted", message: "本次照片检查未完成，请重新检查。" },
        ],
      };
    this.panel = null;
    this.cropPointers = {};
    this.cropGesture = null;
    this.$nextTick(() => {
      if (this.previousFocus?.isConnected)
        this.previousFocus.focus({
          preventScroll: true,
        });
    });
  },
  trap(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = [
      ...this.$refs.toolDialog.querySelectorAll(
        "button:not([disabled]),input:not([disabled]),select",
      ),
    ].filter((n) => n.getClientRects().length);
    const first = nodes[0],
      last = nodes.at(-1);
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
  back() {
    if (!this.busy && !this.panel && returnToOrderCenter()) return;
    if (this.busy) return;
    if (this.panel) {
      this.closePanel();
      return;
    }
    const url = new URL(this.returnTo, location.origin);
    history.pushState(
      {},
      "",
      url.origin === location.origin && url.searchParams.get("page") !== "tool"
        ? url
        : "/?page=home",
    );
    window.dispatchEvent(new Event("zhipai-route"));
  },
  pick() {
    if (this.busy || this.view !== "work" || this.step !== 0) return;
    if (this.portraitEligible) this.error = "";
    this.candidateId = this.sourceKind === "finished" ? this.photo?.id : null;
    this.openPanel("album");
  },
  selectCandidate(id) {
    if (!this.busy && this.library.finished.some((p) => p.id === id && p.blob))
      this.candidateId = id;
  },
  async useCandidate() {
    const photo = this.library.finished.find(
      (p) => p.id === this.candidateId && p.blob,
    );
    if (photo)
      await this.accept({
        photo,
        kind: "finished",
        context: {
          action: this.action,
        },
      });
  },
  pickPhone() {
    if (this.busy || this.step !== 0 || !this.config.sources.includes("phone"))
      return;
    this.closePanel();
    this.selectionId = photoToolId();
    window.dispatchEvent(
      new CustomEvent("zhipai-phone-picker", {
        detail: {
          selectionId: this.selectionId,
          intent: "toolStudio",
          action: this.action,
          returnTo: location.pathname + location.search,
          sources: ["phone"],
        },
      }),
    );
  },
  makePhoto() {
    if (this.busy) return;
    this.closePanel();
    const context = {
      intent: "toolStudio",
      action: this.action,
      returnTo: "/?page=tool&tool=" + this.action + "&view=work",
      sources: ["finished"],
    };
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
  async accept({ photo, kind, context }) {
    if (this.busy) return;
    if (
      context.action !== this.action ||
      !this.config.sources.includes(kind) ||
      !photo?.blob ||
      (context.selectionId && context.selectionId !== this.selectionId)
    )
      return;
    if (kind === "finished") {
      photo = this.library.finished.find((p) => p.id === photo.id && p.blob);
      if (!photo) return;
    }
    if (
      this.photo?.id === photo.id &&
      this.photo.blob === photo.blob &&
      this.sourceKind === kind
    ) {
      this.choosingPhoto = false;
      this.closePanel();
      if (
        this.config.requiresPortrait &&
        this.portraitCheck.status !== "passed"
      )
        await this.validatePortraitPhoto();
      return;
    }
    this.reset();
    this.photo = photo;
    this.sourceKind = kind;
    this.sourceURL = URL.createObjectURL(photo.blob);
    this.saveId = photoToolId();
    this.format = photo.type === "image/png" ? "png" : "jpeg";
    this.view = "work";
    if (this.action === "outfit")
      this.specId =
        this.specs.find(
          (s) => s.width === photo.width && s.height === photo.height,
        )?.id || "two";
    this.stage = "ready";
    if (this.config.requiresPortrait) await this.validatePortraitPhoto();
    else if (!this.config.service) await this.preview();
  },
  async validatePortraitPhoto() {
    if (!this.config.requiresPortrait || !this.photo || this.busy) return;
    const token = ++this.task;
    this.stage = "checking";
    this.portraitCheck = { status: "checking", reasons: [] };
    this.error = "";
    try {
      // Prototype only: expose both outcomes; never infer eligibility from pixels or filenames.
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (token !== this.task) return;
      this.stage = "ready";
      this.portraitCheck = { status: "awaiting", reasons: [] };
      this.openPanel("portraitOutcome");
    } catch (_) {
      if (token === this.task)
        this.portraitCheck = {
          status: "error",
          reasons: [
            {
              code: "unavailable",
              message:
                "照片检测未完成，请重新检测。通过检测前无法继续当前操作。",
            },
          ],
        };
    } finally {
      if (token === this.task) this.stage = "ready";
    }
  },
  async choosePortraitOutcome(outcome, reason = "not_id") {
    if (
      !this.config.requiresPortrait ||
      !this.photo ||
      this.busy ||
      this.panel !== "portraitOutcome" ||
      this.portraitCheck.status !== "awaiting" ||
      !["passed", "rejected", "error"].includes(outcome)
    )
      return;
    const reasons = {
      not_id:
        "当前照片不是人像证件照，请上传背景简洁、人物居中的单人正面证件照。",
      no_face: "未识别到清晰人脸，请重新选择单人正面证件照。",
      multiple_faces: "照片包含多人，暂不支持当前操作，请重新选择单人证件照。",
      background: "照片背景较复杂，不符合证件照要求，请重新选择。",
    };
    this.portraitCheck = {
      status: outcome,
      reasons:
        outcome === "passed"
          ? []
          : [
              {
                code: outcome === "error" ? "unavailable" : reason,
                message:
                  outcome === "error"
                    ? "照片检查未完成，请重试。通过检查前无法继续当前操作。"
                    : reasons[reason] || reasons.not_id,
              },
            ],
    };
    this.closePanel();
    if (outcome === "passed") {
      if (this.action === "background") this.backgroundEditing = true;
      if (["outfit", "background"].includes(this.action) && !this.standardized)
        await this.standardize();
    }
  },
  async retry() {
    if (this.busy) return;
    this.error = "";
    if (!this.portraitEligible) return this.validatePortraitPhoto();
    if (this.stage === "standardize-required") return this.standardize();
    if (this.action === "background" && this.canSave) return this.save();
    return this.config.service ? this.primary() : this.preview();
  },
  async standardize(epoch = null) {
    if (!this.photo || !this.portraitEligible || this.busy) return;
    const token = epoch === null ? ++this.task : epoch;
    this.stage = "standardizing";
    this.error = "";
    try {
      const blob = await renderPhotoBlob(this.photo.blob, {
        outputWidth: this.outputWidth,
        outputHeight: this.outputHeight,
        scale: 1,
        format: "png",
      });
      if (token !== this.task) return;
      this.standardBlob = blob;
      this.setOutput(blob);
      this.standardized = true;
      this.stage = "ready";
      if (this.action === "background") await this.preview();
    } catch (_) {
      if (token === this.task) {
        this.stage = "standardize-required";
        this.error = "标准化未完成，请重试。";
      }
    }
  },
  setOutput(blob) {
    if (this.outputURL) URL.revokeObjectURL(this.outputURL);
    this.output = blob;
    this.outputURL = URL.createObjectURL(blob);
  },
  invalidateService() {
    if (this.busy) return;
    this.serviceApplied = false;
    this.unlocked = false;
    this.paid = false;
    this.orderId = null;
    this.saveId = photoToolId();
    this.savedRecord = null;
    this.notice = "";
    if (this.standardBlob) this.setOutput(this.standardBlob);
  },
  selectOutfitCategory(id) {
    if (this.busy || this.outfitCategory === id) return;
    this.outfitCategory = id;
    this.outfit = id + "-suit";
    this.invalidateService();
  },
  selectOutfit(id) {
    if (this.busy || this.outfit === id) return;
    this.outfit = id;
    this.invalidateService();
  },
  async preview() {
    if (
      !this.photo ||
      !this.portraitEligible ||
      this.saving ||
      this.config.service
    )
      return;
    const token = ++this.task;
    this.previewPending = true;
    this.needsPreview = true;
    this.error = "";
    try {
      let blob;
      if (this.action === "resize") {
        const kb =
          Number(this.targetValue) * (this.sizeUnit === "MB" ? 1024 : 1);
        if (!Number.isFinite(kb) || kb < 5 || kb > 20480)
          throw Error("目标体积需在 5 KB 至 20 MB 之间");
        blob = await compressPhotoFile(this.photo, kb);
      } else if (this.action === "background") {
        if (!this.standardized) throw Error("请先完成标准化处理");
        blob = await replaceToolBackground(
          this.standardBlob,
          this.chosenColor.value,
        );
      } else {
        if (
          this.action === "crop" &&
          (!Number.isInteger(this.spec.width) ||
            !Number.isInteger(this.spec.height) ||
            this.spec.width < 1 ||
            this.spec.height < 1 ||
            this.spec.width > 4096 ||
            this.spec.height > 4096)
        )
          throw Error("尺寸需为 1–4096 px 的整数");
        blob = await renderPhotoBlob(this.photo.blob, {
          outputWidth: this.outputWidth,
          outputHeight: this.outputHeight,
          scale: this.action === "crop" ? this.scale : 1,
          offsetX: this.offsetX,
          offsetY: this.offsetY,
          format: this.format,
        });
        if (blob.type !== "image/" + this.format)
          throw Error("当前浏览器不支持此格式");
      }
      if (token === this.task) {
        this.setOutput(blob);
        this.needsPreview = false;
        this.stage = "ready";
      }
    } catch (e) {
      if (token === this.task) {
        this.error = /[\u4e00-\u9fff]/.test(e.message || "")
          ? e.message
          : "照片处理失败，请重试。";
        this.output = null;
        if (this.outputURL) URL.revokeObjectURL(this.outputURL);
        this.outputURL = "";
      }
    } finally {
      if (token === this.task) this.previewPending = false;
    }
  },
  async setFormat(id) {
    if (this.busy) return;
    this.format = id;
    await this.preview();
  },
  async setBackground(id) {
    if (
      this.busy ||
      !this.backgroundEditing ||
      this.flowCompleted ||
      this.view !== "work"
    )
      return;
    this.background = id;
    await this.preview();
  },
  async primary() {
    if (!this.primaryEnabled) return;
    if (this.choosingPhoto && this.photo) {
      this.choosingPhoto = false;
      if (
        this.action === "background" &&
        !this.backgroundEditing &&
        this.portraitEligible
      ) {
        this.backgroundEditing = true;
        await this.standardize();
      }
      return;
    }
    if (this.action === "background" && !this.backgroundEditing && this.photo) {
      this.backgroundEditing = true;
      await this.standardize();
      return;
    }
    if (this.serviceResult) {
      if (this.savedRecord) this.continueService();
      else {
        this.error = "";
        await this.save();
      }
      return;
    }
    if (!this.photo) {
      this.pick();
      return;
    }
    if (this.action === "repair" && !this.serviceApplied) {
      if (this.paid) await this.runService();
      else await this.openPayment();
      return;
    }
    if (this.action === "outfit" && !this.serviceApplied) {
      if (this.paid) await this.runService();
      else await this.openPayment();
      return;
    }
    await this.save();
  },
  previousStep() {
    if (this.busy || this.panel) return;
    if (!this.photo || this.choosingPhoto) return;
    if (this.view === "saved" || this.flowCompleted) return;
    if (!this.serviceResult) this.choosingPhoto = true;
  },
  previousOutfitStep() {
    this.previousStep();
  },
  openResultAlbum() {
    if (!this.busy && this.serviceResult && this.savedRecord) this.go("album");
  },
  continueOutfit() {
    if (this.action === "outfit") this.continueService();
  },
  continueService() {
    if (this.busy || !this.serviceResult || !this.savedRecord) return;
    this.reset();
    this.entryPhoto = null;
    this.entryKind = null;
    this.route("work");
  },
  async openPayment() {
    if (!this.photo || !this.portraitEligible || this.busy) return;
    if (!requireOrderAccount()) return;
    const token = this.task;
    await this.ordersStore.loading;
    if (token !== this.task) return;
    if (!this.ordersStore.ready) {
      this.ordersStore.loading = this.ordersStore.load();
      await this.ordersStore.loading;
      if (token !== this.task) return;
      if (!this.ordersStore.ready) {
        this.error = this.ordersStore.error || "工具订单读取失败，请重试。";
        return;
      }
    }
    this.paymentOutcome = "success";
    this.openPanel("payment");
  },
  async pay() {
    const owner = requireOrderAccount();
    if (!owner || (this.orderId && !this.currentOrder)) return;
    if (
      this.busy ||
      this.paid ||
      !this.photo ||
      !this.portraitEligible ||
      !this.ordersStore.ready ||
      this.ordersStore.busy ||
      (this.action === "outfit" && (!this.standardized || !this.chosenOutfit))
    )
      return;
    const token = this.task,
      action = this.action,
      sourceKind = this.sourceKind,
      photo = {
        ...this.photo,
      },
      outcome = this.paymentOutcome,
      method = this.paymentMethod,
      outfit = this.outfit,
      output = this.output,
      standardBlob = this.standardBlob,
      specId = this.specId,
      orders = this.ordersStore;
    let id = this.orderId;
    this.paying = true;
    this.error = "";
    try {
      if (!id) {
        id = photoToolId();
        const record = {
          id,
          owner,
          action,
          status: "pending",
          amount: 200,
          createdAt: Date.now(),
          photo,
          outfit,
          method,
          output: null,
          standardBlob: action === "outfit" ? standardBlob : null,
          specId,
          preserveSourceSize: true,
          sourceKind,
          savedId: null,
        };
        await orders.commit((items) => items.unshift(record));
        if (token === this.task) this.orderId = id;
      }
      if (outcome !== "success") {
        if (token === this.task)
          this.error =
            outcome === "cancel"
              ? "已取消付款，照片与设置已保留"
              : "付款未完成，可重试";
        return;
      }
      await orders.commit((items) => {
        const o = items.find((o) => o.id === id);
        o.status = "paid";
        o.paidAt = Date.now();
        o.method = method;
        if (action === "outfit") {
          o.standardBlob = standardBlob;
          o.specId = specId;
        }
      });
      if (token !== this.task || owner !== getStore("account")?.session?.phone)
        return;
      this.paid = true;
      this.unlocked = true;
      this.panel = null;
    } catch (_) {
      if (token === this.task) this.error = "付款状态保存失败，请重试。";
    } finally {
      if (token === this.task) this.paying = false;
    }
    if (
      token === this.task &&
      this.paid &&
      ["repair", "outfit"].includes(action) &&
      !this.serviceApplied
    )
      await this.runService();
  },
  async runService() {
    if (
      !this.photo ||
      !this.portraitEligible ||
      this.busy ||
      (this.config.service &&
        (!this.paid || this.currentOrder?.status !== "paid")) ||
      (this.action === "outfit" && (!this.standardized || !this.standardBlob))
    )
      return;
    const token = ++this.task,
      action = this.action,
      photo = {
        ...this.photo,
      },
      standardBlob = this.standardBlob,
      outfitImage = this.chosenOutfit?.image,
      id = this.orderId,
      orders = this.ordersStore;
    this.stage = "processing";
    this.error = "";
    try {
      await new Promise((r) => setTimeout(r, 700));
      const blob = await toolDemoResult(photo, action, {
        standardBlob,
        outfitImage,
      });
      if (token !== this.task) return;
      if (id)
        await orders.commit((items) => {
          items.find((o) => o.id === id).output = blob;
        });
      if (token !== this.task) return;
      this.setOutput(blob);
      this.serviceApplied = true;
      this.stage = "ready";
      this.unlocked = true;
    } catch (_) {
      if (token === this.task) {
        this.stage = "ready";
        this.error = "处理未完成，照片与付款状态已保留。";
      }
    }
    if (
      token === this.task &&
      ["repair", "outfit"].includes(action) &&
      this.serviceApplied &&
      !this.error
    )
      await this.save();
  },
  async save() {
    if (!this.canSave) return;
    const token = this.task,
      action = this.action,
      config = PHOTO_TOOLS[action],
      photo = {
        ...this.photo,
      },
      blob = this.output,
      width = this.outputWidth,
      height = this.outputHeight,
      spec = {
        ...this.spec,
      },
      store = this.library,
      orders = this.ordersStore,
      orderId = this.orderId;
    const id = config.service
      ? this.currentOrder?.savedId || "tool-" + orderId
      : this.saveId;
    this.saving = true;
    this.error = "";
    try {
      const ext = blob.type.replace("image/", "").replace("jpeg", "jpg");
      if (!this.savesToAlbum) {
        downloadAlbumBlob(blob, `${config.title}-${id}.${ext}`);
        if (token === this.task) {
          this.flowCompleted = true;
          this.route("saved");
        }
        return;
      }
      if (!store.ready || store.busy) throw Error("相册尚未就绪");
      const record = {
        id,
        name: `${config.title}-${(orderId || id).slice(0, 8)}.${ext}`,
        width,
        height,
        type: blob.type,
        size: blob.size,
        blob,
        rawBlob: photo.rawBlob || photo.blob,
        sourceId: photo.id,
        origin: "demo-" + action,
        createdAt: Date.now(),
        spec:
          action === "outfit" && this.outfitOutputSize
            ? `${spec.name} · ${spec.mm}`
            : photo.spec || "",
      };
      const next = store.snapshot();
      const existing = next.finished.findIndex((p) => p.id === id);
      if (existing < 0) next.finished.unshift(record);
      else if (!config.service) next.finished[existing] = record;
      await store.commit(next);
      if (config.service)
        await orders.commit((items) => {
          const o = items.find((o) => o.id === orderId);
          o.savedId = id;
          o.output = blob;
        });
      if (token === this.task) {
        this.savedRecord = record;
        if (config.service) {
          this.notice = this.savedNotice;
          this.view = "work";
        } else {
          this.flowCompleted = true;
          this.route("saved");
        }
      }
    } catch (_) {
      if (token === this.task)
        this.error = "保存未完成，照片与设置已保留，请重试。";
    } finally {
      if (token === this.task) this.saving = false;
    }
  },
  async resumeOrder(order) {
    if (
      this.busy ||
      !order?.owner ||
      order.owner !== getStore("account")?.session?.phone ||
      order.action !== this.action
    )
      return;
    const action = this.action;
    this.reset();
    let token = this.task;
    this.action = action;
    this.photo = {
      ...order.photo,
    };
    this.sourceKind = order.sourceKind || "finished";
    this.sourceURL = URL.createObjectURL(order.photo.blob);
    this.orderId = order.id;
    this.outfit = order.outfit;
    this.outfitCategory = (order.outfit || "men-suit").split("-")[0];
    this.paid = order.status === "paid";
    this.unlocked = this.paid;
    this.stage = "ready";
    this.saveId = order.id;
    this.route("work");
    if (this.config.requiresPortrait) {
      if (this.paid && order.output)
        this.portraitCheck = { status: "passed", reasons: [] };
      else {
        await this.validatePortraitPhoto();
        if (
          this.orderId !== order.id ||
          this.action !== action ||
          !this.portraitEligible
        )
          return;
        token = this.task;
      }
    }
    if (action === "outfit") {
      this.specId =
        order.specId ||
        this.specs.find(
          (s) => s.width === this.photo.width && s.height === this.photo.height,
        )?.id ||
        "two";
      this.outfitOutputSize = order.preserveSourceSize
        ? null
        : { width: this.spec.width, height: this.spec.height };
      if (order.standardBlob) {
        this.standardBlob = order.standardBlob;
        this.standardized = true;
      } else {
        await this.standardize(token);
        if (token !== this.task || !this.standardized) return;
      }
      if (order.output && this.paid) {
        this.serviceApplied = true;
        this.setOutput(order.output);
      } else if (this.standardBlob) this.setOutput(this.standardBlob);
    } else if (order.output) {
      this.serviceApplied = true;
      this.setOutput(order.output);
    }
    if (
      token === this.task &&
      ["repair", "outfit"].includes(action) &&
      this.paid &&
      this.serviceApplied
    ) {
      const saved =
        order.savedId &&
        this.library.finished.find((p) => p.id === order.savedId && p.blob);
      if (saved) {
        this.savedRecord = saved;
        this.notice = this.savedNotice;
      } else await this.save();
    }
    if (token === this.task && !this.paid && action === "repair")
      await this.openPayment();
  },
  openOrders() {
    if (!this.busy) openOrderCenter(this.action);
  },
  viewSaved() {
    if (!this.savedRecord) return;
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("page", "album");
    url.searchParams.set("album", "finished");
    url.searchParams.set("photo", this.savedRecord.id);
    url.searchParams.set("from", "library");
    history.pushState({}, "", url);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  get cropImageStyle() {
    if (!this.photo) return "";
    const r = photoCropBounds(
      this.photo.width,
      this.photo.height,
      this.spec.width,
      this.spec.height,
      this,
    );
    return `width:${(this.photo.width / r.w) * 100}%;height:${(this.photo.height / r.h) * 100}%;left:${(-r.x / r.w) * 100}%;top:${(-r.y / r.h) * 100}%;`;
  },
  startCropGesture(event) {
    if (this.busy || !this.photo || this.panel !== "crop") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    this.cropPointers[event.pointerId] = {
      x: event.clientX,
      y: event.clientY,
    };
    this.resetCropGesture();
  },
  resetCropGesture() {
    const points = Object.values(this.cropPointers);
    this.cropGesture = points.length
      ? {
          x: points[0].x,
          y: points[0].y,
          offsetX: this.offsetX,
          offsetY: this.offsetY,
          scale: this.scale,
          distance:
            points.length > 1
              ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
              : 0,
        }
      : null;
  },
  moveCropGesture(event) {
    if (!this.cropPointers[event.pointerId] || !this.cropGesture) return;
    event.preventDefault();
    this.cropPointers[event.pointerId] = {
      x: event.clientX,
      y: event.clientY,
    };
    const points = Object.values(this.cropPointers),
      g = this.cropGesture;
    if (points.length > 1 && g.distance) {
      this.scale = Math.max(
        1,
        Math.min(
          2,
          (g.scale *
            Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)) /
            g.distance,
        ),
      );
    } else {
      const r = photoCropBounds(
        this.photo.width,
        this.photo.height,
        this.spec.width,
        this.spec.height,
        this,
      );
      const rect = event.currentTarget.getBoundingClientRect(),
        halfX = (this.photo.width - r.w) / 2,
        halfY = (this.photo.height - r.h) / 2;
      this.offsetX = Math.max(
        -100,
        Math.min(
          100,
          g.offsetX -
            (halfX
              ? ((((event.clientX - g.x) / rect.width) * r.w) / halfX) * 100
              : 0),
        ),
      );
      this.offsetY = Math.max(
        -100,
        Math.min(
          100,
          g.offsetY -
            (halfY
              ? ((((event.clientY - g.y) / rect.height) * r.h) / halfY) * 100
              : 0),
        ),
      );
    }
    this.needsPreview = true;
  },
  endCropGesture(event) {
    if (!this.cropPointers[event.pointerId]) return;
    delete this.cropPointers[event.pointerId];
    this.resetCropGesture();
    if (!Object.keys(this.cropPointers).length && this.needsPreview)
      this.preview();
  },
  async applyCrop() {
    this.closePanel();
    await this.preview();
  },
  async chooseSpec(id) {
    if (this.busy) return;
    this.specId = id;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    await this.preview();
  },
}));
export {
  PHOTO_TOOLS,
  photoToolId,
  photoToolDatabase,
  openToolOrders,
  readToolOrders,
  writeToolOrders,
  toolCanvasBlob,
  toolDemoResult,
  replaceToolBackground,
  compressPhotoFile,
};
