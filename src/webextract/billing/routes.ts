import type { Request, RequestHandler, Response } from "express";
import { getPlan } from "./plans.js";
import { constructEvent, createCheckoutSession, fulfillSession, handleEvent } from "./stripe.js";

const SITE_URL = () => process.env.SITE_URL ?? "https://webextract-site.onrender.com";

/** POST /billing/webhook — raw body; verifies signature then processes. */
export const webhookHandler: RequestHandler = async (req: Request, res: Response) => {
  const signature = req.header("stripe-signature");
  if (!signature) {
    res.status(400).send("Missing stripe-signature");
    return;
  }
  let event;
  try {
    // req.body is a Buffer here (express.raw).
    event = constructEvent(req.body as Buffer, signature);
  } catch (err) {
    res.status(400).send(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
    return;
  }
  try {
    await handleEvent(event);
    res.json({ received: true });
  } catch (err) {
    // 500 so Stripe retries.
    res.status(500).json({
      error: err instanceof Error ? err.message : "handler failed",
    });
  }
};

/** GET /billing/checkout?plan=pro — 302 to Stripe Checkout (for site buttons). */
export const checkoutRedirectHandler: RequestHandler = async (req, res) => {
  const plan = getPlan(String(req.query.plan ?? ""));
  if (!plan) {
    res.status(400).send("Unknown plan. Use ?plan=pro|ultra|mega");
    return;
  }
  try {
    const url = await createCheckoutSession(plan);
    res.redirect(303, url);
  } catch (err) {
    res.status(500).send(err instanceof Error ? err.message : "checkout failed");
  }
};

/** POST /billing/checkout { plan } — JSON { url } (for programmatic clients). */
export const checkoutJsonHandler: RequestHandler = async (req, res) => {
  const plan = getPlan(String(req.body?.plan ?? ""));
  if (!plan) {
    res.status(400).json({ error: "Unknown plan. Use pro|ultra|mega" });
    return;
  }
  try {
    const url = await createCheckoutSession(plan);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "checkout failed" });
  }
};

function successPage(apiKey: string, plan: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Your webextract API key</title>
<style>
body{background:#0b0d12;color:#e7eaf0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;max-width:680px;margin:0 auto;padding:48px 24px}
a{color:#6ea8fe}.key{background:#0e1117;border:1px solid #232838;border-radius:10px;padding:16px;font-family:ui-monospace,Menlo,monospace;font-size:15px;word-break:break-all;user-select:all}
pre{background:#0e1117;border:1px solid #232838;border-radius:10px;padding:16px;overflow-x:auto;font-size:13px}
.ok{color:#4ade80;font-weight:600}h1{letter-spacing:-.02em}
</style></head><body>
<p class="ok">✓ Subscription active — ${plan.toUpperCase()} plan</p>
<h1>Your webextract API key</h1>
<p>Save this now. Send it as the <code>X-API-Key</code> header on every request.</p>
<div class="key">${apiKey}</div>
<h3>Quickstart</h3>
<pre>curl -X POST "https://webextract-api-kxu8.onrender.com/extract" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","includeMetadata":true}'</pre>
<p>Questions? <a href="mailto:vere@kaylie.ai">vere@kaylie.ai</a> · <a href="${SITE_URL()}">webextract</a></p>
</body></html>`;
}

/** GET /billing/success?session_id=... — fulfils (idempotent) and shows the key. */
export const successHandler: RequestHandler = async (req, res) => {
  const sessionId = String(req.query.session_id ?? "");
  if (!sessionId) {
    res.status(400).send("Missing session_id");
    return;
  }
  try {
    const result = await fulfillSession(sessionId);
    if (!result) {
      res
        .status(202)
        .send("Payment is still processing. Refresh in a few seconds.");
      return;
    }
    res.status(200).type("html").send(successPage(result.apiKey, result.plan));
  } catch (err) {
    res.status(500).send(err instanceof Error ? err.message : "fulfilment failed");
  }
};
