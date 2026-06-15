import { setupCatalog } from "../core/catalog.js";
import { emailcheckConfig } from "./config.js";

// npx tsx src/emailcheck/setup-catalog.ts
setupCatalog(emailcheckConfig).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
