"use client"

import { useTranslations } from "next-intl"

import type { RftShortfallItem } from "../../application/describe-erection-readiness"

/** The operator's words for one open RFT criterion; NDE and PWHT carry how many are open. */
export function useRftShortfallLabel(): (item: RftShortfallItem) => string {
  const tc = useTranslations("codes")
  return (item) =>
    item.kind === "nde" || item.kind === "pwht"
      ? tc(`rftShortfall.${item.kind}`, { count: item.count ?? 0 })
      : tc(`rftShortfall.${item.kind}`)
}
