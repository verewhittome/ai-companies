/**
 * Shared types for the multi-product API platform. Each product (webextract,
 * emailcheck, …) is its own deployed service + RapidAPI listing + Stripe catalog,
 * but they share this billing/auth/Postgres core.
 */
export interface Plan {
  key: string;
  name: string;
  amountCents: number;
  monthlyQuota: number;
  /** Env var holding the Stripe Price ID for this plan. */
  priceEnvVar: string;
}

export interface ProductConfig {
  /** Stable id used to scope API keys + Stripe metadata, e.g. "emailcheck". */
  productId: string;
  /** Human-facing name for the success page, etc. */
  displayName: string;
  version: string;
  plans: Record<string, Plan>;
  apiBaseUrl: () => string;
  siteUrl: () => string;
  /** Returns the HTML body of the quickstart shown on the checkout success page. */
  quickstart: (apiKey: string) => string;
}
