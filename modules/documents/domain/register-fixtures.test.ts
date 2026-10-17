import { DOCUMENT_COLUMNS, type DocumentColumn, type RegisterLabels } from "./registers"
import type { NdeRegisterRow, PunchRow, TestPackDocumentRow, WeldLogRow } from "./report"

/** Shared rows and Russian labels for the document tests. */
export const labels: RegisterLabels = {
  locale: "ru",
  columns: Object.fromEntries(DOCUMENT_COLUMNS.map((id) => [id, `col:${id}`])) as Record<DocumentColumn, string>,
  location: { shop: "цех", assembly: "сборка", field: "монтаж" },
  method: { rt: "РК", ut: "УЗК", vt: "ВИК", pt: "ПВК" },
  selection: { full: "сплошной", spot: "выборочный" },
  disposition: { pending: "ожидает", issued: "выдан", satisfied: "выполнен", rejected: "брак", waived: "снят", superseded: "заменён" },
  outcome: { accepted: "годен", rejected: "брак" },
  ndeStatus: { pending: "ожидает", rejected: "брак", done: "выполнен" },
  pwht: { required: "требуется", accepted: "принята" },
  punchStatus: { open: "открыто", closed: "закрыто" },
  medium: { H: "гидравлическое", P: "пневматическое", V: "визуальное" },
  yes: "да",
  no: "нет",
}

export function weld(overrides: Partial<WeldLogRow> = {}): WeldLogRow {
  return {
    weldJointRevisionId: "wjr-1", isometricId: "iso-1", isoNumber: "UPG-100-1001", revisionNumber: "R0",
    lineNumber: "L-100-001", spoolNumber: "UPG-100-1001-S1", weldNumber: "W-1", weldLocation: "shop",
    weldTypeCode: "BW", diameterInch: 6, thicknessMm: 7.11, wpsCode: "WPS-01", welderCodes: ["KZ-014"],
    weldOn: "2026-10-01", ndeMethods: ["rt"], ndePending: 0, ndeRejected: 0, pwhtRequired: false,
    pwhtAccepted: false, traceNumbers: ["HT-58213"], testPackId: "tp-1", testPackNumber: "TP-100-01",
    ...overrides,
  }
}

export function obligation(overrides: Partial<NdeRegisterRow> = {}): NdeRegisterRow {
  return {
    obligationId: "ob-1", isometricId: "iso-1", isoNumber: "UPG-100-1001", spoolNumber: "UPG-100-1001-S1",
    weldNumber: "W-1", weldLocation: "shop", welderCodes: ["KZ-014"], method: "rt", selectionMode: "full",
    requiredCoverage: 100, disposition: "satisfied", batchNumber: "RT-0012", batchStatus: "returned",
    ndtSubcontractorName: "НК-Лаб ТОО", examinedOn: "2026-10-02", outcome: "accepted", reportNumber: "RT-0012-03",
    defectCode: null, testPackId: "tp-1", testPackNumber: "TP-100-01",
    ...overrides,
  }
}

export function pack(overrides: Partial<TestPackDocumentRow> = {}): TestPackDocumentRow {
  return {
    testPackId: "tp-1", testPackNumber: "TP-100-01", revisionNo: 0, lifecycle: "active",
    systemCode: "100", systemDescription: "Сепарация газа", subsystemCode: "100-01",
    subsystemDescription: "Входной сепаратор", serviceClassCode: "A1A", lineServiceCode: "NG",
    testMedium: "H", testPressure: 15, pressureUnit: "bar", location: "Площадка 1",
    plannedStartOn: "2026-10-05", plannedEndOn: "2026-10-10", isRft: true, rftOn: "2026-10-06",
    testingStartedOn: "2026-10-08", testingCompletedOn: "2026-10-09", precommissioningCompletedOn: null,
    isoCount: 3, lineNumbers: ["L-100-001", "L-100-002"], weldTotal: 24, weldDone: 24, openXCount: 1,
    ...overrides,
  }
}

export function punch(overrides: Partial<PunchRow> = {}): PunchRow {
  return {
    id: "p-1", testPackNumber: "TP-100-01", itemNumber: "1", isoNumber: "UPG-100-1001", spoolNumber: null,
    punchCode: "BL", description: "Нет заглушки на дренаже", checkingDate: "2026-10-03", completionDate: null,
    ...overrides,
  }
}
