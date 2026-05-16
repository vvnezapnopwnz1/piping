import { WELD_DATA } from "@/lib/weld-data"

export type NdeMethod = "RT" | "UT" | "MT" | "PT" | "PMI" | "HT"
export type NdeBatchStatus = "Created" | "Issued" | "In Progress" | "Results Received" | "Closed" | "Rework"
export type NdeWeldResult = "Pending" | "Accepted" | "Rejected"
export type ReworkCode = string
export type NdeBatchSource = "shop" | "field"

export interface NdeBatchWeld {
  id: string
  jointNo: string
  spoolNo: string
  isoNo: string
  welder: string
  result: NdeWeldResult
  reworkCode?: ReworkCode
  inspector?: string
  date?: string
  remarks?: string
  dwirNo: string
  materialType: string
  diaInch: string
  wpsNo: string
  photos: string[]
}

export interface NdeBatchHistoryEvent {
  id: string
  title: string
  detail: string
  actor: string
  timestamp: string
  status: NdeBatchStatus
}

export interface NdeBatch {
  id: string
  batchNo: string
  method: NdeMethod
  status: NdeBatchStatus
  subcontractor: string
  matrixRef: string
  createdDate: string
  issuedDate?: string
  resultsReceivedDate?: string
  closedDate?: string
  isOverdue?: boolean
  source: NdeBatchSource
  welds: NdeBatchWeld[]
  history: NdeBatchHistoryEvent[]
}

type BatchBlueprint = {
  batchNo: string
  method: NdeMethod
  status: NdeBatchStatus
  subcontractor: string
  matrixRef: string
  createdDate: string
  issuedDate?: string
  resultsReceivedDate?: string
  closedDate?: string
  weldCount: number
  acceptedCount: number
  rejectedCount: number
  isOverdue?: boolean
}

const inspectors = Array.from({ length: 12 }, (_, index) => `NDE-INS-${String(index + 1).padStart(2, "0")}`)

const rejectionLibrary: Array<{ code: ReworkCode; remarks: string }> = [
  {
    code: "RW-001",
    remarks: "Porosity cluster at 3 o'clock position, root pass",
  },
  {
    code: "RW-002",
    remarks: "Linear indication 12mm, requires grinding and re-weld",
  },
  {
    code: "RW-005",
    remarks: "Lack of fusion at cap to side wall transition",
  },
  {
    code: "RW-003",
    remarks: "Slag inclusion noted on fill pass, local repair required",
  },
  {
    code: "RW-004",
    remarks: "Undercut above allowable limit on external bead profile",
  },
]

const subcontractors = ["Bureau Veritas", "SGS Industrial", "TÜV Rheinland"] as const

const matrixByMethod: Record<NdeMethod, string> = {
  RT: "NDE-MTX-RT-01",
  UT: "NDE-MTX-UT-02",
  MT: "NDE-MTX-MT-03",
  PT: "NDE-MTX-PT-04",
  PMI: "NDE-MTX-PMI-05",
  HT: "NDE-MTX-HT-06",
}

const blueprints: BatchBlueprint[] = [
  { batchNo: "BTH-2025-0150", method: "RT", status: "Created", subcontractor: subcontractors[0], matrixRef: matrixByMethod.RT, createdDate: "2025-10-02", weldCount: 6, acceptedCount: 0, rejectedCount: 0 },
  { batchNo: "BTH-2025-0151", method: "RT", status: "Issued", subcontractor: subcontractors[1], matrixRef: matrixByMethod.RT, createdDate: "2025-10-03", issuedDate: "2025-10-05", weldCount: 8, acceptedCount: 0, rejectedCount: 0 },
  { batchNo: "BTH-2025-0152", method: "RT", status: "In Progress", subcontractor: subcontractors[2], matrixRef: matrixByMethod.RT, createdDate: "2025-10-04", issuedDate: "2025-10-06", weldCount: 5, acceptedCount: 2, rejectedCount: 0 },
  { batchNo: "BTH-2025-0153", method: "UT", status: "Closed", subcontractor: subcontractors[0], matrixRef: matrixByMethod.UT, createdDate: "2025-10-05", issuedDate: "2025-10-06", resultsReceivedDate: "2025-10-09", closedDate: "2025-10-24", weldCount: 7, acceptedCount: 7, rejectedCount: 0 },
  { batchNo: "BTH-2025-0154", method: "RT", status: "Rework", subcontractor: subcontractors[1], matrixRef: matrixByMethod.RT, createdDate: "2025-10-06", issuedDate: "2025-10-08", resultsReceivedDate: "2025-10-12", weldCount: 9, acceptedCount: 7, rejectedCount: 2 },
  { batchNo: "BTH-2025-0155", method: "MT", status: "Created", subcontractor: subcontractors[2], matrixRef: matrixByMethod.MT, createdDate: "2025-10-07", weldCount: 4, acceptedCount: 0, rejectedCount: 0 },
  { batchNo: "BTH-2025-0156", method: "RT", status: "Issued", subcontractor: subcontractors[0], matrixRef: matrixByMethod.RT, createdDate: "2025-10-08", issuedDate: "2025-10-13", weldCount: 8, acceptedCount: 0, rejectedCount: 0, isOverdue: true },
  { batchNo: "BTH-2025-0157", method: "PT", status: "Results Received", subcontractor: subcontractors[1], matrixRef: matrixByMethod.PT, createdDate: "2025-10-09", issuedDate: "2025-10-10", resultsReceivedDate: "2025-10-14", weldCount: 6, acceptedCount: 6, rejectedCount: 0 },
  { batchNo: "BTH-2025-0158", method: "RT", status: "Closed", subcontractor: subcontractors[2], matrixRef: matrixByMethod.RT, createdDate: "2025-10-10", issuedDate: "2025-10-11", resultsReceivedDate: "2025-10-16", closedDate: "2025-10-25", weldCount: 7, acceptedCount: 7, rejectedCount: 0 },
  { batchNo: "BTH-2025-0159", method: "UT", status: "In Progress", subcontractor: subcontractors[0], matrixRef: matrixByMethod.UT, createdDate: "2025-10-11", issuedDate: "2025-10-12", weldCount: 10, acceptedCount: 3, rejectedCount: 0 },
  { batchNo: "BTH-2025-0160", method: "RT", status: "Rework", subcontractor: subcontractors[1], matrixRef: matrixByMethod.RT, createdDate: "2025-10-12", issuedDate: "2025-10-14", resultsReceivedDate: "2025-10-18", weldCount: 5, acceptedCount: 4, rejectedCount: 1 },
  { batchNo: "BTH-2025-0161", method: "PMI", status: "Closed", subcontractor: subcontractors[2], matrixRef: matrixByMethod.PMI, createdDate: "2025-10-13", issuedDate: "2025-10-14", resultsReceivedDate: "2025-10-18", closedDate: "2025-10-26", weldCount: 6, acceptedCount: 6, rejectedCount: 0 },
  { batchNo: "BTH-2025-0162", method: "RT", status: "Created", subcontractor: subcontractors[0], matrixRef: matrixByMethod.RT, createdDate: "2025-10-14", weldCount: 3, acceptedCount: 0, rejectedCount: 0 },
  { batchNo: "BTH-2025-0163", method: "UT", status: "Issued", subcontractor: subcontractors[1], matrixRef: matrixByMethod.UT, createdDate: "2025-10-15", issuedDate: "2025-10-20", weldCount: 7, acceptedCount: 0, rejectedCount: 0, isOverdue: true },
  { batchNo: "BTH-2025-0164", method: "RT", status: "Results Received", subcontractor: subcontractors[2], matrixRef: matrixByMethod.RT, createdDate: "2025-10-16", issuedDate: "2025-10-17", resultsReceivedDate: "2025-10-22", weldCount: 8, acceptedCount: 6, rejectedCount: 2 },
  { batchNo: "BTH-2025-0165", method: "MT", status: "Closed", subcontractor: subcontractors[0], matrixRef: matrixByMethod.MT, createdDate: "2025-10-17", issuedDate: "2025-10-18", resultsReceivedDate: "2025-10-21", closedDate: "2025-10-27", weldCount: 5, acceptedCount: 5, rejectedCount: 0 },
  { batchNo: "BTH-2025-0166", method: "RT", status: "In Progress", subcontractor: subcontractors[1], matrixRef: matrixByMethod.RT, createdDate: "2025-10-18", issuedDate: "2025-10-19", weldCount: 9, acceptedCount: 4, rejectedCount: 0 },
  { batchNo: "BTH-2025-0167", method: "RT", status: "Rework", subcontractor: subcontractors[2], matrixRef: matrixByMethod.RT, createdDate: "2025-10-19", issuedDate: "2025-10-20", resultsReceivedDate: "2025-10-24", weldCount: 6, acceptedCount: 5, rejectedCount: 1 },
  { batchNo: "BTH-2025-0168", method: "HT", status: "Closed", subcontractor: subcontractors[0], matrixRef: matrixByMethod.HT, createdDate: "2025-10-20", issuedDate: "2025-10-21", resultsReceivedDate: "2025-10-24", closedDate: "2025-10-28", weldCount: 4, acceptedCount: 4, rejectedCount: 0 },
  { batchNo: "BTH-2025-0169", method: "UT", status: "Issued", subcontractor: subcontractors[1], matrixRef: matrixByMethod.UT, createdDate: "2025-10-21", issuedDate: "2025-10-23", weldCount: 8, acceptedCount: 0, rejectedCount: 0 },
  { batchNo: "BTH-2025-0170", method: "RT", status: "In Progress", subcontractor: subcontractors[2], matrixRef: matrixByMethod.RT, createdDate: "2025-10-22", issuedDate: "2025-10-24", weldCount: 7, acceptedCount: 3, rejectedCount: 0 },
  { batchNo: "BTH-2025-0171", method: "RT", status: "Rework", subcontractor: subcontractors[0], matrixRef: matrixByMethod.RT, createdDate: "2025-10-23", issuedDate: "2025-10-24", resultsReceivedDate: "2025-10-29", weldCount: 6, acceptedCount: 4, rejectedCount: 2 },
]

function shiftDate(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString().slice(0, 10)
}

function createHistory(blueprint: BatchBlueprint, welds: NdeBatchWeld[], batchIndex: number): NdeBatchHistoryEvent[] {
  const createdBy = `QC-COORD-${String((batchIndex % 5) + 1).padStart(2, "0")}`
  const issuedBy = `${blueprint.subcontractor} Desk`
  const receivedBy = inspectors[(batchIndex + 3) % inspectors.length]
  const rejectedWelds = welds.filter((weld) => weld.result === "Rejected")

  const history: NdeBatchHistoryEvent[] = [
    {
      id: `${blueprint.batchNo}-created`,
      title: "Batch created",
      detail: `Matrix ${blueprint.matrixRef} prepared for ${welds.length} welds`,
      actor: createdBy,
      timestamp: blueprint.createdDate,
      status: "Created",
    },
  ]

  if (blueprint.issuedDate) {
    history.push({
      id: `${blueprint.batchNo}-issued`,
      title: "Issued to subcontractor",
      detail: `Released to ${blueprint.subcontractor}`,
      actor: issuedBy,
      timestamp: blueprint.issuedDate,
      status: "Issued",
    })
  }

  if (blueprint.status === "In Progress") {
    history.push({
      id: `${blueprint.batchNo}-progress`,
      title: "Examination in progress",
      detail: `${Math.max(1, blueprint.acceptedCount)} welds reported from first tranche`,
      actor: receivedBy,
      timestamp: shiftDate(blueprint.issuedDate ?? blueprint.createdDate, 2),
      status: "In Progress",
    })
  }

  if (blueprint.resultsReceivedDate) {
    history.push({
      id: `${blueprint.batchNo}-received`,
      title: "Results received",
      detail: `${getAcceptedCountFromWelds(welds)}/${welds.length} welds accepted in latest submission`,
      actor: receivedBy,
      timestamp: blueprint.resultsReceivedDate,
      status: "Results Received",
    })
  }

  if (rejectedWelds.length > 0) {
    history.push({
      id: `${blueprint.batchNo}-reject`,
      title: `${rejectedWelds.length} weld${rejectedWelds.length > 1 ? "s" : ""} rejected`,
      detail: rejectedWelds.map((weld) => `${weld.jointNo} ${weld.reworkCode}`).join(" • "),
      actor: receivedBy,
      timestamp: shiftDate(blueprint.resultsReceivedDate ?? blueprint.issuedDate ?? blueprint.createdDate, 1),
      status: blueprint.status === "Rework" ? "Rework" : "Results Received",
    })
  }

  if (blueprint.status === "Rework") {
    history.push({
      id: `${blueprint.batchNo}-rework`,
      title: "Rework dispatched",
      detail: "Rejected welds released to fabrication for repair and re-examination",
      actor: createdBy,
      timestamp: shiftDate(blueprint.resultsReceivedDate ?? blueprint.issuedDate ?? blueprint.createdDate, 2),
      status: "Rework",
    })
  }

  if (blueprint.closedDate) {
    history.push({
      id: `${blueprint.batchNo}-closed`,
      title: "Batch closed",
      detail: "All required examinations accepted and dossier updated",
      actor: `DOC-CTRL-${String((batchIndex % 3) + 1).padStart(2, "0")}`,
      timestamp: blueprint.closedDate,
      status: "Closed",
    })
  }

  return history
}

function createWelds(blueprint: BatchBlueprint, batchIndex: number): NdeBatchWeld[] {
  return Array.from({ length: blueprint.weldCount }, (_, weldIndex) => {
    const source = WELD_DATA[(batchIndex * 3 + weldIndex) % WELD_DATA.length]
    const pendingBoundary = blueprint.acceptedCount + blueprint.rejectedCount
    const result: NdeWeldResult =
      weldIndex < blueprint.acceptedCount
        ? "Accepted"
        : weldIndex < pendingBoundary
          ? "Rejected"
          : "Pending"

    const rejection = result === "Rejected" ? rejectionLibrary[(batchIndex + weldIndex) % rejectionLibrary.length] : undefined
    const inspector = result === "Pending" ? undefined : inspectors[(batchIndex + weldIndex) % inspectors.length]
    const dateAnchor = blueprint.resultsReceivedDate ?? blueprint.issuedDate ?? blueprint.createdDate

    return {
      id: `${blueprint.batchNo}-W${String(weldIndex + 1).padStart(2, "0")}`,
      jointNo: source.jointNo,
      spoolNo: source.spoolNo,
      isoNo: source.isoNo,
      welder: source.welderCode,
      result,
      reworkCode: rejection?.code,
      inspector,
      date: result === "Pending" ? undefined : shiftDate(dateAnchor, Math.min(weldIndex, 3)),
      remarks:
        result === "Accepted"
          ? source.rtResult === "Accepted"
            ? source.remarks
            : "No reportable indications. Released for dossier close-out."
          : rejection?.remarks,
      dwirNo: source.dwirNo,
      materialType: source.materialType,
      diaInch: source.diaInch,
      wpsNo: source.wpsNo,
      photos: ["Radiograph frame placeholder", "Repair area photo placeholder"],
    }
  })
}

function getAcceptedCountFromWelds(welds: NdeBatchWeld[]) {
  return welds.filter((weld) => weld.result === "Accepted").length
}

export const NDE_BATCHES: NdeBatch[] = blueprints.map((blueprint, batchIndex) => {
  const welds = createWelds(blueprint, batchIndex)

  return {
    id: blueprint.batchNo,
    batchNo: blueprint.batchNo,
    method: blueprint.method,
    status: blueprint.status,
    subcontractor: blueprint.subcontractor,
    matrixRef: blueprint.matrixRef,
    createdDate: blueprint.createdDate,
    issuedDate: blueprint.issuedDate,
    resultsReceivedDate: blueprint.resultsReceivedDate,
    closedDate: blueprint.closedDate,
    isOverdue: blueprint.isOverdue,
    source: "shop",
    welds,
    history: createHistory(blueprint, welds, batchIndex),
  }
})

export function getAcceptedCount(batch: NdeBatch) {
  return batch.welds.filter((weld) => weld.result === "Accepted").length
}

export function getRejectedCount(batch: NdeBatch) {
  return batch.welds.filter((weld) => weld.result === "Rejected").length
}

export function getPendingCount(batch: NdeBatch) {
  return batch.welds.filter((weld) => weld.result === "Pending").length
}

export function countSpools(batch: NdeBatch) {
  return new Set(batch.welds.map((weld) => weld.spoolNo)).size
}

export function getAcceptanceRate(batch: NdeBatch) {
  if (batch.welds.length === 0) {
    return 0
  }

  return Math.round((getAcceptedCount(batch) / batch.welds.length) * 1000) / 10
}

export function hasRejectedWelds(batch: NdeBatch) {
  return getRejectedCount(batch) > 0
}

export function isBatchClosable(batch: NdeBatch) {
  return batch.status !== "Closed" && batch.welds.every((weld) => weld.result === "Accepted")
}
