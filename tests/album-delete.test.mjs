// Domain navigation/persistence contracts; no browser or automated UI interaction.
import test from "node:test";
import assert from "node:assert/strict";
import { database } from "./helpers/memory-indexeddb.mjs";
import { createDetachedController, getStore, registerStore } from "../src/runtime/state.js";
import { readAlbumState } from "../src/domain/album.js";
import "../src/domain/photo-actions.js";
import { updateArchive, readArchive, deleteFamilyPhotos, newMember, appendFamilyPhotos, archivePath, navigateArchive, backInArchive } from "../src/domain/album-spaces.js";

globalThis.window = new EventTarget();
globalThis.document = { activeElement: null, querySelector: () => null };
globalThis.Image = class { naturalWidth = 295; naturalHeight = 413; async decode() {} };
const tick = () => new Promise(setImmediate);
const originalCommit = getStore("photoLibrary").commit;
function navigation(initial, sync) {
  let index = 0;
  const entries = [{ state: {}, url: new URL(initial, "http://localhost").href }];
  const set = url => { globalThis.location = new URL(url, "http://localhost"); };
  set(entries[0].url);
  globalThis.history = {
    get length() { return entries.length; },
    get state() { return entries[index].state; },
    pushState(state, _, url = location.href) { entries.splice(++index); entries.push({ state, url: new URL(url, location).href }); set(entries[index].url); },
    replaceState(state, _, url = location.href) { entries[index] = { state, url: new URL(url, location).href }; set(entries[index].url); },
    go(delta) { index = Math.max(0, Math.min(entries.length - 1, index + delta)); set(entries[index].url); sync({ type: "popstate" }); },
    back() { this.go(-1); },
  };
}
async function seed() {
  globalThis.indexedDB = database();
  const library = getStore("photoLibrary");
  Object.assign(library, { ready: true, busy: false, finished: [], archivedOriginals: [], commit: originalCommit });
  await library.commit({ finished: [{ id: "photo", blob: new Blob(["portrait"], { type: "image/jpeg" }) }, { id: "broken", blob: null }], archivedOriginals: [] });
  return library;
}
function albumController(library) {
  const s = createDetachedController("albumCenter", {
    page: "album", $store: { photoLibrary: library }, $refs: {}, $nextTick: (fn) => fn?.(),
  });
  navigation("/?page=album", (event) => s.syncLocation(event));
  s.syncLocation();
  s.startManage();
  return s;
}

test("personal album management cancels, retries failed deletes, and only removes checked records", async () => {
  const library = await seed();
  const album = albumController(library);
  const profile = getStore("photoActions");
  navigation("/?page=my&photoAction=photo", () => profile.sync());
  profile.sync();
  album.toggle("photo");
  album.showModal("delete");
  album.closeModal();
  assert.deepEqual(album.selected, ["photo"]);
  assert.equal(library.finished.length, 2);
  album.showModal("delete");
  library.commit = async () => { throw Error("storage unavailable"); };
  await album.confirmDelete();
  assert.match(album.message, /保留/);
  assert.deepEqual(album.selected, ["photo"]);
  assert.equal((await readAlbumState()).finished.length, 2);
  library.commit = originalCommit;
  await album.confirmDelete();
  assert.equal(album.modal, null);
  assert.deepEqual(album.selected, []);
  assert.equal(profile.photo, null);
  assert.deepEqual((await readAlbumState()).finished.map(({ id }) => id), ["broken"]);
});

test("personal management deletes unreadable records and ignores duplicate confirmation", async () => {
  const library = await seed();
  const album = albumController(library);
  album.selectAll();
  assert.equal(album.downloadableSelection, false);
  album.selectAll();
  assert.deepEqual(album.selected, []);
  album.toggle("broken");
  album.toggle("photo");
  album.showModal("delete");

  let release, calls = 0;
  library.commit = async function(next) {
    calls++;
    await new Promise((resolve) => { release = resolve; });
    return originalCommit.call(this, next);
  };
  try {
    const pending = album.confirmDelete();
    await album.confirmDelete();
    assert.equal(calls, 1);
    release();
    await pending;
    assert.equal(album.managing, false);
    assert.equal(album.working, false);
    assert.deepEqual((await readAlbumState()).finished, []);
  } finally {
    library.commit = originalCommit;
  }
});

test("personal deletion requires library management and a confirmation", async () => {
  const library = await seed();
  const album = albumController(library);
  album.toggle("photo");
  await album.confirmDelete();
  album.showModal("delete");
  album.view = "detail";
  await album.confirmDelete();
  assert.equal(library.finished.length, 2);
});

test("family management history returns from confirmation to selection and then to the member", () => {
  const folder = archivePath("family");
  const member = archivePath("family", { member: "member" });
  const manage = archivePath("family", { member: "member", sheet: "manage-photos" });
  const confirm = archivePath("family", { member: "member", sheet: "delete-photos" });
  const path = () => location.pathname + location.search;
  navigation(folder, () => {});
  navigateArchive(member);
  navigateArchive(manage);
  navigateArchive(confirm);
  backInArchive(manage);
  assert.equal(path(), manage);
  navigateArchive(confirm);
  backInArchive(member);
  assert.equal(path(), member);
  backInArchive(folder);
  assert.equal(path(), folder);
});

test("family single and batch delete are atomic and keep the member, source, other albums, and documents", async () => {
  await seed();
  registerStore("account", { session: { phone: "family-owner" } });
  const one = newMember("妈妈"), two = newMember("爸爸");
  const p = { id: "copy", sourceId: "photo", blob: new Blob(["copy"]) };
  const other = { ...p, id: "other-copy" };
  await updateArchive("family-owner", (state) => {
    state.members.push(one, two);
    appendFamilyPhotos(state, one.id, [p, { ...p, id: "copy-2" }, { ...p, id: "copy-3", blob: null }]);
    appendFamilyPhotos(state, two.id, [other]);
    state.documents.push({ id: "doc", type: "identity", holderId: one.id, front: p });
  });
  const ids = async () => (await readArchive("family-owner")).members[0].photos.map(({ id }) => id);
  const remove = (selection) => updateArchive("family-owner", (state) => deleteFamilyPhotos(state, one.id, selection));

  await assert.rejects(updateArchive("family-owner", (state) => {
    deleteFamilyPhotos(state, one.id, ["copy", "copy-2"]);
    throw Error("write failed");
  }), /write failed/);
  await assert.rejects(remove(["copy-2", "other-copy"]), /已变化/);
  assert.deepEqual(await ids(), ["copy", "copy-2", "copy-3"]);
  await remove(["copy"]);
  assert.deepEqual(await ids(), ["copy-2", "copy-3"]);
  await assert.rejects(remove(["copy", "copy-2"]), /已变化/);
  assert.deepEqual(await ids(), ["copy-2", "copy-3"]);

  await remove(await ids());
  const archive = await readArchive("family-owner");
  assert.deepEqual(archive.members.map((m) => [m.id, m.photos.length]), [[one.id, 0], [two.id, 1]]);
  assert.equal(archive.members[1].photos[0].id, other.id);
  assert.equal(archive.documents[0].photos[0].id, "copy");
  assert.ok((await readAlbumState()).finished.some(({ id }) => id === "photo"));

  getStore("account").session = { phone: "other-owner" };
  await assert.rejects(remove(["other-copy"]), /登录/);
  await tick();
});
