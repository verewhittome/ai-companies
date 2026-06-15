import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUA } from "./parse.js";

test("parses an iPhone Safari UA as mobile", () => {
  const r = parseUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
  assert.equal(r.os.name, "iOS");
  assert.equal(r.is_mobile, true);
  assert.equal(r.is_bot, false);
  assert.ok(r.browser.name);
});

test("parses desktop Chrome", () => {
  const r = parseUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36");
  assert.equal(r.browser.name, "Chrome");
  assert.equal(r.os.name, "Windows");
  assert.equal(r.is_mobile, false);
});

test("flags bots", () => {
  assert.equal(parseUA("Googlebot/2.1 (+http://www.google.com/bot.html)").is_bot, true);
  assert.equal(parseUA("python-requests/2.31").is_bot, true);
});
