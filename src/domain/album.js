import { returnToOrderCenter } from "./order-routing.js";
import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";

function albumPhotoId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
// Legacy originals are archived during migration, never exposed as an active library.
const albumSeed = () => ({
  schemaVersion: 3,
  finished: [],
  archivedOriginals: [],
});
const photoObjectURLs = new Map();
function actualPhotoURL(photo) {
  if (!photo?.blob) return "";
  const previous = photoObjectURLs.get(photo.id);
  if (previous?.blob === photo.blob) return previous.url;
  if (previous) URL.revokeObjectURL(previous.url);
  const url = URL.createObjectURL(photo.blob);
  photoObjectURLs.set(photo.id, {
    blob: photo.blob,
    url,
  });
  return url;
}
function photoCropBounds(
  width,
  height,
  targetWidth,
  targetHeight,
  settings = {},
) {
  const ratio = targetWidth / targetHeight,
    scale = Math.max(1, Number(settings.scale) || 1);
  const w = Math.min(width, height * ratio) / scale,
    h = w / ratio;
  const halfX = (width - w) / 2,
    halfY = (height - h) / 2;
  return {
    x:
      halfX *
      (1 + Math.max(-100, Math.min(100, Number(settings.offsetX) || 0)) / 100),
    y:
      halfY *
      (1 + Math.max(-100, Math.min(100, Number(settings.offsetY) || 0)) / 100),
    w,
    h,
  };
}
async function decodePhotoBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function renderPhotoBlob(blob, settings) {
  const image = await decodePhotoBlob(blob),
    canvas = document.createElement("canvas");
  canvas.width = settings.outputWidth;
  canvas.height = settings.outputHeight;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("canvas unavailable");
  if (settings.format === "jpeg") {
    c.fillStyle = "#fff";
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
  const r = photoCropBounds(
    image.naturalWidth,
    image.naturalHeight,
    canvas.width,
    canvas.height,
    settings,
  );
  c.drawImage(image, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("encode failed"))),
      "image/" + settings.format,
      0.94,
    ),
  );
}
let albumDatabase;
function openAlbumDatabase() {
  if (albumDatabase) return albumDatabase;
  albumDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open("zhipai-photo-library", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("library");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("database blocked"));
  }).catch((error) => {
    albumDatabase = null;
    throw error;
  });
  return albumDatabase;
}
async function readAlbumState() {
  const db = await openAlbumDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("library", "readonly")
      .objectStore("library")
      .get("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function writeAlbumState(state) {
  const db = await openAlbumDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("library", "readwrite");
    transaction.objectStore("library").put(storageValue(state), "state");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("save aborted"));
  });
}
function plainAlbumState(state) {
  const copyPhotos = (photos) =>
    photos.map((p) => ({
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      type: p.type,
      size: p.size,
      spec: p.spec || "",
      blob: p.blob || null,
      rawBlob: p.rawBlob || null,
      createdAt: p.createdAt || null,
      origin: p.origin || "",
      sourceId: p.sourceId || null,
      uploadSettings: p.uploadSettings
        ? {
            ...p.uploadSettings,
          }
        : null,
    }));
  return {
    schemaVersion: 3,
    finished: copyPhotos(state.finished),
    archivedOriginals: copyPhotos(state.archivedOriginals || state.local || []),
  };
}
async function grayPhotoBlob(photo) {
  if (!(photo?.blob instanceof Blob)) throw new Error("photo file unavailable");
  return photo.blob;
}
function downloadAlbumBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function albumCRC(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function photoZip(photos) {
  const chunks = [],
    central = [];
  let offset = 0,
    centralSize = 0;
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i],
      blob = await grayPhotoBlob(photo);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const filename = new TextEncoder().encode(
      `${String(i + 1).padStart(2, "0")}-${photo.name.replace(/[\\/]/g, "-")}`,
    );
    const crc = albumCRC(bytes);
    const header = new Uint8Array(30 + filename.length),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x800, true);
    h.setUint16(10, dosTime, true);
    h.setUint16(12, dosDate, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, bytes.length, true);
    h.setUint32(22, bytes.length, true);
    h.setUint16(26, filename.length, true);
    header.set(filename, 30);
    const entry = new Uint8Array(46 + filename.length),
      c = new DataView(entry.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x800, true);
    c.setUint16(12, dosTime, true);
    c.setUint16(14, dosDate, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, bytes.length, true);
    c.setUint32(24, bytes.length, true);
    c.setUint16(28, filename.length, true);
    c.setUint32(42, offset, true);
    entry.set(filename, 46);
    chunks.push(header, bytes);
    central.push(entry);
    offset += header.length + bytes.length;
    centralSize += entry.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, photos.length, true);
  e.setUint16(10, photos.length, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end], {
    type: "application/zip",
  });
}
async function uploadedPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      id: `upload-${albumPhotoId()}`,
      name: file.name,
      width: image.naturalWidth,
      height: image.naturalHeight,
      type: file.type || "image/jpeg",
      size: file.size,
      spec: "",
      blob: file,
      createdAt: Date.now(),
      origin: "upload",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
registerStore("photoLibrary", {
  ...albumSeed(),
  urls: {},
  addedIds: [],
  ready: false,
  busy: false,
  error: "",
  init() {
    this.load();
  },
  async load() {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      const saved = await readAlbumState();
      let state = albumSeed();
      if (saved) {
        if (!Array.isArray(saved.finished)) throw new Error("invalid library");
        const keep = (p) =>
          !(!p.blob && /^(finished|original)-\d+$/.test(p.id)) &&
          !(!p.origin && !p.rawBlob && /^made-/.test(p.id));
        state = plainAlbumState({
          finished: saved.finished.filter(keep),
          archivedOriginals: (
            saved.archivedOriginals ||
            saved.local ||
            []
          ).filter(keep),
        });
      }
      if (
        !saved ||
        saved.schemaVersion !== 3 ||
        state.finished.length !== saved.finished.length
      )
        await writeAlbumState(state);
      Object.assign(this, state);
      this.refreshURLs();
      this.ready = true;
    } catch (_) {
      this.ready = false;
      this.error = "相册暂时无法读取，请重新加载后再试。";
    } finally {
      this.busy = false;
    }
  },
  refreshURLs() {
    const photos = this.finished,
      ids = new Set(photos.map((p) => p.id));
    for (const [id, value] of photoObjectURLs)
      if (!ids.has(id) && !id.startsWith("print-")) {
        URL.revokeObjectURL(value.url);
        photoObjectURLs.delete(id);
      }
    this.urls = Object.fromEntries(
      photos.map((p) => [p.id, actualPhotoURL(p)]),
    );
  },
  url(id) {
    return this.urls[id] || "";
  },
  snapshot() {
    return plainAlbumState(this);
  },
  async commit(next) {
    if (!this.ready || this.busy) throw new Error("library unavailable");
    this.busy = true;
    try {
      const state = plainAlbumState(next);
      await writeAlbumState(state);
      const old = new Set(this.finished.map((p) => p.id));
      Object.assign(this, state);
      this.refreshURLs();
      this.addedIds = state.finished
        .filter((p) => !old.has(p.id))
        .map((p) => p.id);
      setTimeout(() => {
        this.addedIds = [];
      }, 1800);
    } finally {
      this.busy = false;
    }
  },
});
registerController("albumCenter", () => ({
  view: "library",
  library: "finished",
  photoId: null,
  managing: false,
  selected: [],
  modal: null,
  message: "",
  notice: "",
  working: false,
  downloading: false,
  previewHistoryId: null,
  previewClosing: false,
  previewImageFailed: false,
  detailFrom: "library",
  operationEpoch: 0,
  scrollPositions: {},
  returnFocus: null,
  noticeTimer: null,
  routeHandler: null,
  tools: [
    {
      icon: "crop-frame",
      name: "照片裁剪",
      action: "crop",
    },
    {
      icon: "tool-background",
      name: "更换背景",
      action: "background",
    },
    {
      icon: "shirt",
      name: "照片换装",
      action: "outfit",
    },
    {
      icon: "repair",
      name: "照片精修",
      action: "repair",
    },
    {
      icon: "size",
      name: "修改体积",
      action: "resize",
    },
    {
      icon: "tool-convert",
      name: "格式转换",
      action: "format",
    },
  ],
  init() {
    this.$watch("managing", (value) => {
      this.albumManaging = value;
    });
    this.$watch("modal", (value) => {
      this.albumModal = !!value;
      this.albumPreview = value === "preview";
    });
    this.$watch("$store.photoLibrary.finished", () => {
      this.selected = this.selected.filter((id) =>
        this.photos.some((p) => p.id === id),
      );
      if (this.managing && !this.photos.length) this.endManage();
    });
    this.routeHandler = (event) => this.syncLocation(event);
    window.addEventListener("popstate", this.routeHandler);
    window.addEventListener("zhipai-route", this.routeHandler);
    this.syncLocation();
  },
  destroy() {
    window.removeEventListener("popstate", this.routeHandler);
    window.removeEventListener("zhipai-route", this.routeHandler);
    clearTimeout(this.noticeTimer);
  },
  get store() {
    return this.$store.photoLibrary;
  },
  get photos() {
    return this.store.finished;
  },
  get photo() {
    return this.photos.find((p) => p.id === this.photoId) || null;
  },
  get libraryTitle() {
    return "知拍相册";
  },
  get disabled() {
    return !this.store.ready || this.store.busy || this.working;
  },
  get downloadableSelection() {
    return (
      this.selected.length > 0 &&
      this.selected.every((id) =>
        this.photos.some((p) => p.id === id && p.blob instanceof Blob),
      )
    );
  },
  rememberScroll() {
    const surface =
      this.view === "library"
        ? this.$refs.finishedLibraryGrid
        : this.$refs.albumScroll;
    if (surface) this.scrollPositions[this.view] = surface.scrollTop;
  },
  syncLocation(event) {
    const query = new URLSearchParams(location.search);
    if (this.modal === "preview" && event?.type === "popstate") {
      const samePhoto =
        query.get("page") === "album" && query.get("photo") === this.photoId;
      this.finishCloseModal(samePhoto);
      if (samePhoto) return;
    }
    this.clearNotice();
    this.rememberScroll();
    this.operationEpoch++;
    this.library = "finished";
    this.photoId = query.get("photo");
    this.detailFrom = "library";
    this.view =
      query.get("page") === "album" && this.photoId ? "detail" : "library";
    this.managing = false;
    this.selected = [];
    this.modal = null;
    this.message = "";
    this.previewHistoryId = null;
    this.previewClosing = false;
    this.previewImageFailed = false;
    this.albumManaging = false;
    this.albumModal = false;
    this.albumPreview = false;
    this.$nextTick(() => {
      const surface =
        this.view === "library"
          ? this.$refs.finishedLibraryGrid
          : this.$refs.albumScroll;
      if (surface) surface.scrollTop = this.scrollPositions[this.view] || 0;
    });
    if (
      event?.type === "popstate" &&
      history.state?.albumPreview &&
      this.view === "detail" &&
      this.photo?.blob instanceof Blob
    ) {
      this.previewHistoryId = history.state.albumPreview;
      this.showModal("preview");
    }
  },
  route(view, kind = this.library, photoId = null) {
    this.rememberScroll();
    const url = new URL(location.href);
    url.searchParams.set("page", "album");
    url.searchParams.delete("state");
    url.searchParams.delete("camera");
    url.searchParams.delete("upload");
    if (view === "detail") url.searchParams.set("album", "finished");
    else url.searchParams.delete("album");
    ["tool", "view", "print", "order", "back"].forEach((key) =>
      url.searchParams.delete(key),
    );
    if (photoId) {
      url.searchParams.set("photo", photoId);
      url.searchParams.set("from", "library");
    } else {
      url.searchParams.delete("photo");
      url.searchParams.delete("from");
    }
    history.pushState(
      {
        page: "album",
        album: kind,
        photo: photoId,
      },
      "",
      url,
    );
    window.dispatchEvent(new Event("zhipai-route"));
  },
  openLibrary(kind) {
    this.route("library", kind);
  },
  openManage() {
    this.route("library", "finished");
    this.$nextTick(() => this.startManage());
  },
  openPhoto(kind, id) {
    if (this.managing) {
      this.toggle(id);
      return;
    }
    this.route("detail", kind, id);
  },
  back() {
    if (!this.busy && !this.modal && !this.panel && returnToOrderCenter())
      return;
    if (this.modal) {
      this.closeModal();
      return;
    }
    if (this.managing) {
      this.endManage();
      return;
    }
    if (this.view === "detail") this.route("library");
    else if (this.$store.photoChoice.printReturnContext)
      this.$store.photoChoice.resumePrint();
    else this.go("home");
  },
  startManage() {
    if (this.disabled || this.downloading || !this.photos.length) return;
    this.managing = true;
    this.selected = [];
    this.message = "";
  },
  endManage() {
    this.managing = false;
    this.selected = [];
    this.message = "";
  },
  toggle(id) {
    if (
      this.disabled ||
      this.downloading ||
      !this.photos.some((p) => p.id === id)
    )
      return;
    this.selected = this.selected.includes(id)
      ? this.selected.filter((item) => item !== id)
      : [...this.selected, id];
  },
  selectAll() {
    if (this.disabled || this.downloading) return;
    this.selected =
      this.selected.length === this.photos.length
        ? []
        : this.photos.map((p) => p.id);
  },
  clearNotice() {
    clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
    this.notice = "";
  },
  toast(text) {
    this.clearNotice();
    this.notice = text;
    this.noticeTimer = setTimeout(() => {
      this.clearNotice();
    }, 2000);
  },
  showModal(name) {
    this.clearNotice();
    if (!this.modal) this.returnFocus = document.activeElement;
    this.message = "";
    this.modal = name;
    this.$nextTick(() => {
      const dialog =
        name === "preview" ? this.$refs.albumViewer : this.$refs.albumDialog;
      dialog?.querySelector("button:not([disabled])")?.focus({
        preventScroll: true,
      });
    });
  },
  openPreview() {
    if (
      this.page !== "album" ||
      this.view !== "detail" ||
      !(this.photo?.blob instanceof Blob) ||
      this.disabled ||
      this.downloading ||
      this.modal
    )
      return;
    this.previewHistoryId = crypto.randomUUID();
    this.previewImageFailed = false;
    history.pushState(
      { ...history.state, albumPreview: this.previewHistoryId },
      "",
      location.href,
    );
    this.showModal("preview");
  },
  closeModal() {
    if (this.modal !== "preview" && (this.working || this.store.busy)) return;
    if (
      this.modal === "preview" &&
      history.state?.albumPreview === this.previewHistoryId
    ) {
      if (!this.previewClosing) {
        this.previewClosing = true;
        history.back();
      }
      return;
    }
    this.finishCloseModal();
  },
  finishCloseModal(restoreFocus = true) {
    this.modal = null;
    this.previewClosing = false;
    this.previewHistoryId = null;
    this.previewImageFailed = false;
    this.message = "";
    this.$nextTick(
      () =>
        restoreFocus &&
        this.returnFocus?.isConnected &&
        this.returnFocus.focus({
          preventScroll: true,
        }),
    );
  },
  trapFocus(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...(this.modal === "preview"
        ? this.$refs.albumViewer
        : this.$refs.albumDialog
      ).querySelectorAll("button:not([disabled]), a[href]"),
    ].filter((el) => el.getClientRects().length);
    if (!controls.length) {
      event.preventDefault();
      return;
    }
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({
        preventScroll: true,
      });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({
        preventScroll: true,
      });
    }
  },
  capturePhoto() {
    if (!this.disabled && !this.downloading) this.openCamera();
  },
  deleteCurrent() {
    if (!this.photo || this.disabled || this.downloading) return;
    this.selected = [this.photo.id];
    this.showModal("delete");
  },
  async confirmDelete() {
    if (!this.selected.length || this.disabled) return;
    const ids = this.selected.filter((id) =>
        this.photos.some((p) => p.id === id),
      ),
      epoch = this.operationEpoch,
      from = this.view;
    if (!ids.length) return;
    this.working = true;
    this.message = "";
    try {
      const next = this.store.snapshot();
      next.finished = next.finished.filter((p) => !ids.includes(p.id));
      await this.store.commit(next);
      if (epoch === this.operationEpoch) {
        this.selected = [];
        this.modal = null;
        if (from === "detail") this.route("library");
        else if (!this.photos.length) this.endManage();
      }
    } catch (_) {
      if (epoch === this.operationEpoch)
        this.message = "删除未完成，照片已保留，请重试。";
    } finally {
      this.working = false;
    }
  },
  async savePhotos(single = false) {
    if (this.downloading || this.disabled) return;
    const photos = single
      ? [this.photo].filter(Boolean)
      : this.photos.filter((p) => this.selected.includes(p.id));
    if (!photos.length) return;
    const epoch = this.operationEpoch;
    this.downloading = true;
    this.message = "";
    try {
      const blob =
        photos.length === 1
          ? await grayPhotoBlob(photos[0])
          : await photoZip(photos);
      downloadAlbumBlob(
        blob,
        photos.length === 1
          ? photos[0].name
          : `${this.libraryTitle}-${photos.length}张照片.zip`,
      );
      if (epoch === this.operationEpoch)
        this.toast(
          photos.length === 1
            ? "已发起照片下载"
            : `已发起 ${photos.length} 张照片的打包下载`,
        );
    } catch (_) {
      if (epoch === this.operationEpoch)
        this.message = "照片下载失败，请重试。";
    } finally {
      this.downloading = false;
    }
  },
  downloadRaw() {
    if (!this.photo?.rawBlob) return;
    try {
      const file = this.photo.rawBlob;
      const extension = (file.type || "image/jpeg")
        .replace("image/", "")
        .replace("jpeg", "jpg");
      downloadAlbumBlob(
        file,
        file.name ||
          "原图-" + this.photo.name.replace(/\.[^.]+$/, "") + "." + extension,
      );
      this.closeModal();
      this.toast("已发起原始文件下载");
    } catch (_) {
      this.message = "原始文件下载失败，请重试。";
    }
  },
  formatSize(bytes) {
    if (!bytes) return "";
    return bytes >= 1048576
      ? `${(bytes / 1048576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  },
  photoInfo(photo) {
    if (!photo) return "";
    return `${photo.width} × ${photo.height} px · ${(photo.type || photo.blob?.type || "").replace("image/", "").replace("jpeg", "JPG").toUpperCase()}${photo.size ? " · " + this.formatSize(photo.size) : ""}`;
  },
}));
export {
  albumPhotoId,
  albumSeed,
  photoObjectURLs,
  actualPhotoURL,
  photoCropBounds,
  decodePhotoBlob,
  renderPhotoBlob,
  albumDatabase,
  openAlbumDatabase,
  readAlbumState,
  writeAlbumState,
  plainAlbumState,
  grayPhotoBlob,
  downloadAlbumBlob,
  albumCRC,
  photoZip,
  uploadedPhoto,
};
