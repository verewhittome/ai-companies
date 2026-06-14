import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { getPlan, planForPriceId, priceIdFor, type Plan } from "./plans.js";
import {
  findKeyBySubscription,
  issueKeyForSubscription,
  revokeBySubscription,
  updatePlanBySubscription,
} from "./db.js";

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

const SITE_URL = () => process.env.SITE_URL ?? "https://webextract-site.onrender.com";
const API_BASE = () => process.env.API_BASE_URL ?? "https://webextract-api-kxu8.onrender.com";

/**
 * Create a Stripe Checkout Session for a subscription to the given plan. The
 * plan key is stored in session metadata so the webhook/success handler can
 * resolve it without re-deriving from line items.
 */
export async function createCheckoutSession(plan: Plan): Promise<string> {
  const priceId = priceIdFor(plan);
  if (!priceId) {
    throw new Error(`No Stripe price configured for plan "${plan.key}"`);
  }
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { plan: plan.key },
    subscription_data: { metadata: { plan: plan.key } },
    success_url: `${API_BASE()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL()}/#pricing`,
    allow_promotion_codes: true,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Verify a webhook payload's signature and return the parsed event. */
export function constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

async function planFromSubscriptionId(subscriptionId: string): Promise<Plan | undefined> {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const metaPlan = sub.metadata?.plan ? getPlan(sub.metadata.plan) : undefined;
  if (metaPlan) return metaPlan;
  const priceId = sub.items.data[0]?.price?.id;
  return priceId ? planForPriceId(priceId) : undefined;
}

/**
 * Issue (idempotently) the API key for a completed checkout session. Returns the
 * key string. Called by both the webhook and the success page so a slow webhook
 * never leaves the buyer without their key.
 */
export async function fulfillSession(sessionId: string): Promise<{
  apiKey: string;
  plan: string;
} | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return null;
  }
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) return null;

  const existing = await findKeyBySubscription(subscriptionId);
  if (existing) return { apiKey: existing.id, plan: existing.plan };

  const planKey = session.metadata?.plan;
  const plan = planKey ? getPlan(planKey) : await planFromSubscriptionId(subscriptionId);
  if (!plan) throw new Error("Could not resolve plan for session");

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? "");
  const email = session.customer_details?.email ?? null;

  const apiKey = await issueKeyForSubscription({
    newKey: newApiKey(),
    subscriptionId,
    customerId,
    plan: plan.key,
    monthlyQuota: plan.monthlyQuota,
    email,
  });
  return { apiKey, plan: plan.key };
}

/** Process a verified webhook event. Idempotent across retries. */
export async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await fulfillSession(session.id);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price?.id;
      const plan = priceId ? planForPriceId(priceId) : undefined;
      if (plan) {
        await updatePlanBySubscription(sub.id, plan.key, plan.monthlyQuota);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await revokeBySubscription(sub.id);
      break;
    }
    default:
      break;
  }
}
