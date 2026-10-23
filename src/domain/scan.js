import { registerController, getStore } from "../runtime/state.js";
import { decodePhotoBlob } from "./album.js";
import {
  collectionScanService,
  collectionCodeError,
  validateCollectionCodeFile,
} from "./collection-code.js";
// Scanner has its own route, stream, upload input and recognition lifecycle.
let collectionScanStream = null;
async function readCollectionQRCode(source) {
  if (typeof window.BarcodeDetector === "function") {
    try {
      const detector = new window.BarcodeDetector({
          formats: ["qr_code"],
        }),
        codes = await detector.detect(source);
      if (codes.length) return codes[0].rawValue;
    } catch (_) {}
  }
  if (typeof window.jsQR !== "function") throw Error("decoder");
  const w = source.videoWidth || source.naturalWidth || source.width,
    h = source.videoHeight || source.naturalHeight || source.height;
  if (!w || !h) return "";
  const scale = Math.min(1, 1280 / Math.max(w, h)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return (
    window.jsQR(data.data, data.width, data.height, {
      inversionAttempts: "attemptBoth",
    })?.data || ""
  );
}
registerController("collectionScanner", () => ({
  ready: false,
  starting: false,
  generation: 0,
  frameReading: false,
  uploading: false,
  resolving: false,
  torch: false,
  torchSupported: false,
  failure: null,
  guideOpen: false,
  guidePage: "",
  cameraError: "",
  notice: "",
  source: "camera",
  cameraGranted: false,
  autoStarted: false,
  picking: false,
  ignoredCode: "",
  ignoredUntil: 0,
  timer: null,
  noticeTimer: null,
  returnTo: "/?page=home",
  collectionContext: null,
  previousFocus: null,
  routeHandler: null,
  openHandler: null,
  visibilityHandler: null,
  scanRoute: "/?page=scan",
  get active() {
    return new URLSearchParams(location.search).get("page") === "scan";
  },
  get reading() {
    return this.uploading || this.resolving;
  },
  get result() {
    return !!this.failure;
  },
  init() {
    this.routeHandler = (event) => {
      // Native/browser back dismisses an open sheet before leaving the scanner.
      if (
        event?.type === "popstate" &&
        !this.active &&
        (this.guideOpen || this.failure)
      ) {
        history.pushState({}, "", this.scanRoute);
        this.guideOpen ? this.guideBack() : this.dismissFailure();
        return;
      }
      this.sync();
    };
    this.openHandler = (event) => {
      this.stop();
      collectionScanService.clear();
      const detail = event.detail || {};
      this.returnTo = this.safeReturn(detail.returnTo);
      this.collectionContext =
        detail.intent === "collectionIdentity"
          ? { intent: detail.intent, projectId: detail.projectId }
          : null;
      this.failure = null;
      this.guideOpen = false;
      this.guidePage = "";
      this.autoStarted = false;
      this.cameraGranted = false;
      this.cameraError = "";
      this.source = "camera";
      this.ignoredCode = "";
      this.picking = false;
    };
    this.visibilityHandler = () => {
      if (document.hidden) this.stop();
      else this.resumeCamera();
    };
    window.addEventListener("zhipai-route", this.routeHandler);
    window.addEventListener("popstate", this.routeHandler);
    window.addEventListener("zhipai-scan-open", this.openHandler);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.sync();
  },
  destroy() {
    window.removeEventListener("zhipai-route", this.routeHandler);
    window.removeEventListener("popstate", this.routeHandler);
    window.removeEventListener("zhipai-scan-open", this.openHandler);
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.stop();
    clearTimeout(this.noticeTimer);
  },
  safeReturn(path) {
    try {
      const url = new URL(path || "/?page=home", location.origin);
      if (
        url.origin === location.origin &&
        !["scan", "camera"].includes(url.searchParams.get("page"))
      )
        return url.pathname + url.search;
    } catch (_) {}
    return "/?page=home";
  },
  sync() {
    if (!this.active) {
      this.stop();
      this.failure = null;
      this.guideOpen = false;
      this.guidePage = "";
      this.picking = false;
      this.autoStarted = false;
      return;
    }
    this.scanRoute = location.pathname + location.search;
    if (!this.autoStarted) {
      this.autoStarted = true;
      this.$nextTick(() => {
        if (this.active && this.source === "camera") this.start();
      });
    }
  },
  async start() {
    if (
      this.starting ||
      this.ready ||
      this.reading ||
      !this.active ||
      document.hidden ||
      this.failure ||
      this.guideOpen ||
      this.picking
    )
      return;
    this.source = "camera";
    this.starting = true;
    this.cameraError = "";
    const generation = ++this.generation;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      });
      if (generation !== this.generation || !this.active || document.hidden) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      collectionScanStream = stream;
      const video = this.$refs.scanVideo;
      if (!video) throw Error("video");
      video.srcObject = stream;
      await video.play();
      if (generation !== this.generation) return;
      this.ready = true;
      this.cameraGranted = true;
      this.torchSupported = !!stream.getVideoTracks()[0]?.getCapabilities?.()
        .torch;
      this.schedule(generation);
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        this.cameraGranted = false;
        this.cameraError =
          error.name === "NotAllowedError"
            ? "相机权限未开启，可从相册识别采集码。"
            : "相机暂时无法开启，可从相册识别采集码。";
      }
    } finally {
      if (generation === this.generation) this.starting = false;
    }
  },
  stop() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    collectionScanStream?.getTracks().forEach((track) => track.stop());
    collectionScanStream = null;
    if (this.$refs.scanVideo) this.$refs.scanVideo.srcObject = null;
    this.ready = false;
    this.starting = false;
    this.torch = false;
    this.torchSupported = false;
    this.frameReading = false;
    this.uploading = false;
    this.resolving = false;
  },
  resumeCamera() {
    if (
      this.source === "camera" &&
      this.cameraGranted &&
      !this.picking &&
      !this.failure &&
      !this.guideOpen
    )
      this.start();
  },
  schedule(generation) {
    clearTimeout(this.timer);
    if (
      !this.active ||
      !this.ready ||
      this.failure ||
      this.guideOpen ||
      generation !== this.generation
    )
      return;
    this.timer = setTimeout(() => this.scanFrame(generation), 650);
  },
  async scanFrame(generation) {
    if (generation !== this.generation || !this.active || !this.ready) return;
    if (this.frameReading || this.reading) {
      this.schedule(generation);
      return;
    }
    this.frameReading = true;
    try {
      const code = await readCollectionQRCode(this.$refs.scanVideo);
      if (generation !== this.generation || !this.active) return;
      if (
        code &&
        !(code === this.ignoredCode && Date.now() < this.ignoredUntil)
      )
        await this.accept(code);
    } catch (_) {
      if (generation === this.generation)
        this.showFailure(
          collectionCodeError(
            "decoder",
            "暂时无法识别",
            "二维码识别暂时不可用，请稍后重试。",
          ),
        );
    } finally {
      if (generation === this.generation) {
        this.frameReading = false;
        this.schedule(generation);
      }
    }
  },
  pickPhoto() {
    if (this.reading || this.picking) return;
    this.previousFocus = document.activeElement;
    this.pickSource = this.source;
    this.picking = true;
    this.stop();
    this.$refs.qrInput?.click();
  },
  cancelPick() {
    if (!this.picking) return;
    this.picking = false;
    this.source = this.pickSource || this.source;
    this.resumeCamera();
  },
  async upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      this.cancelPick();
      return;
    }
    if (this.reading) return;
    this.picking = false;
    this.source = "album";
    this.stop();
    const generation = this.generation;
    this.uploading = true;
    try {
      validateCollectionCodeFile(file);
      const image = await decodePhotoBlob(file);
      const code = await readCollectionQRCode(image);
      if (!this.active || generation !== this.generation || document.hidden)
        return;
      if (!code)
        throw collectionCodeError(
          "no_code",
          "未识别到二维码",
          "请选择包含清晰、完整二维码的原图，避免反光或遮挡。",
        );
      this.uploading = false;
      await this.accept(code);
    } catch (error) {
      if (this.active && generation === this.generation)
        this.showFailure(
          error.code
            ? error
            : collectionCodeError(
                "image",
                "图片无法读取",
                "请重新选择清晰完整的采集码图片。",
              ),
        );
    } finally {
      if (generation === this.generation) this.uploading = false;
    }
  },
  async accept(code) {
    if (this.resolving || !this.active) return;
    this.stop();
    const generation = this.generation;
    this.resolving = true;
    const owner = getStore("account")?.session?.phone || null;
    try {
      const result = await collectionScanService.resolve(
        code,
        this.collectionContext || {},
      );
      if (
        generation !== this.generation ||
        !this.active ||
        document.hidden ||
        owner !== (getStore("account")?.session?.phone || null)
      )
        return;
      collectionScanService.queue(result, owner);
      this.navigateProject(result.projectId);
    } catch (error) {
      if (generation === this.generation && this.active) {
        this.ignoredCode = code;
        this.ignoredUntil = Date.now() + 5000;
        this.showFailure(
          error.code
            ? error
            : collectionCodeError(
                "service",
                "暂时无法关联项目",
                "采集码解析服务暂时不可用，请稍后重试。",
              ),
        );
      }
    } finally {
      if (generation === this.generation) this.resolving = false;
    }
  },
  navigateProject(projectId) {
    this.stop();
    const target = new URL("/?page=collection&view=project", location.origin);
    target.searchParams.set("project", projectId);
    const source = new URL(this.safeReturn(this.returnTo), location.origin);
    if (
      source.searchParams.get("page") === "collection" &&
      source.searchParams.get("view") === "project"
    ) {
      for (const key of ["from", "category", "q", "section", "scanBack"])
        if (source.searchParams.has(key))
          target.searchParams.set(key, source.searchParams.get(key));
    } else target.searchParams.set("scanBack", source.pathname + source.search);
    history.replaceState({}, "", target);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  showFailure(error) {
    this.previousFocus = document.activeElement;
    this.stop();
    this.failure = {
      title: error.title || "识别未完成",
      message: error.message,
      projectId: error.projectId || "",
    };
    this.focusSheet("scanResult");
  },
  dismissFailure() {
    this.failure = null;
    this.restoreFocus();
    this.resumeCamera();
  },
  retry() {
    this.dismissFailure();
  },
  retryPhoto() {
    this.failure = null;
    this.pickPhoto();
  },
  openGuide() {
    if (this.reading) return;
    this.previousFocus = document.activeElement;
    this.guideOpen = true;
    this.guidePage = "";
    this.stop();
    this.focusSheet("scanGuide");
  },
  showGuide(page) {
    if (!["institution", "chsi"].includes(page)) return;
    this.guidePage = page;
    this.$nextTick(() => {
      if (this.$refs.scanGuideBody) this.$refs.scanGuideBody.scrollTop = 0;
    });
    this.focusSheet("scanGuide");
  },
  guideBack() {
    this.guidePage ? this.showDirectory() : this.closeGuide();
  },
  showDirectory() {
    this.guidePage = "";
    this.focusSheet("scanGuide");
  },
  closeGuide() {
    this.guideOpen = false;
    this.guidePage = "";
    this.restoreFocus();
    this.resumeCamera();
  },
  focusSheet(ref) {
    this.$nextTick(() =>
      this.$refs[ref]?.querySelector("button")?.focus({ preventScroll: true }),
    );
  },
  restoreFocus() {
    this.$nextTick(() => this.previousFocus?.focus({ preventScroll: true }));
  },
  async toggleTorch() {
    if (!this.ready || !this.torchSupported) return;
    const generation = this.generation,
      value = !this.torch;
    try {
      await collectionScanStream
        .getVideoTracks()[0]
        .applyConstraints({ advanced: [{ torch: value }] });
      if (generation === this.generation) this.torch = value;
    } catch (_) {
      this.toast("手电筒未能开启，请重试");
    }
  },
  toast(message) {
    this.notice = message;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => (this.notice = ""), 2800);
  },
  back() {
    if (this.guideOpen) {
      this.guideBack();
      return;
    }
    if (this.failure) {
      this.dismissFailure();
      return;
    }
    this.stop();
    history.replaceState({}, "", this.safeReturn(this.returnTo));
    window.dispatchEvent(new Event("zhipai-route"));
  },
  trap(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.guideOpen ? this.guideBack() : this.dismissFailure();
      return;
    }
    if (event.key !== "Tab") return;
    const sheet = this.$refs[this.guideOpen ? "scanGuide" : "scanResult"];
    const nodes = [
      ...(sheet?.querySelectorAll("button:not([disabled]),a[href]") || []),
    ].filter((node) => node.getClientRects().length);
    const first = nodes[0],
      last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  },
}));
export { collectionScanStream, readCollectionQRCode };
