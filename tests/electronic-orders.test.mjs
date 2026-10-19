// Exercise the actual IndexedDB transaction code using an asynchronous in-memory IDB contract.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
const generate = generateModule.default || generateModule;
function database() {
  const stores = new Map();
  const db = {
    objectStoreNames: { contains: (n) => stores.has(n) },
    createObjectStore(n) {
      stores.set(n, new Map());
    },
    transaction(names, mode) {
      const tx = { pending: 0 };
      const snapshots = new Map(
        (Array.isArray(names) ? names : [names]).map((n) => [
          n,
          new Map(stores.get(n)),
        ]),
      );
      const request = (fn) => {
        const r = {};
        tx.pending++;
        queueMicrotask(() => {
          try {
            r.result = fn();
            r.onsuccess?.();
          } catch (e) {
            r.error = e;
            tx.error = e;
            r.onerror?.();
            tx.onerror?.();
          }
          tx.pending--;
          if (!tx.pending) {
            if (mode === "readwrite" && !tx.error)
              for (const [n, s] of snapshots) stores.set(n, s);
            tx.oncomplete?.();
          }
        });
        return r;
      };
      tx.objectStore = (n) => ({
        get: (id) => request(() => structuredClone(snapshots.get(n).get(id))),
        getAll: () =>
          request(() => structuredClone([...snapshots.get(n).values()])),
        put: (record) =>
          request(() =>
            snapshots.get(n).set(record.id, structuredClone(record)),
          ),
        delete: (id) => request(() => snapshots.get(n).delete(id)),
      });
      return tx;
    },
  };
  return {
    open() {
      const r = { result: db };
      queueMicrotask(() => {
        r.onupgradeneeded?.();
        r.onsuccess?.();
      });
      return r;
    },
    stores,
  };
}
function setup() {
  const idb = database(),
    window = new EventTarget();
  let changes = 0;
  window.addEventListener("zhipai-orders-updated", () => changes++);
  const ast = parse(fs.readFileSync("src/domain/camera.js", "utf8"), {
    sourceType: "module",
  });
  ast.program.body = ast.program.body.filter(
    (n) => !["ImportDeclaration", "ExportNamedDeclaration"].includes(n.type),
  );
  const context = vm.createContext({
    indexedDB: idb,
    storageValue: (v) => v,
    registerController() {},
    registerStore() {},
    window,
    Event,
    Blob,
  });
  vm.runInContext(generate(ast).code, context);
  return {
    context,
    idb,
    get changes() {
      return changes;
    },
  };
}
function session(status = "paid") {
  return {
    id: "session",
    draft: {
      id: "session",
      order: {
        id: "electronic-session",
        owner: "13800008000",
        amount: 980,
        status,
        createdAt: 1,
      },
      outputWidth: 295,
      outputHeight: 413,
    },
    photo: { blob: new Blob(["original"]) },
    output: new Blob(["result"]),
  };
}
test("electronic order persists independently of its draft and subsequent photo save without duplicating receipt", async () => {
  const fixture = setup(),
    c = fixture.context,
    r = session();
  await c.writeCameraSession(r);
  assert.ok(fixture.idb.stores.has("sessions"));
  assert.ok(fixture.idb.stores.has("orders"));
  r.draft.savedId = "made-session";
  await c.writeCameraSession(r);
  let items = await c.readElectronicOrders();
  assert.equal(items.length, 1);
  assert.equal(items[0].savedId, "made-session");
  assert.equal(items[0].amount, 980);
  assert.equal(await items[0].photo.blob.text(), "result");
  await c.deleteCameraSession(r.id);
  assert.equal(await c.readCameraSession(r.id), undefined);
  items = await c.readElectronicOrders();
  assert.equal(items.length, 1);
  assert.equal(items[0].status, "paid");
  assert.equal(items[0].sessionAvailable, false);
  assert.equal(items[0].owner, "13800008000");
  assert.equal(fixture.changes, 3);
});
test("discarding an unpaid draft closes its stable receipt; anonymous legacy drafts are never assigned to an account", async () => {
  const { context: c } = setup();
  const r = session("pending");
  await c.writeCameraSession(r);
  await c.deleteCameraSession(r.id);
  assert.equal((await c.readElectronicOrders())[0].status, "cancelled");
  const old = session();
  old.id = "old";
  delete old.draft.order.owner;
  await c.writeCameraSession(old);
  assert.equal((await c.readElectronicOrders()).length, 1);
});
