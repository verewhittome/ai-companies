import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF guard. A public extraction API that fetches arbitrary user-supplied URLs
 * is a textbook server-side request forgery vector: callers can point it at
 * cloud metadata endpoints (169.254.169.254), internal services, or localhost.
 * We reject non-http(s) schemes and any host that resolves to a private,
 * loopback, link-local, or otherwise non-public address. This must run on the
 * FINAL url of every redirect hop, not just the first request.
 */

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — extract and check the v4 part.
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // not a parseable IP — refuse
}

/**
 * Throws BlockedUrlError if the URL is not a safe, public http(s) target.
 * Performs DNS resolution and validates every resolved address.
 */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BlockedUrlError(`Unsupported scheme: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new BlockedUrlError("Refusing to fetch localhost");
  }

  // If the host is already a literal IP, validate it directly.
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new BlockedUrlError("Refusing to fetch a private/reserved IP");
    }
    return;
  }

  // Otherwise resolve and validate every address it maps to.
  let records: { address: string }[];
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new BlockedUrlError("DNS resolution failed");
  }

  if (records.length === 0) {
    throw new BlockedUrlError("Host did not resolve");
  }

  for (const { address } of records) {
    if (isPrivateAddress(address)) {
      throw new BlockedUrlError("Host resolves to a private/reserved address");
    }
  }
}
