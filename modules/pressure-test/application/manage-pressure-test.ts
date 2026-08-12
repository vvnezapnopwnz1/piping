import { canRecordPressureTestEvent, type PressureTestEvent } from "../domain/pressure-test-workflow"
import { recordPressureTestStage } from "../infrastructure/supabase-pressure-test-repository"

const key = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`

export async function recordManagedPressureTestStage(
  repository: Parameters<typeof recordPressureTestStage>[0],
  testPackId: string,
  state: Parameters<typeof canRecordPressureTestEvent>[0],
  event: PressureTestEvent,
  occurredOn: string,
  idempotencyKey = key("pressure-test-stage"),
) {
  if (!canRecordPressureTestEvent(state, event)) {
    return { ok: false as const, errors: { stage: `Cannot record ${event} from ${state}` } }
  }
  if (!occurredOn.trim()) return { ok: false as const, errors: { occurredOn: "Occurred date is required" } }
  return { ok: true as const, value: await recordPressureTestStage(repository, testPackId, event, occurredOn, idempotencyKey) }
}
