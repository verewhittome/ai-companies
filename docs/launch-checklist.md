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

## ✅ Product #3: phonecheck (LIVE as of 2026-06-15)

Phone validation/formatting API (Google libphonenumber, offline). Brand: **phonecheck**.

| Component | URL / ID | Status |
|-----------|----------|--------|
| Site | https://phonecheck-site.onrender.com (`srv-d8nr5r... static`) | live |
| API | https://phonecheck-api-ft15.onrender.com (`srv-d8nrbkurnols73e3q50g`, Starter) | live, verified |
| Postgres | shared `dpg-d8nhmm67r5hc73arcksg-a` | connected |
| Stripe catalog | Pro/Ultra/Mega (LIVE, $10/$35/$99) | created |
| Stripe webhook | `we_1TiVl4…` → phonecheck `/billing/webhook` | enabled |

Endpoints: `GET/POST /validate`, `POST /batch`. Returns validity, E.164/national/
international/RFC3966 formats, country, calling code, line type, is_mobile.
Verified live. Same one unverified link (real payment chain).

## ALL 10 PRODUCTS LIVE — RapidAPI listing reference (2026-06-15)

All on the shared core, one Stripe account ("Toska AI"), one Postgres. Each has a
live Stripe catalog + webhook + metered direct checkout. OpenAPI specs for import
are in `docs/openapi/<product>.json`.

| Product | API base URL | Endpoints | Pricing (Pro/Ultra/Mega) | Tier |
|---|---|---|---|---|
| webextract | https://webextract-api-kxu8.onrender.com | POST /extract, /batch | $9/$29/$99 | Starter |
| emailcheck | https://emailcheck-api.onrender.com | POST /validate, /batch | $12/$39/$99 | Starter |
| phonecheck | https://phonecheck-api-ft15.onrender.com | POST /validate, /batch | $10/$35/$99 | Starter |
| linkpreview | https://linkpreview-api-ygfs.onrender.com | GET/POST /preview | $8/$24/$79 | free |
| uaparse | https://uaparse-api.onrender.com | GET/POST /parse | $8/$24/$79 | free |
| langdetect | https://langdetect-api.onrender.com | GET/POST /detect | $9/$29/$99 | free |
| fxrates | https://fxrates-api.onrender.com | GET /rates, /convert | $9/$29/$99 | free |
| htmlclean | https://htmlclean-api.onrender.com | POST /sanitize | $9/$29/$99 | free |
| qrcode | https://qrcode-api-esh1.onrender.com | GET/POST /generate | $7/$19/$59 | free |
| profanity | https://profanity-api-vc7h.onrender.com | GET/POST /check | $9/$29/$99 | free |

All Basic tiers are $0 / 100 calls/mo. Admin keys + per-service proxy secrets are
in `.env` (`<PRODUCT>_ADMIN_KEY`, `<PRODUCT>_PROXY_SECRET`).

⚠️ **Products #4–#10 run on Render's FREE tier and spin down when idle** (Render
returns a "no-server" 404 for ~30–50s while waking). Functionally verified, but
**upgrade each to Starter before publishing on RapidAPI** or RapidAPI's automated
endpoint tests will intermittently fail. Bulk upgrade: PATCH each service's plan
via the Render API (ask the agent to run it). Cost: +$7/mo per upgraded service.

Monthly infra now ≈ $28 (3 Starter + Postgres); +$49/mo if all 7 move to Starter.

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
