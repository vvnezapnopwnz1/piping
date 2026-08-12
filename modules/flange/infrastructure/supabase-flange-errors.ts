const GENERIC = "The flange action could not be completed. Please try again."

export function mapSupabaseFlangeError(error: { code?: string; message?: string } | null | undefined): string {
  switch (error?.code) {
    case "PQC70": return "You do not have permission to manage flange progress in this project."
    case "PQC71": return "This flange is outside the selected project or PDS scope."
    case "PQC72": return "This flange belongs to a stale, removed or superseded revision. Reload the current revision."
    case "PQC73": return "A flange category, torquing requirement or unit-time referential is missing or inactive."
    case "PQC74": return "Enter a positive jointing value, valid date, report number and tag number."
    case "PQC75": return "Select at least one active jointer; each jointer must be unique and belong to this project."
    case "PQC76": return "Effective flange progress already exists. Use the current record for a correction."
    case "PQC77": return "The import is blocked or has an unresolved conflict. Resolve it before applying flange progress."
    case "PQC78": return "This revision-copy authorization is missing, stale or already materialized."
    case "PQC38": return "The same flange action is already being processed. Wait and try again."
    case "42501": return "You do not have permission to manage flange progress in this project."
    default: return GENERIC
  }
}

export const GENERIC_FLANGE_ERROR = GENERIC
