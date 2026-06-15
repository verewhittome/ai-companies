import { setupCatalog } from "../core/catalog.js";
import { phonecheckConfig } from "./config.js";

// npx tsx src/phonecheck/setup-catalog.ts
setupCatalog(phonecheckConfig).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
