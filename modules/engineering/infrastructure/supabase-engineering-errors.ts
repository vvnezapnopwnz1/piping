const GENERIC = "The engineering action could not be completed. Please try again."

export function mapSupabaseEngineeringError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return GENERIC
  switch (error.code) {
    case "PQC10": return "This import has already been applied. Start a new import to load the files again."
    case "PQC12": return "The import job could not be found."
    case "PQC20": return "The isometric could not be found, or it has no accepted revision to revise."
    case "PQC21": return "That revision is superseded and read-only. Create a new revision instead."
    case "PQC22": return "Every revised spool and every weld inside a reworked spool needs a decision before this import can be applied."
    case "PQC23": return "That revision number already exists for this isometric. Choose another one."
    case "PQC24": return "This import is not in a state where that action is allowed."
    case "PQC25": return "weld.txt is required before a SpoolGen import can be validated or applied."
    case "PQC26": return "The import still has blocking issues. Fix them in the source files and upload again."
    case "42501": return "You do not have permission to manage spooling data for this project."
    case "23505": return "That business number already exists in this project."
    case "23514": return "The files contain a value the project rules do not allow."
    case "23503": return "A referenced value in the files does not exist in this project."
    default: return GENERIC
  }
}
