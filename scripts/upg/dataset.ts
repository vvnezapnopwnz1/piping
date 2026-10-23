// scripts/upg/dataset.ts
/**
 * UPG-1: a small gas treatment unit described as plain data.
 *
 * Pure and deterministic. The import files (files.ts), the referentials (references.ts) and the
 * weekly plan (weeks.ts) are all derived from this one description, so they cannot disagree
 * about a number. Exports one object, UPG_SPEC.
 */
import type { ProjectSpec } from "./spec"
import type { PackStep } from "./weeks"

const SHOP_SUBCONTRACTOR = "FAB-A"
const FIELD_SUBCONTRACTOR = "ERC-A"
/** CS300 welds at or above this wall thickness need PWHT. Entered by hand in the NDE matrix form. */
const PWHT_THRESHOLD_MM = 12

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

export const UPG_SPEC: ProjectSpec = {
  id: "upg",
  fixtureDir: "fixtures/demo-project",
  spooling: "text",
  project: {
    activityCode: "UPG-1",
    projectTitle: "Установка подготовки газа УПГ-1",
    owner: "ТОО «Демо Газ»",
    contractor: "ТОО «Демо Монтаж»",
    contractNumber: "DM-2026-014",
    maxTransitTimeDays: 3,
  },
  shopSubcontractor: SHOP_SUBCONTRACTOR,
  fieldSubcontractor: FIELD_SUBCONTRACTOR,
  lineService: "PROCESS",
  lineServices: [
    { code: "PROCESS", description: "Технологическая среда" },
    { code: "AIR", description: "Сжатый воздух" },
    { code: "WATER", description: "Техническая вода" },
  ],
  pdsAreaCode: "PROCESS",
  serviceClasses: {
    CS150: {
      code: "CS150",
      description: "Углеродистая сталь, 150#",
      materialTypeCode: "CS",
      flangeRating: "150#",
      thicknessByDiameter: { 2: 3.91, 3: 5.49, 4: 6.02, 6: 7.11, 8: 8.18, 12: 9.53 },
      mainDiameters: [4, 6, 8, 3],
      branchDiameter: 2,
    },
    CS300: {
      code: "CS300",
      description: "Углеродистая сталь, 300#, толстостенная",
      materialTypeCode: "CS",
      flangeRating: "300#",
      thicknessByDiameter: { 6: 10.97, 8: 12.7, 10: 15.09 },
      mainDiameters: [8, 10, 6],
      branchDiameter: null,
    },
    SS150: {
      code: "SS150",
      description: "Нержавеющая сталь 316, 150#",
      materialTypeCode: "SS316",
      flangeRating: "150#",
      thicknessByDiameter: { 2: 2.77, 3: 3.05, 4: 3.05, 6: 3.4 },
      mainDiameters: [3, 4, 6],
      branchDiameter: 2,
    },
  },
  systems: [
    {
      code: "100",
      description: "Входная сепарация",
      subsystems: [
        { code: "100-01", description: "Сепаратор С-101" },
        { code: "100-02", description: "Узел замера газа" },
      ],
    },
    {
      code: "200",
      description: "Осушка газа",
      subsystems: [
        { code: "200-01", description: "Абсорбер К-201" },
        { code: "200-02", description: "Регенерация гликоля" },
      ],
    },
    {
      code: "300",
      description: "Топливный газ и факел",
      subsystems: [
        { code: "300-01", description: "Топливный газ" },
        { code: "300-02", description: "Факельный коллектор" },
      ],
    },
  ],
  pdsAreas: [
    { code: "A-100", description: "Площадка входной сепарации" },
    { code: "A-200", description: "Площадка осушки газа" },
    { code: "A-300", description: "Площадка топливного газа и факела" },
  ],
  /**
   * Cohorts set the pace: A finishes the whole process, B ends tested or ready for test, C stops
   * mid-erection, D never leaves the shop. weeks.ts reads the cohort, not the ISO number.
   */
  isoGroups: [
    { cohort: "A", systemCode: "100", subsystemCode: "100-01", serviceClass: "CS150", pdsArea: "A-100", firstSeq: 1001, count: 5, testPack: "TP-100-01", testPressureBar: 29.5, priority: "Высокий" },
    { cohort: "A", systemCode: "100", subsystemCode: "100-02", serviceClass: "CS150", pdsArea: "A-100", firstSeq: 1006, count: 5, testPack: "TP-100-02", testPressureBar: 29.5, priority: "Высокий" },
    { cohort: "B", systemCode: "200", subsystemCode: "200-01", serviceClass: "CS300", pdsArea: "A-200", firstSeq: 2001, count: 6, testPack: "TP-200-01", testPressureBar: 76.6, priority: "Обычный" },
    { cohort: "B", systemCode: "200", subsystemCode: "200-02", serviceClass: "CS300", pdsArea: "A-200", firstSeq: 2007, count: 6, testPack: "TP-200-02", testPressureBar: 76.6, priority: "Обычный" },
    { cohort: "C", systemCode: "300", subsystemCode: "300-01", serviceClass: "SS150", pdsArea: "A-300", firstSeq: 3001, count: 10, testPack: "TP-300-01", testPressureBar: 27.6, priority: "Обычный" },
    { cohort: "D", systemCode: "300", subsystemCode: "300-02", serviceClass: "CS150", pdsArea: "A-300", firstSeq: 3011, count: 8, testPack: "TP-300-02", testPressureBar: 29.5, priority: "Низкий" },
  ],
  weldingProcedures: [
    { code: "WPS-CS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 24, thicknessFrom: 2, thicknessTo: 40 },
    { code: "WPS-SS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "SS316", diameterFrom: 0.5, diameterTo: 12, thicknessFrom: 1, thicknessTo: 20 },
    { code: "WPS-CS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 10, thicknessFrom: 2, thicknessTo: 40 },
    { code: "WPS-SS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "SS316", diameterFrom: 0.5, diameterTo: 12, thicknessFrom: 1, thicknessTo: 20 },
  ],
  wpsByMaterial: {
    CS: { shop: "WPS-CS-01", field: "WPS-CS-F01" },
    SS316: { shop: "WPS-SS-01", field: "WPS-SS-F01" },
  },
  welders: [
    { code: "S-01", name: "Ахметов Ерлан", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
    { code: "S-02", name: "Ким Виктор", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
    { code: "S-03", name: "Сейткали Арман", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-04", name: "Петров Игорь", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-05", name: "Нурланов Данияр", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
    { code: "S-06", name: "Иванов Сергей", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-SS-01"] },
    { code: "F-01", name: "Жумабаев Талгат", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01", "WPS-SS-F01"] },
    { code: "F-02", name: "Смирнов Олег", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
    { code: "F-03", name: "Каримов Руслан", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01", "WPS-SS-F01"] },
    { code: "F-04", name: "Ли Андрей", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-SS-F01"] },
  ],
  /** Rows of the NDE matrix Excel import. A class with PWHT is absent: see pwhtFormRules. */
  ndeImportRules: [
    { serviceClass: "CS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "CS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "CS150", weldType: "SW", location: "shop", rt: 0, mt: 10, pt: 0 },
    { serviceClass: "SS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "SS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "SS150", weldType: "SW", location: "shop", rt: 0, mt: 0, pt: 10 },
  ],
  /**
   * The NDE matrix import has no PWHT columns (modules/imports/domain/import-types.json), so these
   * rules are entered by hand in Project Referential → NDE matrix. load-project.ts creates them
   * through the same repository function the form uses.
   */
  pwhtFormRules: [
    { serviceClass: "CS300", weldType: "BW", location: "shop", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
    { serviceClass: "CS300", weldType: "BW", location: "field", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
  ],
  /** Welds of a PWHT class at or above this wall thickness need PWHT. Entered by hand in the NDE matrix form. */
  pwhtThresholdMm: PWHT_THRESHOLD_MM,
  isoPrefix: "UPG",
  lineCode: "NG",
  special: {
    /** Recorded by hand in the UI, in step with the weeks. */
    threadIsos: ["UPG-100-1001", "UPG-100-1002"],
    /** The ISO that gets revision R1 while its spools are in the shop, and the shop weld R1 adds. */
    revision: { iso: "UPG-200-2005", weld: "2005-S1-W09" },
    /** Rejected in the first shop NDE round; produces a repair and tracers. */
    rejectWeld: "1003-S1-W02",
    /** The field weld of this ISO's first spool has a diameter no field WPS covers: an import warning, never welded. */
    wpsGap: { iso: "UPG-300-3018", fieldDiameterInch: 12 },
    /** Only in the error file set: CS150 at 14" has no thickness rule, so the server blocks it. */
    errorIso: {
      isoNumber: "UPG-300-3099",
      seq: 3099,
      serviceClass: "CS150",
      systemCode: "300",
      subsystemCode: "300-02",
      pdsArea: "A-300",
      testPack: "TP-300-02",
      diameterInch: 14,
      thicknessMm: 11.13,
      weightKg: "260.0",
    },
    /** Leaves the laydown and never arrives on site: a Transit Out alert. */
    overdueSpool: "UPG-300-3009-S1",
  },
  cohortStart: { A: 0, B: 3, C: 14, D: 28 },
  manualPack: "TP-100-01",
  packScenario: [
    ...fullCycle("TP-100-01", [{ iso: "UPG-100-1003", description: "Не установлена бирка на опоре" }]),
    ...fullCycle("TP-100-02", [{ iso: "UPG-100-1009", description: "Не затянуты болты хомута опоры" }]),
    { kind: "line_check", testPack: "TP-200-01", day: 43, resultDay: 44, punches: [] },
    { kind: "blinding", testPack: "TP-200-01", day: 45, recordDay: 45 },
    { kind: "pressure_stage", testPack: "TP-200-01", stage: "testing_started", day: 47 },
    { kind: "pressure_stage", testPack: "TP-200-01", stage: "testing_completed", day: 50 },
    {
      kind: "line_check",
      testPack: "TP-200-02",
      day: 44,
      resultDay: 45,
      punches: [
        { iso: "UPG-200-2010", description: "Отсутствует заглушка на дренаже" },
        { iso: "UPG-200-2011", description: "Повреждено покрытие у опоры" },
      ],
    },
    { kind: "item_clearance", testPack: "TP-200-02", day: 50, clearDay: 51 },
  ],
}
