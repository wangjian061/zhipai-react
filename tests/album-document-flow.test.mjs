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
          member: "self", group: row.id, item: side === "front" || side === "replace" ? row.photos[0].id : null,
          sheet: side === "replace" ? "replace-group-photo" : side === "front" ? "delete-group-photo" : "delete-group",
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
    useArchiveZoom: () => ({ side: "" }),
    SharedSheet: () => null,
    FamilyPhotoPicker: (props) => {
      picker = props;
      return null;
    },
    PhotoDeleteDialog: (props) => {
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
    "/?page=album&space=documents&sheet=delete-group&group=" + f.row.id + "&member=self",
  );
  release();
  await pending;
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
  assert.equal(location.pathname + location.search, domain.archivePath("documents", { member: "self" }));
  assert.equal(new URLSearchParams(location.search).has("item"), false);
  assert.equal(f.updates[0].documents.length, 0);
  assert.equal(f.updates[2], false);
});

test("deleting one group photo preserves the other and returns to the group menu", async () => {
  const f = await fixture("delete-side", "front");
  await f.confirmation.onDelete();
  const [row] = (await domain.readArchive(f.owner)).documents;
  assert.equal(row.id, f.row.id);
  assert.deepEqual(row.photos.map((photo) => photo.id), [f.row.photos[1].id]);
  assert.equal(new URLSearchParams(location.search).get("group"), row.id);
  assert.equal(new URLSearchParams(location.search).get("sheet"), "group-actions");
  assert.equal(f.updates[0].documents[0].photos.length, 1);
});

test("failed deletion keeps the certificate and confirmation; retry succeeds", async () => {
  let fail = true;
  const f = await fixture("delete-retry", "document", (...args) => {
    if (fail)
      return Promise.reject(new DOMException("quota", "QuotaExceededError"));
    return domain.updateArchive(...args);
  });
  await f.confirmation.onDelete();
  assert.match(f.updates[1], /删除未完成，照片已保留，请重试/);
  assert.equal((await domain.readArchive(f.owner)).documents.length, 1);
  assert.equal(
    new URLSearchParams(location.search).get("sheet"),
    "delete-group",
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
    "delete-group",
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
      sheet: "delete-group",
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
  assert.equal(new URLSearchParams(location.search).get("sheet"), "group-actions");
});

test("visible download starts a single original immediately and selects individual originals for multiple photos", () => {
  const owner = "document-download-owner";
  registerStore("account", { session: { phone: owner } });
  const first = image("first"), second = image("second");
  const data = { members: [], documents: [
    { id: "passport", holderId: "", name: "护照", photos: [first] },
    { id: "identity", holderId: "", name: "身份证", photos: [first, second, { id: "missing" }] },
  ] };
  const fields = { member: "self" };
  const listPath = domain.archivePath("documents", fields);
  const downloadPath = domain.archivePath("documents", { ...fields, group: "identity", sheet: "download-group" });
  const downloads = [];
  let sheet, navigation, feedback, focused, fail = false;
  const deps = {
    ...domain, getStore,
    useRef: React.useRef, useEffect: React.useEffect, useCallback: React.useCallback,
    useArchiveZoom: () => ({ side: "" }),
    SharedSheet: (props) => { sheet = props; return null; },
    useState(initial) {
      const [value] = React.useState(initial);
      return [value, (next) => { feedback = next?.message; }];
    },
    navigateArchive: (path) => { navigation = path; },
    backInArchive: (path) => { navigation = path; },
    downloadAlbumBlob: (blob, name) => {
      if (fail) throw new Error("download unavailable");
      downloads.push({ blob, name });
    },
    requestAnimationFrame: (callback) => { callback(); return 1; },
    cancelAnimationFrame: () => {},
  };
  const Albums = new Function("React", ...Object.keys(deps), transformed.code + ";return DocumentAlbums;")(
    React, ...Object.values(deps),
  );
  const renderSheet = (path) => {
    renderToStaticMarkup(React.createElement(Albums, { owner, data, search: new URL(path, "http://localhost").search, clearError: () => {} }));
    return sheet;
  };
  const buttons = (children) => React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    return child.type === "button" ? [child.props] : buttons(child.props.children);
  });

  const list = renderSheet(listPath);
  const listButtons = buttons(list.children);
  listButtons.find((button) => button["data-document-list-action"] === "download:passport").onClick();
  assert.deepEqual(downloads, [{ blob: first.blob, name: "护照-1.png" }]);
  assert.equal(navigation, undefined);
  assert.match(feedback, /已发起/);

  const body = {
    scrollTop: 0,
    querySelectorAll: () => ["menu:identity", "download:identity"].map((action) => ({
      dataset: { documentListAction: action }, focus: () => { focused = action; },
    })),
  };
  const unmountListBody = list.bodyRef(body);
  body.scrollTop = 144;
  listButtons.find((button) => button["data-document-list-action"] === "download:identity").onClick();
  unmountListBody();
  assert.equal(navigation, downloadPath);
  const selector = renderSheet(downloadPath);
  assert.equal(selector.title, "下载证件照片");
  const choices = buttons(selector.children);
  assert.equal(choices[2].disabled, true);
  fail = true;
  choices[1].onClick();
  assert.match(feedback, /请重试/);
  fail = false;
  choices[1].onClick();
  assert.deepEqual(downloads[1], { blob: second.blob, name: "身份证-2.png" });
  assert.equal(navigation, downloadPath);
  selector.onClose();
  assert.equal(navigation, listPath);
  body.scrollTop = 0;
  list.bodyRef(body)();
  assert.equal(body.scrollTop, 144);
  assert.equal(focused, "download:identity");
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
