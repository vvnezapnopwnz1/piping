"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, useTableUrlState } from "@/components/ui/data-table"
import { FABRICATION_SPOOL_COLUMNS } from "./spool-columns"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { CONSTRUCTION_STAGES, stageLabel } from "../../domain/construction-phase"
import {
  loadSpoolStatuses,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"

/**
 * Roadmap §17 exit criterion: the dashboard is built from database projections, never from
 * fixtures. Every number here comes from `spool_construction_status`.
 */
export function FabricationOverview({ projectId }: { projectId: string }) {
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])
  const [tableState, setTableState] = useTableUrlState({ namespace: "spool" })

  useEffect(() => {
    void loadSpoolStatuses(getSupabaseBrowserClient(), projectId)
      .then(setStatuses)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "The overview could not be loaded."),
      )
  }, [projectId])

  const counts = useMemo(() => {
    const byStage = new Map<string, number>()
    for (const status of statuses) {
      const key = status.currentStage ?? "not_started"
      byStage.set(key, (byStage.get(key) ?? 0) + 1)
    }
    return byStage
  }, [statuses])

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {["not_started", ...CONSTRUCTION_STAGES].map((stage) => (
          <Card key={stage}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stage === "not_started"
                  ? "Not started"
                  : stageLabel(stage as (typeof CONSTRUCTION_STAGES)[number])}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {counts.get(stage) ?? 0}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={FABRICATION_SPOOL_COLUMNS}
            rows={statuses}
            state={tableState}
            onStateChange={setTableState}
            rowId={(status) => status.spoolRevisionId}
            searchPlaceholder="Search spool or ISO…"
            emptyTitle="No spool is available on this project."
            emptyDescription="Spools appear once an engineering revision carrying them is accepted."
          />
        </CardContent>
      </Card>
    </div>
  )
}
