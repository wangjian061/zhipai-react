import { openOrderCenter } from "./order-routing.js";
import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";

registerController("imageCarousel", (kind) => ({
  slides:
    kind === "hero"
      ? [
          {
            title: "更换背景色",
            subtitle: "蓝 / 红 / 白底色一键替换",
            actionLabel: "更换背景",
            image: "assets/hero-background.webp",
          },
          {
            title: "个人证件照",
            subtitle: "标准证照 · 轻松制作",
            actionLabel: "开始制作",
            image: "assets/hero-portrait.webp",
          },
          {
            title: "照片处理",
            subtitle: "裁剪 / 转换 / 调整体积",
            actionLabel: "裁剪照片",
            image: "assets/hero-tools.webp",
          },
        ]
      : [
          {
            title: "毕业证照",
            subtitle: "毕业图像 · 规范采集",
            theme: "graduate",
            image: "assets/collection-bear-graduate.webp",
          },
          {
            title: "入学采集",
            subtitle: "新生报到 · 入学证照",
            theme: "enrollment",
            image: "assets/collection-bear-enrollment.webp",
          },
          {
            title: "会员证件",
            subtitle: "会员证照 · 身份登记",
            theme: "association",
            image: "assets/collection-bear-association.webp",
          },
        ],
  index: kind === "hero" ? 1 : 0,
  loadedSlides: kind === "hero" ? [1] : [0, 1, 2],
  changeRequest: 0,
  imageRequests: {},
  startX: null,
  startY: null,
  hovered: false,
  focused: false,
  timer: null,
  visible: true,
  observer: null,
  swiped: false,
  lastChange: Date.now(),
  init() {
    const interval = kind === "hero" ? 7000 : 8000;
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.visible = entry.intersectionRatio >= 0.25;
        },
        {
          threshold: 0.25,
        },
      );
      this.observer.observe(this.$el);
    }
    this.timer = setInterval(() => {
      if (
        document.hidden ||
        !this.visible ||
        this.hovered ||
        this.focused ||
        this.startX !== null ||
        getStore("photoChoice")?.opened
      )
        return;
      if (this.$el.closest(".phone").dataset.page !== "home") return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (Date.now() - this.lastChange >= interval) this.select(this.index + 1);
    }, 300);
  },
  destroy() {
    clearInterval(this.timer);
    this.observer?.disconnect();
    this.changeRequest++;
  },
  pause() {
    this.lastChange = Date.now();
  },
  activate(event, action) {
    if (this.swiped && event.detail !== 0) {
      event.preventDefault();
      this.swiped = false;
      return;
    }
    this.swiped = false;
    this.openPhotoTool(action);
  },
  async select(next) {
    const target = (next + this.slides.length) % this.slides.length;
    const request = ++this.changeRequest;
    this.lastChange = Date.now();
    if (!this.loadedSlides.includes(target)) {
      if (!this.imageRequests[target]) {
        this.imageRequests[target] = new Promise((resolve) => {
          const image = new Image();
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = this.slides[target].image;
        });
      }
      const ready = await this.imageRequests[target];
      delete this.imageRequests[target];
      if (!ready || request !== this.changeRequest) return;
      this.loadedSlides.push(target);
      await this.$nextTick();
      if (request !== this.changeRequest) return;
    }
    this.index = target;
    this.lastChange = Date.now();
  },
  startSwipe(event) {
    if (!event.isPrimary || event.button !== 0) return;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.swiped = false;
    this.pause();
  },
  endSwipe(event) {
    if (this.startX === null) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    this.startX = null;
    this.swiped = Math.abs(dx) > 10 || Math.abs(dy) > 10;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy))
      this.select(this.index + (dx < 0 ? 1 : -1));
  },
}));
registerController("searchPage", () => ({
  keyword: "",
  searched: false,
  matches: [],
  routeHandler: null,
  init() {
    this.routeHandler = () => this.readQuery();
    window.addEventListener("popstate", this.routeHandler);
    window.addEventListener("zhipai-route", this.routeHandler);
    this.readQuery();
  },
  destroy() {
    window.removeEventListener("popstate", this.routeHandler);
    window.removeEventListener("zhipai-route", this.routeHandler);
  },
  readQuery() {
    const query = new URLSearchParams(location.search);
    if (query.get("page") !== "search") return;
    this.keyword = (query.get("q") || "").slice(0, 60);
    if (this.keyword.trim()) this.search(false);
    else {
      this.searched = false;
      this.matches = [];
    }
    this.$nextTick(() =>
      this.$refs.searchInput.focus({
        preventScroll: true,
      }),
    );
  },
  entries: [
    {
      label: "一寸证件照",
      action: "spec",
      aliases: ["一寸", "1寸", "证件照"],
    },
    {
      label: "两寸证件照",
      action: "spec",
      aliases: ["两寸", "二寸", "2寸", "证件照"],
    },
    {
      label: "简历照片",
      action: "spec",
      aliases: ["简历", "求职"],
    },
    {
      label: "会员照片",
      action: "spec",
      aliases: ["会员", "协会"],
    },
    {
      label: "冲印服务",
      action: "print",
      aliases: ["冲印", "打印", "排版"],
    },
    {
      label: "照片精修",
      action: "repair",
      aliases: ["修复", "修图", "精修", "照片修复"],
    },
    {
      label: "照片换装",
      action: "outfit",
      aliases: ["换装", "衣服", "西装"],
    },
    {
      label: "证照规格",
      action: "spec",
      aliases: ["规格", "证照", "尺寸"],
    },
    {
      label: "照片裁剪",
      action: "crop",
      aliases: ["裁剪", "剪裁", "裁切"],
    },
    {
      label: "更换背景",
      action: "background",
      aliases: ["背景", "底色", "蓝底", "红底", "白底"],
    },
    {
      label: "格式转换",
      action: "format",
      aliases: ["格式", "转换", "jpg", "jpeg", "png", "webp"],
    },
    {
      label: "修改体积",
      action: "resize",
      aliases: ["修改大小", "大小", "文件体积", "kb", "mb", "压缩", "缩小"],
    },
  ],
  search(updateURL = true) {
    const query = this.keyword.trim().toLowerCase().replace(/\s+/g, "");
    this.matches = query
      ? this.entries.filter((item) =>
          [item.label, ...item.aliases].some((term) =>
            term.toLowerCase().includes(query),
          ),
        )
      : [];
    this.searched = true;
    if (updateURL) {
      const url = new URL(location.href);
      if (this.keyword.trim()) url.searchParams.set("q", this.keyword.trim());
      else url.searchParams.delete("q");
      ["account", "project", "record", "view"].forEach((key) =>
        url.searchParams.delete(key),
      );
      history.replaceState(history.state, "", url);
    }
  },
  edit() {
    this.searched = false;
    this.matches = [];
    const url = new URL(location.href);
    url.searchParams.delete("q");
    ["account", "project", "record", "view"].forEach((key) =>
      url.searchParams.delete(key),
    );
    history.replaceState(history.state, "", url);
  },
}));
registerController("phoneDemo", () => ({
  page: "home",
  homeNotice: "",
  homeNoticeTimer: null,
  homeNavScrim: 0,
  homeNavFrame: null,
  homeNavObserver: null,
  albumView: "library",
  albumManaging: false,
  albumModal: false,
  cameraStep: "capture",
  myView: "overview",
  init() {
    this.readLocation();
    window.addEventListener("popstate", () => this.readLocation());
    window.addEventListener("zhipai-route", () => this.readLocation());
    this.$nextTick(() => {
      this.homeNavObserver = new ResizeObserver(() =>
        this.scheduleHomeNavScrim(),
      );
      [this.$refs.homePage, this.$refs.homeTools, this.$refs.bottomNav].forEach(
        (el) => {
          if (el) this.homeNavObserver.observe(el);
        },
      );
      this.scheduleHomeNavScrim();
    });
  },
  readLocation() {
    this.clearHomeNotice();
    const query = new URLSearchParams(location.search);
    if (
      query.get("page") === "album" &&
      (query.get("album") === "local" || query.has("upload"))
    ) {
      ["upload", "photo", "from"].forEach((key) => query.delete(key));
      if (query.get("album") === "local") query.set("album", "finished");
      history.replaceState(
        history.state,
        "",
        `${location.pathname}?${query}${location.hash}`,
      );
    }
    if (query.get("page") === "camera" && query.get("camera") === "scan") {
      query.set("page", "scan");
      query.delete("camera");
      history.replaceState(history.state, "", `${location.pathname}?${query}`);
    }
    const requested = query.get("page") || query.get("state");
    this.page = [
      "home",
      "search",
      "album",
      "support",
      "my",
      "camera",
      "scan",
      "print",
      "tool",
      "account",
      "collection",
      "orders",
    ].includes(requested)
      ? requested
      : "home";
    this.cameraStep = [
      "capture",
      "confirm",
      "processing",
      "editor",
      "saved",
    ].includes(query.get("camera"))
      ? query.get("camera")
      : "capture";
    this.myView = query.get("my") === "share" ? "share" : "overview";
    this.albumView =
      query.get("photo") && this.page === "album" ? "detail" : "library";
    this.$nextTick(() => this.scheduleHomeNavScrim());
  },
  scheduleHomeNavScrim() {
    if (this.homeNavFrame !== null) return;
    this.homeNavFrame = requestAnimationFrame(() => {
      this.homeNavFrame = null;
      if (this.page !== "home") {
        this.homeNavScrim = 0;
        return;
      }
      const content = this.$refs.homeTools;
      const nav = this.$refs.bottomNav;
      if (!content || !nav) return;
      const navRect = nav.getBoundingClientRect();
      const scale =
        nav.offsetWidth && navRect.width ? navRect.width / nav.offsetWidth : 1;
      const gap =
        (navRect.top - content.getBoundingClientRect().bottom) / scale;
      this.homeNavScrim = Math.max(0, Math.min(1, (24 - gap) / 24));
    });
  },
  notifyUnavailable() {
    this.clearHomeNotice();
    this.homeNotice = "暂未开放这个功能";
    this.homeNoticeTimer = setTimeout(() => {
      this.homeNotice = "";
      this.homeNoticeTimer = null;
    }, 2500);
  },
  clearHomeNotice() {
    clearTimeout(this.homeNoticeTimer);
    this.homeNoticeTimer = null;
    this.homeNotice = "";
  },
  destroy() {
    this.clearHomeNotice();
    this.homeNavObserver?.disconnect();
    if (this.homeNavFrame !== null) cancelAnimationFrame(this.homeNavFrame);
  },
  openPhotoTool(action, photo = null, kind = null) {
    if (action === "spec") {
      this.notifyUnavailable();
      return;
    }
    if (
      ![
        "repair",
        "outfit",
        "spec",
        "crop",
        "background",
        "format",
        "resize",
      ].includes(action)
    ) {
      const context = {
        action,
        intent: "tool",
        returnTo: location.pathname + location.search,
        sources: ["finished"],
      };
      if (photo)
        window.dispatchEvent(
          new CustomEvent("zhipai-photo-chosen", {
            detail: {
              context,
              kind,
              photo,
            },
          }),
        );
      else this.$store.photoChoice.show(context);
      return;
    }
    window.dispatchEvent(
      new CustomEvent("zhipai-tool-open", {
        detail: {
          action,
          photo,
          kind,
          returnTo: location.pathname + location.search,
        },
      }),
    );
  },
  openCamera(mode = "capture") {
    window.dispatchEvent(
      new CustomEvent(
        mode === "scan" ? "zhipai-scan-open" : "zhipai-camera-open",
        {
          detail: {
            returnTo: location.pathname + location.search,
          },
        },
      ),
    );
    this.go(mode === "scan" ? "scan" : "camera");
  },
  openPrint(photo = null, kind = null, entry = "home") {
    window.dispatchEvent(
      new CustomEvent("zhipai-print-open", {
        detail: {
          photo,
          kind,
          entry,
          returnTo: location.pathname + location.search,
        },
      }),
    );
  },
  openOrders() { openOrderCenter("all", "/?page=my"); },
  go(next, cameraMode = "capture") {
    if (
      ![
        "home",
        "search",
        "album",
        "support",
        "my",
        "camera",
        "scan",
        "print",
        "tool",
        "account",
        "collection",
      "orders",
      ].includes(next)
    )
      return;
    this.page = next;
    const url = new URL(location.href);
    url.searchParams.delete("state");
    url.searchParams.delete("album");
    url.searchParams.delete("photo");
    url.searchParams.delete("from");
    url.searchParams.delete("camera");
    url.searchParams.delete("session");
    url.searchParams.delete("upload");
    url.searchParams.delete("tool");
    url.searchParams.delete("my");
    url.searchParams.delete("share");
    url.searchParams.delete("print");
    url.searchParams.delete("order");
    url.searchParams.delete("address");
    url.searchParams.delete("back");
    url.searchParams.delete("q");
    ["account", "project", "record", "view"].forEach((key) =>
      url.searchParams.delete(key),
    );
    url.searchParams.set("page", next);
    if (next === "camera")
      url.searchParams.set(
        "camera",
        cameraMode === "scan" ? "scan" : "capture",
      );
    history.pushState(
      {
        page: next,
      },
      "",
      url,
    );
    window.dispatchEvent(new Event("zhipai-route"));
  },
}));
export {};
