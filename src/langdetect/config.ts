import { z } from "zod";
import type { Plan, ProductConfig } from "../core/types.js";

export const DetectRequestSchema = z.object({ text: z.string().min(1).max(10_000) });

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "langdetect Pro", amountCents: 900, monthlyQuota: 10_000, priceEnvVar: "LANGDETECT_PRICE_PRO" },
  ultra: { key: "ultra", name: "langdetect Ultra", amountCents: 2900, monthlyQuota: 50_000, priceEnvVar: "LANGDETECT_PRICE_ULTRA" },
  mega: { key: "mega", name: "langdetect Mega", amountCents: 9900, monthlyQuota: 250_000, priceEnvVar: "LANGDETECT_PRICE_MEGA" },
};

export const langdetectConfig: ProductConfig = {
  productId: "langdetect",
  displayName: "langdetect",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://langdetect-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://toska.ai",
  quickstart: (apiKey) =>
    `<pre>curl -X POST "${process.env.API_BASE_URL ?? "https://langdetect-api.onrender.com"}/detect" \\
  -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"text":"Bonjour tout le monde, comment allez-vous ?"}'</pre>`,
};
