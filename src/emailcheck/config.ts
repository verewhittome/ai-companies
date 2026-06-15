import type { Plan, ProductConfig } from "../core/types.js";

// Email validation commands higher per-unit pricing than scraping (ZeroBounce /
// AbstractAPI comparables), so quotas are smaller for the price.
export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "emailcheck Pro", amountCents: 1200, monthlyQuota: 5_000, priceEnvVar: "EMAILCHECK_PRICE_PRO" },
  ultra: { key: "ultra", name: "emailcheck Ultra", amountCents: 3900, monthlyQuota: 25_000, priceEnvVar: "EMAILCHECK_PRICE_ULTRA" },
  mega: { key: "mega", name: "emailcheck Mega", amountCents: 9900, monthlyQuota: 100_000, priceEnvVar: "EMAILCHECK_PRICE_MEGA" },
};

export const emailcheckConfig: ProductConfig = {
  productId: "emailcheck",
  displayName: "emailcheck",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://emailcheck-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://emailcheck-site.onrender.com",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "${process.env.API_BASE_URL ?? "https://emailcheck-api.onrender.com"}/validate" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"someone@example.com"}'</pre>`,
};
