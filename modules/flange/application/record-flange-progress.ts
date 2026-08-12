import {
  normalizeFlangeProgressInput,
  type FlangeProgressInput,
  type NormalizedFlangeProgressInput,
} from "../domain/flange-progress"

export interface FlangeProgressRecord extends NormalizedFlangeProgressInput {
  id: string
  calculatedUt?: number | null
  sourceKind?: string
}

export interface FlangeWorklistItem {
  flangeJointRevisionId: string
  projectId: string | null
  isoNumber: string | null
  spoolNumber: string | null
  revisionNumber: string | null
  lineNumber: string | null
  pdsCode: string | null
  flangeNumber: string | null
  flangeRating: string | null
  diameterInch: number | null
  progressState: string | null
  effectiveProgressId: string | null
  jointCategoryId: string | null
  torquingRequirementId: string | null
  jointingValue: number | null
  jointDate: string | null
  calculatedUt: number | null
}

export interface FlangeFormOptions {
  categories: Array<Record<string, unknown>>
  torquingRequirements: Array<Record<string, unknown>>
  jointers: Array<Record<string, unknown>>
}

export interface FlangeRepository {
  listFlangeWorklist(projectId: string): Promise<FlangeWorklistItem[]>
  listFlangeHistory(projectId: string, flangeJointRevisionId?: string): Promise<Array<Record<string, unknown>>>
  listFlangeFormOptions(projectId: string): Promise<FlangeFormOptions>
  recordFlangeProgress(input: NormalizedFlangeProgressInput): Promise<FlangeProgressRecord>
  materializeFlangeProgressCopies(projectId: string, idempotencyKey: string): Promise<{ createdCount: number }>
}

export type RecordFlangeProgressResult =
  | { ok: true; value: FlangeProgressRecord }
  | { ok: false; errors: Record<string, string> }

export async function recordFlangeProgress(
  repository: FlangeRepository,
  input: FlangeProgressInput,
): Promise<RecordFlangeProgressResult> {
  const validation = normalizeFlangeProgressInput(input)
  if (!validation.ok) return validation
  return { ok: true, value: await repository.recordFlangeProgress(validation.value) }
}
