import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProfanity } from "./check.js";

test("clean text is not flagged", () => {
  const r = checkProfanity("This is a perfectly polite sentence about APIs.");
  assert.equal(r.is_profane, false);
  assert.equal(r.count, 0);
  assert.equal(r.severity, "none");
});

test("detects and censors a profane word", () => {
  const r = checkProfanity("this is a damn good API");
  assert.equal(r.is_profane, true);
  assert.ok(r.matches.includes("damn"));
  assert.match(r.censored, /this is a \*{4} good API/);
});

test("catches leetspeak obfuscation", () => {
  const r = checkProfanity("what the sh1t");
  assert.equal(r.is_profane, true);
});

test("avoids substring false positives (Scunthorpe)", () => {
  const r = checkProfanity("I live in Scunthorpe and use class assignments.");
  assert.equal(r.is_profane, false);
});

test("severity scales with count", () => {
  assert.equal(checkProfanity("damn").severity, "low");
  assert.equal(checkProfanity("damn crap").severity, "medium");
});
