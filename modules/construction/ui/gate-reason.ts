"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"

import type { FabricationGateReason } from "../application/record-material-check"

/** The operator's words for why a shop or field command is not available yet. */
export function useGateReason(): (reason: FabricationGateReason) => string {
  const t = useTranslations("fabrication")
  return useCallback(
    (reason: FabricationGateReason) => {
      switch (reason.code) {
        case "weld_issues":
          return reason.issues.map((issue) => t(`weldIssue.${issue.code}`, issue.values)).join(" ")
        case "release_blockers":
          return reason.blockers.map((blocker) => t(`releaseBlocker.${blocker.code}`, blocker.values)).join(" ")
        case "dft_below":
          return t("gate.dft_below", { measured: reason.measured, required: reason.required })
        default:
          return t(`gate.${reason.code}`)
      }
    },
    [t],
  )
}
