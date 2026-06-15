import { createService } from "../core/server.js";
import { linkpreviewConfig, PreviewRequestSchema } from "./config.js";
import { getPreview } from "./preview.js";
import { BlockedUrlError } from "../webextract/ssrf.js";
import { FetchError } from "../webextract/fetcher.js";

function statusForError(err: unknown): number {
  if (err instanceof BlockedUrlError) return 400;
  if (err instanceof FetchError) return err.statusCode;
  return 500;
}

const { app, start } = createService({
  cfg: linkpreviewConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    const handler = async (req: import("express").Request, res: import("express").Response) => {
      const input = req.method === "GET" ? { url: req.query.url } : req.body;
      const parsed = PreviewRequestSchema.safeParse(input);
      if (!parsed.success) {
        res.status(422).json({ error: "Provide a valid url", details: parsed.error.issues });
        return;
      }
      try {
        res.json(await getPreview(parsed.data.url, parsed.data.timeoutMs));
      } catch (err) {
        res.status(statusForError(err)).json({
          error: err instanceof Error ? err.message : "Preview failed",
          url: parsed.data.url,
        });
      }
    };
    app.get("/preview", authAndMeter, rateLimit, handler);
    app.post("/preview", authAndMeter, rateLimit, handler);
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) start().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
