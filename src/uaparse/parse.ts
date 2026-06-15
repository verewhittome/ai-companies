import { UAParser } from "ua-parser-js";

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|monitor|curl|wget|python-requests|headless|lighthouse|pingdom|uptime/i;

export interface UAResult {
  ua: string;
  browser: { name?: string; version?: string };
  engine: { name?: string; version?: string };
  os: { name?: string; version?: string };
  device: { vendor?: string; model?: string; type: string };
  cpu: { architecture?: string };
  is_bot: boolean;
  is_mobile: boolean;
}

export function parseUA(ua: string): UAResult {
  const r = new UAParser(ua).getResult();
  const type = r.device.type ?? "desktop";
  return {
    ua,
    browser: { name: r.browser.name, version: r.browser.version },
    engine: { name: r.engine.name, version: r.engine.version },
    os: { name: r.os.name, version: r.os.version },
    device: { vendor: r.device.vendor, model: r.device.model, type },
    cpu: { architecture: r.cpu.architecture },
    is_bot: BOT_RE.test(ua),
    is_mobile: type === "mobile" || type === "tablet",
  };
}
