import { createService } from "../core/server.js";
import { phonecheckConfig } from "./config.js";
import { analyzePhone } from "./validator.js";
import { BatchValidateRequestSchema, ValidateRequestSchema } from "./types.js";

const { app, start } = createService({
  cfg: phonecheckConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    app.get("/validate", authAndMeter, rateLimit, (req, res) => {
      const parsed = ValidateRequestSchema.safeParse({
        phone: typeof req.query.phone === "string" ? req.query.phone : "",
        country: typeof req.query.country === "string" ? req.query.country : undefined,
      });
      if (!parsed.success) {
        res.status(422).json({ error: "Provide ?phone=", details: parsed.error.issues });
        return;
      }
      res.json(analyzePhone(parsed.data.phone, parsed.data.country));
    });

    app.post("/validate", authAndMeter, rateLimit, (req, res) => {
      const parsed = ValidateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }
      res.json(analyzePhone(parsed.data.phone, parsed.data.country));
    });

    app.post("/batch", authAndMeter, rateLimit, (req, res) => {
      const parsed = BatchValidateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }
      const { phones, country } = parsed.data;
      res.json({ count: phones.length, results: phones.map((p) => analyzePhone(p, country)) });
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
