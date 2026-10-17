"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  assignReinstatement,
  listProjectTeams,
  listReinstatementWorklist,
  listTestPackReinstatementTargets,
  recordReinstatement,
  type FlangeJointReadinessRow,
  type ProjectTeamRow,
  type ReinstatementWorklistRow,
} from "../../infrastructure/supabase-pressure-test-repository"
import { reportTestPackError, useTestPackTranslations } from "../test-pack-i18n"
import { AssignForm } from "./assign-form"
import { reinstatementAssignKey, reinstatementDraftErrors, reinstatementTargets } from "./testing-actions"

const today = () => new Date().toISOString().slice(0, 10)

export function ReinstatementStep({ projectId, packId, category, available, canManage, onChanged }: { projectId: string; packId: string; category: "Y" | "Z"; available: readonly string[]; canManage: boolean; onChanged: () => void }) {
  const t = useTestPackTranslations()
  const [assignTeams, setAssignTeams] = useState<ProjectTeamRow[]>([])
  const [jointers, setJointers] = useState<ProjectTeamRow[]>([])
  const [flanges, setFlanges] = useState<FlangeJointReadinessRow[]>([])
  const [worklist, setWorklist] = useState<ReinstatementWorklistRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, { date: string; report: string; tag: string; team: string }>>({})
  const [touched, setTouched] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const [a, j, f, w] = await Promise.all([
      listProjectTeams(client, projectId, "reinstatement"), listProjectTeams(client, projectId, "jointer"),
      listTestPackReinstatementTargets(client, projectId, packId), listReinstatementWorklist(client, projectId, packId),
    ])
    setAssignTeams(a); setJointers(j); setFlanges(f); setWorklist(w)
  }, [projectId, packId])
  useEffect(() => { void load() }, [load])

  const held = new Set(worklist.map((row) => row.flange_joint_revision_id))
  const targets = reinstatementTargets(flanges, available, category).filter((target) => !held.has(target.id))
  const open = worklist.filter((row) => row.record_id === null && row.category_snapshot === category)

  const assign = async ({ teamId, date, targetIds }: { teamId: string; date: string; targetIds: string[] }) => {
    setError(null)
    try {
      await assignReinstatement(getSupabaseBrowserClient(), packId, targetIds, teamId, date, reinstatementAssignKey(packId, category, date, teamId, targetIds))
      toast.success(t("steps.action.assigned", { number: "" }))
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.assignFailed"))) }
  }

  const record = async (row: ReinstatementWorklistRow) => {
    const id = row.flange_joint_revision_id ?? ""
    const draft = drafts[id] ?? { date: today(), report: "", tag: "", team: jointers[0]?.id ?? "" }
    setTouched(id)
    if (Object.keys(reinstatementDraftErrors(draft)).length > 0 || draft.team === "") return
    setError(null)
    try {
      await recordReinstatement(getSupabaseBrowserClient(), row.request_id ?? "", id, draft.date, draft.report.trim(), draft.team, draft.tag.trim(), `browser-reinstatement-complete-${id}-${draft.date}`)
      toast.success(t("steps.action.jointSaved"))
      setTouched(null)
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.jointFailed"))) }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {targets.length > 0 && <AssignForm teams={assignTeams} targets={targets} disabled={!canManage} onAssign={assign} />}
      {open.length === 0 ? <p className="text-sm text-muted-foreground">{t("steps.action.noOpen")}</p> : (
        <ul className="space-y-2">
          {open.map((row) => {
            const id = row.flange_joint_revision_id ?? ""
            const draft = drafts[id] ?? { date: today(), report: "", tag: "", team: jointers[0]?.id ?? "" }
            const set = (patch: Partial<typeof draft>) => setDrafts({ ...drafts, [id]: { ...draft, ...patch } })
            const errors = touched === id ? reinstatementDraftErrors(draft) : {}
            return (
              <li key={id} className="space-y-2 rounded border p-3 text-sm">
                <div className="flex justify-between"><span className="font-mono font-medium">{row.flange_number}</span><span className="text-muted-foreground">{t("steps.action.request", { number: row.request_number ?? "" })}</span></div>
                <div className="flex flex-wrap items-start gap-3">
                  <input type="date" aria-label={t("steps.action.date")} className="rounded border bg-transparent p-2" value={draft.date} onChange={(event) => set({ date: event.target.value })} disabled={!canManage} />
                  <label className="block"><input placeholder={t("steps.action.reportNumber")} aria-label={t("steps.action.reportNumber")} className="rounded border bg-transparent p-2" value={draft.report} onChange={(event) => set({ report: event.target.value })} disabled={!canManage} />{errors.report && <span className="block text-xs text-destructive">{t("steps.action.required")}</span>}</label>
                  <label className="block"><input placeholder={t("steps.action.tagNumber")} aria-label={t("steps.action.tagNumber")} className="rounded border bg-transparent p-2" value={draft.tag} onChange={(event) => set({ tag: event.target.value })} disabled={!canManage} />{errors.tag && <span className="block text-xs text-destructive">{t("steps.action.required")}</span>}</label>
                  <select aria-label={t("steps.action.jointerTeam")} className="rounded border bg-transparent p-2" value={draft.team} onChange={(event) => set({ team: event.target.value })} disabled={!canManage}>
                    {jointers.map((team) => <option key={team.id} value={team.id}>{team.code}</option>)}
                  </select>
                  <Button size="sm" disabled={!canManage} onClick={() => void record(row)}>{t("steps.action.recordJoint")}</Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
