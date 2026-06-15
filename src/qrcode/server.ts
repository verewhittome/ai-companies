import { createService } from "../core/server.js";
import { qrcodeConfig, GenerateRequestSchema } from "./config.js";
import { qrSvg, qrDataUrl, qrPngBuffer } from "./generate.js";

const { app, start } = createService({
  cfg: qrcodeConfig,
  mountRoutes: (app, { authAndMeter, rateLimit }) => {
    const handler = async (req: import("express").Request, res: import("express").Response) => {
      const raw = req.method === "GET" ? {
        data: req.query.data,
        format: req.query.format,
        size: req.query.size !== undefined ? Number(req.query.size) : undefined,
        margin: req.query.margin !== undefined ? Number(req.query.margin) : undefined,
        ecc: req.query.ecc,
        dark: req.query.dark,
        light: req.query.light,
      } : req.body;
      const parsed = GenerateRequestSchema.safeParse(raw);
      if (!parsed.success) {
        res.status(422).json({ error: "Provide data", details: parsed.error.issues });
        return;
      }
      const o = parsed.data;
      const format = o.format ?? "png";
      try {
        if (format === "svg") {
          res.type("image/svg+xml").send(await qrSvg(o.data, o));
        } else if (format === "dataurl") {
          res.json({ format: "dataurl", dataUrl: await qrDataUrl(o.data, o) });
        } else {
          res.type("image/png").send(await qrPngBuffer(o.data, o));
        }
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : "QR generation failed" });
      }
    };
    app.get("/generate", authAndMeter, rateLimit, handler);
    app.post("/generate", authAndMeter, rateLimit, handler);
  },
});

export { app };

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) start().catch((err) => { console.error("Fatal startup error:", err); process.exit(1); });
