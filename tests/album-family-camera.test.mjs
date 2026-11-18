import assert from "node:assert/strict";
import test from "node:test";
import "../src/domain/camera.js";
import {
  archivePath,
  navigateArchive,
  newMember,
  openFamilyAlbumCamera,
  readArchive,
  updateArchive,
} from "../src/domain/album-spaces.js";
import { createController, registerStore } from "../src/runtime/state.js";
import { database } from "./helpers/memory-indexeddb.mjs";

globalThis.indexedDB = database();

async function fixture(t, owner) {
  globalThis.window = new EventTarget();
  const blob = new Blob(["photo data"], { type: "image/jpeg" });
  const draw = [];
  globalThis.document = Object.assign(new EventTarget(), {
    hidden: true,
    createElement(tag) {
      assert.equal(tag, "canvas");
      return {
        getContext: () => ({ drawImage: (...args) => draw.push(args) }),
        toBlob: (done) => done(blob),
      };
    },
  });
  globalThis.Image = class {
    naturalWidth = 480;
    naturalHeight = 640;
    async decode() {}
  };
  registerStore("account", { session: { phone: owner } });
  const member = newMember("妈妈"),
    other = newMember("爸爸");
  await updateArchive(owner, (state) => state.members.push(member, other));
  const list = archivePath("family", { member: member.id });
  const entries = [{ state: {}, url: new URL(list, "http://localhost") }];
  let cursor = 0;
  let detectorCalls = 0;
  globalThis.location = entries[cursor].url;
  function update(state, url) {
    globalThis.location = new URL(url, location);
    entries[cursor] = { state, url: location };
  }
  function go(offset) {
    cursor += offset;
    globalThis.location = entries[cursor].url;
    window.dispatchEvent(new Event("popstate"));
  }
  globalThis.history = {
    get length() {
      return entries.length;
    },
    get state() {
      return entries[cursor].state;
    },
    pushState(state, _, url) {
      entries.splice(++cursor);
      update(state, url);
    },
    replaceState(state, _, url) {
      update(state, url);
    },
    go,
    back: () => go(-1),
    forward: () => go(1),
  };
  globalThis.FaceDetector = window.FaceDetector = class {
    constructor() {
      detectorCalls++;
      throw Error("No face detection is available for the prototype.");
    }
  };
  const camera = createController("cameraStudio");
  camera.refs.liveVideo = { videoWidth: 480, videoHeight: 640 };
  camera.start();
  t.after(() => camera.stop());
  const path = () => location.pathname + location.search;
  const open = () => {
    assert.equal(path(), list);
    navigateArchive(
      archivePath("family", { member: member.id, sheet: "photos" }),
    );
    openFamilyAlbumCamera(owner, member.id);
    assert.equal(path(), "/?page=camera&camera=capture");
    assert.equal(camera.scope.familyCamera, true);
    assert.equal(camera.scope.collectionCapture, false);
  };
  const shoot = () => {
    camera.scope.cameraReady = true;
    return camera.scope.capture();
  };
  return {
    camera,
    draw,
    owner,
    list,
    path,
    open,
    shoot,
    detectorCalls: () => detectorCalls,
    archive: () => readArchive(owner),
  };
}

test("the existing shutter stays on one history entry and saves only to the requesting member without depending on face detection", async (t) => {
  const f = await fixture(t, "family-capture");
  const s = f.camera.scope;
  f.open();
  await f.shoot();
  assert.equal(f.path(), "/?page=camera&camera=confirm");
  assert.equal(f.draw[0][0], f.camera.refs.liveVideo);
  assert.equal(s.draft, null);
  assert.equal(s.canSaveFamilyPhoto, true);
  assert.equal(f.detectorCalls(), 0);
  assert.equal((await f.archive()).members[0].photos.length, 0);

  s.retakeFamilyPhoto();
  assert.equal(f.path(), "/?page=camera&camera=capture");
  await f.shoot();
  assert.equal(history.length, 2);
  assert.equal(s.canSaveFamilyPhoto, true);
  await Promise.all([s.saveFamilyPhoto(), s.saveFamilyPhoto()]);
  assert.equal(f.path(), f.list);
  assert.equal(s.familyCamera, false);
  const { members, documents } = await f.archive();
  assert.equal(documents.length, 0);
  assert.equal(members[0].photos.length, 1);
  assert.ok(members[0].photos[0].addedAt > 0);
  assert.equal(await members[0].photos[0].blob.text(), "photo data");
  assert.equal(members[1].photos.length, 0);
});

test("browser back discards the unconfirmed photo, and Forward never opens a personal editing session", async (t) => {
  const f = await fixture(t, "family-cancel");
  const s = f.camera.scope;
  f.open();
  await f.shoot();
  assert.equal(s.canSaveFamilyPhoto, true);
  history.back();
  assert.equal(s.sourcePhoto, null);
  assert.equal(s.canSaveFamilyPhoto, false);
  history.forward();
  assert.equal(f.path(), f.list);
  assert.equal(s.familyCamera, false);
  assert.equal((await f.archive()).members[0].photos.length, 0);

  f.open();
  s.back();
  assert.equal(f.path(), f.list);
  assert.equal(s.familyCamera, false);
});

test("the camera's album shortcut can confirm a photo without a face detector", async (t) => {
  const f = await fixture(t, "family-camera-picker");
  const s = f.camera.scope;
  f.open();
  f.camera.refs.sourceInput = { click() {} };
  s.openPicker();
  const phone = new File(["selected photo"], "member.jpg", {
    type: "image/jpeg",
  });
  await s.phoneSelected({ target: { files: [phone], value: "member.jpg" } });
  assert.equal(f.path(), "/?page=camera&camera=confirm");
  assert.equal(f.detectorCalls(), 0);
  assert.equal(s.canSaveFamilyPhoto, true);
  assert.equal(s.draft, null);
  await s.saveFamilyPhoto();
  assert.equal(f.path(), f.list);
  const [photo] = (await f.archive()).members[0].photos;
  assert.equal(await photo.blob.text(), "selected photo");
});
