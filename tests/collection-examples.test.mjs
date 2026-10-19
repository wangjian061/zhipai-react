import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCollectionExamples,
  importCollectionExamples,
} from "../src/domain/collection-examples.js";
import { collectionStatusKey } from "../src/domain/collection-status.js";

const photo = {
  blob: new Blob(["example"], { type: "image/png" }),
  width: 480,
  height: 603,
};
const owner = "13800008000";

test("examples cover nine presentations, retain backend codes and expose complete student data", () => {
  const records = buildCollectionExamples([], owner, photo, 1000000);
  assert.equal(records.length, 10);
  assert.equal(
    new Set(records.map((r) => collectionStatusKey(r.status))).size,
    9,
  );
  assert.ok(records.some((r) => r.status === 25));
  assert.ok(records.some((r) => r.status === 26));
  assert.equal(records[0].photo, null);
  assert.equal(new Set(records.map((r) => r.number)).size, 10);
  for (const record of records) {
    assert.equal(record.owner, owner);
    assert.equal(record.method, "student");
    assert.equal(record.fixture, false);
    assert.ok(
      record.name && record.number && record.customer && record.projectId,
    );
    assert.equal(record.reviewDueAt, undefined);
    if (record.status !== "pending")
      assert.equal(record.photo.blob, photo.blob);
    if ([23, 40, "upload_failed"].includes(record.status))
      assert.ok(record.reason);
    if (["uploaded", "upload_failed"].includes(record.status))
      assert.equal(record.projectId, "graduate");
  }
});

test("repeat import retains edited examples, original records and account isolation", async () => {
  const original = { id: "original", owner, status: "draft" };
  const other = { id: "other", owner: "13900008000", status: "complete" };
  const store = {
    items: [original, other],
    ready: true,
    busy: false,
    async commit(items) {
      this.items = items;
    },
  };
  let loads = 0;
  const options = {
    store,
    owner,
    isCurrent: () => true,
    loadPhoto: async () => {
      loads++;
      return photo;
    },
  };
  assert.equal(await importCollectionExamples(options), 10);
  const example = store.items[0];
  example.status = "draft";
  example.reason = "edited";
  assert.equal(await importCollectionExamples(options), 0);
  assert.equal(loads, 1);
  assert.equal(store.items.length, 12);
  assert.equal(
    store.items.find((r) => r.id === example.id),
    example,
  );
  assert.equal(
    store.items.find((r) => r.id === "original"),
    original,
  );
  assert.equal(
    store.items.find((r) => r.id === "other"),
    other,
  );
  assert.equal(
    await importCollectionExamples({ ...options, owner: "13900008000" }),
    0,
  );
  assert.deepEqual(buildCollectionExamples(store.items, "", photo), []);
});

test("concurrent imports commit once and preserve writes made during asset loading", async () => {
  let release,
    commits = 0;
  const store = {
    ready: true,
    busy: false,
    items: [],
    async commit(items) {
      commits++;
      this.items = items;
    },
  };
  const options = {
    store,
    owner,
    isCurrent: () => true,
    loadPhoto: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  };
  const first = importCollectionExamples(options);
  const second = importCollectionExamples(options);
  const intervening = { id: "new-photo", owner, status: 24 };
  store.items.push(intervening);
  release(photo);
  await Promise.all([first, second]);
  assert.equal(commits, 1);
  assert.equal(store.items.length, 11);
  assert.equal(store.items.at(-1), intervening);
});

test("account changes and unavailable photos do not commit partial records", async () => {
  let current = true;
  const store = {
    ready: true,
    busy: false,
    items: [],
    async commit() {
      assert.fail("must not write");
    },
  };
  const options = {
    store,
    owner,
    isCurrent: () => current,
    loadPhoto: async () => {
      current = false;
      return photo;
    },
  };
  assert.equal(await importCollectionExamples(options), 0);
  current = true;
  await assert.rejects(
    importCollectionExamples({
      ...options,
      loadPhoto: async () => {
        throw Error("offline");
      },
    }),
    /offline/,
  );
  assert.equal(store.items.length, 0);
});
