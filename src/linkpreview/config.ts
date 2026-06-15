import { z } from "zod";
import type { Plan, ProductConfig } from "../core/types.js";

export const PreviewRequestSchema = z.object({
  url: z.string().url(),
  timeoutMs: z.number().int().positive().max(30_000).optional(),
});

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "linkpreview Pro", amountCents: 800, monthlyQuota: 10_000, priceEnvVar: "LINKPREVIEW_PRICE_PRO" },
  ultra: { key: "ultra", name: "linkpreview Ultra", amountCents: 2400, monthlyQuota: 50_000, priceEnvVar: "LINKPREVIEW_PRICE_ULTRA" },
  mega: { key: "mega", name: "linkpreview Mega", amountCents: 7900, monthlyQuota: 250_000, priceEnvVar: "LINKPREVIEW_PRICE_MEGA" },
};

export const linkpreviewConfig: ProductConfig = {
  productId: "linkpreview",
  displayName: "linkpreview",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://linkpreview-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://toska.ai",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "${process.env.API_BASE_URL ?? "https://linkpreview-api.onrender.com"}/preview" \\
  -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"url":"https://github.com"}'</pre>`,
};
