/**
 * Pure seed data for the Admin module, extracted from store/admin-store.ts.
 *
 * Lives in lib/ so that lib/fixtures/referential.ts can treat it as a
 * source-of-truth without importing from store/ (which would risk a
 * store <-> lib runtime cycle, since stores already import from lib).
 *
 * Types are imported type-only from the store (erased at runtime), so this
 * module has no runtime dependency on the store.
 */
import type {
  Subcontractor,
  ProjectDefinition,
  SystemReferentials,
  SysRefEntry,
  PdsArea,
  HeatRecord,
  AccessRightsRow,
} from "@/store/admin-store"

export const SEED_SUBCONTRACTORS: Subcontractor[] = [
  {
    code: "SUB-001",
    name: "Acme Welding Ltd.",
    scope: ["fabrication", "nde"],
    contact: "John Smith / +971 50 111 1111",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-002",
    name: "Gulf Erectors LLC",
    scope: ["erection", "lineCheck"],
    contact: "Ahmed Hassan / +971 50 222 2222",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-003",
    name: "Pioneer Hydrotest Co.",
    scope: ["blinding", "finishing"],
    contact: "Marko Petrović / +971 50 333 3333",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-004",
    name: "Apex Reinstatement",
    scope: ["reinstatement"],
    contact: "Liu Wei / +971 50 444 4444",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: "SUB-005",
    name: "Falcon NDT Services",
    scope: ["nde"],
    contact: "Carlos García / +971 50 555 5555",
    active: true,
    createdAt: new Date().toISOString(),
  },
]

export const SEED_PROJECT_DEFINITION: ProjectDefinition = {
  activityCode: "PQ-001",
  projectTitle: "PipeQC Demo Project",
  owner: "EasyPlant Owner",
  contractor: "Main EPC Contractor",
  ownerLogoUrl: "",
  contractorLogoUrl: "",
  maxTransitTimeDays: 14,
  updatedAt: new Date().toISOString(),
}

function entry(code: string, description: string): SysRefEntry {
  return {
    code,
    description,
    active: true,
    createdAt: new Date().toISOString(),
  }
}

export const SEED_SYSTEM_REFERENTIALS: SystemReferentials = {
  materialTypes: [
    entry("CS-A106B", "Carbon Steel A106 Gr. B"),
    entry("SS-316L", "Stainless Steel 316L"),
    entry("CS-P91", "CrMo alloy A335 P91"),
    entry("LTCS-A333", "Low-Temp Carbon Steel A333 Gr. 6"),
  ],
  filmQty: [
    entry("DN-25-50", "Diameter DN 25–50 — 1 film per joint"),
    entry("DN-80-150", "Diameter DN 80–150 — 2 films per joint"),
    entry("DN-200-300", "Diameter DN 200–300 — 3 films per joint"),
    entry("DN-350-600", "Diameter DN 350–600 — 4 films per joint"),
  ],
  utCalc: [
    entry("UT-CARBON-A", "Coefficient 1.00 — carbon steel < DN 200"),
    entry("UT-CARBON-B", "Coefficient 1.15 — carbon steel ≥ DN 200"),
    entry("UT-ALLOY", "Coefficient 1.30 — alloy / P91 (any DN)"),
  ],
  torquing: [
    entry("TRQ-LR", "Lubricated flange — refer torque table A1"),
    entry("TRQ-DRY", "Dry flange — refer torque table A2"),
    entry("TRQ-HT", "Hot-bolted / live service — table A3"),
  ],
}

export function seedPdsAreas(): PdsArea[] {
  const now = new Date().toISOString()
  const areas: Omit<PdsArea, "createdAt">[] = [
    { code: "PR-01", name: "Process Area 01", assignedSubCode: "SUB-001", active: true },
    { code: "CA-02", name: "Catalyst Area 02", assignedSubCode: "SUB-001", active: true },
    { code: "RA-01", name: "Reactor Area 01", assignedSubCode: "SUB-002", active: true },
    { code: "VS-01", name: "Vessel Area 01", assignedSubCode: "SUB-002", active: true },
    { code: "UB-03", name: "Utility Block 03", assignedSubCode: null, active: true },
    { code: "HX-02", name: "Heat Exchanger Area 02", assignedSubCode: null, active: true },
  ]
  return areas.map((a) => ({ ...a, createdAt: now }))
}

/**
 * Project Piping Material List — heats expanded to cover every heat used by
 * the hero spools in lib/fixtures/spine.ts. `material` codes MUST match
 * SEED_SYSTEM_REFERENTIALS.materialTypes. Kept in sync via the fixtures
 * validator (npm run validate:fixtures).
 */
export function seedPipingMaterialList(): HeatRecord[] {
  const now = new Date().toISOString()
  const rows: Omit<HeatRecord, "active" | "createdAt">[] = [
    // CW200 — Cooling Water (CS-A106B)
    { heatNo: "HT-CS-A106B-44210", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2203", supplier: "Gulf Steel Trading" },
    { heatNo: "HT-CS-A106B-44211", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2204", supplier: "Gulf Steel Trading" },
    { heatNo: "HT-CS-A106B-44212", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2205", supplier: "Arabian Pipe Mills" },
    { heatNo: "HT-CS-A106B-44213", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2206", supplier: "Arabian Pipe Mills" },
    { heatNo: "HT-CS-A106B-44214", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2211", supplier: "Gulf Steel Trading" },
    // FU300 — Fuel Gas (LTCS-A333) + P91 for the alloy / PWHT case
    { heatNo: "HT-LTCS-A333-60010", material: "LTCS-A333", grade: "Gr. 6", millCertRef: "MILL-2026-6001", supplier: "Cryo Pipe Industries" },
    { heatNo: "HT-LTCS-A333-60011", material: "LTCS-A333", grade: "Gr. 6", millCertRef: "MILL-2026-6002", supplier: "Cryo Pipe Industries" },
    { heatNo: "HT-CS-P91-99814", material: "CS-P91", grade: "P91", millCertRef: "MILL-2026-1105", supplier: "HighTemp Metals Co." },
    { heatNo: "HT-CS-P91-99815", material: "CS-P91", grade: "P91", millCertRef: "MILL-2026-1106", supplier: "HighTemp Metals Co." },
    // TK100 — Tank Farm (SS-316L)
    { heatNo: "HT-SS-316L-55120", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3841", supplier: "Stainless Gulf LLC" },
    { heatNo: "HT-SS-316L-55140", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3848", supplier: "Stainless Gulf LLC" },
    { heatNo: "HT-SS-316L-55141", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3849", supplier: "Euro Alloy Supply" },
    { heatNo: "HT-SS-316L-55150", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3851", supplier: "Euro Alloy Supply" },
    { heatNo: "HT-SS-316L-55151", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3852", supplier: "Stainless Gulf LLC" },
  ]
  return rows.map((r) => ({ ...r, active: true, createdAt: now }))
}

export function seedAccessRights(): AccessRightsRow[] {
  return [
    { userId: "U-001", fullName: "Maria Garcia", email: "maria.garcia@epc.com", role: "system_admin", active: true },
    { userId: "U-002", fullName: "James Okonkwo", email: "j.okonkwo@epc.com", role: "project_manager", active: true },
    { userId: "U-003", fullName: "Elena Vasquez", email: "e.vasquez@epc.com", role: "qc_engineer", active: true },
    { userId: "U-004", fullName: "David Chen", email: "d.chen@nde.com", role: "nde_inspector", active: true },
    { userId: "U-005", fullName: "Sofia Lindström", email: "s.lindstrom@epc.com", role: "spooling_team", active: true },
    { userId: "U-006", fullName: "John Smith", email: "john.smith@acme-weld.com", role: "subcontractor", subcontractorId: "SUB-001", pdsAreaCodes: ["PR-01", "CA-02"], active: true },
    { userId: "U-007", fullName: "Ahmed Hassan", email: "ahmed.hassan@gulf-erectors.com", role: "subcontractor", subcontractorId: "SUB-002", pdsAreaCodes: ["RA-01", "VS-01"], active: true },
    { userId: "U-008", fullName: "Carlos García", email: "carlos@falcon-ndt.com", role: "subcontractor", subcontractorId: "SUB-005", pdsAreaCodes: ["PR-01"], active: true },
    { userId: "U-009", fullName: "Liu Wei", email: "liu.wei@apex-rein.com", role: "subcontractor", subcontractorId: "SUB-004", pdsAreaCodes: ["UB-03"], active: false },
    { userId: "U-010", fullName: "Priya Nair", email: "priya.nair@epc.com", role: "qc_engineer", active: true },
  ]
}
