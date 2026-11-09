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
  PrintLayoutViewer: "components/PrintLayoutViewer",
  PhotoActionSheet: "components/PhotoActionSheet",
  AlbumPage: "pages/AlbumPage",
}))
  components[name] = (await server.ssrLoadModule(`/src/${file}.jsx`)).default;
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
function keepsake(kind, view, selected = false) {
  runtime.registerStore("keepsakeOrders", { items: [], ready: true });
  runtime.registerStore("account", { session: null });
  runtime.registerStore("printLibrary", { addresses: [], ready: true });
  runtime.registerController("keepsakeStudio", () =>
    Object.assign(Object.defineProperties({}, definition), {
      page: "keepsake",
      kind,
      view,
      templateId: kind === "postcard" ? "postcard-graduate" : "stamp-youth",
      photo: selected ? photo : null,
      image: selected ? { data: "blob:input", width: 295, height: 413 } : null,
      output: selected ? new Blob(["output"]) : null,
      outputURL: selected ? "blob:output" : "",
      orderId: null,
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
      `/?page=collection&view=projects&category=${category}&from=home&section=home`,
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
  test(`${kind}: the legacy entry and work route share one product with a separate editor`, () => {
    for (const view of ["templates", "work"]) {
      const { nodes, text } = keepsake(kind, view);
      assert.doesNotMatch(text, /示例/);
      assert.equal(byClass(nodes, "keepsake-product-stage").length, 1);
      assert.equal(byClass(nodes, "keepsake-editor").length, 1);
      assert.equal(
        byClass(nodes, "keepsake-preview").length,
        0,
        "samples are not user input",
      );
      assert.ok(
        nodes.some(
          (n) =>
            n.name === "button" &&
            n.attribs.disabled !== undefined &&
            n.children.some((c) => c.data?.includes("填写收货地址")),
        ),
      );
      if (kind === "postcard") {
        assert.equal(
          byClass(nodes, "postcard-template-rail")[0].children.length,
          5,
        );
        assert.match(text, /¥10.00.*富士相纸.*六寸.*定制预览/);
      } else {
        assert.equal(
          byClass(nodes, "stamp-gallery")[0].children[0].children[0].children[0]
            .attribs.src,
          "/assets/keepsakes/stamp-product-inner-20261106.webp",
        );
        assert.match(text, /产品介绍.*产品参数.*定制预览.*学生证/);
        assert.doesNotMatch(text, /¥/);
      }
    }
  });
  test(`${kind}: only the selected file appears in the editor and enables eligible checkout`, () => {
    const { nodes, text } = keepsake(kind, "work", true);
    assert.equal(byClass(nodes, "keepsake-preview").length, 1);
    assert.match(text, /更换照片.*点击调整照片(?!大小)/s);
    assert.doesNotMatch(text, /调整构图|重置|缩放/);
    if (kind === "stamp") {
      assert.ok(nodes.some((n) => n.attribs?.viewbox === "258 129 648 560"));
    }
    const next = nodes.find(
      (n) =>
        n.name === "button" &&
        n.children.some((c) => c.data?.includes("填写收货地址")),
    );
    assert.equal(next.attribs.disabled !== undefined, kind === "stamp");
  });
  test(`${kind}: order confirmation cannot pay without an address and retains editing back action`, () => {
    const { nodes, text } = keepsake(kind, "confirm", true);
    assert.match(text, /请选择收货地址/);
    if (kind === "stamp")
      assert.match(text, /商品金额¥59.00运费¥10.00数量1套应付金额¥69.00/);
    assert.match(text, /上一步确认并支付/);
    assert.notEqual(
      byClass(nodes, "photo-selection-next")[0].attribs.disabled,
      undefined,
    );
    assert.doesNotMatch(text, /确认制作/);
  });
}

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

test("personal photo sheet has one download footer and no duplicate print footer", () => {
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
});

test("print workspace separates choice from preview without nesting interactive controls", async () => {
  const domain = await server.ssrLoadModule("/src/domain/print.js");
  runtime.registerStore("printLibrary", {
    ready: true,
    busy: false,
    draft: domain.printDraftSeed(),
    orders: [],
    addresses: [],
  });
  const s = runtime.createController("printStudio", [], {
    page: "print",
  }).scope;
  s.view = "layouts";
  s.layoutOptions = domain.PRINT_LAYOUTS;
  const { nodes, text } = render("PrintWorkspace", { studio: s });
  assert.match(text, /请选择您的照片/);
  assert.doesNotMatch(text, /知拍相册 \/ 手机相册/);
  assert.equal(byClass(nodes, "print-workspace-select").length, 2);
  assert.equal(byClass(nodes, "print-workspace-preview").length, 2);
  for (const button of nodes.filter((n) => n.name === "button")) {
    let p = button.parent;
    while (p) {
      assert.notEqual(p.name, "button");
      p = p.parent;
    }
  }
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

test("stamp drawer shows both photo groups and three accessible controls without expanding a section", () => {
  const s = runtime.createController("keepsakeStudio", [], {}).scope;
  Object.assign(s, {
    kind: "stamp",
    templateId: "stamp-youth",
    image: { width: 295, height: 413, data: "blob:photo" },
    cropDraft: {
      center: { scale: 1, offsetX: 0, offsetY: 0 },
      corners: { scale: 1.5, offsetX: 5, offsetY: 0 },
    },
  });
  for (const [key, count] of [
    ["center", 1],
    ["corners", 4],
  ]) {
    s.activeSlot = key;
    const { nodes } = render("KeepsakeCropControls", { s });
    assert.deepEqual(
      nodes
        .filter((n) => n.name === "input")
        .map((n) => n.attribs["aria-label"]),
      ["缩放", "左右", "上下"],
    );
    assert.ok(!nodes.some((n) => n.name === "details"));
    assert.equal(
      byClass(nodes, "stamp-slot-outline")[0].children.length,
      count,
    );
  }
});

test("postcards use the shared sheet without stamp target controls",()=>{
  const s=runtime.createController("keepsakeStudio",[],{}).scope;
  s.kind="postcard";
  s.templateId="postcard-enrollment";
  s.cropDraft={center:{scale:1.5,offsetX:30,offsetY:20},corners:{scale:1,offsetX:0,offsetY:0}};
  const {nodes,text}=render("KeepsakeCropControls",{s});
  assert.doesNotMatch(text,/中央大图|四角小图/);
  assert.match(text,/左转 90°右转 90°0°/);
  assert.deepEqual(nodes.filter(n=>n.name==="input").map(n=>n.attribs["aria-label"]),["缩放","左右","上下"]);
});

test("finished photo sheet has services and download with no more-actions disclosure", () => {
  const album={photo,view:"detail",photoReadable:true,store:{url:()=>"blob:photo"},modal:null};
  const {html,text}=render("PhotoActionSheet",{scope:{},album});
  assert.doesNotMatch(html,/sheet-photo-more|<details/);
  assert.doesNotMatch(text,/更多操作|下载原始文件|删除此照片/);
  assert.match(text,/精选服务/);
  assert.match(text,/下载电子照片/);
});
