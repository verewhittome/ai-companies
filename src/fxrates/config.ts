import { z } from "zod";
import type { Plan, ProductConfig } from "../core/types.js";

export const ConvertRequestSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  amount: z.number().finite(),
});

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "fxrates Pro", amountCents: 900, monthlyQuota: 10_000, priceEnvVar: "FXRATES_PRICE_PRO" },
  ultra: { key: "ultra", name: "fxrates Ultra", amountCents: 2900, monthlyQuota: 50_000, priceEnvVar: "FXRATES_PRICE_ULTRA" },
  mega: { key: "mega", name: "fxrates Mega", amountCents: 9900, monthlyQuota: 250_000, priceEnvVar: "FXRATES_PRICE_MEGA" },
};

export const fxratesConfig: ProductConfig = {
  productId: "fxrates",
  displayName: "fxrates",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://fxrates-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://toska.ai",
  quickstart: (apiKey) =>
    `<pre>curl "${process.env.API_BASE_URL ?? "https://fxrates-api.onrender.com"}/rates?base=USD&symbols=EUR,GBP,JPY" \\
  -H "X-API-Key: ${apiKey}"</pre>`,
};
