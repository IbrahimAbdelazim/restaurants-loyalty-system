export type UiLang = "en" | "ar";

export function detectUiLang(): UiLang {
  if (typeof document === "undefined") return "en";
  const htmlLang = document.documentElement.lang?.toLowerCase() ?? "";
  if (htmlLang.startsWith("ar")) return "ar";
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ar")) {
    return "ar";
  }
  return "en";
}

const NETWORK: Record<UiLang, { title: string; retry: string }> = {
  en: {
    title: "Connection error",
    retry: "Retry",
  },
  ar: {
    title: "خطأ في الاتصال",
    retry: "إعادة المحاولة",
  },
};

export function networkErrorCopy(lang: UiLang) {
  return NETWORK[lang];
}
