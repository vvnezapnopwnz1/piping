/**
 * Referential-integrity validator for the fixture spine.
 *
 * Automates the "do instances comply with Admin/Referential rules" checks:
 * every heat, welder, WPS, NDE method, material, subcontractor and PDS area
 * referenced by a hero spool must exist in the source-of-truth referentials.
 *
 * Run via `npm run validate:fixtures` (see validate.run.ts). A non-empty
 * result means the demo data is out of sync.
 */
import { SPINE } from "./spine"
import {
  PIPING_MATERIAL_LIST,
  MATERIAL_TYPE_CODES,
  ACTIVE_WELDER_CODES,
  ACTIVE_WPS,
  NDE_MATRIX_RULES,
  SUBCONTRACTOR_CODES,
  PDS_AREA_CODES,
} from "./referential"

export interface ValidationIssue {
  spoolNo: string
  field: string
  message: string
}

export function validateFixtures(): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const heats = new Set(PIPING_MATERIAL_LIST.map((h) => h.heatNo))
  const welders = new Set(ACTIVE_WELDER_CODES)
  const wpsCodes = new Set(ACTIVE_WPS.map((w) => w.code))
  const materials = new Set(MATERIAL_TYPE_CODES)
  const subs = new Set(SUBCONTRACTOR_CODES)
  const pdsAreas = new Set(PDS_AREA_CODES)
  const ndeMethods = new Set(
    NDE_MATRIX_RULES.flatMap((r) => [r.primaryMethod, r.secondaryMethod].filter(Boolean) as string[]),
  )

  const seenSpools = new Set<string>()
  // Each ISO may map to at most one *defined* test pack. Spools still in
  // fabrication legitimately have no test pack yet (undefined is ignored).
  const isoToTestPack = new Map<string, string>()

  for (const spool of SPINE) {
    const at = (field: string, message: string) =>
      issues.push({ spoolNo: spool.spoolNo, field, message })

    if (seenSpools.has(spool.spoolNo)) at("spoolNo", "duplicate spoolNo")
    seenSpools.add(spool.spoolNo)

    if (!/^PL-(CW200|FU300|TK100)-\d{3}-[A-Z]$/.test(spool.spoolNo)) {
      at("spoolNo", "does not match PL-<system>-<NNN>-<X>")
    }

    if (!materials.has(spool.material)) {
      at("material", `material "${spool.material}" not in systemReferentials.materialTypes`)
    }

    if (spool.testPackNo) {
      const existing = isoToTestPack.get(spool.isoNo)
      if (existing && existing !== spool.testPackNo) {
        at("testPackNo", `ISO ${spool.isoNo} maps to conflicting test packs (${existing} vs ${spool.testPackNo})`)
      } else {
        isoToTestPack.set(spool.isoNo, spool.testPackNo)
      }
    }

    for (const piece of spool.pieces) {
      if (piece.intentionallyInvalid) continue
      if (!heats.has(piece.heatNo)) {
        at("pieces.heatNo", `heat "${piece.heatNo}" (piece ${piece.id}) not in pipingMaterialList`)
      }
    }

    for (const weld of spool.welds) {
      if (!welders.has(weld.welderId)) {
        at("welds.welderId", `welder "${weld.welderId}" (weld ${weld.weldNo}) not an active qualification`)
      }
      if (!wpsCodes.has(weld.wps)) {
        at("welds.wps", `WPS "${weld.wps}" (weld ${weld.weldNo}) not active`)
      }
      if (weld.ndeMethod && !ndeMethods.has(weld.ndeMethod)) {
        at("welds.ndeMethod", `NDE method "${weld.ndeMethod}" (weld ${weld.weldNo}) not in NDE_MATRIX`)
      }
      if (weld.ndeResult === "Rejected" && !weld.reworkCode) {
        at("welds.reworkCode", `rejected weld ${weld.weldNo} has no reworkCode`)
      }
    }

    if (spool.subcontractorCode && !subs.has(spool.subcontractorCode)) {
      at("subcontractorCode", `subcontractor "${spool.subcontractorCode}" not in admin`)
    }
    if (spool.pdsAreaCode && !pdsAreas.has(spool.pdsAreaCode)) {
      at("pdsAreaCode", `PDS area "${spool.pdsAreaCode}" not in admin`)
    }

    for (const punch of spool.punches ?? []) {
      if (!["X", "Y", "Z"].includes(punch.category)) {
        at("punches.category", `punch ${punch.punchId} category must be X/Y/Z`)
      }
      if (!spool.testPackNo) {
        at("punches", `punch ${punch.punchId} on spool without testPackNo`)
      }
    }
  }

  return issues
}
