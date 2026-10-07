"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"

import type { ErectionGateReason } from "../../application/record-erection-progress"

/** The operator's words for why an erection stage cannot be recorded now. */
export function useErectionGateReason(): (reason: ErectionGateReason) => string {
  const t = useTranslations("erection.gate")
  const tc = useTranslations("codes")
  return useCallback(
    (reason: ErectionGateReason) => {
      switch (reason.code) {
        case "derived":
          return t("derived", { stage: tc(`erectionStage.${reason.stage}`) })
        case "no_access":
          return t("no_access")
        case "date_required":
          return t("date_required")
        case "record_first":
          return t("record_first", { missing: tc(`erectionStage.${reason.missing}`), stage: tc(`erectionStage.${reason.stage}`) })
      }
    },
    [t, tc],
  )
}
