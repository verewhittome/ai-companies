import { setupCatalog } from "../core/catalog.js";
import { webextractConfig } from "./config.js";

// npx tsx src/webextract/setup-catalog.ts
setupCatalog(webextractConfig).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
