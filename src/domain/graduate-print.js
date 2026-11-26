import { registerController } from "../runtime/state.js";
import { accountRoute } from "./account.js";
import { returnToUniversityPrint, universityPath, universityPrintHistory } from "./collection-history.js";
import { renderPhotoBlob, uploadedPhoto } from "./album.js";
import { paymentResult } from "./order-status.js";
import { checkoutMethod, createHandoff, finishHandoff, handoffStatus, lockPayment, presentHandoff } from "./payment-handoff.js";
import { cleanCrop, printAddressCopy, printId, printPhotoCopy, updatePrintTransaction } from "./print.js";
import { cleanShippingAddress, shippingAddressError } from "./shipping-address.js";

export const graduatePrintPath = "/?page=print&view=graduate";
export const graduatePrintTitle = "毕业照片 6 寸冲印";
export const graduatePrintPrices = { minimum: 10, base: 6000, additional: 600, shipping: 1000 };
const emptyDraft = { photos: [], address: {}, orderId: null };
const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxPhotoBytes = 30 * 1048576;
export function graduateSourceAllowed(source) {
  const blob = source?.blob || source;
  return supportedTypes.includes(blob?.type) && blob.size > 0 && blob.size <= maxPhotoBytes;
}

export function graduateQuote(count) {
  const { minimum, base, additional, shipping } = graduatePrintPrices;
  if (!Number.isSafeInteger(count) || count < minimum) return null;
  const extraCount = count - minimum;
  const extra = extraCount * additional;
  return { base, extraCount, extra, print: base + extra, shipping, total: base + extra + shipping };
}
export const graduateRatio = (orientation) => orientation === "portrait" ? [2, 3] : [3, 2];
export function graduateCropReady(photo) {
  if (!photo?.output?.blob?.size || !["landscape", "portrait"].includes(photo.crop?.orientation)) return false;
  const [w, h] = graduateRatio(photo.crop.orientation);
  const { width, height } = photo.output;
  return width === w * 600 && height === h * 600;
}
export function graduateCheckoutIssue(photos) {
  if (photos.length < graduatePrintPrices.minimum)
    return { missing: graduatePrintPrices.minimum - photos.length };
  const waiting = photos.find((photo) => !graduateCropReady(photo));
  return waiting ? { photoId: waiting.id } : null;
}
export function goGraduate(path, replace = false, state = {}) {
  const continuingPrint = path === graduatePrintPath || path.startsWith(graduatePrintPath + "&");
  history[replace ? "replaceState" : "pushState"]({
    ...(continuingPrint ? universityPrintHistory(replace) : null),
    ...state,
  }, "", path);
  window.dispatchEvent(new Event("zhipai-route"));
}
function unfinishedGraduateOrder(state, owner) {
  const id = state.graduateDrafts?.[owner]?.orderId;
  return id && state.orders.find(order => order.id === id && order.owner === owner &&
    order.kind === "graduate" && !order.paidAt && ["pending", "verifying"].includes(order.status));
}
function currentPath() { return location.pathname + location.search; }
function checkoutPath(view, id) {
  return graduatePrintPath + (view === "work" ? "" : "&print=" + view) + (id ? "&order=" + encodeURIComponent(id) : "");
}
export async function makeGraduateCrop(photo, settings) {
  const [w, h] = graduateRatio(settings.orientation);
  const outputWidth = w * 600, outputHeight = h * 600;
  const blob = await renderPhotoBlob(photo.source.blob, { ...settings, outputWidth, outputHeight, format: "jpeg" });
  return { id: photo.id, name: photo.source.name, width: outputWidth, height: outputHeight,
    spec: "六寸", type: blob.type, blob };
}
registerController("graduatePrint", () => ({
  view: "work",
  orderId: "",
  busy: false,
  panel: "",
  selection: [],
  cropId: "",
  cropNotice: "",
  transferringGuest: false,
  crop: null,
  error: "",
  addressError: "",
  highlight: "",
  fields: {},
  method: "wechat",
  outcome: "success",
  resolution: "unknown",
  get store() { return this.$store.printLibrary; },
  get owner() { return this.$store.account.session?.phone || ""; },
  get key() { return this.owner || "guest"; },
  get draft() { return this.store.graduateDrafts?.[this.key] || emptyDraft; },
  get order() { return this.owner ? this.store.orders.find((order) =>
    order.kind === "graduate" && order.id === (this.orderId || this.draft.orderId) && order.owner === this.owner) : null; },
  get photos() { return this.draft.photos; },
  get quote() { return graduateQuote(this.photos.length); },
  get waiting() { return this.photos.filter((photo) => !graduateCropReady(photo)); },
  get checkoutCropHint() { return `还有 ${this.waiting.length} 张照片待裁剪为 6 寸，请先完成裁剪。`; },
  get selectedPhoto() { return this.photos.find((photo) => photo.id === this.cropId); },
  get guestDraft() { return this.store.graduateDrafts?.guest; },
  get guestOrder() { return unfinishedGraduateOrder(this.store, this.owner); },
  get editable() { return this.store.ready && !this.order && !this.busy && !this.transferringGuest; },
  get active() {
    const q = new URLSearchParams(location.search);
    return q.get("page") === "print" && q.get("view") === "graduate";
  },
  init() {
    this.onRoute = () => this.sync();
    window.addEventListener("zhipai-route", this.onRoute);
    window.addEventListener("popstate", this.onRoute);
    this.$watch("$store.printLibrary.ready", () => this.sync());
    this.$watch("$store.account.session.phone", () => this.sync());
    this.sync();
  },
  destroy() {
    window.removeEventListener("zhipai-route", this.onRoute);
    window.removeEventListener("popstate", this.onRoute);
  },
  sync() {
    this.transferringGuest = false;
    if (!this.active) return;
    const params = new URLSearchParams(location.search);
    if (this.store.ready && this.owner && params.has("guest") && this.guestDraft) {
      this.transferringGuest = true;
      this.orderId = "";
      this.view = "work";
      if (this.guestDraft.photos.length && this.guestOrder) {
        this.error = "";
        this.panel = "guestChoice";
      } else {
        this.panel = "";
        void this.adoptGuest();
      }
      return;
    }
    const next = params.get("print");
    this.orderId = params.get("order") || "";
    this.view = next === "confirm" || next === "complete" ? next : "work";
    this.panel = "";
    this.error = "";
    this.highlight = "";
    this.addressError = "";
    this.cropNotice = "";
    if (this.store.ready && this.orderId && !this.order) {
      goGraduate(graduatePrintPath, true);
      return;
    }
    if (this.store.ready && this.view === "complete" && !this.order?.paidAt) {
      goGraduate(this.order ? checkoutPath("confirm", this.order.id) : graduatePrintPath, true);
      return;
    }
    this.fields = { ...(this.order?.address || this.draft.address) };
    if (this.order?.method) this.method = this.order.method;
    if (this.store.ready && !this.order && this.view !== "work" && graduateCheckoutIssue(this.photos)) {
      goGraduate(graduatePrintPath, true);
    }
  },
  updateDraft(key, update) {
    if (key !== this.key) throw Error("账号已切换");
    return this.store.commit((state) => {
      state.graduateDrafts ||= {};
      const previous = state.graduateDrafts[key] || { ...emptyDraft, photos: [], address: {} };
      state.graduateDrafts[key] = { ...previous, ...update(previous) };
    });
  },
  async importFiles(files) {
    if (!this.editable || !files.length) return;
    const key = this.key;
    const added = [];
    let failed = 0;
    this.busy = true;
    this.error = "";
    try {
      for (const file of files) {
        if (!graduateSourceAllowed(file)) { failed++; continue; }
        try { added.push(await uploadedPhoto(file)); }
        catch { failed++; }
      }
      if (added.length) await this.append(key, added, "phone");
      this.error = failed ? `${failed} 张照片未添加，请选择 30 MB 以内可读取的 JPG、PNG 或 WebP。` : "";
      if (added.length) this.panel = "";
    } catch { this.error = "照片暂未保存，请重试。"; }
    finally { this.busy = false; }
  },
  append(key, sources, origin) {
    const entries = sources.map((source) => ({ id: printId(), source: printPhotoCopy(source), origin, crop: null, output: null }));
    return this.updateDraft(key, (previous) => ({ photos: [...previous.photos, ...entries] }));
  },
  async addAlbum() {
    if (!this.editable || !this.selection.length || !this.owner) return;
    const used = new Set(this.photos.filter((item) => item.origin === "album").map((item) => item.source.id));
    const current = this.$store.photoLibrary.finished.filter((item) =>
      this.selection.includes(item.id) && graduateSourceAllowed(item) && !used.has(item.id));
    if (!current.length) { this.error = "没有可添加的照片。"; return; }
    this.busy = true;
    try { await this.append(this.key, current, "album"); this.panel = ""; this.selection = []; }
    catch { this.error = "照片暂未保存，请重试。"; }
    finally { this.busy = false; }
  },
  async remove(id) {
    if (!this.editable) return;
    this.busy = true;
    try { await this.updateDraft(this.key, (previous) => ({ photos: previous.photos.filter((photo) => photo.id !== id) })); }
    catch { this.error = "未能移除照片，请重试。"; }
    finally { this.busy = false; }
  },
  editCrop(id, fromCheckout = false) {
    if (!this.editable) return;
    const photo = this.photos.find((item) => item.id === id);
    if (!photo) return;
    this.cropNotice = fromCheckout ? this.checkoutCropHint : "";
    this.cropId = id;
    this.crop = photo.crop ? { ...photo.crop } : {
      scale: 1, offsetX: 0, offsetY: 0, orientation: photo.source.height > photo.source.width ? "portrait" : "landscape",
    };
    this.error = "";
    this.panel = "crop";
  },
  changeCrop(value) {
    this.crop = { ...cleanCrop(value), orientation: value.orientation || this.crop.orientation };
  },
  async saveCrop(next) {
    if (!this.editable || !this.selectedPhoto) return;
    const photo = this.selectedPhoto, crop = { ...this.crop }, key = this.key;
    this.busy = true;
    this.error = "";
    try {
      const output = await makeGraduateCrop(photo, crop);
      if (!graduateCropReady({ crop, output })) throw Error("裁剪产物无效");
      await this.updateDraft(key, (previous) => ({
        photos: previous.photos.map((entry) => entry.id === photo.id ? { ...entry, crop, output } : entry),
      }));
      this.panel = "";
      this.highlight = "";
    } catch { this.error = "裁剪文件暂未保存，请重试。"; return; }
    finally { this.busy = false; }
    if (next && this.waiting.length) this.editCrop(this.waiting[0].id, !!this.cropNotice);
  },
  confirm() {
    if (!this.store.ready || this.busy || this.transferringGuest) return;
    if (this.order) { goGraduate(checkoutPath(this.order.paidAt ? "complete" : "confirm", this.order.id)); return; }
    const issue = graduateCheckoutIssue(this.photos);
    if (issue?.missing) { this.error = `还差 ${issue.missing} 张起印`; return; }
    if (issue?.photoId) {
      this.error = "";
      this.cropNotice = this.checkoutCropHint;
      this.highlight = issue.photoId;
      const key = this.key;
      this.$nextTick(() => {
        if (!this.active || this.key !== key || this.panel || this.highlight !== issue.photoId) return;
        this.$refs[`photo-${issue.photoId}`]?.scrollIntoView({ block: "nearest" });
        this.editCrop(issue.photoId, true);
      });
      return;
    }
    goGraduate(checkoutPath("confirm"));
  },
  async back() {
    if (this.busy) return;
    if (this.order && history.state?.graduateGuestChoice === this.order.id) {
      history.back();
      return;
    }
    if (this.view === "work") {
      if (!returnToUniversityPrint()) goGraduate(universityPath);
      return;
    }
    if (!this.order) {
      try { await this.updateDraft(this.key, () => ({ address: { ...this.fields } })); }
      catch { this.error = "收货地址暂未保存，请重试。"; return; }
    }
    goGraduate(graduatePrintPath);
  },
  requestPayment() {
    if (this.busy || this.transferringGuest || !this.store.ready || this.order?.paidAt) return;
    if (this.order?.status === "verifying") { void this.resolvePayment(); return; }
    if (this.order?.status === "pending") { this.panel = "payment"; return; }
    if (graduateCheckoutIssue(this.photos)) { goGraduate(graduatePrintPath); return; }
    this.addressError = shippingAddressError(cleanShippingAddress(this.fields)) || "";
    if (this.addressError) {
      this.$nextTick(() => this.$refs.graduateAddress?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    if (!this.owner) {
      const url = checkoutPath("confirm") + "&guest=1";
      void this.updateDraft(this.key, () => ({ address: { ...this.fields } })).then(() => accountRoute("welcome", url))
        .catch(() => { this.error = "草稿暂未保存，请重试。"; });
      return;
    }
    this.panel = "payment";
  },
  loginForAlbum() {
    accountRoute("welcome", graduatePrintPath + "&guest=1");
  },
  viewGuestOrder() {
    const order = this.guestOrder;
    if (!this.transferringGuest || this.busy || !order) return;
    goGraduate(checkoutPath("confirm", order.id), false, { graduateGuestChoice: order.id });
  },
  async adoptGuest(useNewPhotos = false) {
    const owner = this.owner, path = currentPath();
    if (!this.transferringGuest || this.busy || !this.guestDraft || !owner) return;
    if (this.guestOrder && this.guestDraft.photos.length && !useNewPhotos) {
      this.panel = "guestChoice";
      return;
    }
    const view = new URLSearchParams(location.search).get("print") === "confirm" ? "confirm" : "work";
    this.busy = true;
    this.error = "";
    try {
      await this.store.commit((state) => {
        if (owner !== this.owner || currentPath() !== path) throw Error("账号或页面已切换");
        const guest = state.graduateDrafts.guest;
        const saved = state.graduateDrafts[owner];
        if (!guest) return;
        if (guest.photos.length) {
          if (!useNewPhotos && unfinishedGraduateOrder(state, owner)) throw Error("请先选择订单");
          state.graduateDrafts[owner] = {
            photos: saved?.orderId ? guest.photos : [...(saved?.photos || []), ...guest.photos],
            address: Object.keys(guest.address || {}).length ? guest.address : saved?.address || {},
            orderId: null,
          };
        }
        delete state.graduateDrafts.guest;
      });
      if (owner === this.owner && currentPath() === path) goGraduate(checkoutPath(view), true);
    } catch {
      if (owner === this.owner && currentPath() === path) {
        this.error = "本次照片仍在草稿中，请重试。";
        if (this.guestOrder && this.guestDraft?.photos.length) this.panel = "guestChoice";
      }
    } finally {
      this.busy = false;
      if (this.active && this.transferringGuest && (owner !== this.owner || currentPath() !== path)) this.sync();
    }
  },
  async pay() {
    if (this.busy || this.transferringGuest || !this.owner || navigator.onLine === false) return;
    const owner = this.owner, existing = this.order;
    if (existing && existing.status !== "pending") return;
    const id = existing?.id || printId();
    this.busy = true;
    this.error = "";
    const attempt = createHandoff("print", checkoutMethod("print", this.method), this.outcome);
    let release;
    try {
      release = lockPayment("print:" + id);
      const address = cleanShippingAddress(this.fields, printId());
      if (!existing && (graduateCheckoutIssue(this.photos) || shippingAddressError(address))) throw Error();
      const now = new Date().toISOString();
      let amount = existing?.total;
      await this.store.commit((state) => {
        if (owner !== this.owner) throw Error();
        const order = state.orders.find((item) => item.id === id);
        if (order) {
          if (order.owner !== owner || order.status !== "pending" || order.kind !== "graduate") throw Error();
          Object.assign(order, { status: "verifying", handoff: attempt, method: attempt.method, paymentResult: paymentResult("verifying") });
        } else {
          const draft = state.graduateDrafts?.[owner];
          if (!draft || draft.orderId || graduateCheckoutIssue(draft.photos)) throw Error();
          const photos = draft.photos;
          const quote = graduateQuote(photos.length);
          amount = quote.total;
          draft.address = address;
          draft.orderId = id;
          state.orders.unshift({
            id, owner, number: id, kind: "graduate", status: "verifying", createdAt: now,
            photo: photos[0].output, graduatePhotos: photos.map(({ output, crop }) => ({ output, crop })),
            quantity: photos.length, base: graduatePrintPrices.additional, shipping: quote.shipping, total: quote.total,
            address: printAddressCopy(address), handoff: attempt, method: attempt.method, paymentResult: paymentResult("verifying"), events: [],
          });
        }
      });
      this.panel = "";
      goGraduate(checkoutPath("confirm", id), true);
      const result = await presentHandoff(attempt, { id, owner, amount });
      await this.settlePayment(id, owner, attempt, result);
    } catch { this.error = "支付操作未完成，请查看原单状态后重试。"; }
    finally { release?.(); this.busy = false; }
  },
  async settlePayment(id, owner, attempt, result) {
    if (result === "verifying" || owner !== this.owner) return;
    await updatePrintTransaction(id, owner, "verifying", {
      status: result, attempt: attempt.outcome, paymentResult: paymentResult(result, attempt.outcome),
    }, attempt.id);
    finishHandoff(id, attempt);
    if (result === "paid" && currentPath() === checkoutPath("confirm", id)) goGraduate(checkoutPath("complete", id), true);
  },
  async resolvePayment({ automatic = false } = {}) {
    const order = this.order;
    if (this.busy || order?.status !== "verifying" || !order.handoff || navigator.onLine === false) return;
    this.busy = true;
    let release;
    try {
      release = lockPayment("print:" + order.id);
      const result = handoffStatus(order.handoff, { query: true, resolution: automatic ? "unknown" : this.resolution });
      await this.settlePayment(order.id, order.owner, order.handoff, result);
    } catch { this.error = "暂时无法查询支付结果，请重试。"; }
    finally { this.busy = false; }
  },
  async restart() {
    if (this.busy || !this.order?.paidAt) return;
    try {
      const address = this.fields.default ? { ...this.fields } : {};
      if (this.draft.orderId === this.order.id)
        await this.updateDraft(this.key, () => ({ photos: [], address, orderId: null }));
      goGraduate(graduatePrintPath, true);
    } catch { this.error = "暂时无法开始新订单，请重试。"; }
  },
}));
