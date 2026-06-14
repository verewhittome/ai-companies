import { assertPublicUrl, BlockedUrlError } from "./ssrf.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap on response body
const MAX_REDIRECTS = 5;
const USER_AGENT =
  "webextract/1.0 (+https://github.com/; LLM-ready content extraction bot)";

export class FetchError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "FetchError";
    this.statusCode = statusCode;
  }
}

export interface FetchedDocument {
  resolvedUrl: string;
  status: number;
  contentType: string;
  body: string;
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new FetchError("Response exceeds 5 MB limit", 413);
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

/**
 * Fetch with manual redirect handling so the SSRF guard runs on every hop
 * (native fetch's automatic redirects would let an attacker bounce from a
 * public URL to an internal one without re-validation). Enforces a timeout
 * and a response-size cap.
 */
export async function fetchDocument(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<FetchedDocument> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          "accept-language": "en-US,en;q=0.9",
        },
      });
    } catch (err) {
      if (err instanceof BlockedUrlError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new FetchError("Upstream fetch timed out", 504);
      }
      throw new FetchError(
        `Upstream fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    // Manual redirect handling.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new FetchError(`Redirect (${res.status}) without Location header`);
      }
      current = new URL(location, current).toString();
      continue;
    }

    if (res.status >= 400) {
      throw new FetchError(`Upstream returned HTTP ${res.status}`, 502);
    }

    const contentType = res.headers.get("content-type") ?? "";
    const body = await readCapped(res);
    return { resolvedUrl: current, status: res.status, contentType, body };
  }

  throw new FetchError(`Exceeded ${MAX_REDIRECTS} redirects`, 508);
}
