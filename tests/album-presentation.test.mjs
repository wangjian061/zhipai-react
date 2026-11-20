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
import * as documentPhotos from "../src/domain/document-photos.js";
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
const FeedbackToast = await compile("src/components/Feedback.jsx", "FeedbackToast", {
  useLayoutEffect: React.useLayoutEffect, useRef: React.useRef, Portal: renderPortal,
});
const {SharedSheet,SheetFrame}=await compile("src/components/SharedSheet.jsx","({SharedSheet,SheetFrame})",{
  useEffect:React.useEffect,useRef:React.useRef,Portal:renderPortal,FeedbackToast,
});
const {useArchiveZoom,ArchiveZoom}=await compile("src/components/ArchiveZoom.jsx","({useArchiveZoom,ArchiveZoom})",{
  useEffect:React.useEffect,useRef:React.useRef,useState:React.useState,Portal:renderPortal,
});
const ConfirmationDialog = await compile("src/components/ConfirmationDialog.jsx","ConfirmationDialog",{
  useEffect:React.useEffect,useId:React.useId,useRef:React.useRef,Portal:renderPortal,
});
const PhotoDeleteDialog=await compile("src/components/PhotoDeleteDialog.jsx","PhotoDeleteDialog",{
  ConfirmationDialog,
});
const PhotoActionSheet=await compile("src/components/PhotoActionSheet.jsx","PhotoActionSheet",{
  useArchiveZoom,ArchiveZoom,photoFacts,SharedSheet,PhotoDeleteDialog,PhotoOperations:()=>null,
});
const FamilyPhotoDetail = await compile("src/components/FamilyPhotoDetail.jsx", "FamilyPhotoDetail", {
  useEffect:React.useEffect, useState:React.useState, PhotoActionSheet,
});
const {AlbumDate,AlbumTabs,AlbumLibraryCard,AlbumSpaces} = await compile("src/components/AlbumSpaces.jsx", "({AlbumDate,AlbumTabs,AlbumLibraryCard,AlbumSpaces})", {
  ...archiveDomain, PhotoDeleteDialog, useArchiveZoom, ArchiveZoom, SharedSheet, albumDate, useState:React.useState, useRef:React.useRef, useEffect:React.useEffect, useLayoutEffect:React.useLayoutEffect, useCallback:React.useCallback,
});
let current;
const AlbumPage = await compile("src/pages/AlbumPage.jsx", "AlbumPage", {
  View,
  Repeat,
  PhotoDeleteDialog, PhotoActionSheet, AlbumPhotoViewer, AlbumDate, AlbumTabs, AlbumLibraryCard, AlbumSpaces,
  formatCaptureDate,
  FeedbackToast,
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
  assert.match(mine, /<nav class="album-tab-card album-space-tabs"[^>]*>.*<\/nav><section class="album-library-card"/);
  assert.match(mine, /<h2 id="album-library-title">我的照片<\/h2><div class="album-library-actions"><button[^>]*>管理/);
  const managing = renderPage(makeState({ managing: true, selected: [photo.id] }));
  assert.doesNotMatch(managing, /album-tab-card/);
  assert.match(managing, /已选择 1 张.*取消全选.*取消/);
  for(const space of ["family","documents"]) {
    const html=renderPage(makeState({space,archiveRoute:"page=album&space="+space,photo:null}));
    assert.match(html,/登录后查看/);
    assert.doesNotMatch(html,/class="photo-grid album-full-grid"|src="\/original.jpg"/);
  }
  const html=renderPage(makeState({photos:[{...photo,addedAt:new Date(2026,10,5).getTime()}]}));
  assert.match(html,/aria-label="添加日期 2026\/11\/05">2026\/11\/05<\/time>/);
});

test("document folders open a secondary page with adaptive cards and one edit sheet", async () => {
  let injected = false;
  const front = { ...photo, id: "front", archiveName: "人像面" };
  const back = { ...photo, id: "back", archiveName: "国徽面" };
  const archive = {
    members: [{ id: "mother", name: "妈妈", photos: [] }, { id: "father", name: "爸爸", photos: [] }],
    documents: [
      { id: "id-group", holderId: "mother", name: "身份证", photos: [front, back] },
      { id: "trip-group", holderId: "mother", name: "旅行资料", photos: [front, back, { ...front, id: "passport" }] },
      { id: "old-group", holderId: "removed", holderNameSnapshot: "外婆", name: "医保卡", photos: [front] },
    ],
  };
  const ToolNavigation = await compile("src/components/ToolNavigation.jsx", "ToolNavigation", {});
  const Component = await compile("src/components/AlbumSpaces.jsx", "AlbumSpaces", {
    ...archiveDomain, ...documentPhotos, PhotoDeleteDialog, SharedSheet, albumDate, ToolNavigation,
    DocumentPhotoViewer: ({ group, index }) => React.createElement("p", {}, group.name + " · " + (index + 1)),
    FamilyPhotoPicker: ({ documentSlots }) => React.createElement("p", { "data-document-slots": String(documentSlots) }, "选图"),
    getStore: () => ({ finished: [] }),
    useRef: React.useRef, useEffect: React.useEffect,
    useLayoutEffect: React.useLayoutEffect, useCallback: React.useCallback,
    useState(initial) {
      if (!injected) { injected = true; return React.useState(archive); }
      return React.useState(initial);
    },
  });
  const draw = (params = "") => {
    injected = false;
    return renderToStaticMarkup(React.createElement(Component, {
      owner: "owner", space: "documents", search: "?page=album&space=documents" + params,
    }));
  };
  const folders = draw();
  assert.equal((folders.match(/class="archive-folder-tile"/g) || []).length, 4);
  assert.equal((folders.match(/data-cover="document"/g) || []).length, 4);
  assert.match(folders, /archive-document-placeholder/);
  assert.match(folders, /本人.*0 份.*妈妈.*2 份.*爸爸.*外婆/);
  assert.doesNotMatch(folders, /role="dialog"|document-holder-page/);

  const documents = draw("&member=mother");
  assert.match(documents, /document-holder-page.*data-appearance="task".*妈妈的证件/);
  assert.match(documents, /<h2>身份证<\/h2><span>2张<\/span>.*aria-label="编辑身份证".*data-columns="2"/);
  assert.match(documents, /<h2>旅行资料<\/h2><span>3张<\/span>.*data-columns="3"/);
  assert.match(documents, /document-holder-actions.*添加证件/);
  assert.doesNotMatch(documents, /role="dialog"|下载|照片组|人像面|国徽面|删除证件/);
  assert.match(draw("&member=father"), /还没有证件.*添加证件/);
  assert.match(draw("&member=self"), /本人的证件.*还没有证件.*添加证件/);
  assert.doesNotMatch(draw("&member=removed"), /添加证件/);

  assert.match(draw("&sheet=manage"), /管理家人相册.*data-archive-action="member"[^>]*>.*添加家人/);
  assert.match(draw("&member=mother&sheet=new-document"), /data-document-slots="5">选图/);
  const edit = draw("&member=mother&group=id-group&sheet=edit-document");
  assert.equal((edit.match(/role="dialog"/g) || []).length, 1);
  assert.match(edit, /编辑证件.*<label>证件名称.*value="身份证".*替换第 1 张照片.*删除第 1 张照片.*添加.*删除整份证件.*>保存</);
  assert.match(draw("&member=mother&group=id-group&item=front&sheet=pick-document-replace"), /data-document-slots="1">选图/);
  assert.match(draw("&member=mother&group=id-group&sheet=pick-document-add"), /data-document-slots="3">选图/);
  assert.match(draw("&member=mother&group=id-group&item=2&sheet=view-document"), /身份证 · 2/);
});

test("viewer provides direct save and replacement and disables saving a missing original", async () => {
  const Viewer = await compile("src/components/DocumentPhotoViewer.jsx", "DocumentPhotoViewer", {
    Portal: renderPortal, useRef: React.useRef, useEffect: React.useEffect, useState: React.useState,
  });
  const group = { name: "身份证", photos: [photo, { ...photo, id: "missing", blob: null }] };
  const draw = (index) => renderToStaticMarkup(React.createElement(Viewer, { group, index }));
  assert.match(draw(0), /身份证 · 1\/2.*<button type="button">保存照片<\/button>.*替换/);
  assert.match(draw(1), /身份证 · 2\/2.*照片暂时无法显示.*disabled="">保存照片.*替换/);
});

test("document viewer separates swipe, double-tap, pinch, and enlarged pan", async () => {
  const gestures = await import("../src/domain/document-viewer.js");
  const changes = [];
  let view;
  const Stage = await compile("src/components/DocumentPhotoViewer.jsx", "DocumentPhotoStage", {
    ...gestures,
    useRef: (current) => ({ current }),
    useEffect: () => {},
    useState: (initial) => [initial, (next) => { if (next?.zoom) view = next; }],
  });
  const frame = {
    clientWidth: 300, clientHeight: 400,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 400 }),
    setPointerCapture() {},
  };
  const { props } = Stage({
    blob: photo.blob, onStep: (direction) => changes.push(direction), onClose: () => changes.push("close"),
  });
  const event = (pointerId, clientX, clientY, timeStamp = 0) => ({
    pointerId, clientX, clientY, timeStamp, button: 0, currentTarget: frame,
  });
  const down = (id, x, y, time) => props.onPointerDown(event(id, x, y, time));
  const move = (id, x, y, time) => props.onPointerMove(event(id, x, y, time));
  const up = (id, x, y, time) => props.onPointerUp(event(id, x, y, time));

  down(1, 170, 100);
  move(1, 80, 100);
  up(1, 80, 100);
  assert.deepEqual(changes, [1]);
  down(1, 150, 180, 500);
  up(1, 150, 180, 520);
  down(1, 150, 180, 640);
  up(1, 150, 180, 650);
  assert.equal(view.zoom, 2);
  down(1, 150, 180, 900);
  move(1, 90, 180, 935);
  up(1, 90, 180, 950);
  assert.equal(view.x, -60);
  assert.deepEqual(changes, [1]);
  down(1, 125, 180);
  down(2, 175, 180);
  move(2, 275, 180);
  assert.equal(view.zoom, 3);
  up(2, 275, 180);
  up(1, 125, 180);
  assert.deepEqual(changes, [1]);
  assert.equal(gestures.documentGestureAction(0, 100), "close");
  assert.equal(gestures.documentGestureAction(70, 73), null);

  const landscape = gestures.fitDocumentPhoto(300, 500, 400, 300);
  const moved = gestures.documentViewport({ zoom: 1, x: 0, y: 0 }, landscape, 2,
    { x: 0, y: 0 }, { x: 999, y: 999 });
  assert.deepEqual(moved, { zoom: 2, x: 150, y: 0 });
});

test("family photos use a task page and keep the established single-photo sheet", async () => {
  let injected = false, archive;
  const ToolNavigation = await compile("src/components/ToolNavigation.jsx", "ToolNavigation", {});
  const Component = await compile("src/components/AlbumSpaces.jsx", "AlbumSpaces", {
    ...archiveDomain, PhotoDeleteDialog, FamilyPhotoDetail, ToolNavigation, FeedbackToast,
    useArchiveZoom, ArchiveZoom, SharedSheet, albumDate,
    useRef:React.useRef, useEffect:React.useEffect, useLayoutEffect:React.useLayoutEffect, useCallback:React.useCallback,
    useState(initial) {
      if (!injected) { injected=true; return React.useState(archive); }
      return React.useState(initial);
    },
  });
  const draw = (photos, suffix="", withMember=true) => {
    injected=false;
    archive={members:[{id:"member",name:"妈妈",photos}],documents:[]};
    return renderToStaticMarkup(React.createElement(Component,{scope:{},owner:"owner",space:"family",search:"?space=family"+(withMember?"&member=member":"")+suffix}));
  };
  const member = draw([photo]);
  assert.match(member, /家人相册/);
  assert.doesNotMatch(member, /class="archive-folder-document"/);
  assert.match(member, /class="archive-folder-grid"/);
  assert.equal((member.match(/class="archive-folder-tile"/g) || []).length, 1);
  assert.match(member, /<strong>妈妈<\/strong><span>1 张<\/span>/);
  assert.match(member, /family-holder-page.*data-appearance="task".*id="member-photos-title">妈妈的照片/);
  assert.equal((member.match(/role="dialog"/g)||[]).length,0);
  assert.match(member, /archive-photo-grid/);
  assert.match(member, /添加照片/);
  const empty = draw([]);
  assert.match(empty, /archive-folder-paper.*photo-placeholder-silhouette-20261106\.webp/);
  assert.doesNotMatch(empty, /data-cover="document"|archive-document-placeholder/);
  assert.match(empty, /<strong>妈妈<\/strong><span>空相册<\/span>/);
  assert.match(empty, /还没有照片/);
  const detail = draw([photo], "&item=one");
  assert.match(detail, /id="member-photos-title">妈妈的照片/);
  assert.doesNotMatch(detail, /archive-full-image/);
  for (const content of ["photo-action-summary", "sheet-photo-preview", "照片规格", "413 × 579 px", "精选服务", "下载电子照片"])
    assert.ok(detail.includes(content), content);
  assert.equal((detail.match(/role="dialog"/g)||[]).length,1);
  assert.doesNotMatch(detail, /删除照片|role="alertdialog"/);
  const legacy = draw([photo], "&item=one&sheet=delete-photo");
  assert.match(legacy, /photo-action-summary/);
  assert.doesNotMatch(legacy, /删除照片|role="alertdialog"/);
  const selecting = draw([photo], "&sheet=manage-photos");
  assert.match(selecting, /已选 0 张.*全选.*取消/);
  assert.match(selecting, /aria-pressed="false".*class="photo-check"/);
  assert.match(selecting, /class="ui-button-danger-soft" disabled="">删除（已选 0 张）/);
  assert.doesNotMatch(selecting, /添加照片|role="alertdialog"/);
  assert.doesNotMatch(empty, /archive-holder-control/);

  const photos = [photo, { ...photo, id: "two" }, { ...photo, id: "three" }, { ...photo, id: "four" }];
  const list = draw(photos, "", false);
  assert.equal((list.match(/class="archive-folder-paper"/g) || []).length, 3);
  assert.doesNotMatch(list, /data-archive-action="member"/);
  const management = draw(photos, "&sheet=manage", false);
  assert.match(management, /id="album-archive-management-title">管理家人相册/);
  for (const action of ["member", "edit-member:member", "delete-member:member"])
    assert.ok(management.includes('data-archive-action="' + action + '"'));
  const edit = draw(photos, "&sheet=edit-member");
  assert.match(edit, /id="album-archive-form">编辑家人相册/);
  assert.match(edit, /value="妈妈"/);
  assert.doesNotMatch(edit, /id="member-photos-title"|证件类型/);
  const remove = draw(photos, "&sheet=delete-member");
  assert.match(remove, /「妈妈」相册及其中 4 张照片将被删除/);
  assert.match(remove, /取消<\/button><button[^>]*>删除相册及照片<\/button>/);
  assert.doesNotMatch(remove, /aria-label="关闭"|保留照片/);
  assert.match(draw([], "&sheet=delete-member"), /<button[^>]*>删除相册<\/button>/);
});

test("unreadable photos keep retry and disable download with no direct delete action", () => {
  const html=renderToStaticMarkup(React.createElement(PhotoActionSheet,{scope:{},album:makeState({view:"detail",photo:{...photo,blob:null},photoReadStatus:"failed"})}));
  assert.doesNotMatch(html, /data-photo-delete|删除照片|更多操作/);
  assert.match(html, /重新读取/);
  assert.match(html, /disabled="">下载电子照片/);
});
