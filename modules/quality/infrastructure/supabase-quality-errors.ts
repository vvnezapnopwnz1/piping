const GENERIC = "The NDE quality action could not be completed. Please try again."

/**
 * Plan section 3.13. PQC4x codes are reserved for Track 06 NDE quality.
 */
export function mapSupabaseQualityError(
  error: { code?: string; message?: string } | null | undefined,
): string {
  if (!error) return GENERIC
  switch (error.code) {
    case "PQC40":
      return "That NDE batch or obligation could not be found, or it does not belong to this project."
    case "PQC41":
      return "The NDE batch cannot be issued while it has no items allocated to it."
    case "PQC42":
      return "An NDE result has already been recorded for this obligation."
    case "PQC43":
      return "The NDE batch status does not allow this action."
    case "PQC44":
      return "The second repair attempt also failed. This joint must be cut out and replaced."
    case "PQC45":
      return "That weld joint is outside your project scope, or the revision has been superseded."
    case "PQC46":
      return "The NDE result cannot be recorded: the obligation belongs to another project."
    case "PQC47":
      return "This spool has an outstanding PWHT requirement and cannot be quality released."
    case "42501":
      return "You do not have permission to record this NDE work."
    case "23505":
      return "That record already exists for this obligation."
    case "23514":
      return "One of the values entered is not allowed by the project rules."
    case "23503":
      return "A referenced value does not exist in this project."
    default:
      return GENERIC
  }
}
