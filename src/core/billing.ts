import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import type { Plan, ProductConfig } from "./types.js";
import {
  findKeyBySubscription,
  issueKeyForSubscription,
  revokeBySubscription,
  updatePlanBySubscription,
} from "./db.js";

/**
 * Stripe billing, parameterized per product. One Stripe account is shared across
 * products; each product tags its Checkout Sessions / Subscriptions with
 * metadata.product, and each deployed service has its own webhook endpoint (so
 * its STRIPE_WEBHOOK_SECRET is product-specific). Handlers ignore events whose
 * metadata.product doesn't match, so a shared account stays cleanly partitioned.
 */

let stripe: Stripe | null = null;

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripe = new Stripe(key);
  }
  return stripe;
}

function newApiKey(): string {
  return `key_live_${randomBytes(20).toString("hex")}`;
}

export interface Billing {
  getPlan(key: string): Plan | undefined;
  priceIdFor(plan: Plan): string | undefined;
  createCheckoutSession(plan: Plan): Promise<string>;
  constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event;
  fulfillSession(sessionId: string): Promise<{ apiKey: string; plan: string } | null>;
  handleEvent(event: Stripe.Event): Promise<void>;
}

export function createBilling(cfg: ProductConfig): Billing {
  const getPlan = (key: string): Plan | undefined => cfg.plans[key];
  const priceIdFor = (plan: Plan): string | undefined =>
    process.env[plan.priceEnvVar]?.trim() || undefined;
  const planForPriceId = (priceId: string): Plan | undefined =>
    Object.values(cfg.plans).find((p) => priceIdFor(p) === priceId);

  async function createCheckoutSession(plan: Plan): Promise<string> {
    const priceId = priceIdFor(plan);
    if (!priceId) throw new Error(`No Stripe price configured for plan "${plan.key}"`);
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { product: cfg.productId, plan: plan.key },
      subscription_data: { metadata: { product: cfg.productId, plan: plan.key } },
      success_url: `${cfg.apiBaseUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cfg.siteUrl()}/#pricing`,
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return session.url;
  }

  function constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    return getStripe().webhooks.constructEvent(rawBody, signature, secret);
  }

  async function fulfillSession(sessionId: string) {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.product && session.metadata.product !== cfg.productId) return null;
    if (session.payment_status !== "paid" && session.status !== "complete") return null;

    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return null;

    const existing = await findKeyBySubscription(subscriptionId);
    if (existing) return { apiKey: existing.id, plan: existing.plan };

    const plan = session.metadata?.plan ? getPlan(session.metadata.plan) : undefined;
    if (!plan) throw new Error("Could not resolve plan for session");

    const customerId =
      typeof session.customer === "string" ? session.customer : (session.customer?.id ?? "");
    const email = session.customer_details?.email ?? null;

    const apiKey = await issueKeyForSubscription({
      newKey: newApiKey(),
      product: cfg.productId,
      subscriptionId,
      customerId,
      plan: plan.key,
      monthlyQuota: plan.monthlyQuota,
      email,
    });
    return { apiKey, plan: plan.key };
  }

  async function handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.product && session.metadata.product !== cfg.productId) return;
        await fulfillSession(session.id);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.product && sub.metadata.product !== cfg.productId) return;
        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceId ? planForPriceId(priceId) : undefined;
        if (plan) await updatePlanBySubscription(sub.id, plan.key, plan.monthlyQuota);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.product && sub.metadata.product !== cfg.productId) return;
        await revokeBySubscription(sub.id);
        break;
      }
      default:
        break;
    }
  }

  return {
    getPlan,
    priceIdFor,
    createCheckoutSession,
    constructEvent,
    fulfillSession,
    handleEvent,
  };
}
