/**
 * Pure (network-free) email analysis: syntax, normalization, and classification
 * against embedded lists. MX/deliverability is added separately (see dns.ts) so
 * this stays unit-testable with no network.
 */

// Common free webmail providers (a paid corporate domain is usually higher
// value for B2B lead-gen, so callers want to flag these).
const FREE_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "ymail.com",
  "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "protonmail.com", "proton.me",
  "gmx.com", "gmx.net", "mail.com", "zoho.com", "yandex.com", "yandex.ru",
  "fastmail.com", "tutanota.com", "pm.me", "hey.com",
]);

// Disposable / temporary mailbox domains (deliverable but worthless for signups).
const DISPOSABLE = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com", "guerrillamail.net",
  "sharklasers.com", "grr.la", "10minutemail.com", "10minutemail.net",
  "tempmail.com", "temp-mail.org", "throwawaymail.com", "getnada.com",
  "trashmail.com", "trashmail.net", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "mailnesia.com", "mintemail.com", "mohmal.com",
  "spamgourmet.com", "tempinbox.com", "emailondeck.com", "mailcatch.com",
  "burnermail.io", "33mail.com", "anonbox.net", "spam4.me", "tempr.email",
  "discard.email", "mailsac.com", "inboxkitten.com", "tmpmail.org",
  "tmpmail.net", "moakt.com", "luxusmail.org", "wegwerfmail.de",
]);

// Role-based local parts (often shared inboxes, lower personalisation value).
const ROLE_LOCALS = new Set([
  "admin", "administrator", "info", "support", "sales", "contact", "help",
  "billing", "accounts", "noreply", "no-reply", "donotreply", "postmaster",
  "webmaster", "hostmaster", "abuse", "marketing", "office", "team", "hello",
  "enquiries", "inquiries", "service", "hr", "jobs", "careers", "press",
]);

// Popular domains used for "did you mean" typo correction.
const POPULAR_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "live.com", "icloud.com", "aol.com", "protonmail.com", "msn.com",
];

const SYNTAX_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailAnalysis {
  email: string;
  normalized: string;
  valid_syntax: boolean;
  local_part: string | null;
  domain: string | null;
  is_free: boolean;
  is_role: boolean;
  is_disposable: boolean;
  did_you_mean: string | null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function suggestDomain(domain: string): string | null {
  if (POPULAR_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDist = 3; // only suggest for near-misses
  for (const popular of POPULAR_DOMAINS) {
    const d = levenshtein(domain, popular);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = popular;
    }
  }
  return best;
}

function normalize(local: string, domain: string): string {
  const d = domain.toLowerCase();
  let l = local;
  // Gmail ignores dots and everything after '+'.
  if (d === "gmail.com" || d === "googlemail.com") {
    l = l.split("+")[0].replace(/\./g, "").toLowerCase();
    return `${l}@gmail.com`;
  }
  return `${l.toLowerCase()}@${d}`;
}

export function analyzeEmail(raw: string): EmailAnalysis {
  const email = raw.trim();
  const valid_syntax =
    email.length <= 254 && SYNTAX_RE.test(email) && email.split("@")[0].length <= 64;

  if (!valid_syntax) {
    return {
      email,
      normalized: email.toLowerCase(),
      valid_syntax: false,
      local_part: null,
      domain: null,
      is_free: false,
      is_role: false,
      is_disposable: false,
      did_you_mean: null,
    };
  }

  const atIdx = email.lastIndexOf("@");
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1).toLowerCase();

  return {
    email,
    normalized: normalize(local, domain),
    valid_syntax: true,
    local_part: local,
    domain,
    is_free: FREE_PROVIDERS.has(domain),
    is_role: ROLE_LOCALS.has(local.toLowerCase()),
    is_disposable: DISPOSABLE.has(domain),
    did_you_mean: suggestDomain(domain),
  };
}

/**
 * Quality score 0..1. Syntax is a hard gate; MX, disposable, and role status
 * adjust the rest. `hasMx` comes from the DNS step (null when not checked).
 */
export function scoreEmail(a: EmailAnalysis, hasMx: boolean | null): number {
  if (!a.valid_syntax) return 0;
  let score = 0.5;
  if (hasMx === true) score += 0.4;
  else if (hasMx === false) score -= 0.4;
  if (a.is_disposable) score -= 0.5;
  if (a.is_role) score -= 0.1;
  if (a.did_you_mean) score -= 0.2;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}
