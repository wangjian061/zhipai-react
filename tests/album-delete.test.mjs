// Domain navigation/persistence contracts; no browser or automated UI interaction.
import test from "node:test";
import assert from "node:assert/strict";
import { database } from "./helpers/memory-indexeddb.mjs";
import { createDetachedController, getStore, registerStore } from "../src/runtime/state.js";
import { readAlbumState } from "../src/domain/album.js";
import "../src/domain/photo-actions.js";
import { updateArchive, readArchive, deleteFamilyPhoto, newMember, appendFamilyPhotos } from "../src/domain/album-spaces.js";

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
test("personal center delete cancels without writing, retains failure for retry, and updates the same album", async () => {
  const library = await seed(), s = getStore("photoActions");
  Object.assign(s, { deleting: false, working: false, downloading: false, opened: false });
  navigation("/?page=my", () => s.sync());
  s.show(library.finished[0]); s.sync();
  s.requestDelete();
  assert.equal(s.deleting, true);
  s.cancelDelete();
  assert.equal(s.deleting, false);
  assert.equal(s.photoId, "photo");
  assert.equal(library.finished.length, 2);
  s.requestDelete();
  library.commit = async () => { throw Error("storage unavailable"); };
  await s.confirmDelete();
  assert.equal(s.deleting, true);
  assert.match(s.notice, /保留/);
  assert.equal((await readAlbumState()).finished.length, 2);
  library.commit = originalCommit;
  await s.confirmDelete();
  assert.equal(location.search, "?page=my");
  assert.deepEqual(library.finished.map(p => p.id), ["broken"]);
  assert.deepEqual((await readAlbumState()).finished.map(p => p.id), ["broken"]);
  assert.equal(s.working, false);
});
test("unreadable personal photo remains deletable and duplicate confirmations cannot double-write", async () => {
  const library = await seed(), s = getStore("photoActions");
  navigation("/?page=my&photoAction=broken", () => s.sync());
  s.sync();
  assert.equal(s.photo.id, "broken");
  assert.equal(s.photoReadable, false);
  s.requestDelete();
  let release, calls = 0;
  library.commit = async function(next) { calls++; await new Promise(resolve => { release = resolve; }); return originalCommit.call(this, next); };
  const pending = s.confirmDelete();
  await s.confirmDelete();
  assert.equal(calls, 1);
  release(); await pending;
  assert.equal(location.search, "?page=my");
  assert.deepEqual(library.finished.map(p => p.id), ["photo"]);
});
test("album detail delete confirmation returns to detail on back and to its list on success", async () => {
  const library = await seed();
  const s = createDetachedController("albumCenter", { page: "album", $store: { photoLibrary: library },
    $refs: {}, $nextTick: fn => fn?.() });
  navigation("/?page=album", event => s.syncLocation(event));
  const route = () => s.syncLocation();
  window.addEventListener("zhipai-route", route);
  try {
    s.openPhoto("finished", "photo");
    s.deleteCurrent();
    assert.equal(s.modal, "delete");
    history.back();
    assert.equal(s.modal, null);
    assert.equal(s.view, "detail");
    s.deleteCurrent();
    await s.confirmDelete();
    assert.equal(location.search, "?page=album");
    assert.equal(s.view, "library");
    assert.deepEqual(library.finished.map(p => p.id), ["broken"]);
  } finally { window.removeEventListener("zhipai-route", route); }
});
test("album late deletion completion never navigates away from a newer selection", async () => {
  const library = await seed();
  const s = createDetachedController("albumCenter", { page: "album", $store: { photoLibrary: library }, $refs: {}, $nextTick: fn => fn?.() });
  navigation("/?page=album&album=finished&photo=photo", event => s.syncLocation(event));
  s.syncLocation(); s.deleteCurrent();
  let release;
  library.commit = async function(next) { await new Promise(resolve => { release = resolve; }); return originalCommit.call(this, next); };
  const pending = s.confirmDelete();
  history.back();
  release(); await pending;
  assert.equal(location.search, "?page=album&album=finished&photo=photo");
  assert.equal(s.view, "detail");
  assert.equal(s.working, false);
});
test("family deletion retains the member, source photo, other member, and documents, including after transactional failure", async () => {
  await seed();
  registerStore("account", { session: { phone: "family-owner" } });
  const one = newMember("妈妈"), two = newMember("爸爸");
  const p = { id: "copy", sourceId: "photo", blob: new Blob(["copy"]) };
  await updateArchive("family-owner", state => {
    state.members.push(one, two); appendFamilyPhotos(state, one.id, [p]); appendFamilyPhotos(state, two.id, [{...p, id:"other-copy"}]);
    state.documents.push({id:"doc",type:"identity",holderId:one.id,front:p});
  });
  await assert.rejects(updateArchive("family-owner", state => { deleteFamilyPhoto(state, one.id, p.id); throw Error("write failed"); }), /write failed/);
  assert.equal((await readArchive("family-owner")).members[0].photos.length, 1);
  await updateArchive("family-owner", state => deleteFamilyPhoto(state, one.id, p.id));
  const archive = await readArchive("family-owner");
  assert.equal(archive.members.length, 2);
  assert.deepEqual(archive.members.map(m => m.photos.length), [0, 1]);
  assert.equal(archive.documents[0].photos[0].id, "copy");
  assert.equal((await readAlbumState()).finished.length, 2);
  await updateArchive("family-owner", state => deleteFamilyPhoto(state, one.id, p.id));
  getStore("account").session = {phone:"another"};
  await assert.rejects(updateArchive("family-owner", state => deleteFamilyPhoto(state, two.id, "other-copy")), /登录/);
  await tick();
});
