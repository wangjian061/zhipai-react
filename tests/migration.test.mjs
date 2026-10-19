// The collection zone was intentionally redesigned on 2026-10-14.
// Homepage now has one approved container and revised search copy.
// Native device preview replaces two outer Views and adds one inner viewport View.
// Keep migration equivalence checks for all remaining markup, copy and existing assets.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { parseDocument } from "htmlparser2";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
const traverse = traverseModule.default || traverseModule;
const manifest = JSON.parse(fs.readFileSync("migration-manifest.json", "utf8"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const list = (folder) =>
  fs
    .readdirSync(folder, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? list(path.join(folder, e.name))
        : [path.join(folder, e.name)],
    );
test("all original images and unaffected styles remain byte-for-byte unchanged", () => {
  for (const { file, sha256 } of manifest.styles.filter(
    (s) => !["collection.css", "styles.css"].includes(s.file),
  ))
    assert.equal(hash(fs.readFileSync("src/styles/" + file)), sha256, file);
  // Only these homepage surface rules changed; shared search, navigation and tool styles stay protected.
  const homeRules = [
    ".home-page",
    ".home-page .hero",
    ".home-search",
    ".home-content",
    ".home-search-entry",
    ".home-search-placeholder",
    ".home-search-label",
    ".home-page .home-main-card",
    ".home-page .home-search",
    ".home-page .search-form",
    ".home-page .home-content",
    ".home-page .home-search-entry>svg",
  ];
  const unaffected = (css) => {
    for (const selector of homeRules) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      css = css.replace(new RegExp(escaped + "\\{[^}]*\\}", "g"), "");
    }
    return css.replace(/\s/g, "");
  };
  assert.equal(
    unaffected(fs.readFileSync("src/styles/styles.css", "utf8")),
    unaffected(fs.readFileSync(manifest.source + "/dist/styles.css", "utf8")),
    "unaffected shared styles",
  );
  for (const { file, sha256 } of manifest.assets)
    assert.equal(hash(fs.readFileSync("public/assets/" + file)), sha256, file);
});
test("original project HTML remains unchanged by migration", () =>
  assert.equal(
    hash(fs.readFileSync(manifest.source + "/dist/index.html")),
    manifest.sourceHtmlHash,
  ));
test("every unaffected original DOM element, visible copy and binding is represented in React source", () => {
  const originalText = [];
  const migratedText = [];
  const counts = {
    elements: 0,
    events: 0,
    models: 0,
    loops: 0,
    show: 0,
    html: 0,
  };
  const walk = (node) => {
    if (node.attribs?.id === "collection-page") return;
    if (node.type === "text" && node.data.trim()) originalText.push(node.data);
    if (
      ["tag", "script", "style"].includes(node.type) &&
      node.name !== "template"
    ) {
      counts.elements++;
      for (const key of Object.keys(node.attribs || {})) {
        if (key.startsWith("@")) counts.events++;
        if (key.startsWith("x-model")) counts.models++;
        if (key === "x-show") counts.show++;
        if (key === "x-html") counts.html++;
      }
    }
    if (node.attribs?.["x-for"]) counts.loops++;
    for (const child of node.children || []) walk(child);
  };
  const original = parseDocument(
    fs.readFileSync("tests/fixtures/original-ui.html", "utf8"),
    { lowerCaseAttributeNames: false, recognizeSelfClosing: true },
  );
  const body = original.children
    .find((n) => n.name === "html")
    .children.find((n) => n.name === "body");
  walk(body);
  counts.elements--; // React root is inside the document body.
  counts.elements++; // Approved home-main-card wrapper, all existing children retained.
  counts.elements -= 1; // Two outer wrappers now native DevicePreview markup; one inner viewport View added.
  counts.elements += 2; // Approved shared notification symbol and its path.
  counts.elements -= 1; // Approved collection promo image is now native markup with live title/subtitle.
  const oldSearchCopy = originalText.indexOf("搜索证照规格、照片工具");
  assert.ok(oldSearchCopy >= 0);
  originalText[oldSearchCopy] = "请输入搜索内容";
  const actual = {
    elements: 0,
    events: 0,
    models: 0,
    loops: 0,
    show: 0,
    html: 0,
  };
  for (const file of list("src").filter(
    (f) =>
      f.endsWith(".jsx") &&
      !f.includes("/runtime/") &&
      !f.endsWith("main.jsx") &&
      !/\/(CollectionPage|CollectionHome|CollectionServices|CollectionNavigation)\.jsx$/.test(
        f,
      ),
  )) {
    const ast = parse(fs.readFileSync(file, "utf8"), {
      sourceType: "module",
      plugins: ["jsx"],
    });
    traverse(ast, {
      JSXExpressionContainer(p) {
        if (p.node.expression.type === "StringLiteral")
          migratedText.push(p.node.expression.value);
      },
      JSXOpeningElement(p) {
        const n = p.node.name.name;
        if (n === "Repeat") actual.loops++;
        if (n !== "View") return;
        actual.elements++;
        for (const a of p.node.attributes) {
          const key = a.name?.name;
          if (key === "events")
            actual.events += a.value.expression.elements.length;
          if (key === "model") actual.models++;
          if (key === "show") actual.show++;
          if (key === "html") actual.html++;
        }
      },
    });
  }
  assert.deepEqual(actual, counts);
  assert.deepEqual(migratedText.sort(), originalText.sort());
  const collection = fs.readFileSync(
    "src/components/CollectionCarousel.jsx",
    "utf8",
  );
  assert.ok(collection.includes("graduation-banner carousel"));
  assert.ok(!collection.includes('className="hero carousel"'));
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
