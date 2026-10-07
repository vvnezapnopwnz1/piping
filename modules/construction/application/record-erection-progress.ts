import {
  ERECTION_STAGES,
  isRecordableErectionStage,
  type ErectionStage,
} from "../domain/erection-stage"
import type { Gate } from "./record-material-check"

/** Why an erection stage cannot be recorded now (erection.gate in the messages). */
export type ErectionGateReason =
  | { code: "derived"; stage: ErectionStage }
  | { code: "no_access" }
  | { code: "date_required" }
  | { code: "record_first"; missing: ErectionStage; stage: ErectionStage }

export type ErectionGate = Gate<ErectionGateReason>

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
}): ErectionGate {
  const { stage, evidence, occurredOn, canRecord } = input

  if (!isRecordableStage(stage)) {
    return { allowed: false, reason: { code: "derived", stage } }
  }
  if (!canRecord) {
    return { allowed: false, reason: { code: "no_access" } }
  }
  if (occurredOn.trim() === "") {
    return { allowed: false, reason: { code: "date_required" } }
  }

  const missing = firstMissingPredecessor(stage, evidence)
  if (missing) {
    return { allowed: false, reason: { code: "record_first", missing, stage } }
  }

  return { allowed: true, reason: null }
}
