// Targeted state/asset checks. No browser, screenshot or automated UI interaction.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { createController, getStore } from "../src/runtime/state.js";
let current = new URL("http://localhost:4180/?page=home"),
  root,
  stack,
  index,
  backCalls,
  focuses;
Object.defineProperty(globalThis, "location", {
  configurable: true,
  get: () => current,
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { onLine: true },
});
globalThis.window = new EventTarget();
globalThis.document = { activeElement: null };
await import("../src/domain/index.js");
const { collectionHistoryState } =
  await import("../src/domain/collection-history.js");
const { PRINT_LAYOUTS, printDraftSeed } =
  await import("../src/domain/print.js");
const { OUTFITS } = await import("../src/domain/outfit-catalogue.js");
const { normalizeOrders } = await import("../src/domain/orders.js");
const settle = () => new Promise((r) => setTimeout(r, 8));
function historyAt(path) {
  current = new URL(path, "http://localhost:4180");
  window = new EventTarget();
  stack = [{ path: current.href, state: {} }];
  index = 0;
  backCalls = 0;
  focuses = 0;
  root = createController("phoneDemo");
  root.scope.page = current.searchParams.get("page");
  function move() {
    current = new URL(stack[index].path);
    root.scope.page = current.searchParams.get("page");
  }
  globalThis.history = {
    get state() {
      return stack[index].state;
    },
    get length() {
      return stack.length;
    },
    pushState(state, _title, path) {
      stack.splice(++index);
      stack.push({ state, path: new URL(path, current).href });
      move();
    },
    replaceState(state, _title, path) {
      stack[index] = { state, path: new URL(path, current).href };
      move();
    },
    go(delta) {
      assert.ok(index + delta >= 0 && index + delta < stack.length);
      index += delta;
      move();
      window.dispatchEvent(new Event("popstate"));
    },
    back() {
      backCalls++;
      if (index > 0) {
        index--;
        move();
        window.dispatchEvent(new Event("popstate"));
      }
    },
  };
}
function collection(path) {
  historyAt(path);
  const records = getStore("collectionRecords");
  records.items = [];
  records.ready = true;
  records.busy = false;
  getStore("account").session = null;
  const c = createController("collectionFlow", [], root.scope);
  for (const name of [
    "collectionScroll",
    "collectionProjectList",
    "collectionCategoryList",
    "collectionProjectSearchScroll",
  ])
    c.refs[name] = { scrollTop: 0 };
  c.start();
  return c;
}
test("home → category → project returns through the exact history and restores category position", async () => {
  const c = collection("/?page=home"),
    s = c.scope;
  try {
    const target =
      "/?page=collection&view=projects&category=enrollment&from=home&section=home";
    history.pushState(collectionHistoryState(target), "", target);
    window.dispatchEvent(new Event("zhipai-route"));
    await settle();
    s.scrollHost.scrollTop = 137;
    s.openProject("enrollment");
    assert.equal(s.view, "project");
    s.back();
    await settle();
    assert.equal(s.view, "projects");
    assert.equal(s.scrollHost.scrollTop, 137);
    assert.equal(backCalls, 1);
    s.back();
    assert.equal(location.search, "?page=home");
    assert.equal(root.scope.page, "home");
    assert.equal(backCalls, 2);
  } finally {
    c.stop();
  }
});
test("project tasks return to the same project, then category, while filtering out other owners", async () => {
  for (const [category,project] of [["graduate","graduate-degree"],["enrollment","enrollment-vocational"],["association","association-engineering"]]) {
    const c=collection("/?page=collection&view=projects&category="+category),s=c.scope;
    try {
      const owner="13800008000";
      getStore("account").session={phone:owner};
      getStore("collectionRecords").items=[
        {id:"task",owner,projectId:project,status:"reviewing"},
        {id:"foreign",owner:"other",projectId:project,status:"pending"},
        {id:"different",owner,projectId:"enrollment",status:"complete"},
      ];
      s.openProject(project);
      const projectURL=location.href;
      assert.ok(s.projectRecords.every(item=>item.projectId===project && item.owner===owner));
      s.openRecord(getStore("collectionRecords").items[1]);
      assert.equal(location.href,projectURL);
      s.openRecord(s.projectRecords.find(item=>item.id==="task"));
      assert.equal(s.current.id,"task");
      assert.equal(location.searchParams.get("from"),"project");
      assert.equal(s.primaryLabel,"返回项目");
      s.primary();
      await settle();
      assert.equal(location.href,projectURL);
      s.back();
      assert.equal(s.view,"projects");
      assert.equal(s.projectCategory,category);
      assert.equal(backCalls,2);
    } finally {c.stop();}
  }
});
test("legacy record lists redirect with replace and task links recover the actual project category", () => {
  for (const category of ["graduate","enrollment","association"]) {
    const c=collection("/?page=collection&view=records&category="+category);
    try {
      assert.equal(location.searchParams.get("view"),"projects");
      assert.equal(location.searchParams.get("category"),category);
      assert.equal(history.length,1);
      c.scope.back();
      assert.equal(location.search,"?page=home");
    } finally {c.stop();}
  }
  const c=collection("/?page=collection&view=detail&from=records&category=graduate&project=association&record=missing");
  try {
    c.scope.back();
    assert.equal(location.searchParams.get("view"),"project");
    assert.equal(location.searchParams.get("project"),"association");
    c.scope.back();
    assert.equal(location.searchParams.get("category"),"association");
    assert.equal(location.searchParams.get("view"),"projects");
    assert.equal(history.length,1);
  } finally {c.stop();}
});
test("legacy aggregate collection URLs return to the app home", () => {
  for (const path of ["/?page=collection","/?page=collection&view=home","/?page=collection&view=records"]) {
    const c=collection(path);
    try {assert.equal(location.search,"?page=home"); assert.equal(history.length,1);}
    finally {c.stop();}
  }
});
test("direct or untrusted category history falls back by replacing the entry without leaving the app", () => {
  const c = collection("/?page=collection&view=projects&category=association");
  try {
    stack[0].state = {
      collectionCategoryBack: {
        source: "https://external.example/",
        target: location.pathname + location.search,
      },
    };
    c.scope.back();
    assert.equal(location.search, "?page=home");
    assert.equal(history.length, 1);
    assert.equal(backCalls, 0);
  } finally {
    c.stop();
  }
});
test("notification center keeps personal home as its return destination through a detail visit", () => {
  const c = collection("/?page=home");
  try {
    root.scope.openHomeNotifications();
    assert.equal(c.scope.view, "notifications");
    assert.equal(location.searchParams.get("section"), "app-home");
    assert.equal(history.state.homeNotificationDepth, 1);
    c.scope.route("announcement", "", "", {
      section: "app-home",
      message: "example",
    });
    c.scope.back();
    assert.equal(c.scope.view, "notifications");
    c.scope.back();
    assert.equal(index, 0);
    assert.equal(location.search, "?page=home");
  } finally {
    c.stop();
  }
});
test("a direct personal-home notification link returns home without leaving the app", () => {
  const c = collection("/?page=collection&view=notifications&section=app-home");
  try {
    c.scope.back();
    assert.equal(location.search, "?page=home");
    assert.equal(history.length, 1);
  } finally {
    c.stop();
  }
});
function print() {
  historyAt("/?page=print&print=layouts");
  Object.assign(getStore("printLibrary"), {
    ready: true,
    busy: false,
    orders: [],
    addresses: [],
    draft: printDraftSeed(),
  });
  const c = createController("printStudio", [], root.scope),
    s = c.scope;
  s.layoutOptions = PRINT_LAYOUTS.map((x) => ({ ...x }));
  s.view = "layouts";
  s.$refs.printDialog = {
    querySelector: () => ({
      focus() {
        focuses++;
      },
    }),
  };
  s.$nextTick = (fn) => Promise.resolve().then(fn);
  const handler = (e) => s.syncLocation(e);
  window.addEventListener("popstate", handler);
  return {
    s,
    close() {
      window.removeEventListener("popstate", handler);
    },
  };
}
test("3D sheet examples never become the input, and both layouts swap to the actual selected photo", () => {
  const f = print(),
    s = f.s;
  try {
    for (const layout of PRINT_LAYOUTS) {
      const demo = s.workspaceSheet(layout.id);
      assert.equal((demo.match(/<image /g) || []).length, layout.count);
      assert.ok(demo.includes("photo-placeholder-3d-20261105.webp"));
      assert.doesNotMatch(demo, /<text|免剪裁/);
    }
    assert.equal(s.draft.photo, null);
    const photo = {
      id: "real-cropped-photo",
      width: 300,
      height: 420,
      blob: new Blob(["real cropped input"], { type: "image/jpeg" }),
    };
    s.draft.photo = photo;
    s.draft.kind = "phone";
    for (const layout of PRINT_LAYOUTS) {
      const actual = s.workspaceSheet(layout.id);
      assert.doesNotMatch(actual, /placeholder/);
      assert.ok(actual.includes("blob:"));
      assert.equal((actual.match(/<image /g) || []).length, layout.count);
    }
    assert.equal(s.draft.photo.blob, photo.blob);
  } finally {
    f.close();
  }
});
test("preview is independent of selection; button, Escape and system Back only close the layer and restore focus", async () => {
  const f = print(),
    s = f.s;
  try {
    const original = (s.draft.layout = PRINT_LAYOUTS[0].id);
    document.activeElement = {
      isConnected: true,
      focus() {
        focuses++;
      },
    };
    s.openLayoutPreview("missing");
    assert.equal(s.modal, null);
    for (const mode of ["button", "escape", "system"]) {
      s.openLayoutPreview(PRINT_LAYOUTS[1].id);
      assert.equal(s.modal, "layoutPreview");
      assert.equal(s.draft.layout, original);
      assert.equal(getStore("printUi").preview, true);
      if (mode === "system") history.back();
      else if (mode === "escape")
        s.trap({ key: "Escape", preventDefault() {} });
      else s.closeModal();
      await Promise.resolve();
      assert.equal(s.modal, null);
      assert.equal(s.draft.layout, original);
      assert.equal(getStore("printUi").opened, false);
      assert.equal(getStore("printUi").preview, false);
      assert.equal(location.search, "?page=print&print=layouts");
      assert.equal(s.previewClosing, false);
    }
    assert.ok(focuses >= 3);
  } finally {
    f.close();
  }
});
test("all 51 provided clothes have unique IDs and intact local files in the right category", () => {
  assert.equal(OUTFITS.length, 51);
  assert.equal(new Set(OUTFITS.map((x) => x.id)).size, 51);
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL("../docs/assets/outfit-catalogue-20261105.json", import.meta.url),
    ),
  );
  for (const [category, count] of Object.entries({
    men: 14,
    women: 20,
    children: 17,
  }))
    assert.equal(OUTFITS.filter((x) => x.category === category).length, count);
  for (const item of OUTFITS) {
    const bytes = fs.readFileSync(
      new URL("../public" + item.image, import.meta.url),
    );
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      manifest.items.find((x) => x.id === item.id).assetSha256,
    );
    assert.ok(item.name && !/^\d/.test(item.name));
  }
});
test("new categories select real supplied garments; paid historical choices and receipt snapshots stay meaningful", () => {
  historyAt("/?page=tool&tool=outfit&view=work");
  const owner = "13800008000";
  getStore("account").session = { phone: owner };
  Object.assign(getStore("toolOrders"), {
    ready: true,
    busy: false,
    items: [],
  });
  const s = createController("toolStudio", [], root.scope).scope;
  s.action = "outfit";
  for (const category of ["women", "children", "men"]) {
    s.selectOutfitCategory(category);
    assert.equal(s.outfitCategory, category);
    assert.equal(
      s.chosenOutfit.id,
      OUTFITS.find((x) => x.category === category).id,
    );
    assert.ok(s.chosenOutfit.image.endsWith(".webp"));
  }
  const selected = OUTFITS.find((x) => x.category === "women");
  getStore("toolOrders").items = [
    {
      id: "paid",
      owner,
      action: "outfit",
      status: "paid",
      outfit: selected.id,
      amount: 200,
      outfitSnapshot: { ...selected, name: "原单服装" },
      purchaseSnapshot: { outfitName: "女装 · 原单服装" },
    },
  ];
  s.orderId = "paid";
  assert.equal(s.chosenOutfit.name, "原单服装");
  const rows = normalizeOrders({ owner, tools: getStore("toolOrders").items });
  assert.ok(
    rows[0].details.some(
      ([k, v]) => k === "所选服装" && v === "女装 · 原单服装",
    ),
  );
  getStore("toolOrders").items[0].outfit = "men-suit";
  delete getStore("toolOrders").items[0].outfitSnapshot;
  s.outfit = "men-suit";
  assert.equal(s.chosenOutfit.image, "assets/outfit-men-suit.svg");
});

test("category search gets a real history entry, keeps query and scroll on detail return, then restores the category",async()=>{
  const c=collection("/?page=collection&view=projects&category=association"),s=c.scope;
  try {
    s.scrollHost.scrollTop=82;
    s.enterProjectSearch();await settle();
    assert.equal(s.isProjectSearch,true);
    assert.equal(s.searchTerm,"");
    s.keyword="协会";s.searchProjects();await settle();
    assert.equal(history.length,2);
    assert.ok(s.projectsShown.every(p=>p.type==="association"));
    s.scrollHost.scrollTop=164;
    s.openProject(s.projectsShown[0].id);s.back();await settle();
    assert.equal(s.searchTerm,"协会");assert.equal(s.scrollHost.scrollTop,164);
    s.clearSearch();s.back();await settle();
    assert.equal(s.isProjectSearch,false);assert.equal(s.scrollHost.scrollTop,82);
  } finally {c.stop();}
});

test("help search keeps the chosen FAQ category, submits in place, clears and returns to its own entry",()=>{
  historyAt("/?page=support");
  const c=createController("supportCenter",[],root.scope),s=c.scope;c.start();
  try {
    s.category="照片工具";s.enterSearch();
    assert.equal(s.searching,true);s.submitSearch("  尺寸 ");
    assert.equal(s.filtered.length,1);assert.equal(s.filtered[0].id,"resize");
    s.submitSearch("不存在");assert.equal(s.filtered.length,0);
    s.submitSearch("");assert.equal(location.searchParams.has("q"),false);
    s.leaveSearch();assert.equal(s.searching,false);assert.equal(s.category,"照片工具");
  } finally {c.stop();}
});

test("paid capture guide opt-outs are per lens, never saved by Back; file selection bypasses both guides",async()=>{
  const c=collection("/?page=collection&view=detail&project=enrollment&record=test"),s=c.scope;
  const records=getStore("collectionRecords"), account=getStore("account");
  const {skipShootingGuide}=await import("../src/domain/collection-shooting.js");
  account.session={phone:"13800000001"};records.items=[{id:"test",owner:account.session.phone,projectId:"enrollment",status:"pending",payment:{status:"paid"}}];
  await settle();
  const modes=[];window.addEventListener("zhipai-camera-intent",e=>modes.push(e.detail.captureMode));
  root.scope.go=()=>{};
  try {
    await s.capture();s.chooseShootingMode("front");s.skipShootingPrompt=true;s.closePanel();
    assert.equal(s.panel,"captureMethod");assert.equal(skipShootingGuide("front"),false);
    s.chooseShootingMode("front");s.acceptShootingGuide();
    await s.capture();s.chooseShootingMode("front");assert.equal(s.panel,"shootingGuide");
    s.skipShootingPrompt=true;s.acceptShootingGuide();
    await s.capture();s.chooseShootingMode("front");assert.equal(s.panel,null);
    await s.capture();s.chooseShootingMode("rear");assert.equal(s.panel,"shootingGuide");
    history.back();assert.equal(s.panel,"captureMethod");
    await s.useCaptureFile(new File(["bad"],"bad.txt",{type:"text/plain"}));
    assert.equal(s.panel,"captureMethod");assert.match(s.error,/照片无法读取/);
    globalThis.Image=class {naturalWidth=80;naturalHeight=100;async decode(){}};
    await s.useCaptureFile(new File(["mock pixels"],"test.jpg",{type:"image/jpeg"}));
    assert.deepEqual(modes,["front","front","front","album"]);assert.equal(skipShootingGuide("rear"),false);
  } finally {c.stop();}
});

test("camera framing only passes a single in-frame subject; front captures when eligible and rear waits for its shutter",async()=>{
  const {faceInFrame}=await import("../src/domain/collection-shooting.js");
  const box={boundingBox:{x:35,y:20,width:25,height:36}};
  assert.equal(faceInFrame([box],100,100),true);
  for(const faces of [[],[box,box],[{boundingBox:{x:0,y:3,width:5,height:6}}]]) assert.equal(faceInFrame(faces,100,100),false);
  const c=createController("cameraStudio",[],root.scope),s=c.scope;
  let captures=0;s.capture=()=>captures++;s.cameraReady=true;
  s.creationContext={intent:"collectionCapture",captureMode:"rear"};s.framingState="demo";s.demoFramingPass();assert.equal(captures,0);
  s.creationContext.captureMode="front";s.framingState="demo";s.demoFramingPass();assert.equal(captures,1);
});

test("an old album photo detail URL opens as a sheet and closes to its grid",async()=>{
  historyAt("/?page=album&album=finished&photo=missing&from=library");
  const c=createController("albumCenter",[],root.scope);c.start();
  try {
    assert.equal(c.scope.view,"detail");
    c.scope.closeDetail();
    assert.equal(location.search,"?page=album");
    c.scope.openPhoto("finished","one");assert.equal(c.scope.photoId,"one");
    c.scope.closeDetail();assert.equal(index,0);assert.equal(c.scope.view,"library");
  } finally {c.stop();}
});

test("replacing a deep-linked task with its project and category never invents a Back history mark", () => {
  const c=collection("/?page=my");
  try {
    history.pushState({},"","/?page=collection&view=detail&project=graduate&from=records&record=missing");
    window.dispatchEvent(new Event("zhipai-route"));
    c.scope.back();
    assert.equal(location.searchParams.get("view"),"project");
    c.scope.back();
    assert.equal(location.searchParams.get("category"),"graduate");
    assert.equal(history.state?.collectionCategoryBack,undefined);
    c.scope.back();
    assert.equal(location.search,"?page=home");
    assert.equal(backCalls,0);
  } finally {c.stop();}
});
