"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

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
import { describeMaterialCheckGate, toMaterialCheckPayload } from "../../application/record-material-check"
import type { BillLine, TraceEntry } from "../../domain/material-check"
import {
  loadBillOfMaterials,
  loadLatestQc13Form,
  loadMaterialCheckItems,
  loadSpoolStatus,
  type Qc13Form,
  recordConstructionProgress,
  recordMaterialCheck,
  requestQc13Form,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { SpoolStageTimeline } from "./spool-stage-timeline"

const today = () => new Date().toISOString().slice(0, 10)

export function MaterialCheckScreen({ projectId }: { projectId: string }) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [lines, setLines] = useState<BillLine[]>([])
  const [traces, setTraces] = useState<Record<string, string>>({})
  const [checkedOn, setCheckedOn] = useState(today())
  const [refreshToken, setRefreshToken] = useState(0)
  // Browsing for another spool has to take the joint list and the record form with it:
  // they belong to the spool being replaced, and leaving them on screen invites recording
  // against a spool the operator has already moved on from.
  const [browsingSpools, setBrowsingSpools] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [qc13Form, setQc13Form] = useState<Qc13Form | null>(null)
  // A failed load leaves `lines` empty, which describeMaterialCheckGate reports as "this
  // spool revision has no bill of materials" — a sentence that means the opposite of the
  // truth. Track the failure separately so the screen can say which of the two it is.
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!spool) {
      setQc13Form(null)
      setLoadFailed(false)
      return
    }
    const client = getSupabaseBrowserClient()
    void Promise.all([
      loadBillOfMaterials(client, spool.spoolRevisionId),
      loadMaterialCheckItems(client, spool.spoolRevisionId),
      loadLatestQc13Form(client, spool.spoolRevisionId),
    ])
      .then(([billLines, existing, form]) => {
        setLoadFailed(false)
        setLines(billLines)
        setTraces(
          Object.fromEntries(existing.map((item) => [item.identCode, item.traceNumber])),
        )
        setQc13Form(form)
      })
      .catch((error: unknown) => {
        setLoadFailed(true)
        setLines([])
        toast.error(
          error instanceof Error ? error.message : "The bill of materials could not be loaded.",
        )
      })
  }, [spool, refreshToken])

  const reload = useCallback(async () => {
    if (!spool) return
    setSpool(await loadSpoolStatus(getSupabaseBrowserClient(), spool.spoolRevisionId))
    setRefreshToken((token) => token + 1)
  }, [spool])

  const entries: TraceEntry[] = lines
    .filter((line) => (traces[line.identCode] ?? "").trim() !== "")
    .map((line) => ({
      identCode: line.identCode,
      traceNumber: traces[line.identCode],
      quantity: line.quantity,
    }))

  const gate = describeMaterialCheckGate(lines, entries, spool?.dates.start_fab ?? null)

  const startFab = async () => {
    if (!spool) return
    try {
      await recordConstructionProgress(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        "start_fab",
        checkedOn,
        crypto.randomUUID(),
      )
      await reload()
      toast.success("Start Fab recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Start Fab could not be recorded.")
    }
  }

  const issueQc13 = async () => {
    if (!spool) return
    try {
      const form = await requestQc13Form(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        checkedOn,
        crypto.randomUUID(),
      )
      setQc13Form(form)
      toast.success(`QC-13 ${form.formNumber} issued.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The QC-13 could not be issued.")
    }
  }

  const save = async () => {
    if (!spool || !gate.allowed) return
    setIsSaving(true)
    try {
      await recordMaterialCheck(
        getSupabaseBrowserClient(),
        toMaterialCheckPayload({
          spoolRevisionId: spool.spoolRevisionId,
          checkedOn,
          qc13FormId: qc13Form?.id ?? null,
          entries,
        }),
        crypto.randomUUID(),
      )
      await reload()
      toast.success("Material traces recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The traces could not be recorded.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={setSpool}
            browsing={browsingSpools}
            onBrowsingChange={setBrowsingSpools}
            refreshToken={refreshToken}
          />

      {spool && !browsingSpools ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {spool.isoNumber} / {spool.spoolNumber} ({spool.revisionNumber})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SpoolStageTimeline status={spool} />
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  Date
                  <Input
                    type="date"
                    value={checkedOn}
                    onChange={(event) => setCheckedOn(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void startFab()}
                  disabled={spool.dates.start_fab !== null}
                >
                  Record Start Fab
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void issueQc13()}
                  disabled={spool.dates.start_fab === null}
                >
                  Issue QC-13
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Material traceability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ident code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Heat / trace number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.spoolRevisionMaterialId}>
                      <TableCell className="font-mono text-xs">{line.identCode}</TableCell>
                      <TableCell>{line.description ?? "—"}</TableCell>
                      <TableCell>
                        {line.quantity ?? "—"} {line.unit ?? ""}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={traces[line.identCode] ?? ""}
                          onChange={(event) =>
                            setTraces((current) => ({
                              ...current,
                              [line.identCode]: event.target.value,
                            }))
                          }
                          placeholder={line.expectedTraceNumber ?? "Heat number from the QC-13"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {loadFailed ? (
                <p className="text-destructive text-sm">
                  The bill of materials could not be loaded, so nothing is shown above and
                  nothing has been changed. Reload the page, and report this if it persists.
                </p>
              ) : gate.reason ? (
                <p className="text-sm text-muted-foreground">{gate.reason}</p>
              ) : null}
              <Button
                type="button"
                onClick={() => void save()}
                disabled={!gate.allowed || isSaving || loadFailed}
              >
                Record traces
              </Button>
              <p className="text-xs text-muted-foreground">
                Material Check is derived: it appears on the timeline once every ident code
                carries a trace number the PML accepts.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool to record material traces.</p>
      )}
    </div>
  )
}
