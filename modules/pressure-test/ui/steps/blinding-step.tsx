"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  assignBlinding,
  listBlindingWorklist,
  listProjectTeams,
  recordBlinding,
  type BlindingWorklistRow,
  type ProjectTeamRow,
} from "../../infrastructure/supabase-pressure-test-repository"
import { reportTestPackError, useTestPackTranslations } from "../test-pack-i18n"
import { AssignForm } from "./assign-form"
import { openRows } from "./step-actions"

const today = () => new Date().toISOString().slice(0, 10)

export function BlindingStep({ projectId, packId, canManage, onChanged }: { projectId: string; packId: string; canManage: boolean; onChanged: () => void }) {
  const t = useTestPackTranslations()
  const [teams, setTeams] = useState<ProjectTeamRow[]>([])
  const [worklist, setWorklist] = useState<BlindingWorklistRow[]>([])
  const [date, setDate] = useState(today())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const [nextTeams, nextWorklist] = await Promise.all([listProjectTeams(client, projectId, "blinding"), listBlindingWorklist(client, projectId, packId)])
    setTeams(nextTeams); setWorklist(nextWorklist)
  }, [projectId, packId])
  useEffect(() => { void load() }, [load])

  const open = openRows(worklist, "record_id")
  const assign = async ({ teamId, date: assignedOn }: { teamId: string; date: string }) => {
    setError(null)
    try {
      await assignBlinding(getSupabaseBrowserClient(), packId, teamId, assignedOn, `browser-blinding-${packId}-${assignedOn}-${teamId}`)
      toast.success(t("steps.action.assigned", { number: "" }))
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.assignFailed"))) }
  }
  const complete = async (row: BlindingWorklistRow) => {
    setError(null)
    try {
      await recordBlinding(getSupabaseBrowserClient(), row.request_id ?? "", date, `browser-blinding-complete-${row.request_id}-${date}`)
      toast.success(t("steps.action.blindingSaved"))
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.blindingFailed"))) }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {open.length === 0 && <AssignForm teams={teams} targets={null} disabled={!canManage} onAssign={assign} />}
      {open.map((row) => (
        <div key={row.request_id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm">
          <span className="text-muted-foreground">{t("steps.action.request", { number: row.request_number ?? "" })}</span>
          <span className="flex items-center gap-2">
            <input type="date" aria-label={t("steps.action.date")} className="rounded border bg-transparent p-2" value={date} onChange={(event) => setDate(event.target.value)} disabled={!canManage} />
            <Button size="sm" disabled={!canManage || date === ""} onClick={() => void complete(row)}>{t("steps.action.blindingDone")}</Button>
          </span>
        </div>
      ))}
    </div>
  )
}
