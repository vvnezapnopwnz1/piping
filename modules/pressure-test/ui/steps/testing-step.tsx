"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { PressureTestEvent, PressureTestState } from "../../domain/pressure-test-workflow"
import { recordManagedPressureTestStage } from "../../application/manage-pressure-test"
import { reportTestPackError, testPackValidationMessages, useTestPackTranslations } from "../test-pack-i18n"
import { nextTestingAction, type TestingAction } from "./testing-actions"

const today = () => new Date().toISOString().slice(0, 10)

/** What the server needs to accept each action: the pack's state before it and the event it records. */
const ACTIONS: Record<TestingAction, { state: PressureTestState; event: PressureTestEvent; label: string }> = {
  testing_start: { state: "blinded", event: "testing_started", label: "steps.action.startTesting" },
  testing_complete: { state: "testing", event: "testing_completed", label: "steps.action.completeTesting" },
  precommissioning: { state: "ready_for_precommissioning", event: "precommissioning_completed", label: "steps.action.completePrecommissioning" },
}

/** Testing and pre-commissioning: one button, the one the server allows next. */
export function TestingStep({ packId, available, owned, canManage, onChanged }: { packId: string; available: readonly string[]; owned: readonly TestingAction[]; canManage: boolean; onChanged: () => void }) {
  const t = useTestPackTranslations()
  const [date, setDate] = useState(today())
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const action = nextTestingAction(available, owned)
  if (!action) return <p className="text-sm text-muted-foreground">{t("steps.action.waiting")}</p>
  const config = ACTIONS[action]

  const record = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await recordManagedPressureTestStage(getSupabaseBrowserClient(), packId, config.state, config.event, date, `browser-pressure-test-stage-${packId}-${config.event}`)
      if (!result.ok) return void setError(testPackValidationMessages(result.errors, t))
      toast.success(t("steps.action.testingSaved"))
      onChanged()
    } catch (cause) {
      setError(reportTestPackError(cause, t("steps.action.testingFailed")))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">{t("steps.action.date")}
          <input type="date" className="mt-1 block rounded border bg-transparent p-2" value={date} onChange={(event) => setDate(event.target.value)} disabled={!canManage} />
        </label>
        <Button disabled={!canManage || date === "" || pending} loading={pending} onClick={() => void record()}>{t(config.label)}</Button>
      </div>
    </div>
  )
}
