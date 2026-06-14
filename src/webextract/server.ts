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
import { consumeQuota, dbEnabled, initDb } from "./billing/db.js";
import { stripeEnabled } from "./billing/stripe.js";
import {
  checkoutJsonHandler,
  checkoutRedirectHandler,
  successHandler,
  webhookHandler,
} from "./billing/routes.js";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);

/**
 * Auth supports three rails at once:
 *  1. RapidAPI gateway via X-RapidAPI-Proxy-Secret (metered/billed upstream).
 *  2. Direct paid keys (X-API-Key) issued by the Stripe rail, stored in Postgres,
 *     metered per-request against the plan's monthly quota.
 *  3. Bootstrap/admin keys from WEBEXTRACT_API_KEYS (unmetered) for internal use.
 * If no auth is configured at all, the server runs open (local/dev).
 */
const RAPIDAPI_PROXY_SECRET = process.env.RAPIDAPI_PROXY_SECRET?.trim();
const ADMIN_KEYS = new Set(
  (process.env.WEBEXTRACT_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
);
const AUTH_ENABLED =
  Boolean(RAPIDAPI_PROXY_SECRET) || ADMIN_KEYS.size > 0 || dbEnabled();

async function authAndMeter(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!AUTH_ENABLED) return next();

  // 1. RapidAPI-forwarded traffic (already metered upstream).
  if (
    RAPIDAPI_PROXY_SECRET &&
    req.header("X-RapidAPI-Proxy-Secret") === RAPIDAPI_PROXY_SECRET
  ) {
    return next();
  }

  const apiKey = req.header("X-API-Key");
  if (!apiKey) {
    res.status(401).json({ error: "Unauthorized: provide X-API-Key" });
    return;
  }

  // 2. Bootstrap/admin keys (unmetered).
  if (ADMIN_KEYS.has(apiKey)) return next();

  // 3. Direct paid keys, metered against the plan quota.
  if (dbEnabled()) {
    try {
      const result = await consumeQuota(apiKey);
      if (result.ok) {
        res.setHeader("X-Quota-Remaining", String(result.remaining));
        return next();
      }
      if (result.reason === "quota_exceeded") {
        res.status(429).json({ error: "Monthly quota exceeded. Upgrade your plan." });
        return;
      }
      if (result.reason === "revoked") {
        res.status(403).json({ error: "API key is inactive." });
        return;
      }
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Auth backend error",
      });
      return;
    }
  }

  res.status(401).json({ error: "Unauthorized: invalid API key" });
}

/** Burst limiter (backstop; RapidAPI and quota handle real limits). */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number.parseInt(process.env.RATE_LIMIT_PER_MIN ?? "120", 10);
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction): void {
  if (req.header("X-RapidAPI-Proxy-Secret")) return next();
  const id = req.header("X-API-Key") ?? req.ip ?? "anon";
  const now = Date.now();
  const entry = hits.get(id);
  if (!entry || now > entry.resetAt) {
    hits.set(id, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    res.status(429).json({ error: "Rate limit exceeded", retryAfterMs: entry.resetAt - now });
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
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  // Stripe webhook needs the raw body for signature verification, so it must be
  // registered BEFORE the JSON body parser.
  if (stripeEnabled()) {
    app.post("/billing/webhook", express.raw({ type: "application/json" }), webhookHandler);
  }

  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "webextract",
      version: "1.0.0",
      billing: stripeEnabled() && dbEnabled() ? "enabled" : "disabled",
    });
  });

  app.post("/extract", authAndMeter, rateLimit, async (req, res) => {
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

  app.post("/batch", authAndMeter, rateLimit, async (req, res) => {
    const parsed = BatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }
    const { urls, ...shared } = parsed.data;
    const settled = await Promise.allSettled(urls.map((url) => extract({ url, ...shared })));
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

  // Direct Stripe billing rail.
  if (stripeEnabled()) {
    app.get("/billing/checkout", checkoutRedirectHandler);
    app.post("/billing/checkout", checkoutJsonHandler);
    app.get("/billing/success", successHandler);
  }

  return app;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  (async () => {
    if (dbEnabled()) {
      await initDb();
      console.log("webextract: Postgres key store initialised");
    }
    const app = createApp();
    app.listen(PORT, () => {
      const rails = [
        RAPIDAPI_PROXY_SECRET && "rapidapi",
        ADMIN_KEYS.size > 0 && "admin-keys",
        dbEnabled() && "direct-keys",
        stripeEnabled() && "stripe-checkout",
      ].filter(Boolean);
      const mode = rails.length ? rails.join(",") : "OPEN (no auth)";
      console.log(`webextract listening on :${PORT} [${mode}]`);
    });
  })().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}
