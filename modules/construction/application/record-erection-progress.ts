import {
  ERECTION_STAGES,
  erectionStageLabel,
  isRecordableErectionStage,
  type ErectionStage,
} from "../domain/erection-stage"
import type { Gate } from "./record-material-check"

export type RecordableErectionStage = Exclude<ErectionStage, "rft">

/** The four stage dates `spool_erection_readiness` projects, in stage order. */
export interface ErectionStageEvidence {
  toSiteOn: string | null
  erectedOn: string | null
  weldedBoltedOn: string | null
  supportedOn: string | null
}

const EVIDENCE_KEYS: Readonly<Record<RecordableErectionStage, keyof ErectionStageEvidence>> = {
  to_site: "toSiteOn",
  erected: "erectedOn",
  welded_bolted: "weldedBoltedOn",
  supported: "supportedOn",
}

export function isRecordableStage(stage: ErectionStage): stage is RecordableErectionStage {
  return isRecordableErectionStage(stage)
}

export function erectionStageDate(
  stage: RecordableErectionStage,
  evidence: ErectionStageEvidence,
): string | null {
  return evidence[EVIDENCE_KEYS[stage]]
}

/**
 * The first recordable stage before `stage` that carries no date. `record_erection_progress`
 * refuses out-of-order stages with PQC53/PQC54, so the screen names the missing step instead
 * of letting the user find out from a server error.
 */
export function firstMissingPredecessor(
  stage: RecordableErectionStage,
  evidence: ErectionStageEvidence,
): RecordableErectionStage | null {
  for (const candidate of ERECTION_STAGES) {
    if (candidate === stage) break
    if (!isRecordableStage(candidate)) continue
    if (!erectionStageDate(candidate, evidence)) return candidate
  }
  return null
}

export function describeErectionStageGate(input: {
  stage: ErectionStage
  evidence: ErectionStageEvidence
  occurredOn: string
  canRecord: boolean
}): Gate {
  const { stage, evidence, occurredOn, canRecord } = input

  if (!isRecordableStage(stage)) {
    return {
      allowed: false,
      reason: `${erectionStageLabel(stage)} is derived from field weld, support, NDE and PWHT evidence and cannot be recorded by hand.`,
    }
  }
  if (!canRecord) {
    return {
      allowed: false,
      reason: "Recording erection progress needs the erection.progress.record capability.",
    }
  }
  if (occurredOn.trim() === "") {
    return { allowed: false, reason: "Enter the date this step happened." }
  }

  const missing = firstMissingPredecessor(stage, evidence)
  if (missing) {
    return {
      allowed: false,
      reason: `Record ${erectionStageLabel(missing)} before ${erectionStageLabel(stage)}.`,
    }
  }

  return { allowed: true, reason: null }
}
