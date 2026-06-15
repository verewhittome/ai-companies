import { createService } from "../core/server.js";
import { emailcheckConfig } from "./config.js";
import { validateEmail } from "./service.js";
import { BatchValidateRequestSchema, ValidateRequestSchema } from "./types.js";

const { app, start } = createService({
  cfg: emailcheckConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    // GET convenience: /validate?email=...
    app.get("/validate", authAndMeter, rateLimit, async (req, res) => {
      const email = typeof req.query.email === "string" ? req.query.email : "";
      const parsed = ValidateRequestSchema.safeParse({
        email,
        skipMx: req.query.skipMx === "true",
      });
      if (!parsed.success) {
        res.status(422).json({ error: "Provide ?email=", details: parsed.error.issues });
        return;
      }
      res.json(await validateEmail(parsed.data.email, parsed.data.skipMx));
    });

    app.post("/validate", authAndMeter, rateLimit, async (req, res) => {
      const parsed = ValidateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }
      res.json(await validateEmail(parsed.data.email, parsed.data.skipMx));
    });

    app.post("/batch", authAndMeter, rateLimit, async (req, res) => {
      const parsed = BatchValidateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }
      const { emails, skipMx } = parsed.data;
      const results = await Promise.all(emails.map((e) => validateEmail(e, skipMx)));
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
