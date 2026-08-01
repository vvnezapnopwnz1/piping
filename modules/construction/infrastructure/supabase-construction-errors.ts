const GENERIC = "The fabrication action could not be completed. Please try again."

/**
 * Plan section 3.13. Every `PQC3x` code the construction RPCs raise has a sentence a site
 * engineer can act on. Anything else collapses to GENERIC — a PostgREST or SQL message
 * never reaches the screen.
 */
export function mapSupabaseConstructionError(
  error: { code?: string; message?: string } | null | undefined,
): string {
  if (!error) return GENERIC
  switch (error.code) {
    case "PQC30":
      return "That spool, joint or record could not be found, or it does not belong to this spool."
    case "PQC31":
      return "This spool revision is no longer the accepted one. Reload the spool and record the work against the current revision."
    case "PQC32":
      return "An earlier step is missing. Complete the previous fabrication step before recording this one."
    case "PQC33":
      return "That heat or trace number is not registered in the project PML for this ident code."
    case "PQC34":
      return "The WPS or the welder qualification does not cover this joint. Check the diameter, thickness, material, subcontractor and expiry date."
    case "PQC35":
      return "The weld point allocation is not valid. Root and Cap must total 100 percent, Heat and Fill must total 0 or 100, and each point needs a different welder."
    case "PQC36":
      return "This joint is locked because an NDE result has been accepted. Use the correction action, which records a reason."
    case "PQC37":
      return "This spool still has outstanding NDE obligations or PWHT results and cannot be QC released."
    case "PQC38":
      return "The same request is already being processed. Wait for it to finish before retrying."
    case "PQC39":
      return "A project referential this action depends on is missing or archived. Check the NDE matrix, paint matrix and material class mapping in project setup."
    case "42501":
      return "You do not have permission to record this fabrication work, or the spool is outside your scope."
    case "23505":
      return "That record already exists for this spool or joint."
    case "23514":
      return "One of the values entered is not allowed by the project rules."
    case "23503":
      return "A referenced value does not exist in this project."
    default:
      return GENERIC
  }
}
