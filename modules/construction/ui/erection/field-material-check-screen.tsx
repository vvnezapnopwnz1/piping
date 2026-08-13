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
import { describeFieldMaterialCheckGate } from "../../application/record-field-material-check"
import { toMaterialCheckPayload } from "../../application/record-material-check"
import type { BillLine, TraceEntry } from "../../domain/material-check"
import {
  loadBillOfMaterials,
  loadLatestQc13Form,
  loadMaterialCheckItems,
  type Qc13Form,
} from "../../infrastructure/supabase-construction-repository"
import { recordFieldMaterialCheck } from "../../infrastructure/supabase-erection-repository"
import { ErectionScreenShell } from "./erection-screen-shell"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Field material check. Every ident code is transcribed by the user against the accepted bill
 * of materials; the screen this replaced submitted the whole BOM at its own expected trace
 * numbers, which asserted evidence nobody had checked.
 *
 * One record per spool revision (T07-D2): if this spool was already material-checked in the
 * shop, recording here re-confirms that same record and takes over its date. The screen says
 * so rather than hiding it.
 */
export function FieldMaterialCheckScreen({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const state = useErectionReadiness()
  const { selected, canRecord, refresh } = state

  const [lines, setLines] = useState<BillLine[]>([])
  const [traces, setTraces] = useState<Record<string, string>>({})
  const [checkedOn, setCheckedOn] = useState(today())
  const [qc13Form, setQc13Form] = useState<Qc13Form | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // An empty `lines` after a failed read would otherwise be reported as "no bill of materials",
  // which means the opposite of the truth.
  const [loadFailed, setLoadFailed] = useState(false)

  const spoolRevisionId = selected?.spoolRevisionId ?? null

  const reloadBom = useCallback(async () => {
    if (!spoolRevisionId) {
      setLines([])
      setTraces({})
      setQc13Form(null)
      setLoadFailed(false)
      return
    }
    const client = getSupabaseBrowserClient()
    try {
      const [billLines, existing, form] = await Promise.all([
        loadBillOfMaterials(client, spoolRevisionId),
        loadMaterialCheckItems(client, spoolRevisionId),
        loadLatestQc13Form(client, spoolRevisionId),
      ])
      setLoadFailed(false)
      setLines(billLines)
      setTraces(Object.fromEntries(existing.map((item) => [item.identCode, item.traceNumber])))
      setQc13Form(form)
    } catch (error: unknown) {
      setLoadFailed(true)
      setLines([])
      toast.error(
        error instanceof Error ? error.message : "The bill of materials could not be loaded.",
      )
    }
  }, [spoolRevisionId])

  useEffect(() => {
    void reloadBom()
  }, [reloadBom])

  const entries: TraceEntry[] = lines
    .filter((line) => (traces[line.identCode] ?? "").trim() !== "")
    .map((line) => ({
      identCode: line.identCode,
      traceNumber: traces[line.identCode],
      quantity: line.quantity,
    }))

  const gate = describeFieldMaterialCheckGate({
    lines,
    entries,
    toSiteOn: selected?.toSiteOn ?? null,
    canRecord,
  })

  const save = async () => {
    if (!spoolRevisionId || !gate.allowed) return
    setIsSaving(true)
    try {
      await recordFieldMaterialCheck(
        getSupabaseBrowserClient(),
        toMaterialCheckPayload({
          spoolRevisionId,
          checkedOn,
          qc13FormId: qc13Form?.id ?? null,
          entries,
        }),
        crypto.randomUUID(),
      )
      await Promise.all([reloadBom(), refresh()])
      toast.success("Field material traces recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The traces could not be recorded.")
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
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  Date checked
                  <Input
                    type="date"
                    value={checkedOn}
                    onChange={(event) => setCheckedOn(event.target.value)}
                  />
                </label>
                <p className="text-muted-foreground text-sm">
                  {row.materialLineChecked}/{row.materialLineTotal} lines carry accepted evidence
                  {row.materialCheckedOn ? (
                    <>
                      {" "}
                      · last checked{" "}
                      <span className="font-mono">{row.materialCheckedOn.slice(0, 10)}</span>
                    </>
                  ) : null}
                  .
                </p>
              </div>
              {row.materialCheckedOn ? (
                <p className="text-muted-foreground text-xs">
                  A spool revision carries one material check whichever phase performed it, so
                  recording here re-confirms the existing record and takes over its date. The
                  phase of each check stays visible in the progress ledger.
                </p>
              ) : null}
              {qc13Form ? (
                <p className="text-muted-foreground text-xs">
                  Attaching QC-13 <span className="font-mono">{qc13Form.formNumber}</span>.
                </p>
              ) : null}
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
                          placeholder={line.expectedTraceNumber ?? "Heat number on the material"}
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
                <p className="text-muted-foreground text-sm">{gate.reason}</p>
              ) : null}
              <Button
                type="button"
                onClick={() => void save()}
                disabled={!gate.allowed || isSaving || loadFailed}
              >
                Record field traces
              </Button>
              <p className="text-muted-foreground text-xs">
                Material Check is derived, not entered: it appears on the ledger under the
                erection phase once every ident code carries a trace the PML accepts.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </ErectionScreenShell>
  )
}
