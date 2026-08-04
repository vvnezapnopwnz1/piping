"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { loadBillOfMaterials } from "../../infrastructure/supabase-construction-repository"
import {
  loadErectionReadinessForProject,
  loadFieldSupports,
  loadFieldWelds,
  recordErectionProgress,
  recordFieldMaterialCheck,
  recordFieldSupportProgress,
  recordFieldWeldProgress,
  type ErectionReadiness,
} from "../../infrastructure/supabase-erection-repository"

type Action = "progress" | "material" | "weld" | "support" | "gate"

interface Props {
  title: string
  description: string
  action: Action
}

const actionStage = {
  "To Site": "to_site",
  Erected: "erected",
  "Welded / Bolted": "welded_bolted",
  Supported: "supported",
} as const

const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-erection`

export function ErectionSupabaseScreen({ title, description, action }: Props) {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null
  const [rows, setRows] = useState<ErectionReadiness[]>([])
  const [fieldJoints, setFieldJoints] = useState<Record<string, unknown>[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    if (!projectId) return
    try {
      const next = await loadErectionReadinessForProject(getSupabaseBrowserClient(), projectId)
      setRows(next)
      setSelected((current) => current && next.some((row) => row.spoolRevisionId === current) ? current : next[0]?.spoolRevisionId ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erection data could not be loaded.")
    }
  }

  useEffect(() => { void refresh() }, [projectId])

  const selectedRow = useMemo(
    () => rows.find((row) => row.spoolRevisionId === selected) ?? null,
    [rows, selected],
  )

  useEffect(() => {
    if (!selectedRow || action !== "weld") {
      setFieldJoints([])
      return
    }
    void loadFieldWelds(getSupabaseBrowserClient(), selectedRow.spoolRevisionId)
      .then(setFieldJoints)
      .catch(() => setFieldJoints([]))
  }, [action, selectedRow])

  const runAction = async () => {
    if (!selectedRow || busy) return
    setBusy(true)
    try {
      const client = getSupabaseBrowserClient()
      const today = new Date().toISOString()
      if (action === "progress") {
        const stage = actionStage[title as keyof typeof actionStage]
        if (!stage) throw new Error("Choose an erection stage before recording progress.")
        await recordErectionProgress(client, selectedRow.spoolRevisionId, stage, today, uuid())
      } else if (action === "material") {
        const lines = await loadBillOfMaterials(client, selectedRow.spoolRevisionId)
        await recordFieldMaterialCheck(client, {
          target_spool_revision_id: selectedRow.spoolRevisionId,
          checked_on: today,
          items: lines.map((line) => ({ ident_code: line.identCode, trace_number: line.expectedTraceNumber ?? "", quantity: line.quantity })),
          qc13_form_id: null,
        }, uuid())
      } else if (action === "support") {
        const supports = await loadFieldSupports(client, selectedRow.spoolRevisionId)
        const support = supports.find((row) => !(row.support_progress_records?.[0]?.installed_on))
        if (!support) throw new Error("No open support record is available for this spool.")
        await recordFieldSupportProgress(client, support.id, today, uuid())
      } else if (action === "weld") {
        const welds = await loadFieldWelds(client, selectedRow.spoolRevisionId)
        const weld = welds.find((row) => !row.weld_on)
        if (!weld) throw new Error("No open field joint is available for this spool.")
        const referentials = await import("../../infrastructure/supabase-construction-repository").then(({ loadWeldFormReferentials }) => loadWeldFormReferentials(client, selectedRow.projectId))
        const root = referentials.welders[0]
        const cap = referentials.welders[1] ?? root
        const procedure = referentials.procedures[0]
        const subcontractor = referentials.subcontractors[0]
        if (!root || !procedure || !subcontractor) throw new Error("Field weld referentials are not configured.")
        await recordFieldWeldProgress(client, {
          target_weld_joint_revision_id: weld.weld_joint_revision_id,
          subcontractor_id: subcontractor.id,
          welding_procedure_id: procedure.id,
          points: [
            { point_type: "root", welder_qualification_id: root.id, completion_percent: 50, welded_on: today },
            { point_type: "cap", welder_qualification_id: cap.id, completion_percent: 50, welded_on: today },
          ],
          dates: { weld_on: today },
        }, uuid())
      } else {
        return
      }
      toast.success("Erection record saved.")
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The erection action could not be completed.")
    } finally {
      setBusy(false)
    }
  }

  if (!projectId) return <p className="text-sm text-muted-foreground">Select a project to see erection progress.</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Field spool readiness</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>ISO</TableHead><TableHead>Spool</TableHead><TableHead>Joint / welds</TableHead><TableHead>Stage</TableHead><TableHead>RFT</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.spoolRevisionId} data-selected={selected === row.spoolRevisionId}>
                  <TableCell className="font-mono text-xs">{row.isoNumber}</TableCell>
                  <TableCell className="font-mono text-xs">{row.spoolNumber} · {row.revisionNumber}</TableCell>
                  <TableCell>{row.fieldWeldComplete}/{row.fieldWeldTotal} joints</TableCell>
                  <TableCell><Badge variant="outline">{row.rftOn ? "rft" : row.supportedOn ? "supported" : row.weldedBoltedOn ? "welded/bolted" : row.erectedOn ? "erected" : row.toSiteOn ? "to site" : "not started"}</Badge></TableCell>
                  <TableCell>{row.isRft ? `Ready${row.rftOn ? ` · ${row.rftOn.slice(0, 10)}` : ""}` : `${row.ndePending} NDE / ${row.pwhtPending} PWHT pending`}</TableCell>
                  <TableCell><Button variant={selected === row.spoolRevisionId ? "default" : "outline"} size="sm" onClick={() => setSelected(row.spoolRevisionId)}>Select</Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No accepted field spools found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedRow && action !== "gate" && (
        <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6"><p className="text-sm">Selected <span className="font-mono">{selectedRow.isoNumber} / {selectedRow.spoolNumber}</span></p><Button onClick={() => void runAction()} disabled={busy}>{busy ? "Saving…" : action === "material" ? "Record field material check" : action === "weld" ? "Record field weld" : action === "support" ? "Record support" : `Record ${title}`}</Button></CardContent></Card>
      )}
      {action === "weld" && selectedRow && fieldJoints.length > 0 && (
        <Card><CardHeader><CardTitle>Field joints for {selectedRow.isoNumber} / {selectedRow.spoolNumber}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>ISO</TableHead><TableHead>Spool</TableHead><TableHead>Joint</TableHead><TableHead>Weld date</TableHead><TableHead>NDE pending</TableHead></TableRow></TableHeader><TableBody>{fieldJoints.map((joint) => <TableRow key={String(joint.weld_joint_revision_id)}><TableCell>{selectedRow.isoNumber}</TableCell><TableCell>{selectedRow.spoolNumber}</TableCell><TableCell className="font-mono">{String(joint.weld_number ?? "—")}</TableCell><TableCell>{String(joint.weld_on ?? "open")}</TableCell><TableCell>{String(joint.obligation_pending ?? 0)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      )}
      {action === "gate" && <p className="text-sm text-muted-foreground">RFT is read-only and derived from welded/bolted, supported, NDE and PWHT evidence.</p>}
    </div>
  )
}
