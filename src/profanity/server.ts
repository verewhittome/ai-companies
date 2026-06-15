import { createService } from "../core/server.js";
import { profanityConfig, CheckRequestSchema } from "./config.js";
import { checkProfanity } from "./check.js";

const { app, start } = createService({
  cfg: profanityConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    const handler = (req: import("express").Request, res: import("express").Response) => {
      const input = req.method === "GET" ? { text: req.query.text, censorChar: req.query.censorChar } : req.body;
      const parsed = CheckRequestSchema.safeParse(input);
      if (!parsed.success) {
        res.status(422).json({ error: "Provide text", details: parsed.error.issues });
        return;
      }
      res.json(checkProfanity(parsed.data.text, parsed.data.censorChar ?? "*"));
    };
    app.get("/check", authAndMeter, rateLimit, handler);
    app.post("/check", authAndMeter, rateLimit, handler);
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) start().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
