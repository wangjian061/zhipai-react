import { formatCaptureDate } from "./photo-date.js";
import { photoReadabilityState, isPhotoReadable } from "./photo-readability.js";
import { registerStore, getStore, subscribe } from "../runtime/state.js";
import { actualPhotoURL, downloadAlbumBlob } from "./album.js";

export const PHOTO_OPERATIONS = [
  { id: "print", label: "照片冲印", print: true },
  { id: "repair", label: "照片精修" },
  { id: "outfit", label: "照片换装" },
  { id: "crop", label: "修改尺寸" },
  { id: "background", label: "更换背景" },
  { id: "format", label: "格式转换" },
  { id: "resize", label: "修改大小" },
  { id: "postcard", label: "明信片制作", keepsake: true },
  { id: "stamp", label: "邮票制作", keepsake: true },
];
export function photoFacts(photo) {
  if (!photo) return [];
  const size = photo.size || photo.blob?.size;
  return [
    ["照片规格", photo.spec],
    [
      "文件尺寸",
      Number.isFinite(photo.width) &&
      photo.width > 0 &&
      Number.isFinite(photo.height) &&
      photo.height > 0
        ? `${photo.width} × ${photo.height} px`
        : null,
    ],
    [
      "文件格式",
      (photo.type || photo.blob?.type || "")
        .replace("image/", "")
        .toUpperCase() || null,
    ],
    [
      "文件大小",
      size
        ? size >= 1048576
          ? (size / 1048576).toFixed(2) + " MB"
          : Math.ceil(size / 1024) + " KB"
        : null,
    ],
    ["拍摄日期", formatCaptureDate(photo.captureDate)],
    [
      "制作时间",
      photo.createdAt && Number.isFinite(new Date(photo.createdAt).getTime())
        ? new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(photo.createdAt))
        : null,
    ],
  ].filter(([, v]) => v);
}
export function recentPhotos(library) {
  return (library?.finished || [])
    .filter((p) => p.blob instanceof Blob && p.blob.size)
    .map((p, i) => ({ p, i }))
    .sort(
      (a, b) =>
        (Number(b.p.createdAt) || 0) - (Number(a.p.createdAt) || 0) ||
        a.i - b.i,
    )
    .slice(0, 6)
    .map((x) => x.p);
}
registerStore("photoActions", {
  ...photoReadabilityState(),
  get photoReadable() {
    return isPhotoReadable(this);
  },
  opened: false,
  photoId: null,
  notice: "",
  downloading: false,
  deleting: false,
  working: false,
  get deleteDisabled() {
    const library = getStore("photoLibrary");
    return !library.ready || library.busy || this.working || this.downloading;
  },
  get photo() {
    return (
      getStore("photoLibrary").finished.find(
        (p) => p.id === this.photoId,
      ) || null
    );
  },
  init() {
    this.onRoute = () => this.sync();
    window.addEventListener("zhipai-route", this.onRoute);
    window.addEventListener("popstate", this.onRoute);
    this.unsubscribe = subscribe(() => {
      if (this.opened && (this.photo?.blob || null) !== this.photoReadBlob)
        this.checkPhotoReadability();
    });
    this.sync();
  },
  sync() {
    const q = new URLSearchParams(location.search);
    this.opened = q.get("page") === "my" && !!q.get("photoAction");
    this.photoId = this.opened ? q.get("photoAction") : null;
    this.deleting = this.opened && history.state?.personalPhotoDelete === this.photoId;
    this.notice = "";
    this.checkPhotoReadability();
  },
  show(photo) {
    if (
      !getStore("photoLibrary").finished.some(
        (p) => p.id === photo.id && p.blob,
      )
    )
      return;
    const q = new URLSearchParams(location.search);
    q.set("page", "my");
    q.set("photoAction", photo.id);
    history.pushState({personalPhotoSource:location.pathname+location.search}, "", location.pathname + "?" + q);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  close() {
    if(history.state?.personalPhotoSource && history.length>1) return history.back();
    const q = new URLSearchParams(location.search);
    q.delete("photoAction");
    history.replaceState({}, "", location.pathname + "?" + q);
    this.opened = false;
    this.photoId = null;
    window.dispatchEvent(new Event("zhipai-route"));
  },
  url(photo) {
    return actualPhotoURL(photo);
  },
  requestDelete() {
    if (!this.photo || this.deleteDisabled || this.deleting) return;
    history.pushState({ ...history.state, personalPhotoDelete: this.photoId }, "", location.href);
    this.notice = "";
    this.deleting = true;
  },
  cancelDelete() {
    if (this.working) return;
    if (history.state?.personalPhotoDelete === this.photoId) history.back();
    else this.deleting = false;
  },
  async confirmDelete() {
    if (!this.deleting || !this.photo || this.deleteDisabled) return;
    const id = this.photoId, source = location.href;
    this.working = true;
    this.notice = "";
    try {
      await getStore("photoLibrary").removePhotos([id]);
      if (location.href !== source || this.photoId !== id || !this.deleting) return;
      if (history.state?.personalPhotoDelete === id && history.state?.personalPhotoSource && history.length > 2) {
        history.go(-2);
      } else {
        const q = new URLSearchParams(location.search);
        q.delete("photoAction");
        history.replaceState({}, "", location.pathname + "?" + q);
        window.dispatchEvent(new Event("zhipai-route"));
      }
      this.deleting = false;
    } catch {
      if (location.href === source && this.photoId === id)
        this.notice = "删除未完成，照片已保留，请重试。";
    } finally {
      this.working = false;
    }
  },
  async download() {
    if (this.downloading || !this.photoReadable) return;
    this.downloading = true;
    this.notice = "";
    try {
      downloadAlbumBlob(this.photo.blob, this.photo.name || "知拍照片.jpg");
      this.notice = "已发起照片下载。";
    } catch {
      this.notice = "保存未完成，请重试下载。";
    } finally {
      this.downloading = false;
    }
  },
});
