// Keep the migration inputs and retained bitmaps verifiable; the approved React UI evolves independently.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { parseDocument } from "htmlparser2";
const manifest = JSON.parse(fs.readFileSync("migration-manifest.json", "utf8"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const list = (folder) =>
  fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? list(path.join(folder, entry.name)) : [path.join(folder, entry.name)],
  );

test("original migration fixture and retained bitmap assets still match the migration manifest", () => {
  assert.equal(hash(fs.readFileSync("tests/fixtures/original-ui.html")), manifest.sourceHtmlHash);
  for (const { file, sha256 } of manifest.assets)
    assert.equal(hash(fs.readFileSync("public/assets/" + file)), sha256, file);
});

test("the migration's source project remains unchanged when it is available beside the prototype", () => {
  const source = path.join(manifest.source, "dist");
  if (!fs.existsSync(source)) return; // A standalone Git checkout has the committed fixture instead.
  assert.equal(hash(fs.readFileSync(path.join(source, "index.html"))), manifest.sourceHtmlHash);
  for (const { file, sha256 } of manifest.styles)
    assert.equal(hash(fs.readFileSync(path.join(source, file))), sha256, file);
});

test("the production entry mounts one React root and never loads the historical fixture", () => {
  const html = parseDocument(fs.readFileSync("index.html", "utf8"));
  const elements = [];
  const walk = (node) => { if (node.name) elements.push(node); for (const child of node.children || []) walk(child); };
  walk(html);
  assert.equal(elements.filter((n) => n.attribs?.id === "root").length, 1);
  const moduleScripts = elements.filter((n) => n.name === "script" && n.attribs?.type === "module");
  assert.deepEqual(moduleScripts.map(n => n.attribs.src), ["/src/main.jsx"]);
  assert.match(fs.readFileSync("src/main.jsx", "utf8"), /createRoot\(document\.getElementById\("root"\)\)/);
});
test("the new application has no Alpine dependency, hosting manifest or executable HTML directives", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.ok(pkg.dependencies.react);
  assert.ok(pkg.dependencies["react-dom"]);
  assert.ok(!pkg.dependencies.alpinejs);
  assert.equal(fs.existsSync(".openai/hosting.json"), false);
  for (const file of list("src").filter((f) => /\.(js|jsx)$/.test(f))) {
    const text = fs.readFileSync(file, "utf8");
    assert.ok(
      !/Alpine\.|alpine:init|x-data=|x-show=|x-model=/.test(text),
      file,
    );
  }
});
