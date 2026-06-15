import type { Plan, ProductConfig } from "../core/types.js";

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "webextract Pro", amountCents: 900, monthlyQuota: 10_000, priceEnvVar: "STRIPE_PRICE_PRO" },
  ultra: { key: "ultra", name: "webextract Ultra", amountCents: 2900, monthlyQuota: 50_000, priceEnvVar: "STRIPE_PRICE_ULTRA" },
  mega: { key: "mega", name: "webextract Mega", amountCents: 9900, monthlyQuota: 250_000, priceEnvVar: "STRIPE_PRICE_MEGA" },
};

export const webextractConfig: ProductConfig = {
  productId: "webextract",
  displayName: "webextract",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://webextract-api-kxu8.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://webextract-site.onrender.com",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "https://webextract-api-kxu8.onrender.com/extract" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","includeMetadata":true}'</pre>`,
};
