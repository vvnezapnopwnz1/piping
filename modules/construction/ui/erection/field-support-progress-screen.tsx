"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { RecordableErectionStage } from "../../application/record-erection-progress"
import {
  loadSupports,
  type SupportRow,
} from "../../infrastructure/supabase-construction-repository"
import { recordFieldSupportProgress } from "../../infrastructure/supabase-erection-repository"
import { ErectionScreenShell } from "./erection-screen-shell"
import { ErectionStageCard } from "./erection-stage-card"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Field support installation. Each support is recorded individually with its own date; the
 * screen this replaced picked the first support with no record and stamped `new Date()` on it.
 */
export function FieldSupportProgressScreen({
  title,
  description,
  stage,
}: {
  title: string
  description: string
  stage?: RecordableErectionStage
}) {
  const state = useErectionReadiness()
  const { selected, canRecord, refresh } = state

  const [supports, setSupports] = useState<SupportRow[]>([])
  const [installedOn, setInstalledOn] = useState(today())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const spoolRevisionId = selected?.spoolRevisionId ?? null

  const reloadSupports = useCallback(async () => {
    if (!spoolRevisionId) {
      setSupports([])
      setLoadFailed(false)
      return
    }
    try {
      setSupports(await loadSupports(getSupabaseBrowserClient(), spoolRevisionId))
      setLoadFailed(false)
    } catch (error: unknown) {
      setLoadFailed(true)
      setSupports([])
      toast.error(error instanceof Error ? error.message : "Supports could not be loaded.")
    }
  }, [spoolRevisionId])

  useEffect(() => {
    void reloadSupports()
  }, [reloadSupports])

  const record = async (support: SupportRow) => {
    if (!canRecord || installedOn.trim() === "") return
    setSavingId(support.supportRevisionId)
    try {
      await recordFieldSupportProgress(
        getSupabaseBrowserClient(),
        support.supportRevisionId,
        installedOn,
        crypto.randomUUID(),
      )
      await Promise.all([reloadSupports(), refresh()])
      toast.success(`Support ${support.supportNumber} recorded as installed.`)
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "The support could not be recorded.",
      )
    } finally {
      setSavingId(null)
    }
  }

  return (
    <ErectionScreenShell title={title} description={description} state={state}>
      {(row) => (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {row.isoNumber} / {row.spoolNumber} ({row.revisionNumber})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ErectionStageTimeline row={row} />
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  Installation date
                  <Input
                    type="date"
                    value={installedOn}
                    onChange={(event) => setInstalledOn(event.target.value)}
                  />
                </label>
                <p className="text-muted-foreground text-sm">
                  {row.fieldSupportRecorded}/{row.fieldSupportTotal} supports installed in the
                  field.
                </p>
              </div>
              {!canRecord ? (
                <p className="text-muted-foreground text-sm">
                  Recording support installation needs the erection.progress.record capability.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supports on this spool</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Support</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Installed</TableHead>
                    <TableHead>Recorded in</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supports.map((support) => (
                    <TableRow key={support.supportRevisionId}>
                      <TableCell className="font-mono text-xs">{support.supportNumber}</TableCell>
                      <TableCell>{support.supportType ?? "—"}</TableCell>
                      <TableCell>{support.quantity}</TableCell>
                      <TableCell>{support.installedOn ?? "—"}</TableCell>
                      <TableCell>
                        {support.installedPhase ? (
                          <Badge
                            variant={support.installedPhase === "erection" ? "default" : "outline"}
                          >
                            {support.installedPhase}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant={support.installedPhase === "erection" ? "outline" : "default"}
                          onClick={() => void record(support)}
                          loading={savingId === support.supportRevisionId}
                          disabled={!canRecord}
                        >
                          {support.installedOn ? "Re-record" : "Record installed"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {supports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-sm">
                        {loadFailed
                          ? "Supports could not be loaded, so none are listed and nothing has been changed."
                          : "This spool revision has no supports."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <p className="text-muted-foreground mt-3 text-xs">
                A support carries one installation record, so a support installed in the shop
                shows its fabrication phase here and is not counted as field evidence.
                Re-recording it moves it to the erection phase.
              </p>
            </CardContent>
          </Card>

          {stage ? (
            <ErectionStageCard
              row={row}
              stage={stage}
              canRecord={canRecord}
              onRecorded={refresh}
            />
          ) : null}
        </>
      )}
    </ErectionScreenShell>
  )
}
