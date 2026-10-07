"use client"

import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { RotateCw } from "lucide-react"

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
import { useMarkInputsRecorded } from "@/components/pipeqc/unsaved-input-guard"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { toStageEvidence } from "../../application/describe-erection-readiness"
import {
  firstMissingPredecessor,
  type RecordableErectionStage,
} from "../../application/record-erection-progress"
import { erectionStageLabel } from "../../domain/erection-stage"
import {
  loadSupports,
  type SupportRow,
} from "../../infrastructure/supabase-construction-repository"
import { recordFieldSupportProgress } from "../../infrastructure/supabase-erection-repository"
import { panelMode } from "../panel-mode"
import {
  ErectionEmbeddedContext,
  ErectionScreenShell,
  useErectionCommands,
} from "./erection-screen-shell"
import { ErectionStageCard } from "./erection-stage-card"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Field support installation. Each support is recorded individually with its own date.
 * Subgroups: Field supports and Spool milestone (Supported).
 */
export function FieldSupportProgressScreen({
  title,
  description,
  stage = "supported",
}: {
  title: string
  description: string
  stage?: RecordableErectionStage
}) {
  const state = useErectionReadiness()
  const { selected: currentSpool, canRecord, dataCurrent, refresh } = state
  const embedded = useContext(ErectionEmbeddedContext)
  const commands = useErectionCommands()
  const markRecorded = useMarkInputsRecorded()

  const [supports, setSupports] = useState<SupportRow[]>([])
  const [installedOn, setInstalledOn] = useState(today())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const spoolRevisionId = currentSpool?.spoolRevisionId ?? null

  const currentKey = spoolRevisionId ? `${spoolRevisionId}:${refreshToken}` : null
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const loadState: "loading" | "ready" | "error" =
    loadedKey === currentKey ? "ready" : failedKey === currentKey ? "error" : "loading"

  const dateRef = useRef<HTMLInputElement>(null)

  const reloadSupports = useCallback(async () => {
    if (!spoolRevisionId) {
      setSupports([])
      return
    }
    const next = await loadSupports(getSupabaseBrowserClient(), spoolRevisionId)
    setSupports(next)
    setLoadedKey(`${spoolRevisionId}:${refreshToken}`)
  }, [spoolRevisionId, refreshToken])

  useEffect(() => {
    if (!spoolRevisionId || !currentKey) return
    let cancelled = false
    const key = currentKey
    void loadSupports(getSupabaseBrowserClient(), spoolRevisionId)
      .then((loaded) => {
        if (cancelled) return
        setSupports(loaded)
        setLoadedKey(key)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFailedKey(key)
        toast.error(error instanceof Error ? error.message : "Supports could not be loaded.")
      })
    return () => {
      cancelled = true
    }
  }, [spoolRevisionId, currentKey])

  const record = async (support: SupportRow) => {
    if (!canRecord || installedOn.trim() === "" || savingId !== null || commands.pending || !dataCurrent) return
    await commands.run(async () => {
      setSavingId(support.supportRevisionId)
      try {
        await recordFieldSupportProgress(
          getSupabaseBrowserClient(),
          support.supportRevisionId,
          installedOn,
          crypto.randomUUID(),
        )
        if (dateRef.current) markRecorded([dateRef.current])
        try {
          await Promise.all([reloadSupports(), refresh()])
        } catch {
          toast.error("Recorded; status could not be refreshed. Retry refresh.")
          return
        }
        toast.success(`Support ${support.supportNumber} recorded as installed.`)
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "The support could not be recorded.",
        )
      } finally {
        setSavingId(null)
      }
    })
  }

  return (
    <ErectionScreenShell
      title={title}
      description={description}
      state={state}
      commands={commands}
    >
      {(row) => {
        const evidence = toStageEvidence(row)
        const isDone = Boolean(row.supportedOn)
        const missing = firstMissingPredecessor(stage, evidence)
        const blockedBy = !isDone && missing ? erectionStageLabel(missing) : null
        const mode = panelMode({ allRecorded: isDone, blockedBy })

        return (
          <div className="space-y-4" data-explicit-unsaved-commit="true">
            {embedded ? null : (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {row.isoNumber} / {row.spoolNumber} ({row.revisionNumber})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ErectionStageTimeline row={row} />
                </CardContent>
              </Card>
            )}

            {mode === "done" ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Recorded {row.supportedOn?.slice(0, 10)}
                </p>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle>Supports on this spool</CardTitle>
                    {loadState === "loading" ? (
                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                        Loading supports…
                      </Badge>
                    ) : loadState === "error" ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Failed to load supports</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRefreshToken((t) => t + 1)}
                        >
                          <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> Retry
                        </Button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Support</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Installed</TableHead>
                            <TableHead>Recorded in</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supports.map((support) => (
                            <TableRow key={support.supportRevisionId}>
                              <TableCell className="font-mono text-xs">{support.supportNumber}</TableCell>
                              <TableCell>{support.supportType ?? "—"}</TableCell>
                              <TableCell>{support.quantity}</TableCell>
                              <TableCell>{support.installedOn ? support.installedOn.slice(0, 10) : "—"}</TableCell>
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
                            </TableRow>
                          ))}
                          {supports.length === 0 && loadState === "ready" ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-muted-foreground text-sm">
                                This spool revision has no supports.
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : mode === "blocked" ? (
              <ErectionStageCard
                row={row}
                stage={stage}
                canRecord={canRecord}
                dataCurrent={state.dataCurrent}
                onRecorded={refresh}
              />
            ) : (
              <div className="space-y-4">
                <ErectionStageCard
                  row={row}
                  stage={stage}
                  canRecord={canRecord}
                  dataCurrent={state.dataCurrent}
                  onRecorded={refresh}
                />

                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle>Supports on this spool</CardTitle>
                    {loadState === "loading" ? (
                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                        Loading supports…
                      </Badge>
                    ) : loadState === "error" ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Failed to load supports</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRefreshToken((t) => t + 1)}
                        >
                          <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> Retry
                        </Button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-sm font-medium">
                        Installation date
                        <Input
                          ref={dateRef}
                          type="date"
                          value={installedOn}
                          disabled={savingId !== null || commands.pending}
                          onChange={(event) => setInstalledOn(event.target.value)}
                          className="mt-1"
                        />
                      </label>
                    </div>

                    <div className="overflow-x-auto">
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
                          {supports.map((support) => {
                            const isSavingThis = savingId === support.supportRevisionId
                            const actionLabel =
                              support.installedPhase === "fabrication"
                                ? "Record in field"
                                : support.installedPhase === "erection"
                                  ? "Record correction"
                                  : "Record installed"

                            return (
                              <TableRow key={support.supportRevisionId}>
                                <TableCell className="font-mono text-xs">{support.supportNumber}</TableCell>
                                <TableCell>{support.supportType ?? "—"}</TableCell>
                                <TableCell>{support.quantity}</TableCell>
                                <TableCell>{support.installedOn ? support.installedOn.slice(0, 10) : "—"}</TableCell>
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
                                    loading={isSavingThis}
                                    disabled={
                                      !canRecord ||
                                      savingId !== null ||
                                      commands.pending ||
                                      !dataCurrent ||
                                      installedOn.trim() === ""
                                    }
                                  >
                                    {actionLabel}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {supports.length === 0 && loadState === "ready" ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-muted-foreground text-sm">
                                This spool revision has no supports.
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </div>

                    {loadState === "error" ? (
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <p>Supports could not be loaded, so none are listed and nothing has been changed.</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRefreshToken((t) => t + 1)}
                        >
                          <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> Retry
                        </Button>
                      </div>
                    ) : null}

                    {!dataCurrent ? (
                      <p className="text-destructive text-sm">Refresh spool status before recording.</p>
                    ) : !canRecord ? (
                      <p className="text-muted-foreground text-sm">
                        Recording support installation needs the erection.progress.record capability.
                      </p>
                    ) : null}

                    <p className="text-muted-foreground mt-3 text-xs">
                      A support carries one installation record, so a support installed in the shop
                      shows its fabrication phase here and is not counted as field evidence.
                      Re-recording it moves it to the erection phase.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )
      }}
    </ErectionScreenShell>
  )
}
