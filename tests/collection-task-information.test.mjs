import test from "node:test";
import assert from "node:assert/strict";
import { buildCollectionTaskInformation } from "../src/domain/collection-task-information.js";

const project = { name: "2026级新生入学照片采集", organization: "示例学院" };
const record = {
  customer: "202610150001",
  name: "张同学",
  number: "2026010236",
  lastFour: "3101",
};

test("roster identifiers and document suffixes remain separate in the continuous information list", () => {
  for (const [method, label] of [
    ["student", "学号"],
    ["qr", "学号"],
    ["employee", "工号"],
  ]) {
    const rows = buildCollectionTaskInformation({ ...record, method }, project);
    assert.deepEqual(
      rows.map(({ label }) => label),
      ["客服号", "姓名", "证件号后四位", label, "项目名称", "所属机构"],
    );
    assert.equal(rows[2].value, "3101");
    assert.equal(rows[3].value, "2026010236");
    assert.equal(rows.filter(({ label }) => label === "姓名").length, 1);
  }
});

test("document and passport records preserve their existing values without repeating suffixes", () => {
  for (const method of ["id", "document", "passport"]) {
    const number = method === "passport" ? "E12****78" : "110***********3101";
    const rows = buildCollectionTaskInformation(
      { ...record, method, number },
      project,
    );
    assert.equal(rows.length, 5);
    assert.equal(rows[2].label, method === "passport" ? "护照号" : "证件号");
    assert.equal(rows[2].value, number);
    assert.ok(
      !rows.some(
        ({ label }) => label === "证件号后四位" || label === "认证编号",
      ),
    );
  }
});

test("missing and legacy identifiers are named honestly without inferring document numbers", () => {
  const legacy = buildCollectionTaskInformation(
    { method: "constructor", number: "legacy-123" },
    {},
  );
  assert.equal(legacy.find(({ key }) => key === "document").value, "未提供");
  assert.deepEqual(
    legacy.find(({ key }) => key === "authentication"),
    { key: "authentication", label: "认证编号", value: "legacy-123" },
  );
  const missing = buildCollectionTaskInformation({}, null);
  assert.equal(missing.length, 5);
  assert.equal(missing[0].value, "未生成");
  assert.ok(missing.slice(1).every(({ value }) => value === "未提供"));
  const suffixOnly = buildCollectionTaskInformation(
    { method: "id", lastFour: "0000" },
    project,
  );
  assert.equal(suffixOnly[2].label, "证件号后四位");
  assert.equal(suffixOnly[2].value, "0000");
});

test("long content remains complete and displaying a legacy record never changes its stored data", () => {
  const old = Object.freeze({
    ...record,
    method: "student",
    supplement: Object.freeze({ referrer: "历史信息", age: "18" }),
  });
  const longProject = Object.freeze({
    name: "项目名称".repeat(30),
    organization: "机构名称".repeat(30),
  });
  const before = JSON.stringify(old);
  const rows = buildCollectionTaskInformation(old, longProject);
  assert.equal(rows[4].value, longProject.name);
  assert.equal(rows[5].value, longProject.organization);
  assert.equal(JSON.stringify(old), before);
  assert.ok(
    !rows.some(({ label }) => ["推荐人", "年龄", "补充信息"].includes(label)),
  );
});
