const GENERIC = "The NDE quality action could not be completed. Please try again."

/**
 * Track 06 plan section 4. PQC40-PQC47 are the Quality codes; the sentence for
 * each one is quoted from that table, because the table is what the refusal
 * means to a QC engineer. PQC48/PQC49 stay free for Track 06 follow-ups.
 */
export const QUALITY_ERROR_SENTENCES: Record<string, string> = {
  PQC40: "A batch must cover one method, one category and one welder. Split this selection.",
  PQC41: "This batch is not in a state that allows that action. Reload it and check its status.",
  PQC42:
    "That obligation is not in this batch, already has a result, or names a welder who did not weld this joint.",
  PQC43:
    "That joint cannot serve as a tracer: it is already used, or outside the eligible population.",
  PQC44: "This repair cycle is not allowed. R2 follows a rejected R1; there is no R3.",
  PQC45: "That obligation belongs to another project or to a superseded revision.",
  PQC46: "The NDE100 population snapshot is missing or empty.",
  PQC47: "This spool has an outstanding PWHT requirement and cannot be quality released.",
  "42501": "You do not have permission to record this NDE work.",
  "23505": "That record already exists for this obligation.",
  "23514": "One of the values entered is not allowed by the project rules.",
  "23503": "A referenced value does not exist in this project.",
}

export function mapSupabaseQualityError(
  error: { code?: string; message?: string } | null | undefined,
): string {
  if (!error?.code) return GENERIC
  return QUALITY_ERROR_SENTENCES[error.code] ?? GENERIC
}

export const GENERIC_QUALITY_ERROR = GENERIC
