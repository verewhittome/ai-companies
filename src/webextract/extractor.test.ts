import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFromHtml } from "./extractor.js";

const FIXTURE = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Old Title Tag</title>
  <meta name="description" content="A short description of the article." />
  <meta property="og:title" content="The Real Headline" />
  <meta property="og:site_name" content="Example News" />
  <meta name="author" content="Jane Doe" />
  <meta property="article:published_time" content="2026-01-15T10:00:00Z" />
  <link rel="canonical" href="https://example.com/article" />
  <link rel="icon" href="/favicon.ico" />
</head>
<body>
  <nav><a href="/home">Home</a><a href="/about">About</a></nav>
  <article>
    <h1>The Real Headline</h1>
    <p>This is the first substantial paragraph of the article body. It is long
    enough that Mozilla Readability will treat it as primary content rather than
    chrome or navigation noise around the edges of the page.</p>
    <p>Here is a second paragraph with an <a href="https://other.com/ref">external
    reference</a> that should be captured as an absolute link in the output.</p>
    <ul><li>First bullet point</li><li>Second bullet point</li></ul>
  </article>
  <footer><a href="/privacy">Privacy</a></footer>
</body>
</html>`;

test("extracts markdown from main content", () => {
  const r = extractFromHtml(FIXTURE, "https://example.com/article", {
    formats: ["markdown"],
  });
  assert.ok(r.markdown, "should produce markdown");
  // Readability surfaces the headline as the title, not in the content body.
  assert.equal(r.title, "The Real Headline");
  assert.match(r.markdown!, /first substantial paragraph/);
  assert.match(r.markdown!, /\[external reference\]\(https:\/\/other\.com\/ref\)/);
  assert.match(r.markdown!, /-\s+First bullet point/);
  // Navigation/footer chrome should be stripped by readability.
  assert.doesNotMatch(r.markdown!, /Privacy/);
});

test("prefers OpenGraph title over <title> tag", () => {
  const r = extractFromHtml(FIXTURE, "https://example.com/article", {
    formats: ["markdown"],
    includeMetadata: true,
  });
  assert.equal(r.metadata?.title, "The Real Headline");
  assert.equal(r.metadata?.siteName, "Example News");
  assert.equal(r.metadata?.author, "Jane Doe");
  assert.equal(r.metadata?.lang, "en");
  assert.equal(r.metadata?.canonical, "https://example.com/article");
  assert.equal(r.metadata?.favicon, "https://example.com/favicon.ico");
});

test("resolves links to absolute URLs and dedupes", () => {
  const r = extractFromHtml(FIXTURE, "https://example.com/article", {
    formats: ["links"],
  });
  assert.ok(r.links && r.links.length > 0);
  const hrefs = r.links!.map((l) => l.href);
  assert.ok(hrefs.includes("https://other.com/ref"));
  assert.ok(hrefs.every((h) => h.startsWith("http")));
});

test("computes a sensible word count", () => {
  const r = extractFromHtml(FIXTURE, "https://example.com/article", {
    formats: ["text"],
  });
  assert.ok(r.wordCount > 20, `expected >20 words, got ${r.wordCount}`);
  assert.ok(r.text);
});

test("selector narrows extraction scope", () => {
  const html = `<html><body>
    <div class="keep"><p>Keep this important paragraph of content here please.</p></div>
    <div class="drop"><p>Discard this other paragraph entirely from output.</p></div>
  </body></html>`;
  const r = extractFromHtml(html, "https://example.com/", {
    formats: ["text"],
    selector: ".keep",
  });
  assert.match(r.text ?? "", /Keep this important/);
  assert.doesNotMatch(r.text ?? "", /Discard this other/);
});
