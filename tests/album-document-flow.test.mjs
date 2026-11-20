// Execute the actual component's confirmation callbacks against isolated storage.
// No browser, DOM clicks, file upload, or user records are used.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
import { transformWithOxc } from "vite";
import * as domain from "../src/domain/album-spaces.js";
import { albumDate } from "../src/domain/photo-date.js";
import { albumPhotoId } from "../src/domain/album.js";
import * as documentPhotos from "../src/domain/document-photos.js";
import { getStore, registerStore } from "../src/runtime/state.js";
import { database } from "./helpers/memory-indexeddb.mjs";

const generate = generateModule.default || generateModule;
async function transpile(filename) {
  const ast = parse(fs.readFileSync(filename, "utf8"), {
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
  return transformWithOxc(generate(ast).code, filename, {
    jsx: { runtime: "classic" },
  });
}

const [transformed, phonePicker] = await Promise.all([
  transpile("src/components/AlbumSpaces.jsx"),
  transpile("src/components/FamilyPhotoPicker.jsx"),
]);

globalThis.indexedDB = database();
globalThis.window = new EventTarget();
const image = (id) => ({ id, blob: new Blob([id], { type: "image/png" }) });
async function fixture(
  owner,
  side = "document",
  update = domain.updateArchive,
  back = image("back"),
) {
  registerStore("account", { session: { phone: owner } });
  const family = side === "member" || side === "member-import";
  const space = family ? "family" : "documents";
  await domain.updateArchive(owner, (state) => {
    if (family) {
      const member = domain.newMember("妈妈");
      state.members.push(member);
      domain.appendFamilyPhotos(state, member.id, [image("copy")]);
      domain.addDocumentGroup(state, member.id, "身份证", [image("front"), back].filter(Boolean));
    } else {
      domain.addDocumentGroup(state, "", "身份证", [image("front"), back].filter(Boolean));
    }
  });
  const data = await domain.readArchive(owner),
    row = family ? data.members[0] : data.documents[0];
  const path = domain.archivePath(
    space,
    family
      ? { member: row.id, sheet: side === "member-import" ? "photos" : "delete-member" }
      : {
          member: "self", group: row.id, item: side === "replace" ? 1 : side === "front" ? row.photos[0].id : null,
          sheet: side === "replace" ? "replace-document" : "confirm-document-delete",
        },
  );
  globalThis.location = new URL("http://localhost" + path);
  globalThis.history = {
    state: {},
    length: 1,
    replaceState(state, _, url = location.href) {
      this.state = state;
      globalThis.location = new URL(url, location);
    },
  };
  let stateIndex = 0,
    refIndex = 0,
    confirmation, picker;
  const updates = [];
  const deps = {
    ...domain,
    ...documentPhotos,
    getStore,
    ToolNavigation: () => null,
    albumDate, FeedbackToast: () => null,
    SharedSheet: () => null,
    FamilyPhotoPicker: (props) => {
      picker = props;
      return null;
    },
    PhotoDeleteDialog: (props) => {
      confirmation = props;
      return null;
    },
    ConfirmationDialog: (props) => {
      confirmation = props;
      return null;
    },
    useState(initial) {
      const index = stateIndex++;
      const [value] = React.useState(index === 0 ? data : initial);
      return [
        value,
        (next) => {
          updates[index] = typeof next === "function" ? next(value) : next;
        },
      ];
    },
    useRef(initial) {
      return React.useRef(refIndex++ === 2 ? true : initial);
    },
    useEffect: React.useEffect,
    useLayoutEffect: React.useLayoutEffect,
    useCallback: React.useCallback,
    updateArchive: update,
  };
  const Component = new Function(
    "React",
    ...Object.keys(deps),
    transformed.code + ";return AlbumSpaces;",
  )(React, ...Object.values(deps));
  renderToStaticMarkup(
    React.createElement(Component, {
      owner,
      space,
      search: location.search,
    }),
  );
  assert.ok(["replace", "member-import"].includes(side) ? picker : confirmation, "the requested archive panel is rendered");
  return { owner, row, path, confirmation, picker, updates };
}

test("document confirmation deletes immediately, tolerates equivalent route order, and submits once", async () => {
  let calls = 0,
    release;
  const f = await fixture("delete-whole", "document", async (...args) => {
    calls++;
    await new Promise((resolve) => {
      release = resolve;
    });
    return domain.updateArchive(...args);
  });
  const pending = f.confirmation.onDelete();
  await f.confirmation.onDelete();
  assert.equal(calls, 1);
  // Address normalization must not silently cancel an already-confirmed delete.
  history.replaceState(
    {},
    "",
    "/?page=album&space=documents&sheet=confirm-document-delete&group=" + f.row.id + "&member=self",
  );
  release();
  await pending;
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
  assert.equal(location.pathname + location.search, domain.archivePath("documents", { member: "self" }));
  assert.equal(new URLSearchParams(location.search).has("item"), false);
  assert.equal(f.updates[0].documents.length, 0);
  assert.equal(f.updates[2], false);
});

test("removing one of several photos edits the draft and leaves stored files intact", async () => {
  const f = await fixture("delete-side", "front");
  assert.equal(f.confirmation.confirmLabel, "移除照片");
  assert.match(f.confirmation.description, /点击「保存」后/);
  f.confirmation.onConfirm();
  const [row] = (await domain.readArchive(f.owner)).documents;
  assert.deepEqual(row.photos.map((photo) => photo.id), f.row.photos.map((photo) => photo.id));
  assert.equal(new URLSearchParams(location.search).get("sheet"), "edit-document");
  assert.ok(f.updates.some((value) => Array.isArray(value) && value.length === 1 &&
    value[0].id === f.row.photos[1].id));
});

test("saving a complete edit commits the name, order, replacements, and removals together", async () => {
  const f = await fixture("save-draft");
  const upload = image("new");
  await assert.rejects(domain.updateArchive(f.owner, (state) =>
    domain.saveDocumentGroupEdit(state, f.row, "新版证件", [image("image"), { id: "bad" }])), /可用/);
  assert.equal((await domain.readArchive(f.owner)).documents[0].name, f.row.name);

  await domain.updateArchive(f.owner, (state) =>
    domain.saveDocumentGroupEdit(state, f.row, "新版证件", [f.row.photos[1], upload]));
  const [record] = (await domain.readArchive(f.owner)).documents;
  assert.equal(record.name, "新版证件");
  assert.equal(record.photos[0].id, f.row.photos[1].id);
  assert.equal(await record.photos[1].blob.text(), "new");
  await assert.rejects(domain.updateArchive(f.owner, (state) =>
    domain.saveDocumentGroupEdit(state, f.row, "过期更改", [image("another")])), /证件已变化/);
});

test("failed deletion keeps the certificate and confirmation; retry succeeds", async () => {
  let fail = true;
  const f = await fixture("delete-retry", "document", (...args) => {
    if (fail)
      return Promise.reject(new DOMException("quota", "QuotaExceededError"));
    return domain.updateArchive(...args);
  });
  await f.confirmation.onDelete();
  assert.match(f.updates[1], /删除未完成，证件已保留，请重试/);
  assert.equal((await domain.readArchive(f.owner)).documents.length, 1);
  assert.equal(
    new URLSearchParams(location.search).get("sheet"),
    "confirm-document-delete",
  );
  fail = false;
  await f.confirmation.onDelete();
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
});

test("deleting the final photo warns that the whole group is removed", async () => {
  const f = await fixture("delete-final", "front", domain.updateArchive, null);
  assert.equal(f.confirmation.confirmLabel, "删除证件");
  assert.match(f.confirmation.description, /最后一张照片/);
  await f.confirmation.onDelete();
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
  assert.equal(location.pathname + location.search, domain.archivePath("documents", { member: "self" }));
  assert.equal(new URLSearchParams(location.search).has("item"), false);
});

test("a changed document rejects stale confirmation and preserves current images", async () => {
  const f = await fixture("delete-conflict");
  await domain.updateArchive(f.owner, (state) => {
    state.documents[0].photos[1] = image("new-back");
  });
  await f.confirmation.onDelete();
  assert.match(f.updates[1], /证件已变化/);
  const [row] = (await domain.readArchive(f.owner)).documents;
  assert.equal(row.photos[1].id, "new-back");
  assert.equal(row.photos[0].id, f.row.photos[0].id);
  assert.equal(
    new URLSearchParams(location.search).get("sheet"),
    "confirm-document-delete",
  );
});

test("cancel never writes; a late deletion cannot navigate away from a newer page", async () => {
  let release;
  const f = await fixture("delete-cancel", "document", async (...args) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    return domain.updateArchive(...args);
  });
  f.confirmation.onClose();
  assert.equal((await domain.readArchive(f.owner)).documents.length, 1);
  // Restore the confirmation address to exercise an in-flight write separately.
  history.replaceState(
    {},
    "",
    domain.archivePath("documents", {
      member: "self",
      group: f.row.id,
      sheet: "confirm-document-delete",
    }),
  );
  const pending = f.confirmation.onDelete();
  history.replaceState({}, "", "/?page=home");
  release();
  await pending;
  assert.equal(location.search, "?page=home");
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
});

test("family album confirmation cancels safely and returns to management after retry", async () => {
  let fail = true;
  const f = await fixture("delete-family-album", "member", (...args) =>
    fail ? Promise.reject(new DOMException("quota", "QuotaExceededError")) : domain.updateArchive(...args),
  );
  assert.equal(f.confirmation.confirmLabel, "删除相册及照片");
  assert.match(f.confirmation.description, /其中 1 张照片/);
  f.confirmation.onClose();
  assert.equal((await domain.readArchive(f.owner)).members.length, 1);
  const management = domain.archivePath("family", { sheet: "manage" });
  assert.equal(location.pathname + location.search, management);
  history.replaceState({}, "", f.path);
  await f.confirmation.onDelete();
  assert.match(f.updates[1], /删除未完成，相册已保留/);
  assert.equal((await domain.readArchive(f.owner)).members.length, 1);
  assert.equal(location.pathname + location.search, f.path);
  fail = false;
  await f.confirmation.onDelete();
  const archive = await domain.readArchive(f.owner);
  assert.equal(archive.members.length, 0);
  assert.equal(archive.documents[0].holderNameSnapshot, "妈妈");
  assert.equal(location.pathname + location.search, management);
});

test("replacement picker is single-select, retains the original after failure and commits only the selected photo", async () => {
  let fail = true;
  const f = await fixture("replace-photo", "replace", (...args) =>
    fail ? Promise.reject(new DOMException("quota", "QuotaExceededError")) : domain.updateArchive(...args),
  );
  assert.equal(f.picker.documentSlots, 1);
  await f.picker.onAdd(async () => [image("replacement")]);
  assert.match(f.updates[1], /保存失败/);
  assert.equal(location.pathname + location.search, f.path);
  let [group] = (await domain.readArchive(f.owner)).documents;
  assert.equal(await group.photos[0].blob.text(), "front");

  fail = false;
  await f.picker.onAdd(async () => [image("replacement")]);
  [group] = (await domain.readArchive(f.owner)).documents;
  assert.equal(await group.photos[0].blob.text(), "replacement");
  assert.equal(group.name, f.row.name);
  assert.equal(group.photos[1].id, f.row.photos[1].id);
  assert.equal(new URLSearchParams(location.search).get("sheet"), "view-document");
  assert.equal(new URLSearchParams(location.search).get("item"), "1");
});

test("the viewer saves the current original, flips without adding history, and opens one replacement picker", () => {
  const owner = "document-download-owner";
  registerStore("account", { session: { phone: owner } });
  const first = image("first"), second = image("second");
  const group = { id: "identity", holderId: "", name: "身份证", photos: [first, second, { id: "missing" }] };
  const data = { members: [], documents: [group] };
  const fields = { member: "self", group: group.id };
  const listPath = domain.archivePath("documents", { member: "self" });
  const viewerPath = (item) => domain.archivePath("documents", { ...fields, item, sheet: "view-document" });
  const downloads = [];
  let viewer, navigation, replaced, fail = false;
  const deps = {
    ...domain, getStore,
    useRef: React.useRef, useEffect: React.useEffect, useState: React.useState,
    ToolNavigation: () => null,
    DocumentPhotoViewer: (props) => { viewer = props; return null; },
    navigateArchive: (path) => { navigation = path; },
    replaceArchiveEntry: (path) => { replaced = path; },
    backInArchive: (path) => { navigation = path; },
    downloadAlbumBlob: (blob, name) => {
      if (fail) throw new Error("download unavailable");
      downloads.push({ blob, name });
    },
  };
  const Albums = new Function("React", ...Object.keys(deps), transformed.code + ";return DocumentAlbums;")(
    React, ...Object.values(deps),
  );
  const render = (path) => renderToStaticMarkup(React.createElement(Albums, {
    owner, data, search: new URL(path, "http://localhost").search,
    clearError: () => {}, renderLibrary: (children) => children,
  }));

  assert.doesNotMatch(render(listPath), /下载|下载证件照片/);
  render(viewerPath(1));
  assert.equal(viewer.index, 0);
  assert.equal(viewer.onSave(first, 0), "已发起照片下载");
  assert.deepEqual(downloads, [{ blob: first.blob, name: "身份证-1.png" }]);
  fail = true;
  assert.match(viewer.onSave(first, 0), /请重试/);
  viewer.onPage(1);
  assert.equal(replaced, viewerPath(2));
  assert.equal(navigation, undefined);
  render(viewerPath(2));
  assert.equal(viewer.index, 1);
  viewer.onReplace();
  assert.equal(navigation, domain.archivePath("documents", { ...fields, item: 2, sheet: "replace-document" }));
  viewer.onClose();
  assert.equal(navigation, listPath);
});

test("old document menu and download URLs have safe destinations", () => {
  const first = image("first"), second = image("second");
  const group = { id: "identity", holderId: "", name: "身份证", photos: [first, second] };
  const data = { members: [], documents: [group] };
  const fields = { member: "self", group: group.id };
  const old = (sheet, item) => domain.archivePath("documents", { ...fields, item, sheet });
  assert.equal(domain.legacyDocumentPath(data, old("download-group")), old("view-document", 1));
  assert.equal(domain.legacyDocumentPath(data, old("group-photo-actions", second.id)), old("view-document", 2));
  assert.equal(domain.legacyDocumentPath(data, old("delete-group")), old("edit-document"));
  assert.equal(domain.legacyDocumentPath(data, old("edit-document")), null);
});

function phoneSelection(picker, files) {
  const deps = {
    ...domain, ...documentPhotos,
    useRef: React.useRef, useState: React.useState, useEffect: React.useEffect, albumPhotoId,
    SheetFrame: () => null, ToolPhotoSelection: () => null, ConfirmationDialog: () => null,
  };
  const Component = new Function(
    "React", ...Object.keys(deps),
    phonePicker.code + ";return FamilyPhotoPicker;",
  )({
    ...React,
    createElement(type, props, ...children) {
      if (type === "input" && props.type === "file") fn = props.onChange;
      return React.createElement(type, props, ...children);
    },
  }, ...Object.values(deps));
  let fn;
  renderToStaticMarkup(React.createElement(Component, picker));
  assert.ok(fn, "the picker exposes a file input");
  return fn({ currentTarget: { files, value: "选中的文件" } });
}

test("a family phone import saves the original with one selection and returns to that member", async () => {
  const fixtureData = await fixture("family-phone-auto", "member-import");
  const { owner, row, picker, updates } = fixtureData;
  globalThis.Image = class {
    naturalWidth = 413;
    naturalHeight = 579;
    async decode() {}
  };
  const file = new File(["original bytes"], "新证件照.jpg", { type: "image/jpeg" });
  await phoneSelection(picker, []);
  await phoneSelection(picker, [file, file]);
  assert.equal((await domain.readArchive(owner)).members[0].photos.length, 1);
  await phoneSelection(picker, [file]);
  const [first, previous] = (await domain.readArchive(owner)).members[0].photos;
  assert.equal(first.name, file.name);
  assert.equal(await first.blob.text(), await file.text());
  assert.equal(previous.id, "copy");
  assert.equal(location.pathname + location.search, domain.archivePath("family", { member: row.id }));
  assert.equal(updates[3], row.id);
});

test("an unreadable family phone photo stays in the picker without adding a photo", async () => {
  const { owner, picker, path, updates } = await fixture("family-phone-retry", "member-import");
  globalThis.Image = class {
    async decode() { throw new DOMException("bad file", "EncodingError"); }
  };
  await phoneSelection(picker, [new File(["bad bytes"], "bad.jpg", { type: "image/jpeg" })]);
  assert.equal((await domain.readArchive(owner)).members[0].photos.length, 1);
  assert.equal(location.pathname + location.search, path);
  assert.equal(updates[1], "图片未能读取，请重新选择。");
});


function consentPicker(t, props) {
  let stateIndex, refIndex, input, dialog, effect, cleanup, submitted;
  const refs = [], state = [];
  const deps = {
    ...domain, ...documentPhotos, albumPhotoId,
    useRef(initial) {
      const index = refIndex++;
      return (refs[index] ??= { current: initial });
    },
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = value; }];
    },
    useEffect(fn) { effect = fn; },
    SheetFrame: () => null,
    ToolPhotoSelection: () => null,
    ConfirmationDialog(next) { dialog = next; return null; },
  };
  const ReactHost = {
    ...React,
    createElement(type, options, ...children) {
      if (type === "input" && options.type === "file") input = options.onChange;
      return React.createElement(type, options, ...children);
    },
  };
  const Component = new Function(
    "React", ...Object.keys(deps),
    phonePicker.code + ";return FamilyPhotoPicker;",
  )(ReactHost, ...Object.values(deps));

  const render = () => {
    refIndex = stateIndex = 0;
    dialog = null;
    renderToStaticMarkup(React.createElement(Component, {
      ...props,
      onAdd(...args) { return (submitted = props.onAdd(...args)); },
    }));
    return dialog;
  };
  render();
  cleanup = effect();
  t.after(cleanup);
  return {
    pick(files) {
      input({ currentTarget: { files, value: "选中的文件" } });
      return render();
    },
    render,
    submitted: () => submitted,
  };
}

function addConsentHistory() {
  let original;
  history.pushState = function (next) {
    original = this.state;
    this.state = next;
  };
  history.back = function () {
    this.state = original;
    window.dispatchEvent(new Event("popstate"));
  };
}

function mockCompression(t, outputs) {
  let reads = 0, encoded = 0;
  const previous = globalThis.document;
  globalThis.Image = class {
    naturalWidth = 1400;
    naturalHeight = 1600;
    async decode() { reads++; }
  };
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "canvas");
      const output = outputs[encoded++];
      return {
        getContext: () => output ? { drawImage() {} } : null,
        toBlob(callback) { callback(output); },
      };
    },
  };
  t.after(() => { globalThis.document = previous; });
  return { reads: () => reads, encoded: () => encoded };
}

const phoneLimit = documentPhotos.PHONE_ALBUM_PHOTO_MAX_BYTES;
const testPhoto = (size, filename = "照片.jpg") =>
  new File([new Uint8Array(size)], filename, { type: "image/jpeg" });

test("an oversized family phone photo is untouched until consent and then saves within 1 MB", async (t) => {
  const { owner, row, picker } = await fixture("family-size-consent", "member-import");
  addConsentHistory();
  const compress = mockCompression(t, [testPhoto(phoneLimit)]);
  const ui = consentPicker(t, picker);
  const original = testPhoto(phoneLimit + 1);
  let prompt = ui.pick([original]);
  assert.equal(prompt.title, "照片需要压缩");
  assert.match(prompt.description, /有 1 张照片超过 1 MB/);
  assert.equal(compress.reads(), 0);
  assert.equal((await domain.readArchive(owner)).members[0].photos.length, 1);

  prompt.onClose();
  assert.equal(ui.render(), null);
  assert.equal(ui.submitted(), undefined);
  assert.equal(compress.encoded(), 0);
  assert.equal((await domain.readArchive(owner)).members[0].photos.length, 1);

  prompt = ui.pick([original]);
  prompt.onConfirm();
  await ui.submitted();
  const [photo] = (await domain.readArchive(owner)).members[0].photos;
  assert.equal(photo.blob.size, phoneLimit);
  assert.equal(original.size, phoneLimit + 1);
  assert.equal(compress.encoded(), 1);
  assert.equal(location.pathname + location.search, domain.archivePath("family", { member: row.id }));
});

test("document batches ask once, leave 1 MB files untouched, and reject a failed batch atomically", async (t) => {
  await fixture("document-size-consent", "replace");
  addConsentHistory();
  const compress = mockCompression(t, [testPhoto(400000), testPhoto(600000), null]);
  let staged = [];
  const ui = consentPicker(t, {
    documentSlots: 3,
    library: { finished: [] },
    async onAdd(prepare) { staged = [...staged, ...(await prepare())]; },
  });
  const atLimit = testPhoto(phoneLimit, "原图.jpg");
  const over = testPhoto(phoneLimit + 1);
  let prompt = ui.pick([atLimit, over, over]);
  assert.match(prompt.description, /有 2 张照片超过 1 MB/);
  assert.equal(compress.reads(), 0);
  history.back();
  assert.equal(ui.render(), null);
  assert.equal(ui.submitted(), undefined);
  prompt = ui.pick([atLimit, over, over]);
  prompt.onConfirm();
  await ui.submitted();
  assert.equal(staged[0].blob, atLimit);
  assert.deepEqual(staged.map(({ blob }) => blob.size), [phoneLimit, 400000, 600000]);
  assert.equal(compress.encoded(), 2);

  const old = staged;
  ui.pick([atLimit, over]).onConfirm();
  await assert.rejects(ui.submitted(), /压缩失败/);
  assert.equal(staged, old);
});
