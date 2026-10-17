"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { ProjectTeamRow } from "../../infrastructure/supabase-pressure-test-repository"
import { useTestPackTranslations } from "../test-pack-i18n"
import type { Target } from "./step-actions"

const today = () => new Date().toISOString().slice(0, 10)

/** Team, date and (when the work has targets) what to assign; one button. Blinding has no targets: the whole pack. */
export function AssignForm({
  teams,
  targets,
  disabled,
  onAssign,
}: {
  teams: readonly ProjectTeamRow[]
  targets: readonly Target[] | null
  disabled: boolean
  onAssign: (input: { teamId: string; date: string; targetIds: string[] }) => Promise<void>
}) {
  const t = useTestPackTranslations()
  const [teamId, setTeamId] = useState("")
  const [date, setDate] = useState(today())
  const [picked, setPicked] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const noTargets = targets !== null && targets.length === 0
  const ready = !disabled && teamId !== "" && date !== "" && (targets === null || picked.length > 0) && !pending

  return (
    <div className="space-y-3 rounded border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">{t("steps.action.team")}
          <select className="mt-1 block rounded border bg-transparent p-2" value={teamId} onChange={(event) => setTeamId(event.target.value)} disabled={disabled}>
            <option value="">{t("steps.action.selectTeam")}</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.code}{team.description ? ` · ${team.description}` : ""}</option>)}
          </select>
        </label>
        <label className="text-sm">{t("steps.action.assignedOn")}
          <input type="date" className="mt-1 block rounded border bg-transparent p-2" value={date} onChange={(event) => setDate(event.target.value)} disabled={disabled} />
        </label>
      </div>
      {targets === null ? <p className="text-sm text-muted-foreground">{t("steps.action.wholePack")}</p> : noTargets ? <p className="text-sm text-muted-foreground">{t("steps.action.noTargets")}</p> : (
        <div className="space-y-1">
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setPicked(targets.map((target) => target.id))}>{t("steps.action.selectAll")}</Button>
          <ul className="grid gap-1 sm:grid-cols-2">
            {targets.map((target) => (
              <li key={target.id}>
                <label className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                  <input type="checkbox" disabled={disabled} checked={picked.includes(target.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, target.id] : picked.filter((id) => id !== target.id))} />
                  <span className="font-mono">{target.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button
        type="button"
        disabled={!ready || noTargets}
        loading={pending}
        onClick={async () => {
          setPending(true)
          try {
            await onAssign({ teamId, date, targetIds: picked })
            setPicked([])
          } finally {
            setPending(false)
          }
        }}
      >
        {t("steps.action.assignButton")}
      </Button>
    </div>
  )
}
