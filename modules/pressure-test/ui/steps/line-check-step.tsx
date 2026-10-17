"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { assignManagedItemClearance, assignManagedLineCheck, recordManagedLineCheckResult } from "../../application/manage-line-check"
import {
  listItemClearanceWorklist,
  listLineCheckWorklist,
  listProjectPunchCodes,
  listProjectTeams,
  listPunchItems,
  listTestPackMembers,
  recordPunchClearance,
  type ItemClearanceWorklistRow,
  type LineCheckWorklistRow,
  type ProjectReferenceOptionRow,
  type ProjectTeamRow,
  type TestPackMemberRow,
} from "../../infrastructure/supabase-pressure-test-repository"
import { reportTestPackError, testPackValidationMessages, useTestPackTranslations } from "../test-pack-i18n"
import { AssignForm } from "./assign-form"
import { lineCheckTargets, openRows, punchDraftValid, punchTargets } from "./step-actions"

const today = () => new Date().toISOString().slice(0, 10)
type StepProps = { projectId: string; packId: string; canManage: boolean; onChanged: () => void }

export function LineCheckStep({ projectId, packId, canManage, onChanged }: StepProps) {
  const t = useTestPackTranslations()
  const [teams, setTeams] = useState<ProjectTeamRow[]>([])
  const [members, setMembers] = useState<TestPackMemberRow[]>([])
  const [worklist, setWorklist] = useState<LineCheckWorklistRow[]>([])
  const [codes, setCodes] = useState<ProjectReferenceOptionRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, { date: string; code: string; description: string }>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const [nextTeams, nextMembers, nextWorklist, nextCodes] = await Promise.all([
      listProjectTeams(client, projectId, "line_check"), listTestPackMembers(client, projectId, packId),
      listLineCheckWorklist(client, projectId, packId), listProjectPunchCodes(client, projectId),
    ])
    setTeams(nextTeams); setMembers(nextMembers); setWorklist(nextWorklist); setCodes(nextCodes)
  }, [projectId, packId])
  useEffect(() => { void load() }, [load])

  const assign = async ({ teamId, date, targetIds }: { teamId: string; date: string; targetIds: string[] }) => {
    setError(null)
    try {
      const result = await assignManagedLineCheck(getSupabaseBrowserClient(), { testPackId: packId, isometricIds: targetIds, teamId, assignedDate: date })
      if (!result.ok) return void setError(testPackValidationMessages((result as { errors: Record<string, string> }).errors, t))
      toast.success(t("steps.action.assigned", { number: String((result.value as { request_number?: string })?.request_number ?? "") }))
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.assignFailed"))) }
  }

  const save = async (row: LineCheckWorklistRow) => {
    const id = `${row.request_id}:${row.isometric_id}`
    const draft = drafts[id] ?? { date: today(), code: "", description: "" }
    if (!punchDraftValid(draft)) return
    setError(null)
    try {
      const punches = draft.code ? [{ testPackId: packId, isometricId: row.isometric_id ?? "", punchCodeId: draft.code, description: draft.description, checkingDate: draft.date }] : []
      const result = await recordManagedLineCheckResult(getSupabaseBrowserClient(), row.request_id ?? "", row.isometric_id ?? "", draft.date, punches)
      if (!result.ok) return void setError(testPackValidationMessages((result as { errors: Record<string, string> }).errors, t))
      toast.success(t("steps.action.lineCheckSaved"))
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.lineCheckFailed"))) }
  }

  const open = openRows(worklist, "result_id")
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AssignForm teams={teams} targets={lineCheckTargets(members, worklist)} disabled={!canManage} onAssign={assign} />
      {open.length === 0 ? <p className="text-sm text-muted-foreground">{t("steps.action.noOpen")}</p> : (
        <ul className="space-y-2">
          {open.map((row) => {
            const id = `${row.request_id}:${row.isometric_id}`
            const draft = drafts[id] ?? { date: today(), code: "", description: "" }
            const set = (patch: Partial<typeof draft>) => setDrafts({ ...drafts, [id]: { ...draft, ...patch } })
            return (
              <li key={id} className="space-y-2 rounded border p-3 text-sm">
                <div className="flex justify-between"><span className="font-mono font-medium">{row.iso_number}</span><span className="text-muted-foreground">{t("steps.action.request", { number: row.request_number ?? "" })}</span></div>
                <div className="flex flex-wrap items-end gap-3">
                  <input type="date" aria-label={t("steps.action.date")} className="rounded border bg-transparent p-2" value={draft.date} onChange={(event) => set({ date: event.target.value })} disabled={!canManage} />
                  <select aria-label={t("steps.action.punchCode")} className="rounded border bg-transparent p-2" value={draft.code} onChange={(event) => set({ code: event.target.value })} disabled={!canManage}>
                    <option value="">{t("steps.action.noPunch")}</option>
                    {codes.map((code) => <option key={code.id} value={code.id}>{code.code}{code.description ? ` · ${code.description}` : ""}</option>)}
                  </select>
                  {draft.code && <input aria-label={t("steps.action.punchDescription")} placeholder={t("steps.action.punchDescription")} className="min-w-48 flex-1 rounded border bg-transparent p-2" value={draft.description} onChange={(event) => set({ description: event.target.value })} />}
                  <Button size="sm" disabled={!canManage || !punchDraftValid(draft) || draft.date === ""} onClick={() => void save(row)}>{t("steps.action.saveLineCheck")}</Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ItemClearanceStep({ projectId, packId, canManage, onChanged }: StepProps) {
  const t = useTestPackTranslations()
  const [teams, setTeams] = useState<ProjectTeamRow[]>([])
  const [punches, setPunches] = useState<Record<string, unknown>[]>([])
  const [worklist, setWorklist] = useState<ItemClearanceWorklistRow[]>([])
  const [dates, setDates] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const [nextTeams, nextPunches, nextWorklist] = await Promise.all([listProjectTeams(client, projectId, "finishing"), listPunchItems(client, projectId, packId), listItemClearanceWorklist(client, projectId, packId)])
    setTeams(nextTeams); setPunches(nextPunches); setWorklist(nextWorklist)
  }, [projectId, packId])
  useEffect(() => { void load() }, [load])

  const assign = async ({ teamId, date, targetIds }: { teamId: string; date: string; targetIds: string[] }) => {
    setError(null)
    try {
      const result = await assignManagedItemClearance(getSupabaseBrowserClient(), { testPackId: packId, punchItemIds: targetIds, teamId, assignedDate: date })
      if (!result.ok) return void setError(testPackValidationMessages((result as { errors: Record<string, string> }).errors, t))
      toast.success(t("steps.action.assigned", { number: String((result.value as { request_number?: string })?.request_number ?? "") }))
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.assignFailed"))) }
  }

  const clear = async (row: ItemClearanceWorklistRow) => {
    const date = dates[row.punch_item_id ?? ""] ?? today()
    setError(null)
    try {
      await recordPunchClearance(getSupabaseBrowserClient(), row.request_id ?? "", row.punch_item_id ?? "", date, `browser-clear-${row.punch_item_id}-${date}`)
      toast.success(t("steps.action.cleared"))
      await load(); onChanged()
    } catch (cause) { setError(reportTestPackError(cause, t("steps.action.clearFailed"))) }
  }

  const open = openRows(worklist, "clearance_id")
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AssignForm teams={teams} targets={punchTargets(punches as { id: string; item_number?: string | null }[], worklist)} disabled={!canManage} onAssign={assign} />
      {open.length === 0 ? <p className="text-sm text-muted-foreground">{t("steps.action.noOpen")}</p> : (
        <ul className="space-y-2">
          {open.map((row) => (
            <li key={`${row.request_id}:${row.punch_item_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm">
              <span><span className="font-mono font-medium">{row.item_number}</span> <span className="text-muted-foreground">{t("steps.action.request", { number: row.request_number ?? "" })}</span></span>
              <span className="flex items-center gap-2">
                <input type="date" aria-label={t("steps.action.date")} className="rounded border bg-transparent p-2" value={dates[row.punch_item_id ?? ""] ?? today()} onChange={(event) => setDates({ ...dates, [row.punch_item_id ?? ""]: event.target.value })} disabled={!canManage} />
                <Button size="sm" disabled={!canManage} onClick={() => void clear(row)}>{t("steps.action.clear")}</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
