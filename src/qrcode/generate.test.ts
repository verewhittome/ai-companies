import { test } from "node:test";
import assert from "node:assert/strict";
import { qrSvg, qrDataUrl, qrPngBuffer } from "./generate.js";

test("produces an SVG", async () => {
  const svg = await qrSvg("https://toska.ai");
  assert.match(svg, /<svg/);
  assert.match(svg, /<\/svg>/);
});

test("produces a PNG data URL", async () => {
  const url = await qrDataUrl("hello");
  assert.match(url, /^data:image\/png;base64,/);
});

test("produces a PNG buffer with the PNG magic header", async () => {
  const buf = await qrPngBuffer("hello", { size: 128 });
  assert.ok(buf.length > 0);
  // PNG signature: 89 50 4E 47
  assert.equal(buf[0], 0x89);
  assert.equal(buf[1], 0x50);
});
