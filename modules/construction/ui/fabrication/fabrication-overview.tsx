"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ISO</TableHead>
                <TableHead>Spool</TableHead>
                <TableHead>Rev</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Welds</TableHead>
                <TableHead>Supports</TableHead>
                <TableHead>NDE outstanding</TableHead>
                <TableHead>PWHT outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map((status) => (
                <TableRow key={status.spoolRevisionId}>
                  <TableCell className="font-mono text-xs">{status.isoNumber}</TableCell>
                  <TableCell className="font-mono text-xs">{status.spoolNumber}</TableCell>
                  <TableCell>{status.revisionNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{status.currentStage ?? "not started"}</Badge>
                  </TableCell>
                  <TableCell>
                    {status.lineChecked}/{status.lineTotal}
                  </TableCell>
                  <TableCell>
                    {status.weldComplete}/{status.weldTotal}
                  </TableCell>
                  <TableCell>
                    {status.supportRecorded}/{status.supportTotal}
                  </TableCell>
                  <TableCell>{status.ndePending}</TableCell>
                  <TableCell>{status.pwhtPending}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
