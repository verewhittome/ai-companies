/**
 * Direct-sale plans. Prices/quotas mirror the RapidAPI listing so a customer
 * pays the same whichever rail they arrive through. The free tier is not sold
 * through Stripe (it's a signup/RapidAPI concept), so direct checkout starts at
 * Pro. Stripe Price IDs are injected via env after the prices are created in the
 * Stripe account, keeping the catalog out of source control.
 */
export interface Plan {
  key: "pro" | "ultra" | "mega";
  name: string;
  amountCents: number;
  monthlyQuota: number;
  priceEnvVar: string;
}

export const PLANS: Record<Plan["key"], Plan> = {
  pro: {
    key: "pro",
    name: "webextract Pro",
    amountCents: 900,
    monthlyQuota: 10_000,
    priceEnvVar: "STRIPE_PRICE_PRO",
  },
  ultra: {
    key: "ultra",
    name: "webextract Ultra",
    amountCents: 2900,
    monthlyQuota: 50_000,
    priceEnvVar: "STRIPE_PRICE_ULTRA",
  },
  mega: {
    key: "mega",
    name: "webextract Mega",
    amountCents: 9900,
    monthlyQuota: 250_000,
    priceEnvVar: "STRIPE_PRICE_MEGA",
  },
};

export function getPlan(key: string): Plan | undefined {
  return PLANS[key as Plan["key"]];
}

export function priceIdFor(plan: Plan): string | undefined {
  return process.env[plan.priceEnvVar]?.trim() || undefined;
}

/** Resolve a plan from a Stripe Price ID (reverse lookup via env). */
export function planForPriceId(priceId: string): Plan | undefined {
  return Object.values(PLANS).find((p) => priceIdFor(p) === priceId);
}
