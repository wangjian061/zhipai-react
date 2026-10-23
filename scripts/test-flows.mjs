// Replay the original domain contracts against migrated ES-module implementations.
// No browser automation or UI interaction is performed.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { parse } from "@babel/parser";
import generateModule from "@babel/generator";
const generate = generateModule.default || generateModule;
const root = process.cwd();
if (!process.argv[2]) {
  for (const file of fs
    .readdirSync("tests/legacy")
    .filter((n) => n.endsWith(".cjs"))) {
    const result = spawnSync(process.execPath, [import.meta.filename, file], {
      cwd: root,
      encoding: "utf8",
    });
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (result.status !== 0) process.exit(result.status || 1);
  }
  process.exit(0);
}
const filename = path.join(root, "tests/legacy", process.argv[2]);
const nativeRequire = createRequire(filename);
const adaptedFs = {
  ...fs,
  readFileSync(file, ...args) {
    const normalized = String(file).replaceAll("\\", "/");
    if (/(?:^|\/)dist\/index\.html$/.test(normalized))
      return fs.readFileSync(
        path.join(root, "tests/fixtures/original-ui.html"),
        ...args,
      );
    const match = normalized.match(/(?:^|\/)dist\/([^/]+)\.js$/);
    if (match) {
      let code = fs.readFileSync(
        path.join(root, "src/domain", match[1] + ".js"),
        "utf8",
      );
      const ast = parse(code, { sourceType: "module" });
      ast.program.body = ast.program.body.flatMap((n) =>
        n.type === "ImportDeclaration"
          ? []
          : n.type === "ExportNamedDeclaration"
            ? n.declaration
              ? [n.declaration]
              : []
            : [n],
      );
      code = generate(ast).code;
      if (["scan", "collection"].includes(match[1])) {
        const contract = parse(
          fs.readFileSync(
            path.join(root, "src/domain/collection-code.js"),
            "utf8",
          ),
          { sourceType: "module" },
        );
        contract.program.body = contract.program.body
          .map((n) => (n.type === "ExportNamedDeclaration" ? n.declaration : n))
          .filter(Boolean);
        const names = [
          "collectionScanService",
          "resolveCollectionCode",
          "collectionCodeError",
          "validateCollectionCodeFile",
        ];
        code =
          "var collectionCodeContract=globalThis.__collectionCodeContract ||= (function(){" +
          generate(contract).code +
          ";return {" +
          names.join(",") +
          "};})();" +
          names
            .map(
              (name) => "var " + name + "=collectionCodeContract." + name + ";",
            )
            .join("") +
          "\n" +
          code;
      }
      if (match[1] === "camera") {
        const versions = parse(
          fs.readFileSync(
            path.join(root, "src/domain/photo-versions.js"),
            "utf8",
          ),
          { sourceType: "module" },
        );
        versions.program.body = versions.program.body
          .map((n) => (n.type === "ExportNamedDeclaration" ? n.declaration : n))
          .filter(Boolean);
        code = generate(versions).code + "\n" + code;
        const catalog = parse(
          fs.readFileSync(
            path.join(root, "src/domain/photo-specifications.js"),
            "utf8",
          ),
          { sourceType: "module" },
        );
        catalog.program.body = catalog.program.body
          .map((n) => (n.type === "ExportNamedDeclaration" ? n.declaration : n))
          .filter(Boolean);
        code = generate(catalog).code + "\n" + code;
        const policy = parse(
          fs.readFileSync(
            path.join(root, "src/domain/camera-detection.js"),
            "utf8",
          ),
          { sourceType: "module" },
        );
        policy.program.body = policy.program.body
          .map((n) => (n.type === "ExportNamedDeclaration" ? n.declaration : n))
          .filter(Boolean);
        code = generate(policy).code + "\n" + code;
      }
      if (match[1] === "collection") {
        for (const dependency of [
          "collection-config.js",
          "collection-status.js",
        ]) {
          const config = parse(
            fs.readFileSync(path.join(root, "src/domain", dependency), "utf8"),
            { sourceType: "module" },
          );
          config.program.body = config.program.body
            .map((n) =>
              n.type === "ExportNamedDeclaration" ? n.declaration : n,
            )
            .filter(Boolean);
          code = generate(config).code + "\n" + code;
        }
      }
      if (match[1] === "my") {
        const poster = parse(
          fs.readFileSync(
            path.join(root, "src/domain/share-poster.js"),
            "utf8",
          ),
          { sourceType: "module" },
        );
        poster.program.body = poster.program.body
          .filter((n) => n.type !== "ImportDeclaration")
          .map((n) =>
            n.type === "ExportNamedDeclaration" ? n.declaration : n,
          );
        code = generate(poster).code + "\n" + code;
      }
      if (
        ["app", "album", "camera", "tools", "print", "collection"].includes(
          match[1],
        )
      ) {
        const routing = parse(
          fs.readFileSync(
            path.join(root, "src/domain/order-routing.js"),
            "utf8",
          ),
          { sourceType: "module" },
        );
        routing.program.body = routing.program.body
          .filter((n) => n.type !== "ImportDeclaration")
          .map((n) => (n.type === "ExportNamedDeclaration" ? n.declaration : n))
          .filter(Boolean);
        code = generate(routing).code + "\n" + code;
      }
      if (["camera", "tools", "print", "collection"].includes(match[1])) {
        const contract = parse(
          fs.readFileSync(
            path.join(root, "src/domain/order-status.js"),
            "utf8",
          ),
          { sourceType: "module" },
        );
        contract.program.body = contract.program.body
          .map((n) => (n.type === "ExportNamedDeclaration" ? n.declaration : n))
          .filter(Boolean);
        // Shared closure, installed once when a legacy harness loads multiple domains.
        const body = generate(contract).code;
        code =
          "var orderStatusContract = globalThis.__orderStatusContract ||= (function(){" +
          body +
          ";return {paymentResult, transactionState, printFulfillment};})();var paymentResult=orderStatusContract.paymentResult,transactionState=orderStatusContract.transactionState,printFulfillment=orderStatusContract.printFulfillment;\n" +
          code;
      }
      const shim =
        "var registerController=(...args)=>Alpine.data(...args),registerStore=(...args)=>Alpine.store(...args),getStore=(...args)=>Alpine.store(...args),storageValue=value=>value;\n";
      // Some original harnesses intentionally suppress framework init. Preserve that boundary.
      const disable = process.argv[2] === "liquid-tabs-flow.cjs";
      if (disable) code = code.replace(/registerController\([\s\S]*$/, "");
      return shim + code;
    }
    return fs.readFileSync(file, ...args);
  },
};
const require = (name) =>
  name === "node:fs" ? adaptedFs : nativeRequire(name);
const module = { exports: {} };
const run = vm.runInThisContext(
  "(function(require,module,exports,__filename,__dirname){" +
    fs.readFileSync(filename, "utf8") +
    "\n})",
  { filename },
);
run(require, module, module.exports, filename, path.dirname(filename));
