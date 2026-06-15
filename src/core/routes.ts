import type { RequestHandler } from "express";
import type { Billing } from "./billing.js";
import type { ProductConfig } from "./types.js";

/** Builds the /billing/* HTTP handlers for a product. */
export function createBillingRoutes(billing: Billing, cfg: ProductConfig) {
  const webhookHandler: RequestHandler = async (req, res) => {
    const signature = req.header("stripe-signature");
    if (!signature) {
      res.status(400).send("Missing stripe-signature");
      return;
    }
    let event;
    try {
      event = billing.constructEvent(req.body as Buffer, signature);
    } catch (err) {
      res
        .status(400)
        .send(`Webhook signature verification failed: ${err instanceof Error ? err.message : "?"}`);
      return;
    }
    try {
      await billing.handleEvent(event);
      res.json({ received: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "handler failed" });
    }
  };

  const checkoutRedirectHandler: RequestHandler = async (req, res) => {
    const plan = billing.getPlan(String(req.query.plan ?? ""));
    if (!plan) {
      res.status(400).send("Unknown plan");
      return;
    }
    try {
      res.redirect(303, await billing.createCheckoutSession(plan));
    } catch (err) {
      res.status(500).send(err instanceof Error ? err.message : "checkout failed");
    }
  };

  const checkoutJsonHandler: RequestHandler = async (req, res) => {
    const plan = billing.getPlan(String(req.body?.plan ?? ""));
    if (!plan) {
      res.status(400).json({ error: "Unknown plan" });
      return;
    }
    try {
      res.json({ url: await billing.createCheckoutSession(plan) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "checkout failed" });
    }
  };

  const successHandler: RequestHandler = async (req, res) => {
    const sessionId = String(req.query.session_id ?? "");
    if (!sessionId) {
      res.status(400).send("Missing session_id");
      return;
    }
    try {
      const result = await billing.fulfillSession(sessionId);
      if (!result) {
        res.status(202).send("Payment is still processing. Refresh in a few seconds.");
        return;
      }
      res.status(200).type("html").send(successPage(cfg, result.apiKey, result.plan));
    } catch (err) {
      res.status(500).send(err instanceof Error ? err.message : "fulfilment failed");
    }
  };

  return { webhookHandler, checkoutRedirectHandler, checkoutJsonHandler, successHandler };
}

function successPage(cfg: ProductConfig, apiKey: string, plan: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Your ${cfg.displayName} API key</title>
<style>
body{background:#0b0d12;color:#e7eaf0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;max-width:680px;margin:0 auto;padding:48px 24px}
a{color:#6ea8fe}.key{background:#0e1117;border:1px solid #232838;border-radius:10px;padding:16px;font-family:ui-monospace,Menlo,monospace;font-size:15px;word-break:break-all;user-select:all}
pre{background:#0e1117;border:1px solid #232838;border-radius:10px;padding:16px;overflow-x:auto;font-size:13px}
.ok{color:#4ade80;font-weight:600}h1{letter-spacing:-.02em}
</style></head><body>
<p class="ok">✓ Subscription active — ${plan.toUpperCase()} plan</p>
<h1>Your ${cfg.displayName} API key</h1>
<p>Save this now. Send it as the <code>X-API-Key</code> header on every request.</p>
<div class="key">${apiKey}</div>
<h3>Quickstart</h3>
${cfg.quickstart(apiKey)}
<p>Questions? <a href="mailto:vere@kaylie.ai">vere@kaylie.ai</a> · <a href="${cfg.siteUrl()}">${cfg.displayName}</a></p>
</body></html>`;
}
