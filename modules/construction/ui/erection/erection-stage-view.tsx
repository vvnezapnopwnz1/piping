"use client"

import { useContext } from "react"

import { Badge } from "@/components/ui/badge"
import { toStageEvidence } from "../../application/describe-erection-readiness"
import { erectionStageDate, isRecordableStage } from "../../application/record-erection-progress"
import { ERECTION_STAGES, erectionStageLabel } from "../../domain/erection-stage"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { ErectionEmbeddedContext } from "./erection-screen-shell"

export function ErectionStageTimeline({ row }: { row: ErectionReadiness }) {
  const evidence = toStageEvidence(row)
  // The workbench shows this timeline once, as its navigation.
  const embedded = useContext(ErectionEmbeddedContext)
  if (embedded) return null

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {ERECTION_STAGES.map((stage) => {
        const date = isRecordableStage(stage) ? erectionStageDate(stage, evidence) : row.rftOn
        const reached = stage === "rft" ? row.isRft : Boolean(date)
        return (
          <li key={stage}>
            <Badge variant={reached ? "default" : "outline"}>
              {erectionStageLabel(stage)}
              {date ? <span className="ml-2 font-mono text-xs">{date.slice(0, 10)}</span> : null}
            </Badge>
          </li>
        )
      })}
    </ol>
  )
}
