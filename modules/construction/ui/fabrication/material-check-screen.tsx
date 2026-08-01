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
  const [isSaving, setIsSaving] = useState(false)
  const [qc13Form, setQc13Form] = useState<Qc13Form | null>(null)

  useEffect(() => {
    if (!spool) {
      setQc13Form(null)
      return
    }
    const client = getSupabaseBrowserClient()
    void Promise.all([
      loadBillOfMaterials(client, spool.spoolRevisionId),
      loadMaterialCheckItems(client, spool.spoolRevisionId),
      loadLatestQc13Form(client, spool.spoolRevisionId),
    ])
      .then(([billLines, existing, form]) => {
        setLines(billLines)
        setTraces(
          Object.fromEntries(existing.map((item) => [item.identCode, item.traceNumber])),
        )
        setQc13Form(form)
      })
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "The bill of materials could not be loaded.",
        ),
      )
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
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={setSpool}
            refreshToken={refreshToken}
          />
        </CardContent>
      </Card>

      {spool ? (
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

              {gate.reason ? (
                <p className="text-sm text-muted-foreground">{gate.reason}</p>
              ) : null}
              <Button type="button" onClick={() => void save()} disabled={!gate.allowed || isSaving}>
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
