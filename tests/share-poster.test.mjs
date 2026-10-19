import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { PNG } from "pngjs";
import { Resvg } from "@resvg/resvg-js";
import { createSharePoster } from "../src/domain/share-poster.js";
const sandbox = { exports: {}, module: { exports: {} } };
vm.runInNewContext(fs.readFileSync("public/vendor/jsQR.js", "utf8"), sandbox);
const decode = sandbox.module.exports;
function asset(name, type) {
  return (
    `data:image/${type};base64,` +
    fs.readFileSync("public/assets/" + name).toString("base64")
  );
}
const assets = {
  art: asset("share-photo-glass.png", "png"),
  logo: asset("share-brand-logo.png", "png"),
  qr: asset("share-zhipai-qr.png", "png"),
};
test("supplied QR stays unchanged and scans inside the exported full poster", () => {
  const qr = PNG.sync.read(
    fs.readFileSync("public/assets/share-zhipai-qr.png"),
  );
  const url = "https://www.zhipai.com.cn/h5/index.html";
  assert.equal(
    decode(new Uint8ClampedArray(qr.data), qr.width, qr.height)?.data,
    url,
  );
  const markup = createSharePoster(null, assets);
  assert.ok(markup.includes(assets.qr));
  assert.ok(markup.includes(assets.logo));
  const png = new Resvg(markup, {
    fitTo: { mode: "width", value: 1280 },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  const raster = PNG.sync.read(png);
  assert.equal(raster.width, 1280);
  assert.equal(raster.height, 1760);
  assert.equal(
    decode(new Uint8ClampedArray(raster.data), raster.width, raster.height)
      ?.data,
    url,
  );
});
