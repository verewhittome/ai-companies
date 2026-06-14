import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

// Configure env BEFORE importing the module under test (it reads env lazily, but
// be explicit). Dummy values are fine — signature verification is local crypto.
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

const { constructEvent } = await import("./stripe.js");
const { planForPriceId, getPlan } = await import("./plans.js");

const stripe = new Stripe("sk_test_dummy");

function signed(payload: string) {
  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_test_secret",
  });
}

test("accepts a correctly signed webhook payload", () => {
  const payload = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_1" } },
  });
  const event = constructEvent(payload, signed(payload));
  assert.equal(event.type, "checkout.session.completed");
  assert.equal((event.data.object as { id: string }).id, "cs_test_1");
});

test("rejects a tampered payload", () => {
  const payload = JSON.stringify({ id: "evt_2", type: "checkout.session.completed" });
  const sig = signed(payload);
  const tampered = payload.replace("evt_2", "evt_HACKED");
  assert.throws(() => constructEvent(tampered, sig));
});

test("rejects a bogus signature", () => {
  const payload = JSON.stringify({ id: "evt_3" });
  assert.throws(() => constructEvent(payload, "t=1,v1=deadbeef"));
});

test("plan reverse-lookup resolves from price id", () => {
  process.env.STRIPE_PRICE_PRO = "price_pro_123";
  const plan = planForPriceId("price_pro_123");
  assert.equal(plan?.key, "pro");
  assert.equal(getPlan("pro")?.monthlyQuota, 10_000);
  delete process.env.STRIPE_PRICE_PRO;
});
