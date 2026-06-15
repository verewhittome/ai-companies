import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeEmail, scoreEmail } from "./validator.js";

test("valid gmail: normalizes dots/plus, flags free", () => {
  const a = analyzeEmail("John.Doe+newsletter@Gmail.com");
  assert.equal(a.valid_syntax, true);
  assert.equal(a.normalized, "johndoe@gmail.com");
  assert.equal(a.is_free, true);
  assert.equal(a.is_disposable, false);
  assert.equal(a.domain, "gmail.com");
});

test("invalid syntax is rejected", () => {
  for (const bad of ["not-an-email", "a@b", "x@@y.com", "foo@.com", "@nope.com"]) {
    assert.equal(analyzeEmail(bad).valid_syntax, false, `${bad} should be invalid`);
  }
});

test("role accounts are flagged", () => {
  assert.equal(analyzeEmail("admin@company.com").is_role, true);
  assert.equal(analyzeEmail("support@company.com").is_role, true);
  assert.equal(analyzeEmail("alice@company.com").is_role, false);
});

test("disposable domains are flagged", () => {
  assert.equal(analyzeEmail("throwaway@mailinator.com").is_disposable, true);
  assert.equal(analyzeEmail("temp@yopmail.com").is_disposable, true);
  assert.equal(analyzeEmail("real@company.com").is_disposable, false);
});

test("typo suggestion for near-miss domains", () => {
  assert.equal(analyzeEmail("user@gmial.com").did_you_mean, "gmail.com");
  assert.equal(analyzeEmail("user@hotmial.com").did_you_mean, "hotmail.com");
  assert.equal(analyzeEmail("user@gmail.com").did_you_mean, null);
});

test("score: disposable scores low, clean+MX scores high", () => {
  const disp = analyzeEmail("x@mailinator.com");
  assert.ok(scoreEmail(disp, true) < 0.5);
  const clean = analyzeEmail("alice@company.com");
  assert.ok(scoreEmail(clean, true) >= 0.85);
  const bad = analyzeEmail("garbage");
  assert.equal(scoreEmail(bad, null), 0);
});
