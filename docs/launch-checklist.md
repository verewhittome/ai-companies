# Launch checklist — what's needed to actually collect revenue

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
