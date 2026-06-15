import "dotenv/config";
import Stripe from "stripe";
import type { ProductConfig } from "./types.js";

/**
 * Idempotently create a product's Stripe Products + recurring monthly Prices.
 * Re-runs are safe (idempotency keys). Creating catalog objects moves no money.
 * Prints the STRIPE_PRICE_* env lines to wire into the service.
 */
export async function setupCatalog(cfg: ProductConfig): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required");
  const stripe = new Stripe(key);
  const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
  console.error(`Creating ${cfg.productId} catalog in Stripe (${mode} mode)…`);

  const envLines: string[] = [];
  for (const plan of Object.values(cfg.plans)) {
    const product = await stripe.products.create(
      {
        name: plan.name,
        description: `${plan.monthlyQuota.toLocaleString()} requests / month`,
        metadata: { product: cfg.productId, plan: plan.key, quota: String(plan.monthlyQuota) },
      },
      { idempotencyKey: `${cfg.productId}-product-${plan.key}-v1` },
    );
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: plan.amountCents,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { product: cfg.productId, plan: plan.key },
      },
      { idempotencyKey: `${cfg.productId}-price-${plan.key}-v1` },
    );
    console.error(
      `  ${plan.key.padEnd(6)} product=${product.id} price=${price.id} ($${(plan.amountCents / 100).toFixed(2)}/mo)`,
    );
    envLines.push(`${plan.priceEnvVar}=${price.id}`);
  }

  console.error("\nAdd these to the service env:\n");
  console.log(envLines.join("\n"));
}
