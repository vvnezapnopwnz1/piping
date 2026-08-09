const GENERIC = "The pressure-test action could not be completed. Please try again."

export function mapSupabasePressureTestError(error: { code?: string } | null | undefined): string {
  switch (error?.code) {
    case "PQC80": return "The Test Pack or reference is invalid or outside the project scope."
    case "PQC81": return "This ISO membership conflicts with the current Test Pack composition."
    case "PQC82": return "The Line Check target is not eligible for this action."
    case "PQC83": return "The punch or clearance target is invalid or already used."
    case "PQC84": return "The Test Pack is not Ready for Test."
    case "PQC85": return "The pressure-test transition is invalid for the current state."
    case "PQC86": return "The flange is not eligible for Y/Z reinstatement."
    case "PQC88": return "The Test Pack could not be found."
    case "PQC89": return "This Test Pack is archived and read-only."
    case "42501": return "You do not have permission to manage this pressure-test action."
    case "PQC10": return "This command has already been applied."
    case "PQC11": return "This command is not allowed in the current lifecycle state."
    case "PQC12": return "The requested pressure-test record could not be found."
    default: return GENERIC
  }
}
