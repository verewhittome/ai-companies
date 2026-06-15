# Launch checklist — what's needed to actually collect revenue

## ✅ LIVE as of 2026-06-14

Business #1 (`webextract`) is deployed and can take money. Brand: **webextract**.

| Component | URL / ID | Status |
|-----------|----------|--------|
| Marketing site | https://webextract-site.onrender.com (`srv-d8nh2mnlk1mc739nsv2g`) | live, verified |
| API | https://webextract-api-kxu8.onrender.com (`srv-d8nhjjurnols73dpj54g`, Starter) | live, verified |
| Postgres | `dpg-d8nhmm67r5hc73arcksg-a` (basic_256mb) | available, connected |
| Stripe catalog | Pro `price_1TiLTt…`, Ultra `price_1TiLTu…AdeB`, Mega `price_1TiLTu…nE7t` (LIVE) | created |
| Stripe webhook | `we_1TiLUC…` → `/billing/webhook` | enabled |

**Verified in production:** `/health` → `billing:enabled`; `/extract` returns
clean markdown; auth enforced (proxy-secret/admin-key 200, bad key 401);
`/billing/checkout?plan=pro` → real `cs_live_…` Stripe checkout URL; site
Subscribe buttons point at live checkout. 9/9 unit tests pass.

## ✅ Product #2: emailcheck (LIVE as of 2026-06-15)

Email validation API on the shared core. Brand: **emailcheck**.

| Component | URL / ID | Status |
|-----------|----------|--------|
| Site | https://emailcheck-site.onrender.com (`srv-d8nr5r67r5hc73b4jepg`) | live |
| API | https://emailcheck-api.onrender.com (`srv-d8nr518js32c73e0ijgg`, Starter) | live, verified |
| Postgres | shared `dpg-d8nhmm67r5hc73arcksg-a` (product-scoped keys) | connected |
| Stripe catalog | Pro/Ultra/Mega (LIVE, $12/$39/$99) | created |
| Stripe webhook | `we_1TiVXw…` → emailcheck `/billing/webhook` | enabled |

Endpoints: `GET/POST /validate`, `POST /batch`. Returns syntax, gmail-normalized
form, MX deliverability, disposable/role/free flags, `did_you_mean`, score.
Verified live: clean gmail → deliverable 0.90; checkout → `cs_live_…`. Same one
unverified link as webextract (real payment → webhook → key issuance).

**Architecture:** `src/core/` is now a reusable multi-product platform
(product-scoped Postgres keys, Stripe billing factory, 3-rail auth, service
assembler, catalog helper). New products (#3 phonecheck, #4 linkpreview, …) are
~1 day each: write logic + `config.ts` + thin `server.ts`, run the catalog
script, create a Render service + webhook, wire env.

**The one UNVERIFIED link:** the post-payment chain (real card → webhook →
key issuance → quota metering) has not been exercised, because the Stripe keys
are LIVE-only — I won't charge a real card autonomously, and there are no
test-mode keys. The code is unit-tested (webhook signature) and the metering SQL
is atomic, but the full chain needs ONE of:
  - drop `sk_test_…`/`pk_test_…` into `.env` and re-run `setup-catalog.ts` against
    test mode, then complete a test checkout; OR
  - make one real $9 Pro purchase (refundable) as a smoke test.

### Remaining to reach customers
1. **Publish the RapidAPI listing** — manual dashboard work, ~10 min. Exact steps
   + live values in `rapidapi-listing.md`. This is the primary discovery channel.
2. **Verify the payment chain** (above).
3. **Optional:** custom domain via Namecheap (steps in `rapidapi-listing.md`).

### Operational secrets (all in gitignored `.env`)
`RAPIDAPI_PROXY_SECRET`, `WEBEXTRACT_API_KEYS` (admin), `STRIPE_WEBHOOK_SECRET`,
`DATABASE_URL` (external; service uses internal), `STRIPE_PRICE_*`.

---


The product (`webextract`) is built, tested, and live-verified locally. It earns
nothing until it's deployed behind a payment rail. An AI agent can build and
operate the software autonomously; it **cannot** conjure a legal entity, a bank
account, a domain, or marketplace accounts. Those require the human principal.

This is the honest gating list, ranked by what unblocks the first dollar fastest.

## Blocking — required before any revenue

1. **Hosting / deploy target.** A place to run the container with a public HTTPS
   URL. Cheapest paths: Fly.io, Railway, Render, or a small VPS (Hetzner/DigitalOcean).
   - *Need from you:* an account + API token for one provider, OR confirmation I
     should provision via a token you supply. ~$5–10/mo to start.
2. **Domain name.** For a credible API base URL + RapidAPI listing.
   - *Need from you:* a domain, or a registrar API token (e.g. Cloudflare,
     Namecheap) to register one (~$10/yr).
3. **RapidAPI provider account.** Discovery + billing rail #1.
   - *Need from you:* a RapidAPI account (rapidapi.com) with provider/payout set
     up. Listing copy is ready in `docs/rapidapi-listing.md`. Payout requires
     bank/tax details — likely tied to your business entity.
4. **Direct billing rail (recommended, given RapidAPI's payout reliability
   issues in 2026).** Stripe account + a tiny checkout/metering layer so we sell
   API keys directly and aren't hostage to one marketplace.
   - *Need from you:* a Stripe account + restricted API key. I'll build the
     key-issuing + metering layer.

## Strongly recommended

5. **Business entity + bank.** Marketplaces and Stripe need a payee. You have
   Mercury connected — if there's an existing entity (kaylie.ai), payouts can
   route there. *Need from you:* confirmation of which entity to bill under.
6. **Error monitoring** (Sentry free tier) + **uptime check** — so a paid API
   doesn't silently break. I can wire these with a DSN/token.

## What I will do once unblocked (no further input needed)

- Deploy the container, wire the domain + TLS, set env secrets.
- Publish the RapidAPI listing with the prepared copy and pricing tiers.
- Build the direct Stripe checkout + API-key issuance + usage metering service.
- Add monitoring, a status page, and a minimal landing page.
- Instrument usage analytics and iterate on the extraction quality / pricing.

## The unsentimental odds (so expectations are calibrated)

- This is a **commodity-adjacent** API in a category with strong incumbents
  (Firecrawl, Jina, Microlink). The realistic wedge is price + the empty
  long-tail tier, not technical superiority. Expect **low-to-moderate** revenue
  per listing: plausibly $0–$500/mo in the first few months, dependent almost
  entirely on RapidAPI search ranking and how many listings/products we stack.
- The model that works is **a portfolio of small APIs**, not one hero product.
  webextract is unit #1 and the reusable infra (server scaffold, auth, SSRF,
  Docker, billing layer) makes units #2–#10 fast to ship.
- The single biggest risk is not the code — it's **discovery**. If RapidAPI
  ranking doesn't deliver organic installs, revenue stays near zero regardless of
  product quality. That risk is why the direct Stripe rail and a multi-product
  portfolio matter.
