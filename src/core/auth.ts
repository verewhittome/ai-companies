import type { NextFunction, Request, RequestHandler, Response } from "express";
import { consumeQuota, dbEnabled } from "./db.js";

/**
 * Three coexisting auth rails, scoped to one product:
 *  1. RapidAPI gateway via X-RapidAPI-Proxy-Secret (metered upstream).
 *  2. Direct paid keys (X-API-Key) issued by Stripe, metered per-request against
 *     the plan's monthly quota in Postgres.
 *  3. Bootstrap/admin keys from WEBEXTRACT_API_KEYS / <PRODUCT>_ADMIN_KEYS.
 */
export interface AuthDeps {
  productId: string;
  proxySecret?: string;
  adminKeys: Set<string>;
  rateLimitPerMin: number;
}

export function createAuth(deps: AuthDeps) {
  const authEnabled =
    Boolean(deps.proxySecret) || deps.adminKeys.size > 0 || dbEnabled();

  async function authAndMeter(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!authEnabled) return next();

    if (deps.proxySecret && req.header("X-RapidAPI-Proxy-Secret") === deps.proxySecret) {
      return next();
    }

    const apiKey = req.header("X-API-Key");
    if (!apiKey) {
      res.status(401).json({ error: "Unauthorized: provide X-API-Key" });
      return;
    }
    if (deps.adminKeys.has(apiKey)) return next();

    if (dbEnabled()) {
      try {
        const result = await consumeQuota(apiKey, deps.productId);
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
        res.status(500).json({ error: err instanceof Error ? err.message : "Auth backend error" });
        return;
      }
    }
    res.status(401).json({ error: "Unauthorized: invalid API key" });
  }

  const WINDOW_MS = 60_000;
  const hits = new Map<string, { count: number; resetAt: number }>();
  const rateLimit: RequestHandler = (req, res, next) => {
    if (req.header("X-RapidAPI-Proxy-Secret")) return next();
    const id = req.header("X-API-Key") ?? req.ip ?? "anon";
    const now = Date.now();
    const entry = hits.get(id);
    if (!entry || now > entry.resetAt) {
      hits.set(id, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }
    entry.count += 1;
    if (entry.count > deps.rateLimitPerMin) {
      res.status(429).json({ error: "Rate limit exceeded", retryAfterMs: entry.resetAt - now });
      return;
    }
    next();
  };

  return { authAndMeter, rateLimit, authEnabled };
}
