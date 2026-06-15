import { createService } from "../core/server.js";
import { langdetectConfig, DetectRequestSchema } from "./config.js";
import { detectLanguage } from "./detect.js";

const { app, start } = createService({
  cfg: langdetectConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    const handler = (req: import("express").Request, res: import("express").Response) => {
      const input = req.method === "GET" ? { text: req.query.text } : req.body;
      const parsed = DetectRequestSchema.safeParse(input);
      if (!parsed.success) {
        res.status(422).json({ error: "Provide text", details: parsed.error.issues });
        return;
      }
      res.json(detectLanguage(parsed.data.text));
    };
    app.get("/detect", authAndMeter, rateLimit, handler);
    app.post("/detect", authAndMeter, rateLimit, handler);
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) start().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
