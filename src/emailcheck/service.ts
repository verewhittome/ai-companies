import { analyzeEmail, scoreEmail } from "./validator.js";
import { checkMx } from "./dns.js";
import type { ValidateResult } from "./types.js";

/** Full single-email validation: analysis + (optional) DNS deliverability. */
export async function validateEmail(email: string, skipMx = false): Promise<ValidateResult> {
  const a = analyzeEmail(email);

  let has_mx: boolean | null = null;
  let mx_count = 0;
  let domain_resolves: boolean | null = null;

  if (a.valid_syntax && a.domain && !skipMx) {
    const mx = await checkMx(a.domain);
    has_mx = mx.has_mx;
    mx_count = mx.mx_count;
    domain_resolves = mx.domain_resolves;
  }

  const score = scoreEmail(a, has_mx);
  const deliverable = a.valid_syntax && !a.is_disposable && has_mx !== false;

  return {
    email: a.email,
    normalized: a.normalized,
    valid_syntax: a.valid_syntax,
    local_part: a.local_part,
    domain: a.domain,
    is_free: a.is_free,
    is_role: a.is_role,
    is_disposable: a.is_disposable,
    has_mx,
    mx_count,
    domain_resolves,
    did_you_mean: a.did_you_mean,
    deliverable,
    score,
  };
}
