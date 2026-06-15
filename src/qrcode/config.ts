import { z } from "zod";
import type { Plan, ProductConfig } from "../core/types.js";

export const GenerateRequestSchema = z.object({
  data: z.string().min(1).max(2000),
  format: z.enum(["png", "svg", "dataurl"]).optional(),
  size: z.number().int().min(64).max(1000).optional(),
  margin: z.number().int().min(0).max(10).optional(),
  ecc: z.enum(["L", "M", "Q", "H"]).optional(),
  dark: z.string().max(32).optional(),
  light: z.string().max(32).optional(),
});

export const plans: Record<string, Plan> = {
  pro: { key: "pro", name: "qrcode Pro", amountCents: 700, monthlyQuota: 10_000, priceEnvVar: "QRCODE_PRICE_PRO" },
  ultra: { key: "ultra", name: "qrcode Ultra", amountCents: 1900, monthlyQuota: 50_000, priceEnvVar: "QRCODE_PRICE_ULTRA" },
  mega: { key: "mega", name: "qrcode Mega", amountCents: 5900, monthlyQuota: 250_000, priceEnvVar: "QRCODE_PRICE_MEGA" },
};

export const qrcodeConfig: ProductConfig = {
  productId: "qrcode",
  displayName: "qrcode",
  version: "1.0.0",
  plans,
  apiBaseUrl: () => process.env.API_BASE_URL ?? "https://qrcode-api.onrender.com",
  siteUrl: () => process.env.SITE_URL ?? "https://toska.ai",
  quickstart: (apiKey) =>
    `<pre>curl "${process.env.API_BASE_URL ?? "https://qrcode-api.onrender.com"}/generate?data=https://toska.ai&format=png" \\
  -H "X-API-Key: ${apiKey}" --output qr.png</pre>`,
};
