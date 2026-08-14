export type FabricationStageCount = {
  current_stage: string
  spool_count: number
}

export type NdeWorkflowCount = {
  status: string
  obligation_count: number
}

export type ErectionStageCount = {
  stage: string
  spool_count: number
}

export interface ExecutiveOverviewInput {
  fabricationStages: readonly FabricationStageCount[]
  ndeWorkflow: readonly NdeWorkflowCount[]
  erectionStages: readonly ErectionStageCount[]
}

export interface ExecutiveOverview {
  fabrication: { total: number; completed: number; percentComplete: number }
  nde: { total: number; inspected: number; awaitingResult: number; issued: number; percentInspected: number }
  erection: { total: number; readyForTest: number; remaining: number; percentReadyForTest: number }
  attention: { module: "nde" | "erection"; count: number; label: string }[]
}

const count = (rows: readonly { spool_count?: number; obligation_count?: number }[]): number =>
  rows.reduce((total, row) => total + Number(row.spool_count ?? row.obligation_count ?? 0), 0)

const ratio = (part: number, total: number): number => total ? Math.round((part / total) * 100) : 0

export function toExecutiveOverview(input: ExecutiveOverviewInput): ExecutiveOverview {
  const fabricationTotal = count(input.fabricationStages)
  const fabricationCompleted = count(input.fabricationStages.filter((row) => row.current_stage === "laydown"))
  const ndeTotal = count(input.ndeWorkflow)
  const ndeInspected = count(input.ndeWorkflow.filter((row) => row.status === "result_recorded"))
  const ndeIssued = count(input.ndeWorkflow.filter((row) => row.status === "issued"))
  const erectionTotal = count(input.erectionStages)
  const readyForTest = count(input.erectionStages.filter((row) => row.stage === "rft"))
  const remaining = Math.max(erectionTotal - readyForTest, 0)
  const attention: ExecutiveOverview["attention"] = []

  if (ndeIssued) attention.push({ module: "nde", count: ndeIssued, label: "NDE obligations issued to inspector" })
  if (remaining) attention.push({ module: "erection", count: remaining, label: "Accepted spools not Ready for Test" })

  return {
    fabrication: { total: fabricationTotal, completed: fabricationCompleted, percentComplete: ratio(fabricationCompleted, fabricationTotal) },
    nde: { total: ndeTotal, inspected: ndeInspected, awaitingResult: Math.max(ndeTotal - ndeInspected, 0), issued: ndeIssued, percentInspected: ratio(ndeInspected, ndeTotal) },
    erection: { total: erectionTotal, readyForTest, remaining, percentReadyForTest: ratio(readyForTest, erectionTotal) },
    attention,
  }
}
