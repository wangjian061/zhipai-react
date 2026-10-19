import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";
import { decodePhotoBlob } from "./album.js";
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
  reading: false,
  torch: false,
  torchSupported: false,
  result: false,
  guideOpen: false,
  code: "",
  cameraError: "",
  notice: "",
  timer: null,
  noticeTimer: null,
  returnTo: "/?page=home",
  collectionContext: null,
  routeHandler: null,
  openHandler: null,
  visibilityHandler: null,
  previousFocus: null,
  get active() {
    return new URLSearchParams(location.search).get("page") === "scan";
  },
  init() {
    this.routeHandler = () => this.sync();
    this.openHandler = (e) => {
      this.returnTo = e.detail.returnTo || "/?page=home";
      this.collectionContext =
        e.detail.intent === "collectionIdentity"
          ? {
              ...e.detail,
            }
          : null;
      this.result = false;
      this.guideOpen = false;
      this.code = "";
    };
    this.visibilityHandler = () => {
      if (document.hidden) this.stop();
      else if (this.active && !this.result && !this.ready && !this.starting)
        this.start();
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
    this.code = "";
  },
  sync() {
    if (!this.active) {
      this.stop();
      this.result = false;
      this.guideOpen = false;
      this.code = "";
      return;
    }
    if (!this.result && !this.ready && !this.starting)
      this.$nextTick(() => this.start());
  },
  async start() {
    if (
      this.starting ||
      this.ready ||
      this.reading ||
      !this.active ||
      document.hidden ||
      this.result ||
      this.guideOpen
    )
      return;
    this.starting = true;
    this.cameraError = "";
    const generation = ++this.generation;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 1280,
          },
        },
      });
      if (generation !== this.generation || !this.active) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      collectionScanStream = stream;
      this.$refs.scanVideo.srcObject = stream;
      await this.$refs.scanVideo.play();
      if (generation !== this.generation) return;
      this.ready = true;
      this.torchSupported = !!stream.getVideoTracks()[0]?.getCapabilities?.()
        .torch;
      this.schedule(generation);
    } catch (e) {
      if (generation === this.generation) {
        this.stop();
        this.cameraError =
          e.name === "NotAllowedError"
            ? "请允许相机权限，或上传采集码图片。"
            : "相机暂时无法开启，可上传采集码图片。";
      }
    } finally {
      if (generation === this.generation) this.starting = false;
    }
  },
  stop() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    collectionScanStream?.getTracks().forEach((t) => t.stop());
    collectionScanStream = null;
    if (this.$refs.scanVideo) this.$refs.scanVideo.srcObject = null;
    this.ready = false;
    this.starting = false;
    this.torch = false;
    this.torchSupported = false;
  },
  schedule(generation) {
    clearTimeout(this.timer);
    if (
      !this.active ||
      !this.ready ||
      this.result ||
      generation !== this.generation
    )
      return;
    this.timer = setTimeout(() => this.scanFrame(generation), 650);
  },
  async scanFrame(generation) {
    if (this.reading) {
      this.schedule(generation);
      return;
    }
    this.reading = true;
    try {
      const code = await readCollectionQRCode(this.$refs.scanVideo);
      if (generation !== this.generation || !this.active) return;
      if (code) {
        this.accept(code);
        return;
      }
    } catch (_) {
      if (generation === this.generation)
        this.toast("二维码识别暂时不可用，请上传图片重试。");
    } finally {
      this.reading = false;
      this.schedule(generation);
    }
  },
  async upload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || this.reading) return;
    this.stop();
    const generation = this.generation;
    this.reading = true;
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 30 * 1048576
      )
        throw Error("file");
      const image = await decodePhotoBlob(file);
      const code = await readCollectionQRCode(image);
      if (!this.active || generation !== this.generation) return;
      if (code) this.accept(code);
      else this.toast("未识别到二维码，请上传清晰的采集码图片。");
    } catch (_) {
      if (this.active && generation === this.generation)
        this.toast("图片无法识别，请重新选择采集码图片。");
    } finally {
      this.reading = false;
      if (this.active && !this.result && !this.ready && !this.starting)
        this.start();
    }
  },
  accept(code) {
    this.code = code;
    this.previousFocus = document.activeElement;
    this.result = true;
    this.stop();
    this.$nextTick(() =>
      this.$refs.scanResult.querySelector("button")?.focus({
        preventScroll: true,
      }),
    );
  },
  retry() {
    this.result = false;
    this.code = "";
    this.$nextTick(() => {
      this.previousFocus?.focus({
        preventScroll: true,
      });
      this.start();
    });
  },
  openGuide() {
    this.previousFocus = document.activeElement;
    this.guideOpen = true;
    this.stop();
    this.$nextTick(() =>
      this.$refs.scanGuide.querySelector("button")?.focus({
        preventScroll: true,
      }),
    );
  },
  closeGuide() {
    this.guideOpen = false;
    this.$nextTick(() => {
      this.previousFocus?.focus({
        preventScroll: true,
      });
      if (this.active && !this.result) this.start();
    });
  },
  verify() {
    if (!this.collectionContext) {
      this.toast("采集码验证暂未开放");
      return;
    }
    const context = {
        ...this.collectionContext,
      },
      code = this.code;
    this.back();
    window.dispatchEvent(
      new CustomEvent("zhipai-collection-code", {
        detail: {
          projectId: context.projectId,
          code,
        },
      }),
    );
  },
  async toggleTorch() {
    if (!this.ready || !this.torchSupported) {
      this.toast("当前设备不支持手电筒");
      return;
    }
    const generation = this.generation,
      value = !this.torch;
    try {
      await collectionScanStream.getVideoTracks()[0].applyConstraints({
        advanced: [
          {
            torch: value,
          },
        ],
      });
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
    this.stop();
    const u = new URL(this.returnTo, location.origin);
    history.pushState({}, "", u.origin === location.origin ? u : "/?page=home");
    window.dispatchEvent(new Event("zhipai-route"));
  },
  trap(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.guideOpen ? this.closeGuide() : this.retry();
      return;
    }
    if (e.key !== "Tab") return;
    const list = [
        ...(this.guideOpen
          ? this.$refs.scanGuide
          : this.$refs.scanResult
        ).querySelectorAll("button"),
      ],
      first = list[0],
      last = list.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },
}));
export { collectionScanStream, readCollectionQRCode };
