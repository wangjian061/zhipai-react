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

const actions = ["repair", "outfit"];
const workspaceActions = ["crop", "background", "format", "resize"];
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

const allWorkspaces = [
  "crop",
  "background",
  "format",
  "resize",
  "repair",
  "outfit",
];
for (const action of allWorkspaces) {
  test(`${action}: both sources stay in the direct workspace and only the required checks run`, async () => {
    for (const kind of ["finished", "phone"]) {
      const f = fixture(),
        { s, calls } = f;
      try {
        await s.enter({ action, returnTo: "/?page=home" });
        assert.equal(s.isInlineWorkspace, true);
        assert.equal(s.step, 1);
        assert.deepEqual(s.config.steps, []);
        assert.equal(s.primaryLabel, "选取照片");
        await s.accept({ photo, kind, context: { action } });
        assert.equal(s.view, "work");
        assert.equal(s.choosingPhoto, false);
        assert.equal(s.photo.blob, photo.blob);
        if (s.config.requiresPortrait) {
          assert.equal(calls.checks, 1);
          assert.equal(s.portraitCheck.status, "awaiting");
          assert.equal(s.primaryEnabled, false);
          assert.equal(f.orders.items.length, 0);
          await s.choosePortraitOutcome("passed");
          assert.equal(s.panel, null);
          assert.equal(s.portraitEligible, true);
          assert.equal(
            calls.standards,
            ["outfit", "background"].includes(action) ? 1 : 0,
          );
          if (action === "repair") {
            assert.equal(s.primaryEnabled, false);
            s.selectRepairBackground("white");
            assert.equal(s.primaryEnabled, true);
          }
        } else {
          assert.equal(calls.checks, 0);
          assert.equal(calls.previews, action === "resize" ? 0 : 1);
        }
        assert.notEqual(s.primaryLabel, "下一步");
        assert.equal(f.orders.items.length, 0);
      } finally {
        f.close();
      }
    }
  });
  test(`${action}: album detail, cancel and replacement preserve settings and the original return`, async () => {
    const f = fixture(),
      { s, calls } = f;
    try {
      await f.open(action);
      if (s.config.requiresPortrait) await s.choosePortraitOutcome("passed");
      s.repairBackgroundId = "gray";
      s.background = "red";
      s.outfit = "women-shirt";
      s.outfitCategory = "women";
      s.targetValue = 350;
      s.format = "png";
      const previous = s.photo;
      s.pick();
      s.closePanel();
      assert.equal(s.photo, previous);
      const checks = calls.checks;
      await s.accept({ photo, kind: "finished", context: { action } });
      assert.equal(
        calls.checks,
        checks,
        "same accepted photo reuses its successful proof",
      );
      const other = {
        ...photo,
        id: "replacement",
        blob: new Blob(["replacement"], { type: "image/jpeg" }),
      };
      f.library.finished.push(other);
      await s.accept({ photo: other, kind: "finished", context: { action } });
      assert.equal(s.photo.id, "replacement");
      assert.equal(s.choosingPhoto, false);
      assert.equal(s.repairBackgroundId, "gray");
      assert.equal(s.background, "red");
      assert.equal(s.outfit, "women-shirt");
      assert.equal(s.targetValue, 350);
      assert.equal(s.format, "png");
      if (s.config.requiresPortrait) {
        assert.equal(calls.checks, checks + 1);
        assert.equal(s.output, null);
        assert.equal(s.primaryEnabled, false);
      } else if (action === "resize") assert.equal(s.output, null);
      assert.equal(s.returnTo, detailPath);
      if (s.panel) s.closePanel();
      s.back();
      assert.equal(location.pathname + location.search, detailPath);
    } finally {
      f.close();
    }
  });
}

test("portrait rejection, cancellation and technical errors cannot reach payment or output", async () => {
  for (const action of ["repair", "outfit", "background"]) {
    for (const result of ["rejected", "error", "cancel"]) {
      const f = fixture();
      try {
        await f.open(action);
        if (result === "cancel") f.s.closePanel();
        else await f.s.choosePortraitOutcome(result);
        assert.equal(f.s.view, "work");
        assert.equal(f.s.step, 1);
        assert.equal(f.s.primaryEnabled, false);
        assert.equal(f.s.output, null);
        assert.equal(f.orders.items.length, 0);
        assert.equal(f.calls.standards, 0);
      } finally {
        f.close();
      }
    }
  }
});

test("resize confirm uses the latest target and automatically saves exactly once; save retry reuses output", async () => {
  const f = fixture();
  try {
    await f.open("resize");
    const s = f.s;
    let saved = 0,
      target;
    s.targetValue = 350;
    s.needsPreview = true;
    const preview = s.preview;
    s.preview = async () => {
      target = s.targetValue;
      await preview();
    };
    s.save = async () => {
      saved++;
      s.saveFailed = true;
      s.error = "保存未完成";
    };
    assert.equal(s.primaryLabel, "确认修改");
    assert.equal(s.primaryEnabled, true);
    await s.primary();
    assert.equal(target, 350);
    assert.equal(saved, 1);
    assert.equal(f.calls.previews, 1);
    await s.primary();
    assert.equal(saved, 2);
    assert.equal(f.calls.previews, 1, "retry downloads the existing output");
    s.error = "";
    s.saveFailed = false;
    s.targetValue = 1;
    assert.equal(s.primaryEnabled, false);
    s.targetValue = 200;
    s.sizeUnit = "MB";
    assert.equal(s.primaryEnabled, false);
  } finally {
    f.close();
  }
});

test("a verifying paid-tool purchase blocks a different candidate and restores its original snapshot", async () => {
  const f = fixture();
  try {
    const original = { ...photo, id: "original-order-photo" };
    f.orders.items = [
      {
        id: "original-order",
        owner: "13800008000",
        action: "repair",
        status: "verifying",
        photo: original,
        sourceKind: "phone",
        createdAt: 1,
        amount: 200,
        repairBackground: { id: "white", name: "白色", value: "#ffffff" },
      },
    ];
    await f.open("repair");
    assert.equal(f.s.orderId, "original-order");
    assert.equal(f.s.photo.id, original.id);
    assert.equal(f.s.primaryLabel, "查询付款结果");
    await f.s.accept({
      photo,
      kind: "finished",
      context: { action: "repair" },
    });
    assert.equal(f.s.photo.id, original.id);
    assert.equal(f.orders.items.length, 1);
    assert.equal(f.calls.checks, 0);
  } finally {
    f.close();
  }
});

test("unavailable carried files leave an empty workspace, and late order loading cannot replace a newer entry", async () => {
  const f = fixture();
  try {
    await f.open("format", { ...photo, id: "missing" });
    assert.equal(f.s.photo, null);
    assert.equal(f.s.primaryLabel, "选取照片");
    let resolve;
    f.orders.ready = false;
    f.orders.loading = new Promise((r) => {
      resolve = r;
    });
    const one = f.s.enter({
      action: "format",
      photo,
      kind: "finished",
      returnTo: detailPath,
    });
    const two = f.s.enter({
      action: "resize",
      photo,
      kind: "finished",
      returnTo: detailPath,
    });
    f.orders.ready = true;
    resolve();
    await Promise.all([one, two]);
    assert.equal(f.s.action, "resize");
    assert.equal(f.s.photo.id, photo.id);
    assert.equal(f.s.choosingPhoto, false);
    assert.equal(f.calls.previews, 0);
  } finally {
    f.close();
  }
});

test("resize rejects invalid latest targets even after an earlier processing error", async () => {
  const f = fixture();
  try {
    await f.open("resize");
    f.s.error = "上次处理失败";
    f.s.sizeUnit = "KB";
    for (const value of ["", "-1", "4", "20481", "invalid"]) {
      f.s.targetValue = value;
      assert.equal(f.s.primaryEnabled, false, value);
      await f.s.primary();
    }
    assert.equal(f.calls.previews, 0);
    f.s.targetValue = "100";
    assert.equal(f.s.primaryEnabled, true);
  } finally {
    f.close();
  }
});
