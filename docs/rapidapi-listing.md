# webextract — RapidAPI listing copy & pricing

Ready-to-paste content for publishing `webextract` on RapidAPI (rapidapi.com →
"My APIs" → Add New API). RapidAPI handles discovery (8M devs), auth, metering,
and billing; we expose the base URL and a proxy secret.

## Short description (≤ 100 chars)

> Turn any URL into clean, LLM-ready markdown + structured metadata. Built for RAG & AI agents.

## Long description

> **webextract** converts messy web pages into clean, structured content your
> models can actually use. One call returns the main article as markdown — nav,
> ads, cookie banners, and boilerplate stripped via Mozilla Readability — plus
> title, byline, OpenGraph metadata, and resolved outbound links. Optional CSS
> selector targeting and batch mode (up to 20 URLs/call). Fast, predictable, and
> priced for high-volume RAG and agent pipelines. SSRF-hardened.
>
> **Endpoints:** `POST /extract`, `POST /batch`, `GET /health`.

## Category

Data / Tools (secondary: Artificial Intelligence)

## Tags

`scraping`, `markdown`, `readability`, `rag`, `llm`, `web-content`, `metadata`, `ai-agents`

## Pricing tiers (recommended)

Undercut the incumbents on the casual/long-tail tier; this is the gap research
showed is empty. Hard quota + overage.

| Plan      | Price     | Quota              | Overage        |
|-----------|-----------|--------------------|----------------|
| BASIC     | $0/mo     | 100 req/mo         | hard stop      |
| PRO       | $9/mo     | 10,000 req/mo      | $0.001/req     |
| ULTRA     | $29/mo    | 50,000 req/mo      | $0.0008/req    |
| MEGA      | $99/mo    | 250,000 req/mo     | $0.0005/req    |

Rationale: free tier drives trial/discovery; $9 PRO captures the "casual paid"
segment that research found essentially unserved; per-req overage means revenue
scales with usage at ~90%+ gross margin (cost is bandwidth + a small VM).
RapidAPI takes 25%, so net is ~75% of the above.

## Required RapidAPI config (LIVE values)

- **Base URL:** `https://webextract-api-kxu8.onrender.com`
- **Proxy secret:** the server already enforces `RAPIDAPI_PROXY_SECRET` (value is
  in `.env`). RapidAPI generates ITS OWN proxy secret per API — see step 5 below;
  you must set the server's `RAPIDAPI_PROXY_SECRET` env var to match the value
  RapidAPI shows, then redeploy. (Until then, RapidAPI traffic will 401.)
- **Endpoints to declare:** `POST /extract`, `POST /batch`, `GET /health`.

## Publish steps (manual, ~10 min — RapidAPI has no listing API)

1. Go to rapidapi.com → **My APIs** → **Add New API**. Name: `webextract`.
   Category: Data (secondary: Artificial Intelligence). Paste the short + long
   descriptions and tags from above.
2. **Define** → set Base URL to `https://webextract-api-kxu8.onrender.com`.
3. Add endpoints: `POST /extract`, `POST /batch`, `GET /health`. For `/extract`,
   add a JSON body example: `{"url":"https://example.com","includeMetadata":true}`.
4. **Plans & Pricing** → create BASIC/PRO/ULTRA/MEGA with the quotas above and a
   hard request quota per month + overage.
5. **Security** → RapidAPI shows a **Proxy Secret**. Copy it. In Render
   (service `srv-d8nhjjurnols73dpj54g`) set env `RAPIDAPI_PROXY_SECRET` to that
   value and redeploy. Now RapidAPI-forwarded calls authenticate; direct callers
   still need an `X-API-Key`.
6. Set payout/bank/tax under your account, then **Make Public**.

## Example request (for the listing's "Code Snippets")

```bash
curl -X POST "https://webextract-api-kxu8.onrender.com/extract" \
  -H "X-RapidAPI-Proxy-Secret: <rapidapi-proxy-secret>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://en.wikipedia.org/wiki/Model_Context_Protocol","includeMetadata":true}'
```

## Optional: custom domain via Namecheap

1. In Render, add a custom domain to each service (API: e.g. `api.webextract.app`;
   site: `webextract.app`). Render shows the required DNS target.
2. In Namecheap (Advanced DNS), add the records Render specifies — typically a
   `CNAME` for the API subdomain → `webextract-api-kxu8.onrender.com`, and for the
   apex either an `ALIAS`/`ANAME` (Namecheap supports `CNAME`/`ALIAS` via "URL
   Redirect"/ "ANAME") → the static site target.
3. Wait for Render to issue TLS. Then update `SITE_URL` / `API_BASE_URL` env vars
   and the site's Subscribe links + Stripe webhook URL to the new domain.
