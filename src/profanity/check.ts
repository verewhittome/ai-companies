/**
 * Wordlist-based profanity detection for content moderation. Whole-word matching
 * on a leetspeak-normalized token stream to avoid the "Scunthorpe problem"
 * (substring false positives). This is a defensive moderation utility.
 */

// Base list of profane/offensive terms to flag. Whole-word matched after
// normalization. Kept functional for a moderation product.
const WORDS = new Set([
  "ass", "asshole", "bastard", "bitch", "bollocks", "bullshit", "crap", "damn",
  "dick", "dickhead", "douche", "fuck", "fucker", "fucking", "motherfucker",
  "piss", "prick", "shit", "shite", "slut", "twat", "wanker", "cunt", "cock",
  "whore", "jackass", "dumbass", "arse", "bugger", "git",
]);

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function normalizeToken(t: string): string {
  return t
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
}

export type Severity = "none" | "low" | "medium" | "high";

export interface ProfanityResult {
  is_profane: boolean;
  count: number;
  matches: string[];
  severity: Severity;
  censored: string;
}

export function checkProfanity(text: string, censorChar = "*"): ProfanityResult {
  const matches: string[] = [];
  // Tokenize keeping the original spans so we can censor in place.
  const censored = text.replace(/[\p{L}\p{N}@$!]+/gu, (token) => {
    if (WORDS.has(normalizeToken(token))) {
      matches.push(token);
      return censorChar.repeat(Math.max(token.length, 1));
    }
    return token;
  });

  const count = matches.length;
  let severity: Severity = "none";
  if (count >= 5) severity = "high";
  else if (count >= 2) severity = "medium";
  else if (count === 1) severity = "low";

  return {
    is_profane: count > 0,
    count,
    matches: [...new Set(matches.map((m) => m.toLowerCase()))],
    severity,
    censored,
  };
}
