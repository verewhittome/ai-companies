import { z } from "zod";
import type { Plan, ProductConfig } from "../core/types.js";

export const ParseRequestSchema = z.object({ ua: z.string().min(1).max(2000) });

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "uaparse Pro", amountCents: 800, monthlyQuota: 20_000, priceEnvVar: "UAPARSE_PRICE_PRO" },
  ultra: { key: "ultra", name: "uaparse Ultra", amountCents: 2400, monthlyQuota: 100_000, priceEnvVar: "UAPARSE_PRICE_ULTRA" },
  mega: { key: "mega", name: "uaparse Mega", amountCents: 7900, monthlyQuota: 500_000, priceEnvVar: "UAPARSE_PRICE_MEGA" },
};

export const uaparseConfig: ProductConfig = {
  productId: "uaparse",
  displayName: "uaparse",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://uaparse-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://toska.ai",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "${process.env.API_BASE_URL ?? "https://uaparse-api.onrender.com"}/parse" \\
  -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"ua":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1"}'</pre>`,
};
