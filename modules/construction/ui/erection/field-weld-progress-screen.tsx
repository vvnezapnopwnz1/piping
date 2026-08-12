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
import { describeFieldWeldProgressGate } from "../../application/record-field-weld-progress"
import { toWeldProgressPayload } from "../../application/record-weld-progress"
import type { RecordableErectionStage } from "../../application/record-erection-progress"
import type { PointAssignment } from "../../domain/weld-progress"
import {
  loadWeldFormReferentials,
  loadWeldSummaries,
  type WeldFormReferentials,
  type WeldSummary,
} from "../../infrastructure/supabase-construction-repository"
import { recordFieldWeldProgress } from "../../infrastructure/supabase-erection-repository"
import { ErectionScreenShell } from "./erection-screen-shell"
import { ErectionStageCard } from "./erection-stage-card"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_REFERENTIALS: WeldFormReferentials = {
  subcontractors: [],
  procedures: [],
  welders: [],
  reworkCodes: [],
}

/**
 * Field weld progress. This is the same form as the shop screen because the rules are the same
 * — `071_field_weld_parity.test.sql` pins that — with two differences the field imposes: the
 * command carries phase `erection`, and the spool must be To Site first.
 *
 * The welders, the WPS and the split are all chosen by the user. The screen this replaced took
 * `welders[0]` and `welders[1]` and hardcoded 50/50, which recorded wrong data rather than
 * missing data.
 */
export function FieldWeldProgressScreen({
  title,
  description,
  stage,
}: {
  title: string
  description: string
  /** When set, the screen also offers the stage this evidence supports. */
  stage?: RecordableErectionStage
}) {
  const state = useErectionReadiness()
  const { selected, projectId, canRecord, refresh } = state

  const [welds, setWelds] = useState<WeldSummary[]>([])
  const [selectedWeld, setSelectedWeld] = useState<WeldSummary | null>(null)
  const [referentials, setReferentials] = useState<WeldFormReferentials>(EMPTY_REFERENTIALS)
  const [subcontractorId, setSubcontractorId] = useState("")
  const [procedureId, setProcedureId] = useState("")
  const [weldOn, setWeldOn] = useState(today())
  const [rootWelderId, setRootWelderId] = useState("")
  const [capWelderId, setCapWelderId] = useState("")
  const [rootPercent, setRootPercent] = useState(50)
  const [isSaving, setIsSaving] = useState(false)
  const [weldsFailed, setWeldsFailed] = useState(false)

  useEffect(() => {
    if (!projectId) return
    void loadWeldFormReferentials(getSupabaseBrowserClient(), projectId)
      .then(setReferentials)
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "Welding referentials could not be loaded.",
        ),
      )
  }, [projectId])

  const spoolRevisionId = selected?.spoolRevisionId ?? null

  const reloadWelds = useCallback(async () => {
    if (!spoolRevisionId) {
      setWelds([])
      return
    }
    try {
      // "field" is the whole reason this is not the fabrication screen: a shop joint on this
      // screen would be refused by both the domain gate and the command.
      const next = await loadWeldSummaries(getSupabaseBrowserClient(), spoolRevisionId, "field")
      setWeldsFailed(false)
      setWelds(next)
      setSelectedWeld((current) =>
        current
          ? (next.find((weld) => weld.weldJointRevisionId === current.weldJointRevisionId) ?? null)
          : null,
      )
    } catch (error: unknown) {
      setWeldsFailed(true)
      setWelds([])
      toast.error(
        error instanceof Error ? error.message : "Field joints could not be loaded.",
      )
    }
  }, [spoolRevisionId])

  useEffect(() => {
    void reloadWelds()
  }, [reloadWelds])

  const points: PointAssignment[] =
    rootWelderId && capWelderId
      ? [
          {
            pointType: "root",
            welderQualificationId: rootWelderId,
            completionPercent: rootPercent,
            weldedOn: weldOn,
          },
          {
            pointType: "cap",
            welderQualificationId: capWelderId,
            completionPercent: 100 - rootPercent,
            weldedOn: weldOn,
          },
        ]
      : []

  const procedure = referentials.procedures.find((item) => item.id === procedureId)

  const gate =
    selectedWeld && procedure && subcontractorId
      ? describeFieldWeldProgressGate({
          weld: {
            joint: {
              weldLocation: selectedWeld.weldLocation,
              diameterInch: selectedWeld.diameterInch,
              thicknessMm: selectedWeld.thicknessMm,
              availablePointTypes: ["root", "cap"],
            },
            procedure,
            subcontractorId,
            weldOn,
            points,
            welders: referentials.welders,
            isLocked: selectedWeld.isLocked,
            phase: "erection",
          },
          toSiteOn: selected?.toSiteOn ?? null,
          canRecord,
        })
      : { allowed: false, reason: "Select a field joint, a subcontractor and a WPS." }

  const save = async () => {
    if (!selectedWeld || !gate.allowed) return
    setIsSaving(true)
    try {
      await recordFieldWeldProgress(
        getSupabaseBrowserClient(),
        toWeldProgressPayload({
          weldJointRevisionId: selectedWeld.weldJointRevisionId,
          subcontractorId,
          weldingProcedureId: procedureId,
          points,
          dates: {
            cuttingOn: null,
            bevelingOn: null,
            fitupOn: null,
            preheatOn: null,
            weldOn,
            dwirNumber: null,
            qcFormNumber: null,
            qc13FormId: null,
            reworkCodeId: null,
          },
        }),
        crypto.randomUUID(),
      )
      await Promise.all([reloadWelds(), refresh()])
      toast.success(`Field weld ${selectedWeld.weldNumber} recorded.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The field weld could not be recorded.")
    } finally {
      setIsSaving(false)
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
              <p className="text-muted-foreground text-sm">
                {row.fieldWeldComplete}/{row.fieldWeldTotal} field joints welded ·{" "}
                {row.ndePending} NDE and {row.pwhtPending} PWHT obligation(s) open.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Field joints</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joint</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead>Thk</TableHead>
                    <TableHead>WPS</TableHead>
                    <TableHead>Welders</TableHead>
                    <TableHead>Weld date</TableHead>
                    <TableHead>NDE</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {welds.map((weld) => (
                    <TableRow
                      key={weld.weldJointRevisionId}
                      onClick={() => setSelectedWeld(weld)}
                      className={
                        selectedWeld?.weldJointRevisionId === weld.weldJointRevisionId
                          ? "bg-muted"
                          : ""
                      }
                    >
                      <TableCell className="font-mono text-xs">{weld.weldNumber}</TableCell>
                      <TableCell>{weld.diameterInch ?? "—"}</TableCell>
                      <TableCell>{weld.thicknessMm ?? "—"}</TableCell>
                      <TableCell>{weld.wpsCode ?? "—"}</TableCell>
                      <TableCell>{weld.welders.join(", ") || "—"}</TableCell>
                      <TableCell>{weld.weldOn ?? "—"}</TableCell>
                      <TableCell>
                        {weld.obligationPending}/{weld.obligationTotal}
                      </TableCell>
                      <TableCell>
                        {weld.isLocked ? <Badge variant="outline">Locked</Badge> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  {welds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground text-sm">
                        {weldsFailed
                          ? "Field joints could not be loaded, so none are listed and nothing has been changed."
                          : "This spool revision has no field joints."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedWeld ? (
            <Card>
              <CardHeader>
                <CardTitle>Record {selectedWeld.weldNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Subcontractor
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={subcontractorId}
                      onChange={(event) => setSubcontractorId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {referentials.subcontractors.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    WPS
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={procedureId}
                      onChange={(event) => setProcedureId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {referentials.procedures.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Root welder
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={rootWelderId}
                      onChange={(event) => setRootWelderId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {referentials.welders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.welderCode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Cap welder
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={capWelderId}
                      onChange={(event) => setCapWelderId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {referentials.welders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.welderCode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Root percent
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={rootPercent}
                      onChange={(event) => setRootPercent(Number(event.target.value))}
                    />
                  </label>
                  <label className="text-sm">
                    Weld date
                    <Input
                      type="date"
                      value={weldOn}
                      onChange={(event) => setWeldOn(event.target.value)}
                    />
                  </label>
                </div>

                <p className="text-muted-foreground text-xs">
                  Root and Cap always total 100 percent; the cap takes {100 - rootPercent}.
                </p>
                {gate.reason ? <p className="text-destructive text-sm">{gate.reason}</p> : null}
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={!gate.allowed || isSaving}
                >
                  {isSaving ? "Saving…" : "Record field weld progress"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

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
