import { z } from "zod";
import type { Plan, ProductConfig } from "../core/types.js";

export const CheckRequestSchema = z.object({
  text: z.string().min(1).max(20_000),
  censorChar: z.string().length(1).optional(),
});

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "profanity Pro", amountCents: 900, monthlyQuota: 10_000, priceEnvVar: "PROFANITY_PRICE_PRO" },
  ultra: { key: "ultra", name: "profanity Ultra", amountCents: 2900, monthlyQuota: 50_000, priceEnvVar: "PROFANITY_PRICE_ULTRA" },
  mega: { key: "mega", name: "profanity Mega", amountCents: 9900, monthlyQuota: 250_000, priceEnvVar: "PROFANITY_PRICE_MEGA" },
};

export const profanityConfig: ProductConfig = {
  productId: "profanity",
  displayName: "profanity",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://profanity-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://toska.ai",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "${process.env.API_BASE_URL ?? "https://profanity-api.onrender.com"}/check" \\
  -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"text":"this is a damn good API"}'</pre>`,
};
