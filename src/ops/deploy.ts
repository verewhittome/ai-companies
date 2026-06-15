import "dotenv/config";
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import Stripe from "stripe";
import { registry } from "../registry.js";

/**
 * Deploy one or more products to Render (free tier) end-to-end:
 *   npx tsx src/ops/deploy.ts linkpreview uaparse ...
 * Per product: create Stripe catalog, create free Render web service (shared
 * Dockerfile, SERVICE env), create Stripe webhook, wire all env, trigger deploy.
 * Idempotent on the Stripe catalog/webhook; Render service create fails loudly
 * if the name already exists.
 */
const OWNER = "tea-cspplol6l47c73f66c1g";
const PG = "dpg-d8nhmm67r5hc73arcksg-a";
const REPO = "https://github.com/verewhittome/ai-companies";
const RK = process.env.RENDER_API_KEY!;
const SK = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(SK);

const rh = { Authorization: `Bearer ${RK}`, "Content-Type": "application/json" };
const render = async (path: string, method: string, body?: unknown) => {
  const r = await fetch(`https://api.render.com/v1${path}`, {
    method,
    headers: rh,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

async function internalDbUrl(): Promise<string> {
  const r = await fetch(`https://api.render.com/v1/postgres/${PG}/connection-info`, { headers: rh });
  const j = (await r.json()) as { internalConnectionString?: string };
  if (!j.internalConnectionString) throw new Error("no internal DB url");
  return j.internalConnectionString;
}

async function deployProduct(id: string, internal: string) {
  const cfg = registry[id];
  if (!cfg) throw new Error(`unknown product ${id}`);
  console.log(`\n=== ${id} ===`);

  // 1. Stripe catalog
  const priceEnv: Record<string, string> = {};
  for (const plan of Object.values(cfg.plans)) {
    const product = await stripe.products.create(
      { name: plan.name, description: `${plan.monthlyQuota.toLocaleString()} requests / month`, metadata: { product: id, plan: plan.key } },
      { idempotencyKey: `${id}-product-${plan.key}-v1` },
    );
    const price = await stripe.prices.create(
      { product: product.id, unit_amount: plan.amountCents, currency: "usd", recurring: { interval: "month" }, metadata: { product: id, plan: plan.key } },
      { idempotencyKey: `${id}-price-${plan.key}-v1` },
    );
    priceEnv[plan.priceEnvVar] = price.id;
    console.log(`  ${plan.key} -> ${price.id}`);
  }

  const proxy = randomBytes(24).toString("hex");
  const admin = "key_live_" + randomBytes(16).toString("hex");

  // 2. Render free web service
  const baseEnv: Record<string, string> = {
    NODE_ENV: "production", PORT: "8080", SERVICE: id,
    RAPIDAPI_PROXY_SECRET: proxy, ADMIN_API_KEYS: admin,
    DATABASE_URL: internal,
    STRIPE_SECRET_KEY: SK, STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY!,
    SITE_URL: "https://toska.ai",
    ...priceEnv,
  };
  const create = await render("/services", "POST", {
    type: "web_service", name: `${id}-api`, ownerId: OWNER, repo: REPO, branch: "main", autoDeploy: "yes",
    serviceDetails: {
      runtime: "docker", plan: "free", region: "oregon", healthCheckPath: "/health",
      envSpecificDetails: { dockerfilePath: "./Dockerfile", dockerContext: "." },
    },
    envVars: Object.entries(baseEnv).map(([key, value]) => ({ key, value })),
  });
  const svc = (create.json as any).service || create.json;
  const serviceId = svc.id;
  const url = svc.serviceDetails?.url;
  if (!serviceId || !url) { console.log("  CREATE FAILED:", JSON.stringify(create.json).slice(0, 300)); return; }
  console.log(`  service ${serviceId} -> ${url}`);

  // 3. Stripe webhook
  const wh = await stripe.webhookEndpoints.create(
    { url: `${url}/billing/webhook`, enabled_events: ["checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"] },
    { idempotencyKey: `${id}-webhook-v1` },
  );

  // 4. PUT full env (add webhook secret + API_BASE_URL) + deploy
  const full = { ...baseEnv, STRIPE_WEBHOOK_SECRET: wh.secret!, API_BASE_URL: url };
  await render(`/services/${serviceId}/env-vars`, "PUT", Object.entries(full).map(([key, value]) => ({ key, value })));
  await render(`/services/${serviceId}/deploys`, "POST", { clearCache: "do_not_clear" });

  appendFileSync(".env", `\n# ${id}\n${id.toUpperCase()}_API_URL=${url}\n${id.toUpperCase()}_ADMIN_KEY=${admin}\n`);
  console.log(`  DONE  admin=${admin}`);
  return { id, url, serviceId, admin };
}

const ids = process.argv.slice(2);
if (!ids.length) { console.error("usage: deploy.ts <productId...>"); process.exit(1); }
const internal = await internalDbUrl();
const results = [];
for (const id of ids) {
  try { results.push(await deployProduct(id, internal)); }
  catch (e) { console.log(`  ERROR ${id}:`, e instanceof Error ? e.message : e); }
}
console.log("\nSUMMARY:", JSON.stringify(results.filter(Boolean), null, 2));
