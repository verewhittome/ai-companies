import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

const { createBilling } = await import("./billing.js");
import type { ProductConfig } from "./types.js";

const cfg: ProductConfig = {
  productId: "testprod",
  displayName: "Test",
  version: "1.0.0",
  plans: {
    pro: { key: "pro", name: "Pro", amountCents: 900, monthlyQuota: 10_000, priceEnvVar: "TEST_PRICE_PRO" },
  },
  apiBaseUrl: () => "https://api.test",
  siteUrl: () => "https://test",
  quickstart: () => "",
};
const billing = createBilling(cfg);
const stripe = new Stripe("sk_test_dummy");
const sign = (payload: string) =>
  stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test_secret" });

test("accepts a correctly signed webhook payload", () => {
  const payload = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_1" } },
  });
  const event = billing.constructEvent(payload, sign(payload));
  assert.equal(event.type, "checkout.session.completed");
});

test("rejects a tampered payload", () => {
  const payload = JSON.stringify({ id: "evt_2", type: "x" });
  const sig = sign(payload);
  assert.throws(() => billing.constructEvent(payload.replace("evt_2", "evt_X"), sig));
});

test("rejects a bogus signature", () => {
  assert.throws(() => billing.constructEvent(JSON.stringify({ id: "evt_3" }), "t=1,v1=dead"));
});

test("getPlan resolves configured plans", () => {
  assert.equal(billing.getPlan("pro")?.monthlyQuota, 10_000);
  assert.equal(billing.getPlan("nope"), undefined);
});
