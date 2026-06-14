import "dotenv/config";
import Stripe from "stripe";
import { PLANS } from "./plans.js";

/**
 * One-off ops script: creates the webextract Products + recurring monthly Prices
 * in the configured Stripe account. Idempotency keys make re-runs safe (no
 * duplicates within Stripe's idempotency window). Creating catalog objects moves
 * no money. Prints the STRIPE_PRICE_* env lines to wire into the API service.
 *
 *   npx tsx src/webextract/billing/setup-catalog.ts
 */
async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required");
  const stripe = new Stripe(key);
  const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
  console.error(`Creating webextract catalog in Stripe (${mode} mode)…`);

  const envLines: string[] = [];

  for (const plan of Object.values(PLANS)) {
    const product = await stripe.products.create(
      {
        name: plan.name,
        description: `${plan.monthlyQuota.toLocaleString()} extractions / month`,
        metadata: { plan: plan.key, quota: String(plan.monthlyQuota) },
      },
      { idempotencyKey: `webextract-product-${plan.key}-v1` },
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: plan.amountCents,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { plan: plan.key },
      },
      { idempotencyKey: `webextract-price-${plan.key}-v1` },
    );

    console.error(
      `  ${plan.key.padEnd(6)} product=${product.id} price=${price.id} ($${(plan.amountCents / 100).toFixed(2)}/mo)`,
    );
    envLines.push(`${plan.priceEnvVar}=${price.id}`);
  }

  console.error("\nAdd these to the API service env:\n");
  // Print env lines to stdout so they can be captured.
  console.log(envLines.join("\n"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
