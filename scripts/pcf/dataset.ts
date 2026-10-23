/**
 * PCF-1: connection unit piping project imported from PCF files.
 *
 * 5 ISOs, composition is our estimate; spooling comes from PCF; weeks are not executed. // оценка
 */
import type { ProjectSpec } from "../upg/spec"

const SHOP_SUBCONTRACTOR = "FAB-A"
const FIELD_SUBCONTRACTOR = "ERC-A"
const PWHT_THRESHOLD_MM = 19

export const PCF_SPEC: ProjectSpec = {
  id: "pcf",
  fixtureDir: "fixtures/demo-project-pcf",
  spooling: "pcf",
  project: {
    activityCode: "PCF-1",
    projectTitle: "Узел подключения (импорт из PCF)",
    owner: "ТОО «Демо Трубопровод»",
    contractor: "ТОО «Демо Монтаж»",
    contractNumber: "DM-2026-030",
    maxTransitTimeDays: 3,
  },
  shopSubcontractor: SHOP_SUBCONTRACTOR,
  fieldSubcontractor: FIELD_SUBCONTRACTOR,
  lineService: "PROCESS",
  lineServices: [
    { code: "PROCESS", description: "Нефть (технологическая среда)" },
    { code: "WATER", description: "Техническая вода" },
    // The manifest's RAL codes and paint rules name AIR too; a project without it fails on its references.
    { code: "AIR", description: "Сжатый воздух" },
  ],
  pdsAreaCode: "PROCESS",
  serviceClasses: {
    CS150: {
      code: "CS150",
      description: "Углеродистая сталь, 150#",
      materialTypeCode: "CS",
      flangeRating: "150#",
      // ASME B36.10, Sch 40
      thicknessByDiameter: { 2: 3.91, 3: 5.49, 4: 6.02, 6: 7.11 },
      mainDiameters: [3, 4, 6],
      branchDiameter: 2,
    },
  },
  systems: [
    {
      code: "100",
      description: "Узел подключения",
      subsystems: [
        { code: "100-01", description: "Узел подключения" }, // оценка
      ],
    },
  ],
  pdsAreas: [
    { code: "A-100", description: "Узел подключения" },
  ],
  isoGroups: [
    {
      cohort: "A",
      systemCode: "100",
      subsystemCode: "100-01",
      serviceClass: "CS150",
      pdsArea: "A-100",
      firstSeq: 1001,
      count: 5,
      testPack: "TP-100-01",
      testPressureBar: 29.5,
      priority: "Обычный",
    },
  ],
  weldingProcedures: [
    { code: "WPS-CS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 24, thicknessFrom: 2, thicknessTo: 40 },
    { code: "WPS-CS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 24, thicknessFrom: 2, thicknessTo: 40 },
  ],
  wpsByMaterial: {
    CS: { shop: "WPS-CS-01", field: "WPS-CS-F01" },
  },
  welders: [
    { code: "S-01", name: "Байжанов Марат", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "S-02", name: "Садыков Рустем", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
    { code: "F-01", name: "Алиев Тимур", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
    { code: "F-02", name: "Попов Александр", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
  ],
  ndeImportRules: [
    { serviceClass: "CS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "CS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
    { serviceClass: "CS150", weldType: "SW", location: "shop", rt: 0, mt: 10, pt: 0 },
  ],
  pwhtFormRules: [],
  pwhtThresholdMm: PWHT_THRESHOLD_MM,
  isoPrefix: "PCF",
  lineCode: "OIL",
  special: {
    threadIsos: [],
    revision: null,
    rejectWeld: null,
    wpsGap: null,
    errorIso: null,
    overdueSpool: null,
  },
  cohortStart: { A: 0, B: 3, C: 14, D: 28 },
  manualPack: null,
  packScenario: [],
}
