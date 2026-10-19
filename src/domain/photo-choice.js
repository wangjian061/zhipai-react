import {
  registerController,
  registerStore,
  getStore,
  storageValue,
} from "../runtime/state.js";

registerStore("photoChoice", {
  opened: false,
  context: null,
  previousFocus: null,
  printReturnContext: null,
  init() {
    window.addEventListener("zhipai-route", () => {
      if (this.opened) this.close(false);
    });
    window.addEventListener("popstate", () => {
      if (this.opened) this.close(false);
    });
  },
  show(context) {
    this.previousFocus = document.activeElement;
    this.context = {
      action: "edit",
      intent: "tool",
      returnTo: location.pathname + location.search,
      sources: ["finished", "phone", "camera"],
      ...context,
    };
    this.opened = true;
  },
  resumePrint() {
    if (!this.printReturnContext) return;
    const context = {
      ...this.printReturnContext,
    };
    this.printReturnContext = null;
    window.dispatchEvent(
      new CustomEvent("zhipai-print-resume", {
        detail: context,
      }),
    );
  },
  close(restore = true) {
    this.opened = false;
    if (restore)
      queueMicrotask(() =>
        this.previousFocus?.focus({
          preventScroll: true,
        }),
      );
  },
});
registerController("photoChooser", () => ({
  init() {
    this.$watch("$store.photoChoice.opened", (opened) => {
      if (opened)
        this.$nextTick(() =>
          this.$refs.choiceDialog.querySelector("button")?.focus({
            preventScroll: true,
          }),
        );
    });
  },
  get choice() {
    return this.$store.photoChoice;
  },
  get library() {
    return this.$store.photoLibrary;
  },
  get sources() {
    return this.choice.context?.sources || ["finished", "phone", "camera"];
  },
  get allowFinished() {
    return this.sources.includes("finished");
  },
  get allowPhone() {
    return this.sources.includes("phone");
  },
  get isPrint() {
    return this.choice.context?.intent === "print";
  },
  get allowCamera() {
    return (
      this.isPrint ||
      this.sources.includes("camera") ||
      (this.allowFinished &&
        this.library.ready &&
        !this.library.finished.length)
    );
  },
  select(kind, id) {
    if (
      !this.allowFinished ||
      kind !== "finished" ||
      !this.library.ready ||
      this.library.busy
    )
      return;
    const photo = this.library.finished.find((item) => item.id === id);
    if (!photo) return;
    const context = {
      ...this.choice.context,
    };
    if (this.isPrint) this.choice.printReturnContext = null;
    this.choice.close(false);
    window.dispatchEvent(
      new CustomEvent("zhipai-photo-chosen", {
        detail: {
          context,
          kind,
          photo,
        },
      }),
    );
  },
  camera() {
    if (!this.allowCamera) return;
    const context = {
      ...this.choice.context,
    };
    if (this.isPrint)
      this.choice.printReturnContext = {
        ...context,
      };
    this.choice.close(false);
    window.dispatchEvent(
      new CustomEvent("zhipai-camera-open", {
        detail: {
          returnTo: context.exitTo || context.returnTo,
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
  album() {
    if (!this.isPrint || !this.library.ready || this.library.busy) return;
    this.choice.printReturnContext = {
      ...this.choice.context,
    };
    this.choice.close(false);
    this.go("album");
  },
  phone() {
    if (!this.allowPhone) return;
    const context = {
      ...this.choice.context,
    };
    this.choice.close(false);
    window.dispatchEvent(
      new CustomEvent("zhipai-phone-picker", {
        detail: context,
      }),
    );
  },
  trap(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.choice.close();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...this.$refs.choiceDialog.querySelectorAll("button:not([disabled])"),
    ].filter((el) => el.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
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
}));
export {};
