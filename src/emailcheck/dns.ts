import { resolveMx, resolve4 } from "node:dns/promises";

/** Result of the DNS deliverability probe for a domain. */
export interface MxCheck {
  has_mx: boolean;
  mx_count: number;
  domain_resolves: boolean;
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Check whether a domain can receive mail: MX records (preferred) or, failing
 * that, an A record (some domains accept mail on the bare host). Never throws —
 * DNS failures resolve to "not deliverable". Bounded by a timeout.
 */
export async function checkMx(domain: string, timeoutMs = 5000): Promise<MxCheck> {
  const mx = await withTimeout(
    resolveMx(domain).catch(() => [] as { exchange: string; priority: number }[]),
    timeoutMs,
    [],
  );
  if (mx.length > 0) {
    return { has_mx: true, mx_count: mx.length, domain_resolves: true };
  }
  const a = await withTimeout(
    resolve4(domain).catch(() => [] as string[]),
    timeoutMs,
    [],
  );
  return { has_mx: false, mx_count: 0, domain_resolves: a.length > 0 };
}
