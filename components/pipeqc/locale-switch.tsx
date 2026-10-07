"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/locale"

/** Saves the choice on this device for a year and re-renders the page in it; typed input stays. */
function useSwitchLocale() {
  const router = useRouter()
  return (next: Locale) => {
    // i18n-ignore — cookie attributes, not text
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }
}

/** The language choice inside the user menu. */
export function LocaleMenuItems() {
  const t = useTranslations("common")
  const locale = useLocale()
  const switchLocale = useSwitchLocale()
  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("language")}</DropdownMenuLabel>
      {LOCALES.map((option) => (
        <DropdownMenuCheckboxItem key={option} checked={option === locale} onCheckedChange={() => switchLocale(option)}>
          {LOCALE_NAMES[option]}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  )
}

/** The language choice under the sign-in form, before anyone is signed in. */
export function LocaleToggle() {
  const t = useTranslations("common")
  const locale = useLocale()
  const switchLocale = useSwitchLocale()
  return (
    <nav aria-label={t("language")} className="flex justify-center gap-4 text-sm">
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === locale}
          onClick={() => switchLocale(option)}
          className={option === locale ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
        >
          {LOCALE_NAMES[option]}
        </button>
      ))}
    </nav>
  )
}
