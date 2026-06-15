import { createService } from "../core/server.js";
import { fxratesConfig, ConvertRequestSchema } from "./config.js";
import { getEcbRates, rebase, convertAmount } from "./rates.js";

const { app, start } = createService({
  cfg: fxratesConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    app.get("/rates", authAndMeter, rateLimit, async (req, res) => {
      const base = (typeof req.query.base === "string" ? req.query.base : "EUR").toUpperCase();
      const symbols =
        typeof req.query.symbols === "string"
          ? req.query.symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
          : undefined;
      try {
        const { date, rates } = await getEcbRates();
        res.json({ base, date, rates: rebase(rates, base, symbols) });
      } catch (err) {
        res.status(err instanceof Error && /Unsupported/.test(err.message) ? 400 : 502).json({
          error: err instanceof Error ? err.message : "rates unavailable",
        });
      }
    });

    const convert = async (req: import("express").Request, res: import("express").Response) => {
      const input =
        req.method === "GET"
          ? { from: String(req.query.from ?? "").toUpperCase(), to: String(req.query.to ?? "").toUpperCase(), amount: Number(req.query.amount) }
          : { ...req.body, from: String(req.body?.from ?? "").toUpperCase(), to: String(req.body?.to ?? "").toUpperCase() };
      const parsed = ConvertRequestSchema.safeParse(input);
      if (!parsed.success) {
        res.status(422).json({ error: "Provide from, to, amount", details: parsed.error.issues });
        return;
      }
      try {
        const { date, rates } = await getEcbRates();
        const { from, to, amount } = parsed.data;
        res.json({ from, to, amount, result: convertAmount(rates, from, to, amount), date });
      } catch (err) {
        res.status(err instanceof Error && /Unsupported/.test(err.message) ? 400 : 502).json({
          error: err instanceof Error ? err.message : "conversion failed",
        });
      }
    };
    app.get("/convert", authAndMeter, rateLimit, convert);
    app.post("/convert", authAndMeter, rateLimit, convert);
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) start().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
