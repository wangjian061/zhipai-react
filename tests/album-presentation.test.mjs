// Static React and source handlers only; no browser or screenshot automation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
import { transformWithOxc } from "vite";
import { observable, withLocals } from "../src/runtime/state.js";
import {photoFacts} from "../src/domain/photo-actions.js";
import * as archiveDomain from "../src/domain/album-spaces.js";
import { albumDate, formatCaptureDate } from "../src/domain/photo-date.js";
import { visiblePhotoBounds } from "../src/components/photo-processing.js";
const generate = generateModule.default || generateModule;
async function compile(file, name, deps) {
  const ast = parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"],
  });
  ast.program.body = ast.program.body
    .filter((n) => n.type !== "ImportDeclaration")
    .map((n) =>
      ["ExportDefaultDeclaration", "ExportNamedDeclaration"].includes(n.type)
        ? n.declaration
        : n,
    );
  const out = await transformWithOxc(generate(ast).code, file, {
    jsx: { runtime: "classic" },
  });
  return new Function(
    "React",
    ...Object.keys(deps),
    out.code + ";return " + name,
  )(React, ...Object.values(deps));
}
const { View, Repeat } = await compile(
  "src/runtime/components.jsx",
  "({View,Repeat})",
  {
    createContext: React.createContext,
    useContext: React.useContext,
    useRef: React.useRef,
    useState: React.useState,
    useSyncExternalStore: React.useSyncExternalStore,
    useLayoutEffect: React.useLayoutEffect,
    withLocals,
  },
);
const AlbumPhotoViewer = await compile(
  "src/components/AlbumPhotoViewer.jsx",
  "AlbumPhotoViewer",
  { View, visiblePhotoBounds },
);
const photo = {
  id: "one",
  name: "证件照.jpg",
  width: 413,
  height: 579,
  spec: "二寸 · 35 × 49 mm",
  blob: new Blob(["photo"]),
};
const makeState = (extra = {}) =>
  observable({
    page: "album",
    view: "library",
    space: "mine",
    modal: null,
    photo: null,
    photoId: null,
    photos: [photo],
    selected: [],
    tools: [],
    managing: false,
    disabled: false,
    downloading: false,
    working: false,
    message: "",
    notice: "",
    previewClosing: false,
    $store: { photoChoice: { printReturnContext: null } },
    store: {
      ready: true,
      busy: false,
      error: "",
      addedIds: [],
      url: () => "/original.jpg",
    },
    photoInfo: () => "413 × 579 px · JPG · 49 KB",
    ...extra,
  });
const renderPortal=({target,children})=>React.createElement("div",{"data-portal-target":target},children);
const {SharedSheet,SheetFrame}=await compile("src/components/SharedSheet.jsx","({SharedSheet,SheetFrame})",{
  useEffect:React.useEffect,useRef:React.useRef,Portal:renderPortal,
});
const {useArchiveZoom,ArchiveZoom}=await compile("src/components/ArchiveZoom.jsx","({useArchiveZoom,ArchiveZoom})",{
  useEffect:React.useEffect,useRef:React.useRef,useState:React.useState,Portal:renderPortal,
});
const PhotoDeleteDialog=await compile("src/components/PhotoDeleteDialog.jsx","PhotoDeleteDialog",{
  useEffect:React.useEffect,useRef:React.useRef,Portal:renderPortal,
});
const PhotoActionSheet=await compile("src/components/PhotoActionSheet.jsx","PhotoActionSheet",{
  useArchiveZoom,ArchiveZoom,photoFacts,SharedSheet,PhotoDeleteDialog,PhotoOperations:()=>null,
});
const FamilyPhotoDetail = await compile("src/components/FamilyPhotoDetail.jsx", "FamilyPhotoDetail", {
  useEffect:React.useEffect, useState:React.useState, PhotoActionSheet,
});
const SpecificationIcon=await compile("src/components/SpecificationIcon.jsx","SpecificationIcon",{});
const {AlbumDate,AlbumTabs,AlbumSpaces} = await compile("src/components/AlbumSpaces.jsx", "({AlbumDate,AlbumTabs,AlbumSpaces})", {
  ...archiveDomain, PhotoDeleteDialog, SpecificationIcon, useArchiveZoom, ArchiveZoom, SharedSheet, albumDate, useState:React.useState, useRef:React.useRef, useEffect:React.useEffect, useLayoutEffect:React.useLayoutEffect, useCallback:React.useCallback,
});
let current;
const AlbumPage = await compile("src/pages/AlbumPage.jsx", "AlbumPage", {
  View,
  Repeat,
  PhotoDeleteDialog, PhotoActionSheet, AlbumPhotoViewer, AlbumDate, AlbumTabs, AlbumSpaces,
  formatCaptureDate,
  PhotoOperations: () => null,
  // This fixture has no paid unfinished results; recovery has separate domain tests.
  PendingPhotoResults: () => null,
  Controller: ({ children }) => children(current),
  Portal: ({ target, children }) =>
    React.createElement("div", { "data-portal-target": target }, children),
});
function renderPage(state) {
  current = state;
  return renderToStaticMarkup(React.createElement(AlbumPage));
}
test("library omits unknown dates and file details; detail keeps its metadata", () => {
  const library = renderPage(makeState());
  assert.ok(library.includes("/original.jpg"));
  assert.ok(!library.includes("album-photo-caption"));
  assert.ok(!library.includes("35 × 49 mm"));
  const detail = renderPage(
    makeState({ view: "detail", photo, photoId: photo.id }),
  );
  assert.ok(detail.includes("二寸 · 35 × 49 mm"));
  assert.ok(detail.includes("413 × 579 px"));
  assert.ok(detail.includes('class="sheet-photo-preview"'));
  assert.ok(detail.includes('aria-label="点击放大查看"'));
  assert.ok(!detail.includes("zoomed"));
});
test("the thumbnail, detail and photo information show the original day", () => {
  const dated = { ...photo, captureDate: "2024-02-29", createdAt: new Date(2026, 10, 5, 9, 34).getTime() };
  const list = renderPage(makeState({ photos: [dated, { ...photo, id: "unknown" }] }));
  assert.equal((list.match(/class="album-capture-date"/g) || []).length, 1);
  assert.ok(list.includes('datetime="2024-02-29"') || list.includes('dateTime="2024-02-29"'));
  assert.ok(list.includes("2024/02/29"));
  const detail = renderPage(makeState({ view: "detail", photo: dated }));
  assert.ok(detail.indexOf("拍摄日期") >= 0 && detail.indexOf("拍摄日期") < detail.indexOf("制作时间"));
  const info = renderPage(makeState({ view: "detail", photo: dated, modal: "info" }));
  assert.ok(info.slice(info.indexOf('class="photo-info-list"')).includes("2024/02/29"));
});
test("viewer is a separate modal in the existing Portal and locks the unchanged detail", () => {
  const html = renderPage(
    makeState({ view: "detail", photo, modal: "preview" }),
  );
  const portal = html.indexOf('data-portal-target="#album-modal-layer"');
  assert.ok(html.indexOf('class="album-photo-viewer"') > portal);
  assert.ok(html.includes('aria-label="照片大图"'));
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes('aria-label="关闭照片大图"'));
  assert.ok(html.includes('inert=""'));
  assert.ok(html.includes('data-preview="true"'));
  assert.ok(!html.includes('class="sheet-photo-preview"'));
  assert.ok(html.includes('class="album-library-card"'));
  assert.equal(AlbumPhotoViewer({ scope: makeState() }), null);
  const unavailable = renderToStaticMarkup(
    React.createElement(AlbumPhotoViewer, {
      scope: makeState({ modal: "preview", photo: null }),
    }),
  );
  assert.ok(unavailable.includes("照片暂时无法显示"));
  assert.ok(unavailable.includes("关闭照片大图"));
});
test("clicking letterbox blank closes the viewer, actual photo content does not", () => {
  for (const scale of [1, 0.6]) {
    let closed = 0;
    const tree = AlbumPhotoViewer({
      scope: makeState({ photo, modal: "preview", closeModal: () => closed++ }),
    });
    const stage = React.Children.toArray(tree.props.children).at(-1);
    const rect = {
      left: 100,
      top: 200,
      width: 360 * scale,
      height: 600 * scale,
    };
    const frame = {
      getBoundingClientRect: () => rect,
      querySelector: () => ({
        getBoundingClientRect: () => rect,
        naturalWidth: 1000,
        naturalHeight: 500,
      }),
    };
    stage.props.onClick({
      currentTarget: frame,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
    assert.equal(closed, 0);
    stage.props.onClick({
      currentTarget: frame,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + 10 * scale,
    });
    assert.equal(closed, 1);
    const button = React.Children.toArray(tree.props.children)[0].props
      .children;
    button.props.onClick();
    assert.equal(closed, 2);
  }
});

test("the existing library opens on My; private spaces offer sign-in without rendering that grid", () => {
  const mine=renderPage(makeState());
  for(const label of ["我的照片","家人照片","证件照片"]) assert.ok(mine.includes(label));
  for(const space of ["family","documents"]) {
    const html=renderPage(makeState({space,archiveRoute:"page=album&space="+space,photo:null}));
    assert.match(html,/登录后查看/);
    assert.doesNotMatch(html,/class="photo-grid album-full-grid"|src="\/original.jpg"/);
  }
  const html=renderPage(makeState({photos:[{...photo,addedAt:new Date(2026,10,5).getTime()}]}));
  assert.match(html,/aria-label="添加日期 2026\/11\/05">2026\/11\/05<\/time>/);
});

test("document types expand in place; details expose only viewing and deletion with truthful counts", async () => {
  let injected = false;
  let archive;
  const Component = await compile("src/components/AlbumSpaces.jsx", "AlbumSpaces", {
    ...archiveDomain, PhotoDeleteDialog, SpecificationIcon, useArchiveZoom, ArchiveZoom, SharedSheet, albumDate,
    Portal: renderPortal, useRef:React.useRef, useEffect:React.useEffect,
    useLayoutEffect:React.useLayoutEffect, useCallback:React.useCallback,
    useState(initial) {
      if (!injected) { injected=true; return React.useState(archive); }
      return React.useState(initial);
    },
  });
  const doc={id:"document",type:"identity",holderId:"",front:{...photo,id:"front"},back:{...photo,id:"back"}};
  const draw=(record,sheet="",detail=true)=>{
    injected=false;
    archive={members:[],documents:[record]};
    return renderToStaticMarkup(React.createElement(Component,{owner:"owner",space:"documents",search:"?space=documents&doctype=identity"+(detail?"&item=document":"")+sheet}));
  };
  const list=draw(doc,"",false);
  assert.doesNotMatch(list,/role="dialog"|aria-label="返回"/);
  assert.match(list,/本人 · 身份证/);
  assert.equal((list.match(/aria-expanded="true"/g)||[]).length,1);
  const complete=draw(doc);
  for (const label of ["删除人像面","删除国徽面","删除整份证件"])
    assert.ok(complete.includes(label),label);
  assert.doesNotMatch(complete,/替换人像面|替换国徽面|补充人像面|补充国徽面/);
  for (const type of archiveDomain.DOCUMENT_TYPES)
    assert.ok(complete.includes(type.name), type.name);
  assert.match(complete,/aria-expanded="true" aria-controls="archive-documents-identity"/);
  assert.doesNotMatch(complete,/aria-label="返回"/);
  assert.ok(complete.includes("2 张图片"));
  const partial=draw({...doc,front:null});
  assert.ok(partial.includes("未添加人像面"));
  assert.ok(partial.includes("删除国徽面"));
  assert.ok(partial.includes("1 张图片"));
  assert.ok(!partial.includes("删除人像面"));
  const oneSide=draw(doc,"&sheet=delete-front");
  assert.ok(oneSide.includes('role="alertdialog"'));
  assert.ok(oneSide.includes("删除人像面？"));
  assert.ok(oneSide.includes("删除这一面"));
  assert.ok(!oneSide.includes('id="archive-detail-title"'));
  const lastSide=draw({...doc,back:null},"&sheet=delete-front");
  assert.ok(lastSide.includes("这是最后一面图片，删除后将移除整份证件。"));
  assert.ok(lastSide.includes("删除整份证件"));
});


test("family list lives in one sheet; single photos keep the established facts/services/download layout", async () => {
  let injected = false, archive;
  const Component = await compile("src/components/AlbumSpaces.jsx", "AlbumSpaces", {
    ...archiveDomain, PhotoDeleteDialog, FamilyPhotoDetail, SpecificationIcon,
    useArchiveZoom, ArchiveZoom, SharedSheet, albumDate,
    useRef:React.useRef, useEffect:React.useEffect, useLayoutEffect:React.useLayoutEffect, useCallback:React.useCallback,
    useState(initial) {
      if (!injected) { injected=true; return React.useState(archive); }
      return React.useState(initial);
    },
  });
  const draw = (photos, suffix="") => {
    injected=false;
    archive={members:[{id:"member",name:"妈妈",photos}],documents:[]};
    return renderToStaticMarkup(React.createElement(Component,{scope:{},owner:"owner",space:"family",search:"?space=family&member=member"+suffix}));
  };
  const member = draw([photo]);
  assert.match(member, /家人相册/);
  assert.match(member, /id="member-photos-title">妈妈/);
  assert.equal((member.match(/role="dialog"/g)||[]).length,1);
  assert.match(member, /archive-photo-grid/);
  assert.match(member, /添加照片/);
  assert.match(draw([]), /还没有照片/);
  const detail = draw([photo], "&item=one");
  assert.doesNotMatch(detail, /id="member-photos-title"|archive-full-image/);
  for (const content of ["photo-action-summary", "sheet-photo-preview", "照片规格", "413 × 579 px", "精选服务", "下载电子照片", "删除照片"])
    assert.ok(detail.includes(content), content);
  assert.equal((detail.match(/role="dialog"/g)||[]).length,1);
  const confirmation=draw([photo], "&item=one&sheet=delete-photo");
  assert.match(confirmation, /role="alertdialog"/);
  assert.match(confirmation, /原照片和其他家人的照片不会删除/);
  assert.doesNotMatch(confirmation, /photo-action-summary|archive-photo-grid/);
});

test("unreadable personal photo keeps a direct delete action outside the services and original footer", () => {
  const html=renderToStaticMarkup(React.createElement(PhotoActionSheet,{scope:{},album:makeState({view:"detail",photo:{...photo,blob:null},photoReadStatus:"failed"})}));
  assert.match(html, /data-photo-delete="true"/);
  assert.doesNotMatch(html, /更多操作/);
  assert.match(html, /下载电子照片/);
  assert.ok(html.indexOf("data-photo-delete") < html.indexOf("ui-sheet-footer"));
});
