import { createService } from "../core/server.js";
import { webextractConfig } from "./config.js";
import { extract } from "./extractor.js";
import { BlockedUrlError } from "./ssrf.js";
import { FetchError } from "./fetcher.js";
import { BatchRequestSchema, ExtractRequestSchema, type ExtractResult } from "./types.js";

function statusForError(err: unknown): number {
  if (err instanceof BlockedUrlError) return 400;
  if (err instanceof FetchError) return err.statusCode;
  return 500;
}

const { app, start } = createService({
  cfg: webextractConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    app.post("/extract", authAndMeter, rateLimit, async (req, res) => {
      const parsed = ExtractRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }
      try {
        res.json(await extract(parsed.data));
      } catch (err) {
        res.status(statusForError(err)).json({
          error: err instanceof Error ? err.message : "Extraction failed",
          url: parsed.data.url,
        });
      }
    });

    app.post("/batch", authAndMeter, rateLimit, async (req, res) => {
      const parsed = BatchRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }
      const { urls, ...shared } = parsed.data;
      const settled = await Promise.allSettled(urls.map((url) => extract({ url, ...shared })));
      const results = settled.map((s, i) =>
        s.status === "fulfilled"
          ? ({ ok: true, ...s.value } as ExtractResult & { ok: true })
          : {
              ok: false as const,
              url: urls[i],
              error: s.reason instanceof Error ? s.reason.message : "Extraction failed",
            },
      );
      res.json({ count: results.length, results });
    });
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  start().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}
