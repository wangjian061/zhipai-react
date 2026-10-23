// Real app → tool event, route and state transitions. No browser/UI automation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createController,
  getStore,
  registerStore,
  storageValue,
} from "../src/runtime/state.js";

globalThis.location = new URL("http://localhost:4180/?page=album");
globalThis.window = new EventTarget();
await import("../src/domain/tools.js");
await import("../src/domain/app.js");
registerStore("account", { session: { phone: "13800008000" } });

const actions = ["repair", "outfit", "crop", "background", "format", "resize"];
const photo = {
  id: "detail-photo",
  name: "证件照.jpg",
  width: 295,
  height: 413,
  type: "image/jpeg",
  spec: "一寸 · 25 × 35 mm",
  blob: new Blob(["original"], { type: "image/jpeg" }),
};
const detailPath =
  "/?page=album&album=finished&photo=detail-photo&from=library";

function fixture() {
  globalThis.location = new URL(detailPath, "http://localhost:4180");
  globalThis.window = new EventTarget();
  globalThis.document = { activeElement: null };
  const orders = getStore("toolOrders"),
    library = getStore("photoLibrary");
  orders.items = [];
  orders.ready = library.ready = true;
  orders.busy = library.busy = false;
  orders.loading = Promise.resolve();
  library.finished = [photo];
  const app = createController("phoneDemo").scope;
  const s = createController("toolStudio", [], app).scope;
  s.$refs.toolDialog = { querySelector: () => ({ focus() {} }) };
  s.$nextTick = (fn) => Promise.resolve().then(fn);
  globalThis.history = {
    pushState(_state, _title, value) {
      globalThis.location = new URL(value, location.origin);
      s.page = location.searchParams.get("page");
    },
  };
  const calls = { checks: 0, previews: 0, standards: 0 };
  s.validatePortraitPhoto = async () => {
    calls.checks++;
    s.portraitCheck = { status: "awaiting", reasons: [] };
    s.panel = "portraitOutcome";
  };
  s.preview = async () => {
    calls.previews++;
    s.setOutput(new Blob(["preview"], { type: "image/jpeg" }));
    s.needsPreview = false;
  };
  s.standardize = async () => {
    calls.standards++;
    s.standardized = true;
    s.standardBlob = new Blob(["prepared"]);
    s.setOutput(s.standardBlob);
  };
  let entry;
  const enter = s.enter;
  s.enter = (detail) => (entry = enter.call(s, detail));
  s.init();
  return {
    s,
    calls,
    orders,
    library,
    async open(action, candidate = photo) {
      app.openPhotoTool(action, candidate, "finished");
      await entry;
    },
    close() {
      s.destroy();
    },
  };
}

for (const action of actions) {
  test(`${action}: library and phone selection both wait for Next before checking or rendering`, async () => {
    for (const kind of ["finished", "phone"]) {
      const f = fixture(),
        { s, calls } = f;
      try {
        await s.enter({ action, returnTo: "/?page=home" });
        assert.equal(s.step, 0);
        assert.equal(s.primaryLabel, "选取照片");
        await s.accept({ photo, kind, context: { action } });
        assert.equal(s.step, 0);
        assert.equal(s.primaryLabel, "下一步");
        assert.equal(s.primaryEnabled, true);
        assert.equal(s.output, null);
        assert.equal(s.panel, null);
        assert.equal(s.portraitCheck.status, "idle");
        assert.deepEqual(calls, { checks: 0, previews: 0, standards: 0 });
        await s.primary();
        if (s.config.requiresPortrait) {
          assert.equal(calls.checks, 1);
          assert.equal(s.step, 0);
          await s.choosePortraitOutcome("passed");
        } else assert.equal(calls.previews, 1);
        assert.equal(s.step, 1);
      } finally {
        f.close();
      }
    }
  });
  test(`${action}: detail entry stops at selection; Next runs the existing flow; Back restores detail`, async () => {
    const f = fixture(),
      { s, calls, orders } = f;
    try {
      await f.open(action);
      assert.equal(location.searchParams.get("tool"), action);
      assert.equal(s.step, 0);
      assert.equal(s.photo.id, photo.id);
      assert.equal(s.photo.blob, photo.blob);
      assert.ok(s.sourceURL);
      assert.equal(s.primaryLabel, "下一步");
      assert.equal(s.primaryEnabled, true);
      assert.equal(s.output, null);
      assert.equal(s.showPortraitCheck, false);
      assert.equal(s.panel, null);
      assert.deepEqual(calls, { checks: 0, previews: 0, standards: 0 });

      // Canceling replacement and confirming the same candidate keep step one.
      s.pick();
      assert.equal(s.panel, "album");
      s.closePanel();
      assert.equal(s.step, 0);
      s.pick();
      await s.useCandidate();
      assert.equal(s.step, 0);
      assert.equal(s.panel, null);
      assert.deepEqual(calls, { checks: 0, previews: 0, standards: 0 });

      // A different candidate also waits for Next and clears any old work.
      const replacement = {
        ...photo,
        id: "replacement",
        blob: new Blob(["new source"]),
      };
      f.library.finished.push(replacement);
      s.pick();
      s.selectCandidate(replacement.id);
      await s.useCandidate();
      assert.equal(s.photo.id, replacement.id);
      assert.equal(s.step, 0);
      assert.equal(s.choosingPhoto, true);
      assert.deepEqual(calls, { checks: 0, previews: 0, standards: 0 });

      const beforeOrders = storageValue(orders.items);
      await s.primary();
      if (s.config.requiresPortrait) {
        assert.equal(calls.checks, 1);
        assert.equal(s.step, 0);
        assert.equal(s.panel, "portraitOutcome");
        await s.primary();
        assert.equal(
          calls.checks,
          1,
          "a repeated Next does not restart the check",
        );
        await s.choosePortraitOutcome("passed");
        assert.equal(s.panel, null);
        assert.equal(
          calls.standards,
          ["outfit", "background"].includes(action) ? 1 : 0,
        );
      } else {
        assert.equal(calls.checks, 0);
        assert.equal(calls.previews, 1);
        assert.ok(s.output);
      }
      assert.equal(s.step, 1);
      assert.equal(s.choosingPhoto, false);
      assert.equal(s.photo.id, replacement.id);
      assert.deepEqual(
        storageValue(orders.items),
        beforeOrders,
        "Next never pays or creates an order",
      );
      if (action === "repair") {
        assert.equal(s.repairColor, null);
        assert.equal(
          s.primaryEnabled,
          false,
          "step two still requires a background choice",
        );
      }
      s.previousStep();
      assert.equal(s.step, 0);
      assert.equal(s.photo.id, replacement.id);
      await s.primary();
      assert.equal(s.step, 1);
      assert.equal(calls.checks, s.config.requiresPortrait ? 1 : 0);
      s.back();
      assert.equal(location.pathname + location.search, detailPath);
      assert.equal(f.library.finished[0].blob, photo.blob);
    } finally {
      f.close();
    }
  });
}

test("failed or unavailable portrait check stays in selection without preparing, paying or processing", async () => {
  for (const action of ["repair", "outfit", "background"]) {
    for (const outcome of ["rejected", "error"]) {
      const f = fixture();
      try {
        await f.open(action);
        await f.s.primary();
        await f.s.choosePortraitOutcome(outcome);
        assert.equal(f.s.step, 0);
        assert.equal(f.s.photo.blob, photo.blob);
        assert.equal(f.s.primaryEnabled, false);
        assert.equal(f.s.output, null);
        assert.equal(f.s.orderId, null);
        assert.equal(f.calls.standards, 0);
        assert.equal(f.calls.previews, 0);
      } finally {
        f.close();
      }
    }
  }
});

test("a verifying purchase does not hijack initial selection; Next recovers its original photo and order", async () => {
  const f = fixture();
  try {
    const original = {
      ...photo,
      id: "original-purchased",
      blob: new Blob(["purchase source"]),
    };
    const order = {
      id: "query-original",
      owner: "13800008000",
      action: "outfit",
      status: "verifying",
      amount: 200,
      photo: original,
      outfit: "men-shirt",
    };
    f.orders.items = [order];
    await f.open("outfit");
    assert.equal(f.s.step, 0);
    assert.equal(f.s.photo.id, photo.id);
    assert.equal(f.s.orderId, null);
    const before = storageValue(f.orders.items);
    await f.s.primary();
    assert.equal(f.s.orderId, order.id);
    assert.equal(f.s.photo.id, original.id);
    assert.equal(f.s.primaryLabel, "查询付款结果");
    assert.equal(f.calls.checks, 0);
    assert.deepEqual(storageValue(f.orders.items), before);
  } finally {
    f.close();
  }
});

test("unavailable detail files do not open step two or start processing", async () => {
  const f = fixture();
  try {
    await f.open("format", { ...photo, id: "missing" });
    assert.equal(f.s.step, 0);
    assert.equal(f.s.photo, null);
    assert.equal(f.s.primaryLabel, "选取照片");
    assert.equal(f.calls.previews, 0);
  } finally {
    f.close();
  }
});

test("failed replacement keeps the original candidate and Next can still continue with it", async () => {
  for (const action of ["repair", "format"]) {
    const f = fixture();
    try {
      await f.open(action);
      f.s.pickPhone();
      f.s.failedHandler({
        detail: {
          context: { intent: "toolStudio", selectionId: f.s.selectionId },
          message: "照片读取失败，请重新选择。",
        },
      });
      assert.equal(f.s.error, "照片读取失败，请重新选择。");
      assert.equal(f.s.photo.id, photo.id);
      assert.equal(f.s.step, 0);
      await f.s.primary();
      assert.equal(f.s.error, "");
      assert.equal(f.s.photo.id, photo.id);
      assert.equal(f.s.choosingPhoto, false);
      assert.equal(f.s.step, action === "repair" ? 0 : 1);
      assert.equal(f.calls.checks, action === "repair" ? 1 : 0);
      assert.equal(f.calls.previews, action === "format" ? 1 : 0);
    } finally {
      f.close();
    }
  }
});

test("late order loading cannot replace a newer tool entry", async () => {
  const f = fixture();
  try {
    let resolve;
    f.orders.ready = false;
    f.orders.loading = new Promise((done) => {
      resolve = done;
    });
    const first = f.s.enter({
      action: "format",
      photo,
      kind: "finished",
      returnTo: detailPath,
    });
    const second = f.s.enter({
      action: "resize",
      photo,
      kind: "finished",
      returnTo: detailPath,
    });
    f.orders.ready = true;
    resolve();
    await Promise.all([first, second]);
    assert.equal(f.s.action, "resize");
    assert.equal(f.s.photo.id, photo.id);
    assert.equal(f.s.step, 0);
    assert.equal(f.s.choosingPhoto, true);
    assert.deepEqual(f.calls, { checks: 0, previews: 0, standards: 0 });
  } finally {
    f.close();
  }
});
