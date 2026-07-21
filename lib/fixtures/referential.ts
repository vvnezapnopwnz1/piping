/**
 * Single access point to the project's source-of-truth referentials
 * (Admin / Referential modules). The spine and the validator consult these
 * to guarantee every hero spool complies with the rules defined in Admin.
 *
 * Uses relative imports (not the "@/" alias) so the module also resolves
 * when the validator is run outside Next.js via `tsx` (see validate.run.ts).
 */
import { WPS_LIST, NDE_MATRIX, REWORK_CODES } from "../engineering-references"
import { WELDER_QUALIFICATIONS } from "../welder-qualifications"
import {
  SEED_SUBCONTRACTORS,
  SEED_SYSTEM_REFERENTIALS,
  seedPdsAreas,
  seedPipingMaterialList,
} from "../admin-seed"

export const PIPING_MATERIAL_LIST = seedPipingMaterialList()
export const MATERIAL_TYPE_CODES = SEED_SYSTEM_REFERENTIALS.materialTypes.map((e) => e.code)
export const ACTIVE_WPS = WPS_LIST.filter((w) => w.status === "Active")
export const NDE_MATRIX_RULES = NDE_MATRIX
export const REWORK_CODE_LIST = REWORK_CODES
export const ACTIVE_WELDER_CODES = WELDER_QUALIFICATIONS.map((w) => w.welderCode)
export const SUBCONTRACTOR_CODES = SEED_SUBCONTRACTORS.map((s) => s.code)
export const PDS_AREA_CODES = seedPdsAreas().map((a) => a.code)
