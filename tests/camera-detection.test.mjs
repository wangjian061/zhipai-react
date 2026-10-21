import test from "node:test";
import assert from "node:assert/strict";
import {
  CAMERA_DETECTION_CONFIG,
  cameraDetectionItems,
  cameraDetectionSignature,
  evaluateCameraDetection,
  cameraReturnPath,
} from "../src/domain/camera-detection.js";

test("configured checks distinguish content rejection from service failure", () => {
  assert.equal(
    evaluateCameraDetection(CAMERA_DETECTION_CONFIG).status,
    "passed",
  );
  for (const scenario of ["animal", "multiple", "no_person"]) {
    const result = evaluateCameraDetection(CAMERA_DETECTION_CONFIG, scenario);
    assert.equal(result.status, "failed");
    assert.ok(result.checks.some((item) => item.status === "failed"));
    assert.deepEqual(result.reasons, []);
  }
  const error = evaluateCameraDetection(CAMERA_DETECTION_CONFIG, "error");
  assert.equal(error.status, "error");
  assert.ok(error.checks.every((item) => item.status === "unknown"));
  assert.ok(!error.reasons[0].includes("人像不合格"));
});
test("only enabled rules block; missing, unknown and empty policies never pass", () => {
  const policy = {
    version: "two",
    checks: CAMERA_DETECTION_CONFIG.checks.map((item) => ({
      ...item,
      enabled: item.id !== "single_person",
    })),
  };
  assert.equal(cameraDetectionItems(policy).length, 2);
  assert.equal(evaluateCameraDetection(policy, "multiple").status, "passed");
  assert.equal(evaluateCameraDetection(policy, "animal").status, "failed");
  const labeled = {
    version: "renamed",
    checks: [{ id: "person", label: "后台配置的检查名称", enabled: true }],
  };
  const rejected = evaluateCameraDetection(labeled, "no_person");
  assert.deepEqual(rejected.checks, [
    { id: "person", label: "后台配置的检查名称", status: "failed" },
  ]);
  assert.deepEqual(rejected.reasons, []);
  assert.notEqual(
    cameraDetectionSignature(policy),
    cameraDetectionSignature(CAMERA_DETECTION_CONFIG),
  );
  for (const bad of [
    null,
    {},
    { version: "x", checks: [] },
    { version: "x", checks: [{ id: "unknown", enabled: true }] },
  ])
    assert.equal(evaluateCameraDetection(bad).status, "error");
});
test("entry return targets cannot resolve to an external site or the camera journey itself", () => {
  const origin = "http://127.0.0.1:4180";
  assert.equal(cameraReturnPath("/?page=album", null, origin), "/?page=album");
  assert.equal(
    cameraReturnPath(
      "/?page=camera&camera=confirm",
      "/?page=tool&tool=repair",
      origin,
    ),
    "/?page=tool&tool=repair",
  );
  assert.equal(
    cameraReturnPath("https://other.example", "/?page=camera", origin),
    "/?page=home",
  );
});
