import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { extract } from "./extractor.js";
import { BlockedUrlError } from "./ssrf.js";
import { FetchError } from "./fetcher.js";
import {
  BatchRequestSchema,
  ExtractRequestSchema,
  type ExtractResult,
} from "./types.js";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);

/**
 * Auth model supports two deployment shapes simultaneously:
 *  1. RapidAPI gateway — RapidAPI forwards an `X-RapidAPI-Proxy-Secret` header
 *     that only it knows. If RAPIDAPI_PROXY_SECRET is set, traffic carrying the
 *     correct secret is allowed (RapidAPI has already metered/billed it).
 *  2. Direct sales — comma-separated keys in WEBEXTRACT_API_KEYS, checked
 *     against the `X-API-Key` header, so we own a billing rail independent of
 *     RapidAPI's flaky payouts.
 * If neither env var is set, the server runs open (local/dev).
 */
const RAPIDAPI_PROXY_SECRET = process.env.RAPIDAPI_PROXY_SECRET?.trim();
const API_KEYS = new Set(
  (process.env.WEBEXTRACT_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
);
const AUTH_ENABLED = Boolean(RAPIDAPI_PROXY_SECRET) || API_KEYS.size > 0;

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!AUTH_ENABLED) return next();

  if (
    RAPIDAPI_PROXY_SECRET &&
    req.header("X-RapidAPI-Proxy-Secret") === RAPIDAPI_PROXY_SECRET
  ) {
    return next();
  }
  const apiKey = req.header("X-API-Key");
  if (apiKey && API_KEYS.has(apiKey)) return next();

  res.status(401).json({ error: "Unauthorized: missing or invalid API key" });
}

/** Naive fixed-window per-key rate limiter for the self-hosted (non-RapidAPI)
 * path. RapidAPI enforces its own quotas upstream, so this is a backstop. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number.parseInt(process.env.RATE_LIMIT_PER_MIN ?? "60", 10);
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction): void {
  if (req.header("X-RapidAPI-Proxy-Secret")) return next(); // metered upstream
  const id = req.header("X-API-Key") ?? req.ip ?? "anon";
  const now = Date.now();
  const entry = hits.get(id);
  if (!entry || now > entry.resetAt) {
    hits.set(id, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    res
      .status(429)
      .json({ error: "Rate limit exceeded", retryAfterMs: entry.resetAt - now });
    return;
  }
  next();
}

function statusForError(err: unknown): number {
  if (err instanceof BlockedUrlError) return 400;
  if (err instanceof FetchError) return err.statusCode;
  return 500;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "webextract", version: "1.0.0" });
  });

  app.post("/extract", authMiddleware, rateLimit, async (req, res) => {
    const parsed = ExtractRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }
    try {
      const result = await extract(parsed.data);
      res.json(result);
    } catch (err) {
      res.status(statusForError(err)).json({
        error: err instanceof Error ? err.message : "Extraction failed",
        url: parsed.data.url,
      });
    }
  });

  app.post("/batch", authMiddleware, rateLimit, async (req, res) => {
    const parsed = BatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }
    const { urls, ...shared } = parsed.data;
    const settled = await Promise.allSettled(
      urls.map((url) => extract({ url, ...shared })),
    );
    const results = settled.map((s, i) =>
      s.status === "fulfilled"
        ? ({ ok: true, ...s.value } as ExtractResult & { ok: true })
        : {
            ok: false as const,
            url: urls[i],
            error: s.reason instanceof Error ? s.reason.message : "Extraction failed",
          },
    );
    res.json({ count: results.length, results });
  });

  return app;
}

// Boot only when run directly (not when imported by tests).
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = createApp();
  app.listen(PORT, () => {
    const mode = AUTH_ENABLED ? "auth-enabled" : "OPEN (no auth configured)";
    console.log(`webextract listening on :${PORT} [${mode}]`);
  });
}
