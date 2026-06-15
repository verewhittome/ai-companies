import sanitizeHtml from "sanitize-html";

export type Profile = "default" | "basic" | "strict";

const BASIC_TAGS = [
  "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "code", "pre",
  "blockquote", "h1", "h2", "h3", "h4", "span",
];

export interface CleanResult {
  clean: string;
  profile: Profile;
  original_length: number;
  clean_length: number;
  removed_chars: number;
}

/**
 * Sanitize untrusted HTML, stripping scripts/XSS vectors.
 *  - default: sanitize-html defaults (safe subset of tags, no script/style/iframe)
 *  - basic:   a small whitelist of formatting tags (links keep href only)
 *  - strict:  plain text (all tags removed)
 */
export function cleanHtml(html: string, profile: Profile = "default"): CleanResult {
  let opts: sanitizeHtml.IOptions;
  if (profile === "strict") opts = { allowedTags: [], allowedAttributes: {} };
  else if (profile === "basic") opts = { allowedTags: BASIC_TAGS, allowedAttributes: { a: ["href", "title"] } };
  else opts = {};
  const clean = sanitizeHtml(html, opts);
  return {
    clean,
    profile,
    original_length: html.length,
    clean_length: clean.length,
    removed_chars: html.length - clean.length,
  };
}
