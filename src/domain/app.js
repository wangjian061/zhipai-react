import { openOrderCenter } from "./order-routing.js";
import { HOME_HERO_SLIDES } from "./home-hero.js";
import { hasPageScrollOffset } from "./device-preview.js";
import {
  registerController,
  registerStore,
  getStore,
  getControllerScopes,
  storageValue,
} from "../runtime/state.js";

registerController("imageCarousel", () => ({
  slides: HOME_HERO_SLIDES.map((slide) => ({ ...slide })),
  index: 0,
  loadedSlides: [0],
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
    const interval = 7000;
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
    if (action === "collection") this.go("collection");
    else if (action === "camera") this.openCamera();
    else if (action === "repair") this.openPhotoTool("repair");
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
registerController("phoneDemo", () => ({
  page: "home",
  homeNotice: "",
  homeNoticeTimer: null,
  homeNavScrim: 0,
  homeNavFrame: null,
  homeNavObserver: null,
  homeHeaderOverContent: false,
  returnFocusToHomeBell: false,
  get homeHasUnread() {
    return this.$store.collectionMessages.hasUnreadFor(this.$store.account.session?.phone);
  },
  openHomeNotifications() {
    const collection = getControllerScopes().collectionFlow;
    if (!collection?.entryEnabled("notifications")) {
      this.notifyUnavailable();
      return;
    }
    this.returnFocusToHomeBell = true;
    collection.openNotifications(true);
  },
  albumView: "library",
  albumManaging: false,
  albumModal: false,
  albumPreview: false,
  cameraCompare: false,
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
      [this.$refs.homePage, this.$refs.homeContent, this.$refs.bottomNav].forEach(
        (el) => {
          if (el) this.homeNavObserver.observe(el);
        },
      );
      this.scheduleHomeNavScrim();
    });
  },
  readLocation() {
    this.clearHomeNotice();
    let query = new URLSearchParams(location.search);
    if ((query.get("page") || query.get("state")) === "search") {
      query = new URLSearchParams({ page: "home" });
      history.replaceState(
        { page: "home" },
        "",
        location.pathname + "?" + query,
      );
    }
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
      "specifications",
      "keepsake",
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
    this.supportSearching = this.page==="support" && query.get("view")==="search";
    this.myView = query.get("my") === "share" ? "share" : "overview";
    this.albumView =
      query.get("photo") && this.page === "album" ? "detail" : "library";
    if (this.page === "home" && this.returnFocusToHomeBell) {
      this.returnFocusToHomeBell = false;
      this.$nextTick(() => document.getElementById("home-notifications")?.focus({ preventScroll: true }));
    }
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
      const viewport = this.$refs.homePage;
      if (viewport?.clientHeight)
        this.homeHeaderOverContent = hasPageScrollOffset(viewport);
      const cards = this.$refs.homeContent?.children;
      const nav = this.$refs.bottomNav;
      if (!cards || !nav || !viewport) {
        this.homeNavScrim = 0;
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const screenBottom = viewport.getBoundingClientRect().bottom;
      const scale = nav.offsetWidth && navRect.width ? navRect.width / nav.offsetWidth : 1;
      let overlap = 0;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        overlap = Math.max(overlap, Math.min(screenBottom, rect.bottom) - Math.max(navRect.top, rect.top));
      }
      this.homeNavScrim = Math.min(1, overlap / (24 * scale));
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
      const back = location.pathname + location.search;
      const query = new URLSearchParams({ page: "specifications", back });
      history.pushState({}, "", location.pathname + "?" + query);
      window.dispatchEvent(new Event("zhipai-route"));
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
  openOrders() {
    openOrderCenter("all", "/?page=my");
  },
  go(next, cameraMode = "capture") {
    if (
      ![
        "home",
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
        "specifications",
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
