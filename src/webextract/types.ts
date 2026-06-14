import { z } from "zod";

/**
 * Output formats the caller can request. `markdown` is the default and the
 * primary product: clean, LLM-ready markdown of the main content.
 */
export const FormatSchema = z.enum(["markdown", "text", "html", "links"]);
export type Format = z.infer<typeof FormatSchema>;

export const ExtractRequestSchema = z.object({
  url: z.string().url(),
  /** Which payloads to compute. Defaults to ["markdown"]. */
  formats: z.array(FormatSchema).nonempty().optional(),
  /** Restrict extraction to nodes matching this CSS selector before processing. */
  selector: z.string().min(1).max(200).optional(),
  /** Include the resolved metadata block (title, description, OpenGraph, etc.). */
  includeMetadata: z.boolean().optional(),
  /** Include outbound links discovered in the main content. */
  includeLinks: z.boolean().optional(),
  /** Max milliseconds to wait for the upstream fetch. Clamped server-side. */
  timeoutMs: z.number().int().positive().max(30_000).optional(),
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

export const BatchRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(20),
  formats: z.array(FormatSchema).nonempty().optional(),
  selector: z.string().min(1).max(200).optional(),
  includeMetadata: z.boolean().optional(),
  includeLinks: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(30_000).optional(),
});
export type BatchRequest = z.infer<typeof BatchRequestSchema>;

export interface LinkRef {
  href: string;
  text: string;
}

export interface ExtractMetadata {
  title: string | null;
  description: string | null;
  siteName: string | null;
  author: string | null;
  publishedTime: string | null;
  lang: string | null;
  favicon: string | null;
  image: string | null;
  canonical: string | null;
}

export interface ExtractResult {
  url: string;
  /** Final URL after redirects. */
  resolvedUrl: string;
  statusCode: number;
  title: string | null;
  byline: string | null;
  excerpt: string | null;
  wordCount: number;
  markdown?: string;
  text?: string;
  html?: string;
  links?: LinkRef[];
  metadata?: ExtractMetadata;
  fetchedAt: string;
}
