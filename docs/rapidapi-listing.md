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

## Required RapidAPI config

- **Base URL:** the deployed HTTPS endpoint (e.g. `https://api.webextract.<domain>`).
- **Proxy secret:** set `RAPIDAPI_PROXY_SECRET` on the server to the value
  RapidAPI generates, so only RapidAPI-forwarded (metered) traffic is accepted.
- **Endpoints to declare:** `POST /extract`, `POST /batch`, `GET /health`.

## Example request (for the listing's "Code Snippets")

```bash
curl -X POST "https://<base-url>/extract" \
  -H "X-RapidAPI-Proxy-Secret: <secret>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://en.wikipedia.org/wiki/Model_Context_Protocol","includeMetadata":true}'
```
