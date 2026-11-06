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
  await domain.updateArchive(owner, (state) =>
    domain.addDocument(state, "identity", "", image("front"), back),
  );
  const data = await domain.readArchive(owner),
    row = data.documents[0];
  globalThis.location = new URL(
    "http://localhost" +
      domain.archivePath("documents", {
        doctype: "identity",
        item: row.id,
        sheet: "delete-" + side,
      }),
  );
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
    confirmation;
  const updates = [];
  const deps = {
    ...domain,
    getStore,
    useArchiveZoom: () => ({ side: "" }),
    SharedSheet: () => null,
    SpecificationIcon: () => null,
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
      space: "documents",
      search: location.search,
    }),
  );
  assert.ok(confirmation, "the actual document confirmation is rendered");
  return { owner, row, confirmation, updates };
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
    "/?page=album&space=documents&doctype=identity&item=" +
      f.row.id +
      "&sheet=delete-document",
  );
  release();
  await pending;
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
  assert.equal(new URLSearchParams(location.search).get("doctype"), "identity");
  assert.equal(new URLSearchParams(location.search).has("item"), false);
  assert.equal(f.updates[0].documents.length, 0);
  assert.equal(f.updates[2], false);
});

test("single-side deletion preserves the other side and returns to the same detail", async () => {
  const f = await fixture("delete-side", "front");
  await f.confirmation.onDelete();
  const [row] = (await domain.readArchive(f.owner)).documents;
  assert.equal(row.id, f.row.id);
  assert.equal(row.front, null);
  assert.equal(row.back.id, "back");
  assert.equal(new URLSearchParams(location.search).get("item"), row.id);
  assert.equal(new URLSearchParams(location.search).has("sheet"), false);
  assert.equal(f.updates[0].documents[0].front, null);
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
    "delete-document",
  );
  fail = false;
  await f.confirmation.onDelete();
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
});

test("deleting the final face warns that the whole document is removed", async () => {
  const f = await fixture("delete-final", "front", domain.updateArchive, null);
  assert.equal(f.confirmation.confirmLabel, "删除整份证件");
  assert.match(f.confirmation.description, /最后一面/);
  await f.confirmation.onDelete();
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
  assert.equal(new URLSearchParams(location.search).get("doctype"), "identity");
  assert.equal(new URLSearchParams(location.search).has("item"), false);
});

test("a changed document rejects stale confirmation and preserves current images", async () => {
  const f = await fixture("delete-conflict");
  await domain.updateArchive(f.owner, (state) => {
    state.documents[0].back = image("new-back");
  });
  await f.confirmation.onDelete();
  assert.match(f.updates[1], /证件已变化/);
  const [row] = (await domain.readArchive(f.owner)).documents;
  assert.equal(row.back.id, "new-back");
  assert.equal(row.front.id, "front");
  assert.equal(
    new URLSearchParams(location.search).get("sheet"),
    "delete-document",
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
      doctype: "identity",
      item: f.row.id,
      sheet: "delete-document",
    }),
  );
  const pending = f.confirmation.onDelete();
  history.replaceState({}, "", "/?page=home");
  release();
  await pending;
  assert.equal(location.search, "?page=home");
  assert.equal((await domain.readArchive(f.owner)).documents.length, 0);
});
