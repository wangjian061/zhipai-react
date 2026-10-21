import { createSharePoster, renderSharePoster } from "./share-poster.js";
import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";
import { PHOTO_TOOLS } from "./tools.js";
import { uploadedPhoto, downloadAlbumBlob } from "./album.js";
const ZHIPAI_SHARE_URL = "https://www.zhipai.com.cn/h5/index.html";
function zhipaiShareEntry(key) {
  if (key === "print")
    return {
      key,
      title: "冲印服务",
      subtitle: "证件照冲印，送到你手中",
      headline: ["专业冲印", "配送到家"],
      mascot: "assets/bear-print.webp",
      steps: "assets/print-photo-journey.png",
      path: "/?page=print&print=preview",
    };
  if (
    typeof PHOTO_TOOLS !== "undefined" &&
    Object.hasOwn(PHOTO_TOOLS, key) &&
    key !== "spec"
  ) {
    const config = PHOTO_TOOLS[key];
    return {
      key,
      title: config.title,
      subtitle: config.subtitle,
      headline: config.headline,
      mascot: `assets/bear-${key}.webp`,
      steps: `assets/steps-${key}.png`,
      path: `/?page=tool&tool=${key}`,
    };
  }
  return null;
}
function openZhipaiShare(key = "") {
  const entry = zhipaiShareEntry(key),
    url = new URL(location.href);
  const back = location.pathname + location.search;
  url.search = "";
  url.hash = "";
  url.searchParams.set("page", "my");
  url.searchParams.set("my", "share");
  if (entry) url.searchParams.set("share", entry.key);
  url.searchParams.set("back", back);
  history.pushState({}, "", url);
  window.dispatchEvent(new Event("zhipai-route"));
}
const sharePosterAssets = new Map();
function zhipaiPosterAsset(path) {
  if (!sharePosterAssets.has(path))
    sharePosterAssets.set(
      path,
      (async () => {
        const response = await fetch(path);
        if (!response.ok) throw Error("asset unavailable");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })().catch((error) => {
        sharePosterAssets.delete(path);
        throw error;
      }),
    );
  return sharePosterAssets.get(path);
}
function zhipaiServicePoster(entry, assets) {
  return createSharePoster(entry, assets);
}
function zhipaiSharePoster(assets) {
  return createSharePoster(null, assets);
}
function zhipaiChannelIcon(kind) {
  const bodies = {
    wechat:
      '<ellipse cx="15" cy="15" rx="13" ry="11" fill="#04ca54"/><path d="m7 22-2 7 9-5" fill="#04ca54"/><ellipse cx="26" cy="24" rx="10" ry="9" fill="#00bd51" stroke="#fff" stroke-width="1.5"/><path d="m28 30 6 5-1-8" fill="#00bd51"/><g fill="#fff"><circle cx="11" cy="13" r="1.5"/><circle cx="20" cy="13" r="1.5"/><circle cx="22" cy="22" r="1.2"/><circle cx="29" cy="22" r="1.2"/></g>',
    moments: [
      "#ffad2e",
      "#ff795b",
      "#d65edc",
      "#7183fb",
      "#3aafff",
      "#2ddab6",
      "#5fce69",
      "#e6cc3a",
    ]
      .map(
        (color, i) =>
          `<path d="M20 4 30 7 22 19 16 13z" transform="rotate(${i * 45} 20 20)" fill="${color}"/>`,
      )
      .join(""),
    qq: '<ellipse cx="14" cy="34" rx="7" ry="3" fill="#ffc13a"/><ellipse cx="27" cy="34" rx="7" ry="3" fill="#ffc13a"/><path d="M9 26 4 29 9 17M31 26l5 3-5-12" fill="#17202a"/><ellipse cx="20" cy="20" rx="12" ry="16" fill="#17202a"/><ellipse cx="20" cy="24" rx="9" ry="10" fill="#fff"/><ellipse cx="16" cy="12" rx="3" ry="4" fill="#fff"/><ellipse cx="24" cy="12" rx="3" ry="4" fill="#fff"/><g fill="#17202a"><circle cx="17" cy="12" r="1.2"/><circle cx="23" cy="12" r="1.2"/></g><path d="m16 17 4 3 5-3z" fill="#ffb536"/><path d="M9 21q11 5 22 0v4q-11 5-22 0z" fill="#ff4a5a"/>',
    qzone:
      '<path d="m20 2 5.6 11.3L38 15l-9 8.8L31 36l-11-5.8L9 36l2-12.2L2 15l12.4-1.7z" fill="#ffcc00"/><path d="M12 15h17l-16 11h16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" aria-hidden="true">${bodies[kind] || ""}</svg>`;
}
registerStore("myUi", {
  opened: false,
});
registerController("myCenter", () => ({
  feedbackAttachments: [],
  feedbackReading: false,
  feedbackTask: 0,
  feedbackAttachmentError: "",
  feedbackPreview: null,
  feedbackResult: null,
  panel: "",
  channel: "",
  feedback: "",
  panelNotice: "",
  notice: "",
  saving: false,
  previousFocus: null,
  posterMarkup: "",
  posterBlob: null,
  sharing: false,
  shareUrl: ZHIPAI_SHARE_URL,
  shareEntry: null,
  shareBack: "/?page=my",
  posterLoading: false,
  posterError: "",
  posterTask: 0,
  copyManual: false,
  supportEmail: "zpai_service@163.com",
  supportEmailConfirm: false,
  supportCopyManual: false,
  supportNotice: "",
  supportTask: 0,
  onRoute: null,
  init() {
    this.onRoute = () => {
      this.closePanel(false);
      this.notice = "";
      this.loadShareContext();
    };
    window.addEventListener("popstate", this.onRoute);
    window.addEventListener("zhipai-route", this.onRoute);
    this.loadShareContext();
  },
  destroy() {
    window.removeEventListener("popstate", this.onRoute);
    window.removeEventListener("zhipai-route", this.onRoute);
    this.posterTask++;
    this.supportTask++;
    this.resetFeedback();
    this.$store.myUi.opened = false;
  },
  get panelTitle() {
    return (
      {
        account: "登录 / 注册",
        orders: "我的订单",
        support: this.supportEmailConfirm ? "打开邮箱" : "客服中心",
        feedback: "意见反馈",
        language: "切换语言",
        settings: "我的设置",
        share: {
          wechat: "分享给微信好友",
          moments: "分享到朋友圈",
          qq: "分享给 QQ 好友",
          qzone: "分享到 QQ 空间",
        }[this.channel],
      }[this.panel] || ""
    );
  },
  get channelInstructions() {
    return ["moments", "qzone"].includes(this.channel)
      ? "保存分享图片后，在" +
          (this.channel === "moments" ? "朋友圈" : "QQ 空间") +
          "发布，也可以复制链接随图片分享。"
      : "复制分享链接，打开" +
          (this.channel === "qq" ? "QQ" : "微信") +
          "并粘贴给好友，也可以发送分享图片。";
  },
  channelIcon(kind) {
    return zhipaiChannelIcon(kind);
  },
  async loadShareContext() {
    const task = ++this.posterTask,
      q = new URLSearchParams(location.search);
    this.posterLoading = false;
    this.posterError = "";
    this.posterMarkup = "";
    this.posterBlob = null;
    this.copyManual = false;
    if (q.get("page") !== "my" || q.get("my") !== "share") return;
    this.shareEntry = zhipaiShareEntry(q.get("share"));
    const fallback = this.shareEntry?.path || "/?page=my";
    try {
      const back = new URL(q.get("back") || fallback, location.origin);
      this.shareBack =
        back.origin === location.origin &&
        ["my", "home", "tool", "print"].includes(
          back.searchParams.get("page"),
        ) &&
        back.searchParams.get("my") !== "share"
          ? back.pathname + back.search
          : fallback;
    } catch (_) {
      this.shareBack = fallback;
    }
    this.shareUrl = ZHIPAI_SHARE_URL;
    this.posterLoading = true;
    const entry = this.shareEntry;
    try {
      const [art, logo, qr] = await Promise.all([
        zhipaiPosterAsset("assets/share-photo-glass.png"),
        zhipaiPosterAsset("assets/share-brand-logo.png"),
        zhipaiPosterAsset("assets/share-zhipai-qr.png"),
      ]);
      if (task !== this.posterTask) return;
      const assets = { art, logo, qr };
      const markup = entry
        ? zhipaiServicePoster(entry, assets)
        : zhipaiSharePoster(assets);
      this.posterMarkup = markup;
      const blob = await renderSharePoster(markup);
      if (task === this.posterTask) this.posterBlob = blob;
    } catch (_) {
      if (task === this.posterTask)
        this.posterError = "分享图片加载失败，请重试。";
    } finally {
      if (task === this.posterTask) this.posterLoading = false;
    }
  },
  get supportEmailHref() {
    return (
      "mailto:" +
      this.supportEmail +
      "?subject=" +
      encodeURIComponent("知拍客服｜问题咨询")
    );
  },
  requestSupportEmail() {
    if (this.panel !== "support" || !this.$store.myUi.opened) return;
    this.supportEmailConfirm = true;
    this.supportNotice = "";
    this.$nextTick(() =>
      this.$refs.dialog.querySelector("[data-support-confirm]")?.focus(),
    );
  },
  cancelSupportEmail() {
    this.supportEmailConfirm = false;
    this.$nextTick(() =>
      this.$refs.dialog.querySelector("[data-support-contact]")?.focus(),
    );
  },
  async copySupportEmail() {
    if (this.panel !== "support" || !this.$store.myUi.opened) return;
    const task = ++this.supportTask;
    try {
      await navigator.clipboard.writeText(this.supportEmail);
      if (task !== this.supportTask) return;
      this.supportCopyManual = false;
      this.supportNotice = "客服邮箱已复制";
    } catch (_) {
      if (task !== this.supportTask) return;
      this.supportCopyManual = true;
      this.supportNotice = "无法自动复制，请长按或选中邮箱地址复制。";
    }
  },
  showPanel(panel) {
    this.supportTask++;
    this.supportEmailConfirm = false;
    this.supportCopyManual = false;
    this.supportNotice = "";
    this.previousFocus = document.activeElement;
    this.panel = panel;
    this.panelNotice = "";
    this.$store.myUi.opened = true;
    this.$nextTick(() => this.$refs.dialog.querySelector(".my-close")?.focus());
  },
  closePanel(restore = true) {
    if (!this.$store.myUi.opened) return;
    this.supportTask++;
    this.supportEmailConfirm = false;
    this.feedbackTask++;
    this.feedbackReading = false;
    this.feedbackPreview = null;
    this.$store.myUi.opened = false;
    if (restore && this.previousFocus?.isConnected)
      this.$nextTick(() => this.previousFocus.focus());
  },
  dialogKeys(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closePanel();
    }
    if (event.key !== "Tab") return;
    const nodes = Array.from(
      this.$refs.dialog.querySelectorAll(
        "button:not(:disabled),a[href],textarea,input:not([type=file])",
      ),
    ).filter((node) => node.getClientRects().length);
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (!first) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  },
  openShare() {
    this.notice = "";
    openZhipaiShare();
    this.$nextTick(() => {
      this.$el.scrollTop = 0;
    });
  },
  backToMy() {
    history.pushState({}, "", this.shareBack);
    window.dispatchEvent(new Event("zhipai-route"));
    this.$nextTick(() => {
      this.$el.scrollTop = 0;
    });
  },
  shareChannel(kind) {
    this.channel = kind;
    this.showPanel("share");
  },
  async copyLink() {
    const task = this.posterTask,
      url = this.shareUrl;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      if (task !== this.posterTask) return;
      this.copyManual = false;
      this.notice = this.panelNotice = "链接已复制，请在分享应用中粘贴。";
    } catch (_) {
      if (task === this.posterTask) {
        this.copyManual = true;
        this.notice = this.panelNotice =
          "无法自动复制，请长按或选中下方链接手动复制。";
      }
    }
  },
  async addFeedbackAttachments(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length || this.feedbackReading) return;
    const remaining = 6 - this.feedbackAttachments.length;
    if (!remaining) return;
    const task = ++this.feedbackTask;
    this.feedbackReading = true;
    this.feedbackAttachmentError = "";
    this.panelNotice = "";
    const errors = [];
    if (files.length > remaining)
      errors.push(`最多添加6张，超出的 ${files.length - remaining} 张未加入。`);
    try {
      for (const file of files.slice(0, remaining)) {
        if (file.size > 10 * 1048576) {
          errors.push(`${file.name} 超过10 MB。`);
          continue;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          errors.push(`${file.name} 格式不支持，请使用 JPG、PNG 或 WebP。`);
          continue;
        }
        try {
          const photo = await uploadedPhoto(file);
          if (task !== this.feedbackTask) return;
          this.feedbackAttachments.push({
            id: photo.id,
            name: photo.name,
            file,
            url: URL.createObjectURL(file),
          });
        } catch (_) {
          errors.push(`${file.name} 无法读取，请重新选择。`);
        }
      }
      if (task === this.feedbackTask)
        this.feedbackAttachmentError = errors.join(" ");
    } finally {
      if (task === this.feedbackTask) this.feedbackReading = false;
    }
  },
  removeFeedbackAttachment(id) {
    if (this.feedbackReading) return;
    const item = this.feedbackAttachments.find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.url);
    this.feedbackAttachments = this.feedbackAttachments.filter(
      (p) => p.id !== id,
    );
    if (this.feedbackPreview === id) this.feedbackPreview = null;
    this.feedbackAttachmentError = "";
  },
  resetFeedback() {
    this.feedbackTask++;
    this.feedbackReading = false;
    this.feedbackAttachments.forEach((p) => URL.revokeObjectURL(p.url));
    this.feedbackAttachments = [];
    this.feedback = "";
    this.feedbackResult = null;
    this.feedbackPreview = null;
    this.feedbackAttachmentError = "";
    this.panelNotice = "";
  },
  sendFeedback() {
    if (this.feedbackReading || this.feedbackResult) return;
    const message = this.feedback.trim();
    if (!message) {
      this.panelNotice = "请填写问题或建议。";
      return;
    }
    this.panelNotice = "";
    this.feedbackPreview = null;
    this.feedbackResult = {
      message,
      attachmentCount: this.feedbackAttachments.length,
    };
    this.$nextTick(() => {
      this.$refs.dialog.scrollTop = 0;
    });
  },
  async savePoster() {
    if (this.saving || this.posterLoading || !this.posterBlob) return;
    const task = this.posterTask,
      blob = this.posterBlob;
    this.saving = true;
    this.notice = this.panelNotice = "";
    try {
      // Keep a route-safe snapshot without re-rendering during the download gesture.
      await Promise.resolve();
      if (task !== this.posterTask) return;
      downloadAlbumBlob(
        blob,
        (this.shareEntry?.title || "知拍") + "分享海报.png",
      );
      this.notice = this.panelNotice = "已发起图片下载，可在下载文件中查看。";
    } catch (_) {
      if (task === this.posterTask)
        this.notice = this.panelNotice = "图片保存失败，请重试。";
    } finally {
      this.saving = false;
    }
  },
  async systemShare() {
    if (this.sharing || this.posterLoading || !this.posterBlob) return;
    if (!navigator.share) {
      this.notice =
        "当前浏览器不支持直接分享，请保存图片后发送给朋友，或复制链接分享。";
      return;
    }
    const task = this.posterTask,
      title = this.shareEntry?.title || "知拍";
    this.sharing = true;
    this.notice = "";
    try {
      const file = new File([this.posterBlob], title + "分享海报.png", {
        type: "image/png",
      });
      const data = navigator.canShare?.({ files: [file] })
        ? { files: [file], title }
        : { title, text: "你的随身证件照工具", url: this.shareUrl };
      await navigator.share(data);
      if (task === this.posterTask)
        this.notice = "已交给所选应用，请在应用中完成发送。";
    } catch (error) {
      if (task === this.posterTask && error?.name !== "AbortError")
        this.notice = "分享未完成，请重试，或保存图片后发送。";
    } finally {
      this.sharing = false;
    }
  },
}));
export {
  ZHIPAI_SHARE_URL,
  zhipaiShareEntry,
  openZhipaiShare,
  sharePosterAssets,
  zhipaiPosterAsset,
  zhipaiServicePoster,
  zhipaiSharePoster,
  zhipaiChannelIcon,
};
