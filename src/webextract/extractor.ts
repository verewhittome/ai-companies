import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { fetchDocument } from "./fetcher.js";
import type {
  ExtractMetadata,
  ExtractRequest,
  ExtractResult,
  Format,
  LinkRef,
} from "./types.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
// Drop noise that survives readability and adds tokens without meaning.
turndown.remove(["script", "style", "noscript", "iframe", "form"]);

function absolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function readMeta(doc: Document, names: string[]): string | null {
  for (const name of names) {
    const el =
      doc.querySelector(`meta[property="${name}"]`) ??
      doc.querySelector(`meta[name="${name}"]`);
    const content = el?.getAttribute("content");
    if (content && content.trim()) return content.trim();
  }
  return null;
}

function extractMetadata(doc: Document, baseUrl: string): ExtractMetadata {
  const canonicalHref = doc
    .querySelector('link[rel="canonical"]')
    ?.getAttribute("href");
  const faviconHref =
    doc.querySelector('link[rel="icon"]')?.getAttribute("href") ??
    doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ??
    "/favicon.ico";
  const imageHref = readMeta(doc, ["og:image", "twitter:image"]);

  return {
    title:
      readMeta(doc, ["og:title", "twitter:title"]) ??
      (doc.querySelector("title")?.textContent?.trim() || null),
    description: readMeta(doc, [
      "description",
      "og:description",
      "twitter:description",
    ]),
    siteName: readMeta(doc, ["og:site_name", "application-name"]),
    author: readMeta(doc, ["author", "article:author"]),
    publishedTime: readMeta(doc, [
      "article:published_time",
      "datePublished",
      "date",
    ]),
    lang: doc.documentElement.getAttribute("lang") || null,
    favicon: faviconHref ? absolute(faviconHref, baseUrl) : null,
    image: imageHref ? absolute(imageHref, baseUrl) : null,
    canonical: canonicalHref ? absolute(canonicalHref, baseUrl) : null,
  };
}

function extractLinks(container: Element | Document, baseUrl: string): LinkRef[] {
  const seen = new Set<string>();
  const links: LinkRef[] = [];
  for (const a of Array.from(container.querySelectorAll("a[href]"))) {
    const rawHref = a.getAttribute("href");
    if (!rawHref) continue;
    const href = absolute(rawHref, baseUrl);
    if (!href) continue;
    if (!href.startsWith("http")) continue; // drop mailto:, tel:, javascript:
    if (seen.has(href)) continue;
    seen.add(href);
    links.push({ href, text: collapseWhitespace(a.textContent ?? "") });
  }
  return links;
}

/**
 * Pure, network-free extraction. Given raw HTML and the base URL it came from,
 * produce the requested payloads. Kept separate from fetching so it can be
 * unit-tested against fixtures with no network access.
 */
export function extractFromHtml(
  html: string,
  baseUrl: string,
  opts: {
    formats: Format[];
    selector?: string;
    includeMetadata?: boolean;
    includeLinks?: boolean;
    statusCode?: number;
    resolvedUrl?: string;
  },
): ExtractResult {
  const dom = new JSDOM(html, { url: baseUrl });
  const doc = dom.window.document;

  const metadata = extractMetadata(doc, baseUrl);

  // If a selector is given, narrow the working DOM to matching nodes before
  // running readability so callers can target a specific region.
  let workingHtml = html;
  let scopeForLinks: Element | Document = doc;
  if (opts.selector) {
    const matches = Array.from(doc.querySelectorAll(opts.selector));
    if (matches.length > 0) {
      const wrapper = doc.createElement("div");
      for (const m of matches) wrapper.appendChild(m.cloneNode(true));
      workingHtml = `<!DOCTYPE html><html><body>${wrapper.innerHTML}</body></html>`;
      scopeForLinks = wrapper;
    }
  }

  // Readability mutates the document, so parse a dedicated DOM for it.
  const readabilityDom = new JSDOM(workingHtml, { url: baseUrl });
  const reader = new Readability(readabilityDom.window.document);
  const article = reader.parse();

  const contentHtml = article?.content ?? "";
  const contentText = article?.textContent ?? doc.body?.textContent ?? "";

  const result: ExtractResult = {
    url: baseUrl,
    resolvedUrl: opts.resolvedUrl ?? baseUrl,
    statusCode: opts.statusCode ?? 200,
    title: article?.title ?? metadata.title,
    byline: article?.byline ?? metadata.author,
    excerpt: article?.excerpt ?? metadata.description,
    wordCount: collapseWhitespace(contentText).split(" ").filter(Boolean).length,
    fetchedAt: new Date().toISOString(),
  };

  const formats = new Set(opts.formats);
  if (formats.has("markdown")) {
    result.markdown = contentHtml
      ? turndown.turndown(contentHtml).trim()
      : collapseWhitespace(contentText);
  }
  if (formats.has("text")) {
    result.text = contentText.replace(/\n{3,}/g, "\n\n").trim();
  }
  if (formats.has("html")) {
    result.html = contentHtml;
  }
  if (formats.has("links") || opts.includeLinks) {
    result.links = extractLinks(scopeForLinks, baseUrl);
  }
  if (opts.includeMetadata) {
    result.metadata = metadata;
  }

  return result;
}

const NON_HTML_PASSTHROUGH = /^(text\/plain|text\/markdown|application\/json)/i;

/**
 * Full pipeline: fetch the URL (with SSRF + size + timeout protection) and run
 * extraction. Non-HTML text responses are returned as-is in the requested
 * text-like formats rather than forced through the HTML parser.
 */
export async function extract(req: ExtractRequest): Promise<ExtractResult> {
  const formats: Format[] = req.formats ?? ["markdown"];
  const fetched = await fetchDocument(req.url, req.timeoutMs);

  if (
    NON_HTML_PASSTHROUGH.test(fetched.contentType) &&
    !/html/i.test(fetched.contentType)
  ) {
    const text = fetched.body.trim();
    const result: ExtractResult = {
      url: req.url,
      resolvedUrl: fetched.resolvedUrl,
      statusCode: fetched.status,
      title: null,
      byline: null,
      excerpt: null,
      wordCount: collapseWhitespace(text).split(" ").filter(Boolean).length,
      fetchedAt: new Date().toISOString(),
    };
    if (formats.includes("markdown")) result.markdown = text;
    if (formats.includes("text")) result.text = text;
    if (formats.includes("html")) result.html = text;
    return result;
  }

  return extractFromHtml(fetched.body, fetched.resolvedUrl, {
    formats,
    selector: req.selector,
    includeMetadata: req.includeMetadata,
    includeLinks: req.includeLinks,
    statusCode: fetched.status,
    resolvedUrl: fetched.resolvedUrl,
  });
}
