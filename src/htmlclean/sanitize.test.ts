import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanHtml } from "./sanitize.js";

test("strips script tags (default)", () => {
  const r = cleanHtml('<p>Hi</p><script>alert(1)</script>');
  assert.doesNotMatch(r.clean, /script/i);
  assert.match(r.clean, /<p>Hi<\/p>/);
  assert.ok(r.removed_chars > 0);
});

test("strict profile removes all tags", () => {
  const r = cleanHtml("<p>Hello <b>world</b></p>", "strict");
  assert.equal(r.clean, "Hello world");
});

test("basic profile keeps whitelisted tags, drops others", () => {
  const r = cleanHtml('<p>ok</p><table><tr><td>x</td></tr></table>', "basic");
  assert.match(r.clean, /<p>ok<\/p>/);
  assert.doesNotMatch(r.clean, /<table>/);
});

test("removes event handler attributes", () => {
  const r = cleanHtml('<a href="https://x.com" onclick="evil()">link</a>');
  assert.doesNotMatch(r.clean, /onclick/i);
  assert.match(r.clean, /href="https:\/\/x.com"/);
});
