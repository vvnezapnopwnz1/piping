"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { recordFlangeProgress } from "../application/record-flange-progress"
import type { FlangeFormOptions, FlangeWorklistItem } from "../application/record-flange-progress"
import { listFlangeFormOptions, listFlangeHistory, listFlangeWorklist, recordFlangeProgress as saveFlangeProgress } from "../infrastructure/supabase-flange-repository"

const today = () => new Date().toISOString().slice(0, 10)
const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? "")

export function FlangeManagementScreen({ projectId, canManage, mode = "operate" }: { projectId: string; canManage: boolean; mode?: "browse" | "operate" }) {
  const [rows, setRows] = useState<FlangeWorklistItem[]>([])
  const [options, setOptions] = useState<FlangeFormOptions>({ categories: [], torquingRequirements: [], jointers: [] })
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [jointCategoryId, setJointCategoryId] = useState("")
  const [torquingRequirementId, setTorquingRequirementId] = useState("")
  const [jointingValue, setJointingValue] = useState("")
  const [jointDate, setJointDate] = useState(today())
  const [reportNumber, setReportNumber] = useState("")
  const [tagNumber, setTagNumber] = useState("")
  const [jointerIds, setJointerIds] = useState<string[]>([])

  const selected = useMemo(() => rows.find((row) => row.flangeJointRevisionId === selectedId) ?? null, [rows, selectedId])
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const client = getSupabaseBrowserClient()
      const [nextRows, nextOptions] = await Promise.all([listFlangeWorklist(client, projectId), listFlangeFormOptions(client, projectId)])
      setRows(nextRows)
      setOptions(nextOptions)
      setSelectedId((current) => current && nextRows.some((row) => row.flangeJointRevisionId === current) ? current : nextRows[0]?.flangeJointRevisionId ?? null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Flange worklist could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    if (!selectedId) { setHistory([]); return }
    void listFlangeHistory(getSupabaseBrowserClient(), projectId, selectedId).then(setHistory).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Flange history could not be loaded."))
  }, [projectId, selectedId])

  const submit = async () => {
    if (!canManage || !selected) return
    setSaving(true)
    try {
      const result = await recordFlangeProgress(
        { listFlangeWorklist: async () => [], listFlangeHistory: async () => [], listFlangeFormOptions: async () => options,
          recordFlangeProgress: (input) => saveFlangeProgress(getSupabaseBrowserClient(), input),
          materializeFlangeProgressCopies: async () => ({ createdCount: 0 }) },
        {
          projectId, flangeJointRevisionId: selected.flangeJointRevisionId, jointCategoryId, torquingRequirementId,
          jointingValue: Number(jointingValue), jointDate, reportNumber, tagNumber, jointerIds, idempotencyKey: crypto.randomUUID(),
          replacesProgressId: selected.effectiveProgressId ?? undefined,
        },
      )
      if (!result.ok) { toast.error(Object.values(result.errors)[0] ?? "Check the form."); return }
      toast.success("Flange progress recorded.")
      setReportNumber(""); setTagNumber(""); setJointingValue("")
      await reload()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Flange progress could not be recorded.")
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading flange worklist…</p>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Flange worklist</CardTitle>
          <CardDescription>Current accepted flange definitions and their effective bolt-up progress.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Flange</TableHead><TableHead>ISO / Spool</TableHead><TableHead>Rev</TableHead><TableHead>Line / PDS</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead>UT</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => <TableRow key={row.flangeJointRevisionId} data-state={row.flangeJointRevisionId === selectedId ? "selected" : undefined} onClick={() => setSelectedId(row.flangeJointRevisionId)} className="cursor-pointer">
                <TableCell className="font-mono text-xs">{row.flangeNumber ?? "—"}</TableCell><TableCell>{row.isoNumber ?? "—"} / {row.spoolNumber ?? "—"}</TableCell><TableCell>{row.revisionNumber ?? "—"}</TableCell><TableCell>{row.lineNumber ?? "—"} / {row.pdsCode ?? "—"}</TableCell><TableCell>{row.flangeRating ?? "—"}</TableCell><TableCell><Badge variant="outline">{row.progressState ?? "not_started"}</Badge></TableCell><TableCell>{row.calculatedUt ?? "Not configured"}</TableCell>
              </TableRow>)}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-muted-foreground">No flange joints in the current revision.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {mode === "browse" ? null :
        <Card>
          <CardHeader><CardTitle>{selected.flangeNumber ?? "Flange"} progress</CardTitle><CardDescription>{selected.progressState === "completed" ? "Correction creates a new immutable history row." : "Record the jointing event once the flange is ready."}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {canManage ? <>
              <label className="block text-sm">Joint category<select className="mt-1 w-full rounded-md border bg-background p-2" value={jointCategoryId} onChange={(event) => setJointCategoryId(event.target.value)}><option value="">Select category</option>{options.categories.map((item) => <option key={text(item, "id")} value={text(item, "id")}>{text(item, "category_code")} — {text(item, "reason")}</option>)}</select></label>
              <label className="block text-sm">Torquing requirement<select className="mt-1 w-full rounded-md border bg-background p-2" value={torquingRequirementId} onChange={(event) => setTorquingRequirementId(event.target.value)}><option value="">Select requirement</option>{options.torquingRequirements.map((item) => <option key={text(item, "id")} value={text(item, "id")}>{text(item, "code")} — {text(item, "description")}</option>)}</select></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Jointing value<Input type="number" min="0.01" value={jointingValue} onChange={(event) => setJointingValue(event.target.value)} /></label><label className="text-sm">Joint date<Input type="date" value={jointDate} onChange={(event) => setJointDate(event.target.value)} /></label><label className="text-sm">Report number<Input value={reportNumber} onChange={(event) => setReportNumber(event.target.value)} /></label><label className="text-sm">Tag number<Input value={tagNumber} onChange={(event) => setTagNumber(event.target.value)} /></label></div>
              <fieldset><legend className="text-sm">Jointers</legend><div className="grid gap-1 sm:grid-cols-2">{options.jointers.map((item) => { const id = text(item, "id"); return <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={jointerIds.includes(id)} onChange={(event) => setJointerIds((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} />{text(item, "code")} — {text(item, "description")}</label> })}</div></fieldset>
              <Button disabled={saving} onClick={() => void submit()}>{saving ? "Saving…" : selected.effectiveProgressId ? "Record correction" : "Record flange progress"}</Button>
            </> : <p className="text-sm text-muted-foreground">You have read-only access. Flange progress requires the flange.manage capability.</p>}
          </CardContent>
        </Card>}
        <Card><CardHeader><CardTitle>History</CardTitle><CardDescription>Append-only records for this flange revision.</CardDescription></CardHeader><CardContent><div className="space-y-2 text-sm">{history.map((item) => <div key={text(item, "id")} className="rounded border p-2"><div className="flex justify-between"><span>{text(item, "report_number")} · {text(item, "tag_number")}</span><Badge variant="outline">{text(item, "source_kind")}</Badge></div><div className="text-muted-foreground">{text(item, "joint_date")} · value {text(item, "jointing_value")} · UT {text(item, "calculated_ut") || "not configured"}</div></div>)}{history.length === 0 && <p className="text-muted-foreground">No progress history.</p>}</div></CardContent></Card>
      </div>}
    </div>
  )
}
