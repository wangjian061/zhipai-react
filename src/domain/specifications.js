import { registerController } from "../runtime/state.js";
import {
  PHOTO_SPECIFICATIONS,
  PHOTO_BACKGROUNDS,
  specificationSelection,
  specificationBackgroundState,
  specificationsReturnPath,
} from "./photo-specifications.js";

registerController("specificationPicker", () => ({
  specifications: PHOTO_SPECIFICATIONS,
  colors: PHOTO_BACKGROUNDS,
  selectedId: null,
  backgroundId: "blue",
  opened: false,
  closing: false,
  previousFocus: null,
  routeHandler: null,
  get selected() {
    return this.specifications.find((item) => item.id === this.selectedId);
  },
  get backgrounds() {
    return this.backgroundState.colors;
  },
  get backgroundState() {
    return specificationBackgroundState(
      this.selectedId,
      this.backgroundId,
      this.specifications,
      this.colors,
    );
  },
  get selection() {
    return specificationSelection(
      this.selectedId,
      this.backgroundState.background,
      this.specifications,
      this.colors,
    );
  },
  init() {
    // A reload or Forward entry must not silently reopen a completed drawer.
    this.clearStalePanelEntry();
    let previouslyActive = new URLSearchParams(location.search).get("page") === "specifications";
    this.routeHandler = () => {
      this.closing = false;
      const active =
        new URLSearchParams(location.search).get("page") === "specifications";
      if (active && !this.opened) this.clearStalePanelEntry();
      if (!active || !history.state?.specificationPanel) {
        const wasOpen = this.opened;
        this.opened = false;
        if (active && (wasOpen || !previouslyActive))
          this.$nextTick(() => this.previousFocus?.focus({ preventScroll: true }));
      }
      previouslyActive = active;
    };
    window.addEventListener("popstate", this.routeHandler);
    window.addEventListener("zhipai-route", this.routeHandler);
  },
  clearStalePanelEntry() {
    if (
      new URLSearchParams(location.search).get("page") !== "specifications" ||
      !history.state?.specificationPanel
    )
      return;
    const { specificationPanel, ...state } = history.state;
    history.replaceState(state, "", location.href);
  },
  destroy() {
    window.removeEventListener("popstate", this.routeHandler);
    window.removeEventListener("zhipai-route", this.routeHandler);
  },
  choose(id, trigger = document.activeElement) {
    if (this.opened || this.closing) return;
    const spec = this.specifications.find((item) => item.id === id);
    if (!spec) return;
    this.selectedId = id;
    this.backgroundId = this.backgroundState.backgroundId;
    this.previousFocus = trigger;
    history.pushState(
      { ...history.state, specificationPanel: true },
      "",
      location.href,
    );
    this.opened = true;
  },
  selectBackground(id) {
    if (this.backgrounds.some((item) => item.id === id)) this.backgroundId = id;
  },
  close() {
    if (!this.opened) return;
    this.opened = false;
    this.$nextTick(() => this.previousFocus?.focus());
    if (history.state?.specificationPanel) {
      this.closing = true;
      history.back();
    }
  },
  back() {
    if (this.opened) return this.close();
    const target = specificationsReturnPath(
      new URLSearchParams(location.search).get("back"),
    );
    history.pushState({}, "", target);
    window.dispatchEvent(new Event("zhipai-route"));
  },
  confirm() {
    if (!this.opened) return;
    const selection = this.selection;
    if (!selection) return;
    const returnTo = location.pathname + location.search;
    this.opened = false;
    window.dispatchEvent(
      new CustomEvent("zhipai-camera-open", {
        detail: { returnTo, specification: selection },
      }),
    );
    const query = new URLSearchParams({
      page: "camera",
      camera: "capture",
      spec: selection.specId,
      background: selection.background,
      back: returnTo,
    });
    // Replace the drawer's history entry, so Back returns to the unchanged list.
    history.replaceState({}, "", location.pathname + "?" + query);
    window.dispatchEvent(new Event("zhipai-route"));
  },
}));
