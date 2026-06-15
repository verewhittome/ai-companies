import "dotenv/config";
import express, { type Express } from "express";
import { createAuth } from "./auth.js";
import { createBilling, stripeEnabled } from "./billing.js";
import { createBillingRoutes } from "./routes.js";
import { dbEnabled, initDb } from "./db.js";
import type { ProductConfig } from "./types.js";

export interface ServiceMiddleware {
  authAndMeter: express.RequestHandler;
  rateLimit: express.RequestHandler;
}

export interface ServiceOptions {
  cfg: ProductConfig;
  /** Mount product-specific endpoints (e.g. /extract, /validate). */
  mountRoutes: (app: Express, mw: ServiceMiddleware) => void;
}

/**
 * Assembles a complete product service: health, 3-rail auth + metering, Stripe
 * billing routes, and the product's own endpoints. Returns the app plus a
 * start() that initialises the DB and listens.
 */
export function createService(opts: ServiceOptions) {
  const { cfg, mountRoutes } = opts;

  const proxySecret = process.env.RAPIDAPI_PROXY_SECRET?.trim();
  const adminKeys = new Set(
    [
      ...(process.env.ADMIN_API_KEYS ?? "").split(","),
      ...(process.env.WEBEXTRACT_API_KEYS ?? "").split(","),
    ]
      .map((k) => k.trim())
      .filter(Boolean),
  );
  const rateLimitPerMin = Number.parseInt(process.env.RATE_LIMIT_PER_MIN ?? "120", 10);

  const { authAndMeter, rateLimit } = createAuth({
    productId: cfg.productId,
    proxySecret,
    adminKeys,
    rateLimitPerMin,
  });

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  // Webhook needs the raw body for signature verification — before JSON parser.
  if (stripeEnabled()) {
    const billing = createBilling(cfg);
    const billingRoutes = createBillingRoutes(billing, cfg);
    app.post("/billing/webhook", express.raw({ type: "application/json" }), billingRoutes.webhookHandler);

    app.use(express.json({ limit: "256kb" }));

    app.get("/billing/checkout", billingRoutes.checkoutRedirectHandler);
    app.post("/billing/checkout", billingRoutes.checkoutJsonHandler);
    app.get("/billing/success", billingRoutes.successHandler);
  } else {
    app.use(express.json({ limit: "256kb" }));
  }

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: cfg.productId,
      version: cfg.version,
      billing: stripeEnabled() && dbEnabled() ? "enabled" : "disabled",
    });
  });

  mountRoutes(app, { authAndMeter, rateLimit });

  async function start(): Promise<void> {
    const port = Number.parseInt(process.env.PORT ?? "8080", 10);
    if (dbEnabled()) {
      await initDb();
      console.log(`${cfg.productId}: Postgres key store initialised`);
    }
    app.listen(port, () => {
      const rails = [
        proxySecret && "rapidapi",
        adminKeys.size > 0 && "admin-keys",
        dbEnabled() && "direct-keys",
        stripeEnabled() && "stripe-checkout",
      ].filter(Boolean);
      console.log(
        `${cfg.productId} listening on :${port} [${rails.length ? rails.join(",") : "OPEN (no auth)"}]`,
      );
    });
  }

  return { app, start };
}
