import type { NextRequest } from "next/server";

export type LocalizedText = { en: string; ar: string };

export function localizedMessage(en: string, ar: string): LocalizedText {
  return { en, ar };
}

/** Prefer `?lang=ar|en` then Accept-Language. */
export function resolveLang(req: NextRequest): "en" | "ar" {
  const url = new URL(req.url);
  const q = url.searchParams.get("lang");
  if (q === "ar" || q === "en") return q;
  const al = req.headers.get("accept-language") ?? "";
  if (/^\s*ar\b/i.test(al) || /,\s*ar\b/i.test(al)) return "ar";
  return "en";
}

export function pickLocalized(text: LocalizedText, lang: "en" | "ar"): string {
  return lang === "ar" ? text.ar : text.en;
}
