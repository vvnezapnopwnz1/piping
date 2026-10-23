// scripts/nps/dataset.ts
/**
 * NPS-1: a pump station piping project described as plain data.
 *
 * The second demo project, next to UPG-1. Pure and deterministic: the import files, the referentials
 * and the weekly plan are derived from this one description, as for UPG-1. The composition is our
 * estimate, not a source: no public sample exists. A number from a checked source names it; a
 * number without one is marked `// оценка`. Exports one object, NPS_SPEC.
 */
import type { ProjectSpec } from "../upg/spec"
import type { PackStep } from "../upg/weeks"

const SHOP_SUBCONTRACTOR = "FAB-A"
const FIELD_SUBCONTRACTOR = "ERC-A"
/** CS300H welds at or above this wall thickness need PWHT (the plan fixes 19 mm). Entered by hand in the NDE matrix form. */
const PWHT_THRESHOLD_MM = 19

const fullCycle = (testPack: string, punches: readonly { iso: string; description: string }[]): PackStep[] => [
  { kind: "line_check", testPack, day: 42, resultDay: 43, situation: "line_check_with_x", punches },
  { kind: "item_clearance", testPack, day: 44, clearDay: 45, situation: "x_cleared" },
  { kind: "blinding", testPack, day: 46, recordDay: 46, situation: "blinding" },
  { kind: "pressure_stage", testPack, stage: "testing_started", day: 47, situation: "testing" },
  { kind: "pressure_stage", testPack, stage: "testing_completed", day: 48 },
  { kind: "reinstatement", testPack, category: "Y", day: 49, recordDay: 50, situation: "y_reinstatement" },
  { kind: "pressure_stage", testPack, stage: "precommissioning_completed", day: 52, situation: "precommissioning" },
  { kind: "reinstatement", testPack, category: "Z", day: 53, recordDay: 54, situation: "z_reinstatement" },
]

export const NPS_SPEC: ProjectSpec = {
  id: "nps",
  fixtureDir: "fixtures/demo-project-nps",
  spooling: "text",
  project: {
    activityCode: "NPS-1",
    projectTitle: "Насосная станция НПС-1, обвязка",
    owner: "ТОО «Демо Трубопровод»",
    contractor: "ТОО «Демо Монтаж»",
    contractNumber: "DM-2026-021",
    maxTransitTimeDays: 3,
  },
  shopSubcontractor: SHOP_SUBCONTRACTOR,
  fieldSubcontractor: FIELD_SUBCONTRACTOR,
  lineService: "PROCESS",
  lineServices: [
    { code: "PROCESS", description: "Нефть (технологическая среда)" },
    { code: "WATER", description: "Техническая вода" },
    { code: "AIR", description: "Сжатый воздух" },
  ],
  pdsAreaCode: "PROCESS",
  serviceClasses: {
    CS150: {
      code: "CS150",
      description: "Углеродистая сталь, 150#",
      materialTypeCode: "CS",
      flangeRating: "150#",
      // ASME B36.10, Sch 40 (the same values as CS150 in UPG-1, without 12")
      thicknessByDiameter: { 2: 3.91, 3: 5.49, 4: 6.02, 6: 7.11, 8: 8.18 },
      mainDiameters: [4, 6, 8, 3],
      branchDiameter: 2,
    },
    CS300: {
      code: "CS300",
      description: "Углеродистая сталь, 300#",
      materialTypeCode: "CS",
      flangeRating: "300#",
      // ASME B36.10, STD (9.53 mm for 16", 20", 24"); the 2" branch is Sch 40. No PWHT: the wall is below the threshold.
      thicknessByDiameter: { 2: 3.91, 16: 9.53, 20: 9.53, 24: 9.53 },
      mainDiameters: [16, 20, 24],
      branchDiameter: 2,
    },
    CS300H: {
      code: "CS300H",
      description: "Углеродистая сталь, 300#, толстостенная",
      materialTypeCode: "CS",
      // 300#, not 600#: the app has UT rules and bolt torque tables for 150# and 300# only.
      flangeRating: "300#",
      // Thick wall so that PWHT applies from 19 mm: 12" (17.48) stays below, 16" and 20" are above it.
      // Reference ASME B36.10 (2" and 12" Sch 80, 16" and 20" Sch 40), recalled, not re-checked: оценка.
      thicknessByDiameter: { 2: 5.54, 12: 17.48, 16: 21.44, 20: 26.19 },
      mainDiameters: [12, 16, 20],
      branchDiameter: 2,
    },
  },
  systems: [
    {
      code: "100",
      description: "Всасывание",
      subsystems: [
        { code: "100-01", description: "Приёмный коллектор" },
        { code: "100-02", description: "Всасывание насосов Н-1/2/3" },
      ],
    },
    {
      code: "200",
      description: "Нагнетание",
      subsystems: [
        { code: "200-01", description: "Обвязка насосов Н-1/2/3" },
        { code: "200-02", description: "Нагнетательный коллектор" },
        { code: "200-03", description: "Узел регулирования давления" },
      ],
    },
    {
      code: "300",
      description: "Узел СОД и дренажи",
      subsystems: [
        { code: "300-01", description: "Узел пуска и приёма СОД" },
        { code: "300-02", description: "Дренажи и утилиты" },
        { code: "300-03", description: "Дренажный коллектор" },
      ],
    },
  ],
  pdsAreas: [
    { code: "A-100", description: "Площадка всасывания" },
    { code: "A-200", description: "Насосный зал" },
    { code: "A-300", description: "Узел СОД и дренажи" },
  ],
  /**
   * Cohorts set the pace: A finishes the whole process, B ends tested or ready for test, C stops
   * mid-erection, D never leaves the shop. weeks.ts reads the cohort, not the ISO number.
   * One group per subsystem, one test pack per group. Test pressure is 1.5 x the ambient rating of
   * ASME B16.5 group 1.1 (150#: 19.6 bar, 300#: 51.1 bar), as in UPG-1; a real hydrotest follows the
   * project procedure: оценка. That the СОД unit is class CS150 is also оценка.
   */
  isoGroups: [
    { cohort: "A", systemCode: "100", subsystemCode: "100-01", serviceClass: "CS300", pdsArea: "A-100", firstSeq: 1001, count: 4, testPack: "TP-100-01", testPressureBar: 76.6, priority: "Высокий" },
    { cohort: "A", systemCode: "200", subsystemCode: "200-01", serviceClass: "CS300H", pdsArea: "A-200", firstSeq: 2001, count: 4, testPack: "TP-200-01", testPressureBar: 76.6, priority: "Высокий" },
    { cohort: "B", systemCode: "100", subsystemCode: "100-02", serviceClass: "CS300", pdsArea: "A-100", firstSeq: 1005, count: 5, testPack: "TP-100-02", testPressureBar: 76.6, priority: "Обычный" },
    { cohort: "B", systemCode: "200", subsystemCode: "200-02", serviceClass: "CS300H", pdsArea: "A-200", firstSeq: 2005, count: 4, testPack: "TP-200-02", testPressureBar: 76.6, priority: "Обычный" },
    { cohort: "B", systemCode: "200", subsystemCode: "200-03", serviceClass: "CS300H", pdsArea: "A-200", firstSeq: 2009, count: 4, testPack: "TP-200-03", testPressureBar: 76.6, priority: "Обычный" },
    { cohort: "C", systemCode: "300", subsystemCode: "300-01", serviceClass: "CS150", pdsArea: "A-300", firstSeq: 3001, count: 5, testPack: "TP-300-01", testPressureBar: 29.5, priority: "Обычный" },
    { cohort: "C", systemCode: "300", subsystemCode: "300-02", serviceClass: "CS150", pdsArea: "A-300", firstSeq: 3006, count: 4, testPack: "TP-300-02", testPressureBar: 29.5, priority: "Обычный" },
    { cohort: "D", systemCode: "300", subsystemCode: "300-03", serviceClass: "CS150", pdsArea: "A-300", firstSeq: 3010, count: 6, testPack: "TP-300-03", testPressureBar: 29.5, priority: "Низкий" },
  ],
  // No stainless steel in this project: carbon steel procedures only, one per subcontractor.
  weldingProcedures: [
    { code: "WPS-CS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 24, thicknessFrom: 2, thicknessTo: 40 },
    { code: "WPS-CS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 24, thicknessFrom: 2, thicknessTo: 40 },
  ],
  wpsByMaterial: {
    CS: { shop: "WPS-CS-01", field: "WPS-CS-F01" },
  },
  // One WPS per subcontractor, so each welder holds exactly one; record_weld_progress needs two welders per WPS.
  welders: [
    { code: "S-01", name: "Байжанов Марат", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-02", name: "Садыков Рустем", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-03", name: "Кузнецов Алексей", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-04", name: "Оспанов Берик", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-05", name: "Васильев Дмитрий", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-06", name: "Калиев Мурат", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "F-01", name: "Алиев Тимур", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
    { code: "F-02", name: "Попов Александр", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
    { code: "F-03", name: "Ергалиев Канат", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
    { code: "F-04", name: "Морозов Денис", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
  ],
  /**
   * Rows of the NDE matrix Excel import. BW is absent for CS300H: see pwhtFormRules.
   * GOST 32569-2013 table 12.3 gives 20/10/2/1 % by category and 100 % above 10 MPa or for dissimilar
   * steels. The class-to-percentage mapping and every SW (MT) row are оценка.
   */
  ndeImportRules: [
    { serviceClass: "CS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "CS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "CS150", weldType: "SW", location: "shop", rt: 0, mt: 10, pt: 0 },
    { serviceClass: "CS300", weldType: "BW", location: "shop", rt: 20, mt: 0, pt: 0 },
    { serviceClass: "CS300", weldType: "BW", location: "field", rt: 20, mt: 0, pt: 0 },
    { serviceClass: "CS300", weldType: "SW", location: "shop", rt: 0, mt: 10, pt: 0 },
    { serviceClass: "CS300H", weldType: "SW", location: "shop", rt: 0, mt: 100, pt: 0 },
  ],
  /**
   * The NDE matrix import has no PWHT columns (modules/imports/domain/import-types.json), so these
   * rules are entered by hand in Project Referential → NDE matrix. load-project.ts creates them
   * through the same repository function the form uses.
   */
  pwhtFormRules: [
    { serviceClass: "CS300H", weldType: "BW", location: "shop", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
    { serviceClass: "CS300H", weldType: "BW", location: "field", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
  ],
  /** Welds of a PWHT class at or above this wall thickness need PWHT. Entered by hand in the NDE matrix form. */
  pwhtThresholdMm: PWHT_THRESHOLD_MM,
  isoPrefix: "NPS",
  lineCode: "OIL",
  special: {
    /** Recorded by hand in the UI, in step with the weeks: the first two ISOs of pack TP-100-01, which is the manual pack. */
    threadIsos: ["NPS-100-1001", "NPS-100-1002"],
    /** The ISO that gets revision R1 while its spools are in the shop (the fifth of the first B group), and the shop weld R1 adds. */
    revision: { iso: "NPS-100-1009", weld: "1009-S1-W09" },
    /** Rejected in the first shop NDE round: the second weld of the first spool of the third cohort-A ISO. */
    rejectWeld: "1003-S1-W02",
    /** No WPS gap: both WPS reach 24", so every field weld is covered. */
    wpsGap: null,
    /** Only in the error file set: CS150 at 14" has no thickness rule, so the server blocks it. */
    errorIso: {
      isoNumber: "NPS-300-3099",
      seq: 3099,
      serviceClass: "CS150",
      systemCode: "300",
      subsystemCode: "300-03",
      pdsArea: "A-300",
      testPack: "TP-300-03",
      diameterInch: 14,
      thicknessMm: 11.13,
      weightKg: "260.0",
    },
    /** A cohort C spool that leaves the laydown and never arrives on site: a Transit Out alert. */
    overdueSpool: "NPS-300-3004-S1",
  },
  cohortStart: { A: 0, B: 3, C: 14, D: 28 },
  manualPack: "TP-100-01",
  /** The NPS run stops at week 5, but the spec describes all 8 weeks, like UPG-1: no pack steps fall before week 7. */
  packScenario: [
    ...fullCycle("TP-100-01", [{ iso: "NPS-100-1003", description: "Не установлена бирка на опоре" }]),
    ...fullCycle("TP-200-01", [{ iso: "NPS-200-2002", description: "Не затянуты болты хомута опоры" }]),
    { kind: "line_check", testPack: "TP-100-02", day: 43, resultDay: 44, punches: [] },
    { kind: "blinding", testPack: "TP-100-02", day: 45, recordDay: 45 },
    { kind: "pressure_stage", testPack: "TP-100-02", stage: "testing_started", day: 47 },
    { kind: "pressure_stage", testPack: "TP-100-02", stage: "testing_completed", day: 50 },
    {
      kind: "line_check",
      testPack: "TP-200-02",
      day: 44,
      resultDay: 45,
      punches: [
        { iso: "NPS-200-2006", description: "Отсутствует заглушка на дренаже" },
        { iso: "NPS-200-2007", description: "Повреждено покрытие у опоры" },
      ],
    },
    { kind: "item_clearance", testPack: "TP-200-02", day: 50, clearDay: 51 },
    { kind: "line_check", testPack: "TP-200-03", day: 45, resultDay: 46, punches: [] },
  ],
}
