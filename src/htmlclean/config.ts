import { z } from "zod";
import type { Plan, ProductConfig } from "../core/types.js";

export const SanitizeRequestSchema = z.object({
  html: z.string().min(1).max(200_000),
  profile: z.enum(["default", "basic", "strict"]).optional(),
});

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "htmlclean Pro", amountCents: 900, monthlyQuota: 10_000, priceEnvVar: "HTMLCLEAN_PRICE_PRO" },
  ultra: { key: "ultra", name: "htmlclean Ultra", amountCents: 2900, monthlyQuota: 50_000, priceEnvVar: "HTMLCLEAN_PRICE_ULTRA" },
  mega: { key: "mega", name: "htmlclean Mega", amountCents: 9900, monthlyQuota: 250_000, priceEnvVar: "HTMLCLEAN_PRICE_MEGA" },
};

export const htmlcleanConfig: ProductConfig = {
  productId: "htmlclean",
  displayName: "htmlclean",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://htmlclean-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://toska.ai",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "${process.env.API_BASE_URL ?? "https://htmlclean-api.onrender.com"}/sanitize" \\
  -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"html":"&lt;p&gt;Hi&lt;script&gt;alert(1)&lt;/script&gt;&lt;/p&gt;"}'</pre>`,
};
