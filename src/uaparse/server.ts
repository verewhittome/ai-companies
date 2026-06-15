import { createService } from "../core/server.js";
import { uaparseConfig, ParseRequestSchema } from "./config.js";
import { parseUA } from "./parse.js";

const { app, start } = createService({
  cfg: uaparseConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    const handler = (req: import("express").Request, res: import("express").Response) => {
      // Accept ua from body/query, or fall back to the caller's own User-Agent.
      const ua =
        (req.method === "GET" ? req.query.ua : req.body?.ua) ?? req.header("user-agent") ?? "";
      const parsed = ParseRequestSchema.safeParse({ ua });
      if (!parsed.success) {
        res.status(422).json({ error: "Provide a ua string", details: parsed.error.issues });
        return;
      }
      res.json(parseUA(parsed.data.ua));
    };
    app.get("/parse", authAndMeter, rateLimit, handler);
    app.post("/parse", authAndMeter, rateLimit, handler);
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) start().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
