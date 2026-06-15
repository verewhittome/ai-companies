import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPreviewFromHtml } from "./preview.js";

const HTML = `<!DOCTYPE html><html lang="en"><head>
<title>Fallback Title</title>
<meta name="description" content="A page description."/>
<meta property="og:title" content="OG Title"/>
<meta property="og:image" content="/img/card.png"/>
<meta property="og:site_name" content="ExampleSite"/>
<meta property="og:type" content="article"/>
<meta name="theme-color" content="#ff0000"/>
<link rel="icon" href="/favicon.ico"/>
</head><body><h1>Hi</h1></body></html>`;

test("builds an unfurl card with absolute image/favicon", () => {
  const p = extractPreviewFromHtml(HTML, "https://example.com/post");
  assert.equal(p.title, "OG Title");
  assert.equal(p.description, "A page description.");
  assert.equal(p.image, "https://example.com/img/card.png");
  assert.equal(p.favicon, "https://example.com/favicon.ico");
  assert.equal(p.siteName, "ExampleSite");
  assert.equal(p.type, "article");
  assert.equal(p.themeColor, "#ff0000");
  assert.equal(p.locale, "en");
});

test("falls back to <title> when no og:title", () => {
  const p = extractPreviewFromHtml(`<html><head><title>Only Title</title></head><body></body></html>`, "https://x.com");
  assert.equal(p.title, "Only Title");
});
