const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const TTL_MS = 6 * 60 * 60 * 1000; // ECB publishes once per working day

export type RateMap = Record<string, number>; // EUR-based: { EUR:1, USD:1.08, ... }

/** Pure: parse the ECB daily XML into an EUR-based rate map + the quote date. */
export function parseEcbXml(xml: string): { date: string | null; rates: RateMap } {
  const date = xml.match(/time=['"]([\d-]+)['"]/)?.[1] ?? null;
  const rates: RateMap = { EUR: 1 };
  const re = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) rates[m[1]] = Number.parseFloat(m[2]);
  return { date, rates };
}

/** Pure: rebase EUR-based rates to an arbitrary base currency. */
export function rebase(ecb: RateMap, base: string, symbols?: string[]): RateMap {
  const b = ecb[base];
  if (!b) throw new Error(`Unsupported base currency: ${base}`);
  const out: RateMap = {};
  const keys = symbols && symbols.length ? symbols : Object.keys(ecb);
  for (const k of keys) {
    if (ecb[k] === undefined) continue;
    out[k] = Number((ecb[k] / b).toFixed(6));
  }
  return out;
}

/** Pure: convert an amount between currencies via the EUR-based map. */
export function convertAmount(ecb: RateMap, from: string, to: string, amount: number): number {
  if (!ecb[from]) throw new Error(`Unsupported currency: ${from}`);
  if (!ecb[to]) throw new Error(`Unsupported currency: ${to}`);
  return Number(((amount * ecb[to]) / ecb[from]).toFixed(6));
}

let cache: { date: string | null; rates: RateMap; fetchedAt: number } | null = null;

export async function getEcbRates(): Promise<{ date: string | null; rates: RateMap }> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return { date: cache.date, rates: cache.rates };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(ECB_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`ECB returned HTTP ${res.status}`);
    const parsed = parseEcbXml(await res.text());
    if (Object.keys(parsed.rates).length < 2) throw new Error("ECB feed parse produced no rates");
    cache = { ...parsed, fetchedAt: Date.now() };
    return parsed;
  } catch (err) {
    if (cache) return { date: cache.date, rates: cache.rates }; // serve stale on failure
    throw err instanceof Error ? err : new Error("Failed to fetch ECB rates");
  } finally {
    clearTimeout(t);
  }
}
