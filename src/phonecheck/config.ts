import type { Plan, ProductConfig } from "../core/types.js";

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "phonecheck Pro", amountCents: 1000, monthlyQuota: 5_000, priceEnvVar: "PHONECHECK_PRICE_PRO" },
  ultra: { key: "ultra", name: "phonecheck Ultra", amountCents: 3500, monthlyQuota: 25_000, priceEnvVar: "PHONECHECK_PRICE_ULTRA" },
  mega: { key: "mega", name: "phonecheck Mega", amountCents: 9900, monthlyQuota: 100_000, priceEnvVar: "PHONECHECK_PRICE_MEGA" },
};

export const phonecheckConfig: ProductConfig = {
  productId: "phonecheck",
  displayName: "phonecheck",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://phonecheck-api-ft15.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://phonecheck-site.onrender.com",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "${process.env.API_BASE_URL ?? "https://phonecheck-api-ft15.onrender.com"}/validate" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+14155552671"}'</pre>`,
};
