import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzePhone } from "./validator.js";

test("valid US mobile in E.164", () => {
  const r = analyzePhone("+14155552671");
  assert.equal(r.valid, true);
  assert.equal(r.country, "US");
  assert.equal(r.country_calling_code, "+1");
  assert.equal(r.e164, "+14155552671");
  assert.match(r.international ?? "", /\+1 415/);
});

test("parses a national number with country hint", () => {
  const r = analyzePhone("020 7946 0958", "GB");
  assert.equal(r.valid, true);
  assert.equal(r.country, "GB");
  assert.equal(r.e164, "+442079460958");
});

test("invalid number is rejected", () => {
  const r = analyzePhone("12345");
  assert.equal(r.valid, false);
});

test("garbage input does not throw", () => {
  const r = analyzePhone("not a phone");
  assert.equal(r.valid, false);
  assert.equal(r.e164, null);
});

test("detects line type", () => {
  const r = analyzePhone("+14155552671");
  assert.ok(r.type !== null);
  assert.equal(typeof r.is_mobile, "boolean");
});
