# webextract

**URL → clean, LLM-ready markdown + structured metadata + links.**

A focused content-extraction API for the AI-agent / RAG era. Point it at any web
page; get back the main article as markdown (boilerplate, nav, ads, and chrome
removed by Mozilla Readability), plus title, byline, OpenGraph metadata, and
resolved outbound links. Built to be cheap, fast, and correct on the long tail
of pages that the big "reader" APIs over-charge for.

This is business #1 in the `ai-companies` repo: a self-hostable utility API,
designed to be listed on RapidAPI for discovery **and** sold direct (we own the
billing rail, so we are not hostage to any single marketplace's payout policy).

## Why this exists / who pays

Every team building an LLM agent, RAG pipeline, or research tool needs to turn
messy HTML into clean text. The incumbents (Firecrawl, Jina Reader, Microlink)
prove the willingness to pay. The wedge here is the **price-sensitive long tail**
on RapidAPI's 8M-developer marketplace: a single, well-documented endpoint that
does one job well and undercuts on price.

## Endpoints

| Method | Path       | Purpose                                  |
|--------|------------|------------------------------------------|
| GET    | `/health`  | Liveness probe.                          |
| POST   | `/extract` | Extract one URL.                         |
| POST   | `/batch`   | Extract up to 20 URLs in one call.       |

### `POST /extract`

```json
{
  "url": "https://example.com/article",
  "formats": ["markdown", "text", "html", "links"],
  "selector": ".article-body",
  "includeMetadata": true,
  "includeLinks": true,
  "timeoutMs": 15000
}
```

Only `url` is required. `formats` defaults to `["markdown"]`.

Response (abridged):

```json
{
  "url": "https://example.com/article",
  "resolvedUrl": "https://example.com/article",
  "statusCode": 200,
  "title": "The Real Headline",
  "byline": "Jane Doe",
  "excerpt": "A short description ...",
  "wordCount": 1009,
  "markdown": "...clean markdown...",
  "metadata": { "siteName": "...", "lang": "en", "image": "...", "canonical": "..." },
  "fetchedAt": "2026-06-14T18:30:58.126Z"
}
```

### `POST /batch`

```json
{ "urls": ["https://a.com", "https://b.com"], "formats": ["markdown"] }
```

Returns `{ count, results: [...] }`; each result has `ok: true|false` so a single
bad URL never fails the whole batch.

## Running locally

```bash
npm install
npm run serve          # tsx, hot path, port 8080 (override with PORT)
npm test               # unit tests against HTML fixtures (no network)
```

## Production

```bash
docker build -f src/webextract/Dockerfile -t webextract .
docker run -p 8080:8080 \
  -e WEBEXTRACT_API_KEYS=key_live_abc,key_live_def \
  webextract
```

## Configuration (env)

| Variable                 | Default | Meaning                                                        |
|--------------------------|---------|----------------------------------------------------------------|
| `PORT`                   | `8080`  | Listen port.                                                   |
| `WEBEXTRACT_API_KEYS`    | —       | Comma-separated keys checked against `X-API-Key` (direct sales).|
| `RAPIDAPI_PROXY_SECRET`  | —       | Shared secret RapidAPI forwards as `X-RapidAPI-Proxy-Secret`.   |
| `RATE_LIMIT_PER_MIN`     | `60`    | Per-key/IP fixed-window limit on the direct (non-RapidAPI) path.|

If neither `WEBEXTRACT_API_KEYS` nor `RAPIDAPI_PROXY_SECRET` is set, the server
runs **open** (dev only). Set at least one before exposing it publicly.

## Safety

- **SSRF guard** (`ssrf.ts`): rejects non-http(s) schemes and any host that
  resolves to a loopback / private / link-local / CGNAT / reserved address —
  re-checked on **every redirect hop**. Blocks cloud-metadata attacks
  (`169.254.169.254`).
- **Resource caps**: 5 MB response limit, configurable timeout, max 5 redirects.
- Runs as a non-root user in the container.

## Status

Functional MVP: typechecks, unit-tested, live-verified against real pages. Not
yet deployed — see `docs/launch-checklist.md` at the repo root for what's needed
to go live and collect revenue.
