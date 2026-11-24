// Actual component structure checks via SSR; not browser layout/visual acceptance.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument } from "htmlparser2";
import { createServer } from "vite";
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "zhipai-personal-ui-"));
const server = await createServer({
  cacheDir,
  plugins:[{name:"ssr-shared-sheet-host",transform(code,id){
    if(id.endsWith("/src/runtime/components.jsx")) return code.replace("return host ? createPortal(children, host) : null;",'return target === "#shared-modal-layer" ? children : null;');
  },enforce:"pre"}],
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
after(async () => {
  await server.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
});
await server.ssrLoadModule("/src/domain/index.js");
const runtime = await server.ssrLoadModule("/src/runtime/state.js");
const components = {};
for (const [name, file] of Object.entries({
  HomeCollectionCard: "components/HomeCollectionCard",
  HomeKeepsakes: "components/HomeKeepsakes",
  MyOverview: "components/MyOverview",
  PhotoOperations: "components/PhotoOperations",
  KeepsakesPage: "pages/KeepsakesPage",
  KeepsakeCropControls: "components/KeepsakeCropControls",
  PrintWorkspace: "components/PrintWorkspace",
  PrintPreviewSheet: "components/PrintPreviewSheet",
  PrintLayoutViewer: "components/PrintLayoutViewer",
  PhotoActionSheet: "components/PhotoActionSheet",
  AlbumPage: "pages/AlbumPage",
}))
  components[name] = (await server.ssrLoadModule(`/src/${file}.jsx`)).default;
const { checkoutPaymentAction } = await server.ssrLoadModule("/src/pages/KeepsakesPage.jsx");
const definition = Object.getOwnPropertyDescriptors(
  runtime.createDetachedController("keepsakeStudio", {}),
);
const photo = {
  id: "photo",
  name: "照片.jpg",
  width: 295,
  height: 413,
  blob: new Blob(["input"], { type: "image/jpeg" }),
};
const noop = () => {};
function render(name, props = {}) {
  const html = renderToStaticMarkup(
      React.createElement(components[name], props),
    ),
    tree = parseDocument(html),
    nodes = [];
  function walk(node) {
    nodes.push(node);
    for (const child of node.children || []) walk(child);
  }
  walk(tree);
  return {
    html,
    nodes,
    text: nodes
      .filter((n) => n.type === "text")
      .map((n) => n.data)
      .join(""),
  };
}
const byClass = (nodes, name) =>
  nodes.filter((n) => (n.attribs?.class || "").split(" ").includes(name));
function keepsake(kind, view, selected = false, state = {}) {
  const { checkoutOrder, checkoutAddress, ...scope } = state;
  runtime.registerStore("keepsakeOrders", { items: checkoutOrder ? [checkoutOrder] : [], ready: true });
  runtime.registerStore("account", { session: checkoutOrder ? { phone: checkoutOrder.owner } : null });
  runtime.registerStore("printLibrary", { addresses: checkoutAddress ? [checkoutAddress] : [], ready: true });
  runtime.registerController("keepsakeStudio", () =>
    Object.assign(Object.defineProperties({}, definition), {
      page: "keepsake",
      kind,
      view,
      templateId: kind === "postcard" ? "postcard-graduate" : "stamp-youth",
      photo: selected ? photo : null,
      image: selected ? { data: "blob:input", width: 295, height: 413 } : null,
      previewFrame: selected ? { templateId: kind === "stamp" ? "stamp-youth" : "postcard-graduate", data: "blob:frame" } : null,
      output: selected ? new Blob(["output"]) : null,
      outputURL: selected ? "blob:output" : "",
      orderId: checkoutOrder?.id || null,
      addressId: checkoutAddress?.id || null,
      ...scope,
    }),
  );
  return render("KeepsakesPage");
}
test("each home collection link exposes its own title and description independently of its portrait", () => {
  const { nodes, text } = render("HomeCollectionCard");
  const [grid] = byClass(nodes, "home-collection-grid");
  const entries = grid.children.filter((n) => n.name === "a");
  assert.equal(byClass(nodes, "home-collection-rail").length, 0);
  assert.ok(entries.every((card) => !card.attribs["aria-hidden"]));
  assert.equal(nodes.find((n) => n.name === "h2").children[0].data, "证照采集");
  assert.equal(nodes.filter((n) => n.name === "button").length, 0);
  assert.equal(entries.length, 3);
  for (const [index, [category, title, subtitle]] of [
    ["graduate", "毕业生采集", "毕业图像采集"],
    ["enrollment", "新生采集", "大学入学证照"],
    ["association", "其它采集", "机构行业证照"],
  ].entries()) {
    const entry = entries[index];
    assert.equal(
      entry.attribs.href,
      category === "graduate"
        ? "/?page=collection&view=university&category=graduate"
        : `/?page=collection&view=projects&category=${category}&from=home&section=home`,
    );
    const caption = entry.children.find(
      (child) => child.attribs?.class === "home-collection-caption",
    );
    assert.deepEqual(
      caption.children.map((part) =>
        part.children.map((c) => c.data ?? c.children[0].data).join(""),
      ),
      [title, subtitle],
    );
    const art = entry.children.find(
      (child) => child.attribs?.class === "home-collection-art",
    );
    const portrait = art.children.find((child) => child.name === "img");
    assert.equal(portrait.attribs.alt, "");
    assert.ok(
      fs.existsSync(
        new URL("../public" + portrait.attribs.src, import.meta.url),
      ),
    );
  }
  assert.doesNotMatch(text, /毕业生 · 新生入学/);
});
test("home groups two independent product entries in one keepsake card", () => {
  const { nodes, text } = render("HomeKeepsakes");
  assert.equal(byClass(nodes, "home-keepsake-card").length, 1);
  const [toggle] = byClass(nodes, "home-keepsake-layout-toggle");
  const [products] = byClass(nodes, "home-keepsake-products");
  assert.equal(toggle.attribs["aria-controls"], products.attribs.id);
  assert.equal(products.attribs["data-layout"], "double");
  const art = nodes.filter((n) => n.name === "img");
  assert.deepEqual(
    art.map((n) => n.attribs.src.split("/").at(-1)),
    ["home-postcard-compact-20261109.webp", "home-stamp-compact-20261109.webp"],
  );
  for (const image of art) {
    assert.ok(fs.existsSync(new URL("../public" + image.attribs.src, import.meta.url)));
  }
  assert.equal(text, "照片纪念品切换单列明信片推荐邮票推荐");
  const entries = byClass(nodes, "home-keepsake-entry");
  assert.deepEqual(
    entries.map((n) => n.attribs["aria-label"]),
    ["明信片制作，推荐", "邮票制作，推荐"],
  );
  assert.equal(byClass(nodes, "home-collection-caption").length, 2);
  assert.ok(!nodes.some((n) => n.name === "svg"));
});
test("personal center shows six real photos then an ordinary orders item, retaining album access", () => {
  const photos = Array.from({ length: 8 }, (_, i) => ({
    ...photo,
    id: String(i),
    createdAt: i + 1,
  }));
  const { nodes, text, html } = render("MyOverview", {
    scope: {
      myView: "overview",
      $store: {
        account: { loggedIn: false },
        photoLibrary: { finished: photos, ready: true },
      },
      go: noop,
      openOrders: noop,
    },
  });
  assert.equal(byClass(nodes, "my-photo-line").length, 1, "the manual strip does not repeat the photos");
  assert.equal(
    byClass(nodes, "my-photo-line")[0].children.filter(
      (n) => n.name === "button",
    ).length,
    6,
  );
  assert.equal(byClass(nodes, "my-order-entry").length, 1);
  assert.match(text, /我的照片进入相册我的订单/);
  assert.ok(html.indexOf("my-photos-strip") < html.indexOf("my-order-entry"));
});
test("unreadable photo guard disables all nine shared services together", () => {
  const { nodes, text } = render("PhotoOperations", {
    disabled: true,
    onTool: noop,
    onKeepsake: noop,
  });
  const buttons = nodes.filter((n) => n.name === "button");
  assert.equal(buttons.length, 9);
  assert.ok(buttons.every((n) => n.attribs.disabled !== undefined));
  assert.match(text, /明信片制作邮票制作/);
});
for (const kind of ["postcard", "stamp"]) {
  test(`${kind}: the product view keeps official art and opens photo selection from the footer`, () => {
    for (const view of ["templates", "work"]) {
      const { nodes, text } = keepsake(kind, view);
      assert.equal(byClass(nodes, "keepsake-product-stage").length, 1);
      assert.equal(byClass(nodes, "keepsake-preview").length, 0);
      const upload = nodes.find((n) => n.name === "button" &&
        n.children.some((c) => c.data === "上传照片 · 预览效果"));
      assert.ok(upload && upload.attribs.disabled === undefined);
      assert.doesNotMatch(text, /购买人学生证|填写收货地址|去确认订单/);
      if (kind === "postcard") {
        assert.equal(byClass(nodes, "postcard-template-rail")[0].children.length, 6);
        const [card] = byClass(nodes, "keepsake-product-spec");
        assert.deepEqual(card.children.map((node) => node.name), ["header", "p", "dl"]);
        const [, intro, specs] = card.children;
        assert.equal(intro.children[0].data, "上传一张照片，把毕业、旅行或相聚的瞬间做成明信片。下单前可预览并调整。");
        const rows = specs.children.map((row) =>
          row.children.map((item) => item.children.map((part) => part.data).join("")),
        );
        assert.deepEqual(rows, [
          ["材质", "富士相纸"],
          ["尺寸", "六寸"],
          ["成品数量", "每单 1 张"],
        ]);
        assert.ok(text.includes("定制明信片¥10.00 / 张"));
      } else {
        assert.equal(
          byClass(nodes, "stamp-gallery")[0].children[0].children[0].children[0].attribs.src,
          "/assets/keepsakes/stamp-product-inner-20261106.webp",
        );
        assert.match(text, /致青春 · 学生纪念邮折¥59.00 \/ 套一张照片可定制中央大图与四角小图套装一套一册（含封套与邮票内页）版式5 个定制位 · 8 枚固定图案购买条件仅限学生购买/);
        assert.doesNotMatch(text, /产品介绍|产品参数/);
      }
    }
  });
  test(`${kind}: returning from preview keeps footer actions without embedding the photo`, () => {
    const work = keepsake(kind, "work", true);
    assert.equal(byClass(work.nodes, "keepsake-preview").length, 0);
    assert.match(work.text, /继续预览去确认订单/);
    const next = work.nodes.find((n) => n.name === "button" && n.children.some((c) => c.data === "去确认订单"));
    assert.equal(next.attribs.disabled, undefined);
    assert.doesNotMatch(work.text, /学生身份核验|请先上传学生身份凭证|填写收货地址/);

    const preview = keepsake(kind, "work", true, { panel: "keepsakeCrop" });
    const [actions] = byClass(preview.nodes, "ui-sheet-footer");
    assert.ok(actions);
    assert.match(preview.text, /换一张满意，去确认订单/);
    assert.doesNotMatch(preview.text, /购买人学生证|填写收货地址/);
  });
  test(`${kind}: checkout keeps its pay button reachable to guide missing address`, () => {
    const { nodes, text } = keepsake(kind, "confirm", true);
    assert.match(text, /请选择收货地址/);
    if (kind === "stamp")
      assert.match(text, /商品金额¥59.00运费¥10.00数量1套应付金额¥69.00/);
    assert.match(text, /上一步去微信支付/);
    assert.equal(byClass(nodes, "photo-selection-next")[0].attribs.disabled, undefined);
    assert.doesNotMatch(text, /请先选择收货地址后再继续支付|确认制作/);
  });
}

test("stamp verifies eligibility between the address and finished product only at checkout", () => {
  const address = { id: "shipping", name: "收件人", phone: "13800000000", region: "北京", street: "示例地址" };
  const missing = keepsake("stamp", "confirm", true, { checkoutAddress: address });
  const card = byClass(missing.nodes, "stamp-verification-card")[0];
  assert.ok(missing.nodes.indexOf(byClass(missing.nodes, "keepsake-address")[0]) < missing.nodes.indexOf(card));
  assert.ok(missing.nodes.indexOf(card) < missing.nodes.indexOf(byClass(missing.nodes, "keepsake-purchase")[0]));
  assert.match(missing.text, /学生身份核验待上传.*上传学生证照片/);
  assert.doesNotMatch(missing.text, /请先上传购买人学生证后再继续支付/);
  assert.equal(byClass(missing.nodes, "photo-selection-next")[0].attribs.disabled, undefined);

  const studentProof = new Blob(["fixture"], { type: "image/png" });
  const state = { studentProof, studentProofURL: "blob:student-proof", checkoutAddress: address };
  const ready = keepsake("stamp", "confirm", true, state);
  assert.match(ready.text, /学生身份核验已上传.*学生身份凭证已上传支付后人工审核更换/);
  assert.ok(ready.nodes.some((node) => node.name === "img" && node.attribs.src === "blob:student-proof"));
  assert.equal(byClass(ready.nodes, "photo-selection-next")[0].attribs.disabled, undefined);

  const noAddress = keepsake("stamp", "confirm", true, { ...state, checkoutAddress: undefined });
  assert.match(noAddress.text, /请选择收货地址/);
  assert.equal(byClass(noAddress.nodes, "photo-selection-next")[0].attribs.disabled, undefined);

  const checkoutOrder = { id: "pending-stamp", owner: "13800000000", status: "verifying", address };
  const locked = keepsake("stamp", "confirm", true, { ...state, checkoutOrder });
  assert.match(locked.text, /学生身份核验已上传.*查询支付结果/);
  assert.ok(!locked.nodes.some((node) => node.attribs?.type === "file"));
  assert.ok(locked.nodes.some((node) => node.name === "img" && node.attribs.src === "blob:student-proof"));
  assert.equal(byClass(locked.nodes, "photo-selection-next")[0].attribs.disabled, undefined);
  assert.equal(byClass(keepsake("postcard", "confirm", true).nodes, "stamp-verification-card").length, 0);
});

test("checkout guides address before proof and leaves payment and status checks to canPay", () => {
  const checkout = {
    canPay: false,
    address: null,
    proofReady: false,
    photo,
    output: new Blob(["finished"]),
    orders: { ready: true },
    locked: false,
    order: null,
  };
  assert.equal(checkoutPaymentAction(checkout, true), "address");
  checkout.address = { id: "shipping" };
  assert.equal(checkoutPaymentAction(checkout, true), "proof");
  checkout.proofReady = true;
  assert.equal(checkoutPaymentAction(checkout, true), "disabled");
  checkout.canPay = true;
  assert.equal(checkoutPaymentAction(checkout, true), "pay");

  assert.equal(checkoutPaymentAction(checkout, false), "disabled");
  assert.equal(checkoutPaymentAction({ ...checkout, locked: true }, true), "disabled");
  assert.equal(checkoutPaymentAction({ ...checkout, orders: { ready: false } }, true), "disabled");
  assert.equal(checkoutPaymentAction({ ...checkout, output: null }, true), "disabled");
  assert.equal(checkoutPaymentAction({
    ...checkout, address: null, proofReady: false, photo: null, output: null,
    order: { status: "verifying" },
  }, true), "pay", "checking the original order does not ask for missing field edits");
});

test("shared service buttons dispatch print separately while carrying existing tool and keepsake actions", () => {
  const calls = [],
    node = components.PhotoOperations({
      onPrint: () => calls.push("print"),
      onTool: (id) => calls.push(id),
      onKeepsake: (id) => calls.push(id),
    });
  const buttons = node.props.children;
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  buttons.at(-1).props.onClick();
  assert.deepEqual(calls, ["print", "repair", "stamp"]);
  assert.equal(node.props["data-columns"], "3");
  assert.equal(node.props["aria-label"], "精选服务");
});

test("personal photo sheet has one download footer and no delete action", () => {
  const state = {
    photo,
    photoReadable: true,
    opened:true,
    downloading: false,
    notice: "",
    url: () => "blob:actual",
  };
  const {html}=render("PhotoActionSheet",{scope:{$store:{photoActions:state}}});
  const footer=html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)[1];
  assert.equal((footer.match(/<button/g) || []).length, 1);
  assert.match(footer, /下载电子照片/);
  assert.doesNotMatch(footer, /冲印/);
  assert.doesNotMatch(html, /data-photo-delete|删除照片|role="alertdialog"/);
});

test("print workspace shares the keepsake gallery and places purchase layout inside the product card", async () => {
  const domain = await server.ssrLoadModule("/src/domain/print.js");
  runtime.registerStore("printLibrary", {
    ready: true, busy: false, draft: domain.printDraftSeed(), orders: [], addresses: [],
  });
  const s = runtime.createController("printStudio", [], { page: "print" }).scope;
  const { nodes, text } = render("PrintWorkspace", { studio: s });
  const [stage] = byClass(nodes, "keepsake-product-stage");
  const [rail] = byClass(nodes, "keepsake-choice-rail");
  const [card] = byClass(nodes, "keepsake-product-spec");
  assert.equal(stage.attribs["aria-label"], "查看大图：混排整版");
  assert.equal(stage.attribs["aria-haspopup"], "dialog");
  assert.equal(rail.children.filter((node) => node.name === "button").length, 4);
  assert.ok(nodes.indexOf(stage) < nodes.indexOf(rail) && nodes.indexOf(rail) < nodes.indexOf(card));
  const [sku] = byClass(nodes, "print-sku-row");
  assert.equal(sku.parent.parent, card);
  assert.equal(sku.children.find((node) => node.name === "dd").children.filter((node) => node.name === "button").length, 2);
  assert.equal(byClass(nodes, "print-product-photo")[0].attribs.src, "./assets/print-product-mixed-4-8.webp");
  assert.equal(byClass(nodes, "print-product-photo")[0].attribs.width, undefined);
  assert.equal(byClass(nodes, "print-sheet-svg").length, 0);
  assert.match(text, /混排整版.*二寸8张.*斜角实拍.*模切细节/);
  assert.match(text, /背胶模切证件照.*相纸规格.*富士相纸 六寸.*每单 1 版，不支持加印/);
  assert.match(text, /上传照片 · 预览效果/);
  assert.doesNotMatch(text, /已选版式|可选版式|¥19\.80|运费 ¥10\.00/);
  s.draft.layout = domain.PRINT_LAYOUTS[1].id;
  const switched = render("PrintWorkspace", { studio: s });
  assert.match(switched.text, /相纸规格.*富士相纸 六寸/);
  assert.equal(byClass(switched.nodes, "print-product-photo")[0].attribs.src, "./assets/print-product-two-8.webp");
  s.modal = "layoutPreview";
  s.selectGalleryImage("angle");
  const viewer = render("PrintLayoutViewer", { scope: s });
  assert.equal(byClass(viewer.nodes, "print-product-photo")[0].attribs.src, "./assets/print-product-angle.webp");
  assert.match(viewer.text, /斜角实拍.*上一张.*3 \/ 4.*下一张/);
  assert.equal(s.draft.layout, domain.PRINT_LAYOUTS[1].id);

  s.draft.photo = { ...photo, width: 295, height: 413 };
  s.layoutOptions = domain.PRINT_LAYOUTS;
  s.loadedPhotoKey = s.photoKey;
  const withPhoto = render("PrintWorkspace", { studio: s });
  assert.equal(byClass(withPhoto.nodes, "photo-selection-current").length, 0);
  const [newRail] = byClass(withPhoto.nodes, "keepsake-choice-rail");
  const galleryButtons = newRail.children.filter((node) => node.name === "button");
  assert.equal(galleryButtons.length, 4);
  assert.equal(galleryButtons[2].attribs["aria-pressed"], "true");
  assert.equal(byClass(withPhoto.nodes, "print-product-photo")[0].attribs.src, "./assets/print-product-angle.webp");
  assert.match(withPhoto.text, /继续预览.*去确认订单/);
  assert.doesNotMatch(withPhoto.text, /我的整版/);
  assert.equal(byClass(withPhoto.nodes, "print-sheet-svg").length, 0);
  assert.match(render("PrintLayoutViewer", { scope: s }).text, /3 \/ 4/);

  s.modal = "printPreview";
  const preview = render("PrintPreviewSheet", { studio: s });
  assert.match(preview.text, /冲印预览.*整版成品.*手动裁剪.*换一张.*满意，去确认订单/);
  assert.equal(byClass(preview.nodes, "print-sheet-svg").length, 1);
  assert.match(preview.html, /免剪裁 · 自带胶 · 背胶模切/);
  assert.equal(preview.nodes.filter((node) => node.attribs?.type === "range").length, 0);
  s.previewTab = "crop";
  const crop = render("PrintPreviewSheet", { studio: s });
  assert.equal(crop.nodes.filter((node) => node.attribs?.type === "range").length, 3);
  assert.match(crop.text, /拖动或滑杆微调 5∶7 构图.*复位.*缩放.*水平.*垂直/);
});

test("full album detail mirrors nine featured services and the single download footer", () => {
  const library = {
    finished: [photo],
    addedIds: [],
    ready: true,
    busy: false,
    url: () => "blob:actual",
  };
  runtime.registerStore("photoLibrary", library);
  const defs = Object.getOwnPropertyDescriptors(
    runtime.createDetachedController("albumCenter", {}),
  );
  runtime.registerController("albumCenter", () =>
    Object.assign(Object.defineProperties({}, defs), {
      page: "album",
      view: "detail",
      photoId: photo.id,
      photoReadStatus: "ready",
      photoReadBlob: photo.blob,
    }),
  );
  const { nodes, html } = render("AlbumPage");
  const grid = byClass(nodes, "photo-operation-grid")[0];
  assert.equal(grid.attribs["data-columns"], "3");
  assert.equal(grid.children.filter((n) => n.name === "button").length, 9);
  const footer = byClass(nodes, "shared-sheet-actions")[0];
  assert.equal(footer.children.filter((n) => n.name === "button").length, 1);
  assert.match(html, /精选服务/);
});

test("stamp preview has independent groups and compact sliders; proof is collected at checkout", () => {
  const s = runtime.createController("keepsakeStudio", [], {}).scope;
  Object.assign(s, {
    kind: "stamp",
    templateId: "stamp-youth",
    photo,
    image: { width: 295, height: 413, data: "blob:photo" },
    previewFrame: { templateId: "stamp-youth", data: "blob:frame" },
    cropDraft: {
      center: { scale: 1, offsetX: 0, offsetY: 0, rotation: 90 },
      corners: { scale: 1.5, offsetX: 5, offsetY: 0, rotation: 270 },
    },
  });
  for (const [key, count] of [["center", 1], ["corners", 4]]) {
    s.activeSlot = key;
    const { nodes, text } = render("KeepsakeCropControls", { s });
    assert.deepEqual(nodes.filter((n) => n.name === "input").map((n) => n.attribs.type),
      ["radio", "radio", "range", "range", "range"]);
    assert.equal(nodes.find((n) => n.attribs?.type === "radio" && n.attribs.checked !== undefined).attribs.value, key);
    assert.match(text, /中央大图四角小图.*拖动或滑杆调整构图左转右转复位.*缩放.*左右.*上下/);
    assert.doesNotMatch(text, /学生身份核验|上传学生证照片/);
    const sliders = nodes.filter((n) => n.attribs?.type === "range");
    assert.deepEqual(sliders.map((n) => n.attribs["aria-label"]), ["缩放", "左右", "上下"]);
    assert.equal(sliders[0].attribs.value, key === "center" ? "1" : "1.5");
    assert.deepEqual(byClass(nodes, "keepsake-turn").map((button) => button.attribs["aria-label"]),
      ["左转 90°", "右转 90°"]);
    const photoLayers = nodes.filter((n) => n.name === "use" && n.attribs.transform);
    assert.equal(photoLayers.length, 5);
    assert.match(photoLayers[0].attribs.transform, /matrix\(0 1 -1 0 413 0\)/);
    assert.ok(photoLayers.slice(1).every((n) => /matrix\(0 -1 1 0 0 295\)/.test(n.attribs.transform)));
    assert.equal(byClass(nodes, "stamp-slot-outline").length, count);
    assert.ok(nodes.some((n) => n.attribs?.viewbox === "258 129 648 560"));
  }
});

test("postcard preview shares the gesture canvas and sliders above its template choices", () => {
  const draft = {
    center: { scale: 1.5, offsetX: 30, offsetY: 20 },
    corners: { scale: 1, offsetX: 0, offsetY: 0 },
  };
  const state = { panel: "keepsakeCrop", cropDraft: draft };
  const { nodes, text } = keepsake("postcard", "work", true, state);
  const [sheet] = byClass(nodes, "keepsake-preview-sheet");
  assert.equal(sheet.attribs.role, "dialog");
  assert.match(text, /定制预览.*左转右转复位.*换一张满意，去确认订单/);
  assert.doesNotMatch(text, /中央大图|四角小图|购买人学生证/);
  const sliders = nodes.filter((n) => n.attribs?.type === "range");
  assert.deepEqual(sliders.map((n) => n.attribs["aria-label"]), ["缩放", "左右", "上下"]);
  assert.deepEqual(sliders.map((n) => n.attribs.value), ["1.5", "-30", "-20"]);
  assert.ok(nodes.indexOf(sliders.at(-1)) < nodes.indexOf(byClass(nodes, "keepsake-preview-templates")[0]));
  assert.ok(text.includes("拖动或滑杆调整构图"));
  assert.equal(byClass(nodes, "keepsake-preview")[0].attribs.tabindex, "0");
  assert.ok(nodes.some((n) => n.name === "image" && n.attribs.href === "blob:input"));
  assert.equal(byClass(nodes, "keepsake-preview-templates")[0].children.length, 6);

  const turns = byClass(nodes, "keepsake-turn");
  assert.deepEqual(turns.map((button) => button.attribs["aria-label"]), ["左转 90°", "右转 90°"]);
  const [left, right] = turns.map((button) => {
    const icon = button.children.find((child) => child.name === "svg");
    assert.equal(icon.attribs["aria-hidden"], "true");
    return icon.children.find((child) => child.name === "path");
  });
  assert.equal(left.attribs.transform, undefined);
  assert.equal(right.attribs.transform, "translate(16 0) scale(-1 1)");
  const reset = nodes.find((node) => node.name === "button" && node.children.some((child) => child.data === "复位"));
  assert.ok(reset && !turns.includes(reset) && reset.attribs.disabled === undefined);
  const initial = keepsake("postcard", "work", false, { ...state, previewLoading: true });
  assert.match(initial.text, /正在生成定制效果/);
  assert.equal(byClass(initial.nodes, "keepsake-preview").length, 0);

  for (const condition of [
    { previewLoading: true, templateId: "postcard-birthday" },
    { previewError: "模板读取失败，请重试。", templateId: "postcard-birthday" },
  ]) {
    const pending = keepsake("postcard", "work", true, { ...state, ...condition });
    const next = pending.nodes.find((n) => n.name === "button" &&
      n.children.some((c) => c.data === "满意，去确认订单"));
    assert.notEqual(next.attribs.disabled, undefined);
    assert.doesNotMatch(pending.text, /正在生成定制效果/);
    assert.equal(byClass(pending.nodes, "keepsake-preview").length, 1);
    assert.ok(pending.nodes.some((n) => n.name === "image" && n.attribs.href === "blob:frame"));
    if (condition.previewError) assert.match(pending.text, /模板读取失败，请重试。重试重新选图/);
  }

});

test("finished photo sheet has services and download with no more-actions disclosure", () => {
  const album={photo,view:"detail",photoReadable:true,store:{url:()=>"blob:photo"},modal:null};
  const {html,text}=render("PhotoActionSheet",{scope:{},album});
  assert.doesNotMatch(html,/sheet-photo-more|<details/);
  assert.doesNotMatch(text,/更多操作|下载原始文件|删除此照片|删除照片/);
  assert.match(text,/精选服务/);
  assert.match(text,/下载电子照片/);
});
