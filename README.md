# ai-companies

Experiments with AI-generated companies.

This repo is a sandbox for spinning up, running, and evaluating synthetic companies built by AI agents — from ideation and branding through operations, tooling, and outcome tracking.

## Structure

```
experiments/   # One folder per experiment run
src/           # Shared types, utilities, and experiment runners
data/          # Generated artifacts (gitignored by default)
```

## Setup

```bash
npm install
cp .env.example .env
```

Add your API keys to `.env`, then run:

```bash
npm run experiment -- --help
```

## Experiments

Each experiment lives in `experiments/<name>/` with its own brief, config, and outputs. Shared logic lives in `src/`.

## Businesses (real, revenue-seeking)

This repo is shifting from generating *fictional* company briefs to building
*real* products with a path to revenue. Ideation is the cheap part; the work is
shipping something people pay for and getting it in front of buyers.

### #1 — `webextract` (`src/webextract/`)

A self-hostable **URL → LLM-ready markdown + metadata** API. Built, tested, and
live-verified. Designed to be listed on RapidAPI (discovery) and sold direct via
Stripe (so we own a billing rail independent of any one marketplace).

- Run it: `npm run serve` · Test: `npm test`
- Product docs: [`src/webextract/README.md`](src/webextract/README.md)
- Go-live requirements: [`docs/launch-checklist.md`](docs/launch-checklist.md)
- Marketplace listing copy: [`docs/rapidapi-listing.md`](docs/rapidapi-listing.md)

**Status:** code complete, not yet deployed. Deployment + monetization is blocked
on credentials only a human can provide (hosting, domain, RapidAPI/Stripe
accounts) — see the launch checklist.
