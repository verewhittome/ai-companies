import { franc, francAll } from "franc";

// ISO 639-3 -> { name, iso639_1 } for common languages.
const LANGS: Record<string, { name: string; iso1: string }> = {
  eng: { name: "English", iso1: "en" }, spa: { name: "Spanish", iso1: "es" },
  fra: { name: "French", iso1: "fr" }, deu: { name: "German", iso1: "de" },
  ita: { name: "Italian", iso1: "it" }, por: { name: "Portuguese", iso1: "pt" },
  nld: { name: "Dutch", iso1: "nl" }, rus: { name: "Russian", iso1: "ru" },
  ukr: { name: "Ukrainian", iso1: "uk" }, pol: { name: "Polish", iso1: "pl" },
  ces: { name: "Czech", iso1: "cs" }, swe: { name: "Swedish", iso1: "sv" },
  dan: { name: "Danish", iso1: "da" }, nob: { name: "Norwegian", iso1: "nb" },
  fin: { name: "Finnish", iso1: "fi" }, tur: { name: "Turkish", iso1: "tr" },
  ell: { name: "Greek", iso1: "el" }, ara: { name: "Arabic", iso1: "ar" },
  heb: { name: "Hebrew", iso1: "he" }, fas: { name: "Persian", iso1: "fa" },
  hin: { name: "Hindi", iso1: "hi" }, ben: { name: "Bengali", iso1: "bn" },
  urd: { name: "Urdu", iso1: "ur" }, tam: { name: "Tamil", iso1: "ta" },
  tel: { name: "Telugu", iso1: "te" }, cmn: { name: "Mandarin Chinese", iso1: "zh" },
  jpn: { name: "Japanese", iso1: "ja" }, kor: { name: "Korean", iso1: "ko" },
  vie: { name: "Vietnamese", iso1: "vi" }, tha: { name: "Thai", iso1: "th" },
  ind: { name: "Indonesian", iso1: "id" }, msa: { name: "Malay", iso1: "ms" },
  ron: { name: "Romanian", iso1: "ro" }, hun: { name: "Hungarian", iso1: "hu" },
  bul: { name: "Bulgarian", iso1: "bg" }, hrv: { name: "Croatian", iso1: "hr" },
  srp: { name: "Serbian", iso1: "sr" }, slk: { name: "Slovak", iso1: "sk" },
  cat: { name: "Catalan", iso1: "ca" }, tgl: { name: "Tagalog", iso1: "tl" },
};

export interface LangResult {
  language: string;
  iso639_3: string;
  iso639_1: string | null;
  reliable: boolean;
  candidates: { language: string; iso639_3: string; score: number }[];
}

export function detectLanguage(text: string): LangResult {
  const opts = { minLength: 3 } as const;
  const code = franc(text, opts);
  const all = francAll(text, opts)
    .slice(0, 3)
    .map(([c, score]) => ({
      language: LANGS[c]?.name ?? c,
      iso639_3: c,
      score: Number(score.toFixed(3)),
    }));
  return {
    language: code === "und" ? "Undetermined" : (LANGS[code]?.name ?? code),
    iso639_3: code,
    iso639_1: LANGS[code]?.iso1 ?? null,
    reliable: code !== "und",
    candidates: all,
  };
}
