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
import { getStore, registerStore } from "../src/runtime/state.js";
import { database } from "./helpers/memory-indexeddb.mjs";

const generate = generateModule.default || generateModule;
const ast = parse(fs.readFileSync("src/components/AlbumSpaces.jsx", "utf8"), {
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
const transformed = await transformWithOxc(
  generate(ast).code,
  "AlbumSpaces.jsx",
  { jsx: { runtime: "classic" } },
);

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
  const family = side === "member";
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
      ? { member: row.id, sheet: "delete-member" }
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
  assert.ok(side === "replace" ? picker : confirmation, "the requested archive panel is rendered");
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
  assert.equal(f.picker.multiple, false);
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
