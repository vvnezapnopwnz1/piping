"use client"

import { Badge } from "@/components/ui/badge"
import { CONSTRUCTION_STAGES, stageLabel } from "../../domain/construction-phase"
import type { SpoolStatus } from "../../infrastructure/supabase-construction-repository"

/**
 * Dossier 16.2's eight stages, in order. `fabricated` has no date of its own until the
 * readiness view derives one, which is exactly what this timeline shows.
 */
export function SpoolStageTimeline({ status }: { status: SpoolStatus }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {CONSTRUCTION_STAGES.map((stage) => {
        const date = status.dates[stage] ?? null
        const isCurrent = status.currentStage === stage
        return (
          <li key={stage} className="min-w-32 rounded border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{stageLabel(stage)}</span>
              {isCurrent ? <Badge variant="outline">Current</Badge> : null}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{date ?? "—"}</p>
          </li>
        )
      })}
    </ol>
  )
}
