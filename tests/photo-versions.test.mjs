import test from "node:test";
import assert from "node:assert/strict";
import {
  PHOTO_VERSIONS,
  photoVersion,
  versionPrice,
  versionIsProtected,
  makePhotoVersions,
} from "../src/domain/photo-versions.js";

test("ordinary and retouched are distinct purchasable identities with integer prices", () => {
  assert.deepEqual(
    PHOTO_VERSIONS.map((v) => [v.id, v.amount]),
    [
      ["ordinary", 198],
      ["retouched", 980],
    ],
  );
  assert.equal(versionPrice("ordinary"), "1.98");
  assert.equal(versionPrice("retouched"), "9.80");
  assert.equal(photoVersion("premium"), null);
});

test("both outputs use the exact same source, dimensions, background and placement snapshot", async () => {
  const source = new Blob(["source"]),
    calls = [];
  const settings = Object.freeze({
    outputWidth: 295,
    outputHeight: 413,
    background: "#ffffff",
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const versions = await makePhotoVersions(
    source,
    settings,
    async (blob, config) => {
      calls.push({ blob, config });
      return new Blob([config.finish]);
    },
  );
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.blob, source);
    const { finish, ...rest } = call.config;
    assert.deepEqual(rest, settings);
  }
  assert.equal(await versions.ordinary.blob.text(), "ordinary");
  assert.equal(await versions.retouched.blob.text(), "retouched");
  assert.equal(settings.finish, undefined);
});

test("each partial-success demo produces only its successful output and a retryable reason", async () => {
  for (const [outcome, ready, failed] of [
    ["ordinary_only", "ordinary", "retouched"],
    ["retouched_only", "retouched", "ordinary"],
  ]) {
    const rendered = [];
    const result = await makePhotoVersions(
      new Blob(["source"]),
      { outputWidth: 295, outputHeight: 413 },
      async (_, s) => {
        rendered.push(s.finish);
        return new Blob([s.finish]);
      },
      outcome,
    );
    assert.deepEqual(rendered, [ready]);
    assert.equal(result[ready].status, "ready");
    assert.equal(result[failed].status, "failed");
    assert.equal(result[failed].blob, null);
    assert.match(result[failed].reason, /重试/);
  }
});

test("one render failure does not discard the other result or create an empty payable result", async () => {
  const result = await makePhotoVersions(
    new Blob(["source"]),
    {},
    async (_, config) => {
      if (config.finish === "retouched") throw Error("service");
      return new Blob(["ordinary"]);
    },
  );
  assert.equal(result.ordinary.status, "ready");
  assert.equal(result.retouched.status, "failed");
  const empty = await makePhotoVersions(
    new Blob(["source"]),
    {},
    async () => new Blob([]),
  );
  assert.ok(
    Object.values(empty).every((v) => v.status === "failed" && !v.blob),
  );
});

test("querying, paid and saved sessions protect the purchase while pending cancellation remains selectable", () => {
  assert.equal(versionIsProtected({ order: { status: "pending" } }), false);
  for (const status of ["verifying", "paid"])
    assert.equal(versionIsProtected({ order: { status } }), true);
  assert.equal(versionIsProtected({ savedId: "saved" }), true);
});
