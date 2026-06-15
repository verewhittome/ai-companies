import { JSDOM } from "jsdom";
import { fetchDocument } from "../webextract/fetcher.js";

export interface LinkPreview {
  url: string;
  resolvedUrl: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  type: string | null;
  author: string | null;
  themeColor: string | null;
  locale: string | null;
}

function abs(href: string | null | undefined, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function meta(doc: Document, names: string[]): string | null {
  for (const n of names) {
    const el =
      doc.querySelector(`meta[property="${n}"]`) ?? doc.querySelector(`meta[name="${n}"]`);
    const c = el?.getAttribute("content");
    if (c && c.trim()) return c.trim();
  }
  return null;
}

/** Pure: build an unfurl card from HTML. Network-free for unit testing. */
export function extractPreviewFromHtml(html: string, baseUrl: string): LinkPreview {
  const doc = new JSDOM(html, { url: baseUrl }).window.document;
  const favicon =
    doc.querySelector('link[rel="icon"]')?.getAttribute("href") ??
    doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ??
    "/favicon.ico";
  return {
    url: baseUrl,
    resolvedUrl: baseUrl,
    title: meta(doc, ["og:title", "twitter:title"]) ?? doc.querySelector("title")?.textContent?.trim() ?? null,
    description: meta(doc, ["description", "og:description", "twitter:description"]),
    image: abs(meta(doc, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]), baseUrl),
    favicon: abs(favicon, baseUrl),
    siteName: meta(doc, ["og:site_name", "application-name"]),
    type: meta(doc, ["og:type"]),
    author: meta(doc, ["author", "article:author"]),
    themeColor: meta(doc, ["theme-color"]),
    locale: meta(doc, ["og:locale"]) ?? doc.documentElement.getAttribute("lang"),
  };
}

export async function getPreview(url: string, timeoutMs?: number): Promise<LinkPreview> {
  const fetched = await fetchDocument(url, timeoutMs);
  const preview = extractPreviewFromHtml(fetched.body, fetched.resolvedUrl);
  preview.url = url;
  preview.resolvedUrl = fetched.resolvedUrl;
  return preview;
}
