import type { ProductConfig } from "./core/types.js";
import { webextractConfig } from "./webextract/config.js";
import { emailcheckConfig } from "./emailcheck/config.js";
import { phonecheckConfig } from "./phonecheck/config.js";
import { linkpreviewConfig } from "./linkpreview/config.js";
import { uaparseConfig } from "./uaparse/config.js";
import { langdetectConfig } from "./langdetect/config.js";
import { fxratesConfig } from "./fxrates/config.js";
import { htmlcleanConfig } from "./htmlclean/config.js";
import { qrcodeConfig } from "./qrcode/config.js";
import { profanityConfig } from "./profanity/config.js";

/** Every Toska product, keyed by productId. */
export const registry: Record<string, ProductConfig> = {
  webextract: webextractConfig,
  emailcheck: emailcheckConfig,
  phonecheck: phonecheckConfig,
  linkpreview: linkpreviewConfig,
  uaparse: uaparseConfig,
  langdetect: langdetectConfig,
  fxrates: fxratesConfig,
  htmlclean: htmlcleanConfig,
  qrcode: qrcodeConfig,
  profanity: profanityConfig,
};
