const GENERIC = "The import could not be completed. Please try again."

export function mapSupabaseImportError(
  error: { code?: string; message?: string } | null | undefined
): string {
  if (!error) return GENERIC

  switch (error.code) {
    case "PQC10":
      return "This import has already been applied. Start a new import to load the file again."
    case "PQC11":
      return "This import is not in a state where that action is allowed."
    case "PQC12":
      return "The import job could not be found."
    case "PQC13":
      return "Some rows still have blocking errors. Fix them in the source file and upload it again."
    case "PQC14":
      return "This import overwrites existing records. Confirm the overwrite to continue."
    case "PQC70":
      return "Flange progress import needs both import and flange management permissions."
    case "PQC71":
      return "A flange progress row is outside the selected project or PDS scope."
    case "PQC72":
      return "A flange progress row targets a stale or removed revision."
    case "PQC73":
      return "A flange category, torquing requirement or engineering reference is missing."
    case "PQC74":
      return "A flange progress row contains an invalid value or date."
    case "PQC75":
      return "A flange progress row contains an empty, duplicate or unknown jointer."
    case "PQC76":
      return "A flange progress correction target is stale."
    case "PQC77":
      return "The flange progress import has an unresolved conflict or unsupported state."
    case "PQC78":
      return "A flange revision-copy authorization is missing or already materialized."
    case "PQC92":
      return "Test Pack import needs both import and Test Pack management permissions."
    case "PQC93":
      return "A Test Pack import row is outside the selected project or PDS scope."
    case "PQC94":
      return "A Test Pack import row targets a stale or non-accepted ISO revision."
    case "PQC95":
      return "A Test Pack import reference is missing or inactive."
    case "PQC96":
      return "Test Pack import has an unresolved conflict or requires a manual ISO assignment."
    case "PQC80":
      return "The Test Pack import references an unknown system."
    case "PQC81":
      return "The Test Pack import references an unknown subsystem."
    case "PQC82":
      return "The Test Pack import references an unknown service class."
    case "PQC83":
      return "The Test Pack import references an unknown line service."
    case "42501":
      return "You do not have permission to manage imports for this project."
    case "23514":
      return "The file contains a value the project rules do not allow."
    case "23503":
      return "A referenced value in the file does not exist in this project."
    default:
      return GENERIC
  }
}
