import { createService } from "../core/server.js";
import { htmlcleanConfig, SanitizeRequestSchema } from "./config.js";
import { cleanHtml } from "./sanitize.js";

const { app, start } = createService({
  cfg: htmlcleanConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    app.post("/sanitize", authAndMeter, rateLimit, (req, res) => {
      const parsed = SanitizeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Provide html", details: parsed.error.issues });
        return;
      }
      res.json(cleanHtml(parsed.data.html, parsed.data.profile ?? "default"));
    });
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) start().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
