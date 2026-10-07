export const LOCALES = ["en", "ru"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "NEXT_LOCALE"

// i18n-ignore — each language is named in itself
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ru: "Русский" }

/**
 * The language of one request: the person's saved choice, else the first language of the browser
 * that PipeQC speaks. Kazakh browsers get Russian, the language of Kazakh construction sites.
 */
export function resolveLocale(saved: string | undefined, acceptLanguage: string | null): Locale {
  if (saved === "en" || saved === "ru") return saved
  for (const part of (acceptLanguage ?? "").split(",")) {
    const base = part.split(";")[0].trim().toLowerCase().split("-")[0]
    if (base === "ru" || base === "kk") return "ru"
    if (base === "en") return "en"
  }
  return DEFAULT_LOCALE
}
