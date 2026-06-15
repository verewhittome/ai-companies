import { test } from "node:test";
import assert from "node:assert/strict";
import { detectLanguage } from "./detect.js";

test("detects English", () => {
  const r = detectLanguage("The quick brown fox jumps over the lazy dog every morning.");
  assert.equal(r.iso639_3, "eng");
  assert.equal(r.iso639_1, "en");
  assert.equal(r.reliable, true);
});

test("detects French", () => {
  const r = detectLanguage("Bonjour tout le monde, comment allez-vous aujourd'hui ?");
  assert.equal(r.iso639_3, "fra");
  assert.equal(r.language, "French");
});

test("returns candidates ranked", () => {
  const r = detectLanguage("Hola, ¿cómo estás? Espero que todo vaya muy bien contigo.");
  assert.ok(r.candidates.length > 0);
  assert.equal(r.candidates[0].iso639_3, "spa");
});
