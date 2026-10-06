import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import {
  getProjectPressureUnit,
  getTestPackCatalogRow,
  getTestPackReadinessRow,
  listBlindingWorklist,
  listFlangeReinstatementRecords,
  listItemClearanceWorklist,
  listLineCheckWorklist,
  listProjectLineServices,
  listProjectServiceClasses,
  listProjectSubsystems,
  listProjectSystems,
  listReinstatementWorklist,
  listTestingPrecommWorklist,
  listTestPackIsoStatus,
  listTestPackMembers,
  listTestPackReinstatementTargets,
  listTestPackSpoolStatus,
  type BlindingWorklistRow,
  type FlangeJointReadinessRow,
  type FlangeReinstatementRecordRow,
  type ItemClearanceWorklistRow,
  type LineCheckWorklistRow,
  type ProjectReferenceOptionRow,
  type ProjectSubsystemOptionRow,
  type ReinstatementWorklistRow,
  type TestingPrecommWorklistRow,
  type TestPackCatalogRow,
  type TestPackIsoStatusRow,
  type TestPackMemberRow,
  type TestPackReadinessRow,
  type TestPackSpoolStatusRow,
} from "../infrastructure/supabase-pressure-test-repository"

export interface ScopedPage<T> {
  rows: readonly T[]
  total: number
}

export async function readCompleteScopedRows<T>(
  loadPage: (from: number, to: number) => Promise<ScopedPage<T>>,
  pageSize = 500,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("Page size must be positive.")
  }
  const rows: T[] = []
  let expected: number | null = null
  for (let offset = 0; ; offset += pageSize) {
    const page = await loadPage(offset, offset + pageSize - 1)
    if (expected !== null && expected !== page.total) {
      throw new Error("Worklist changed while loading; retry refresh.")
    }
    expected = page.total
    rows.push(...page.rows)
    if (rows.length === expected) return rows
    if (rows.length > expected || page.rows.length !== pageSize) {
      throw new Error("Worklist is incomplete; retry refresh.")
    }
  }
}

export interface TestPackReferenceLabels {
  system: string | null
  subsystem: string | null
  serviceClass: string | null
  lineService: string | null
}

export interface TestPackScopedWorklists {
  lineCheck: LineCheckWorklistRow[]
  itemClearance: ItemClearanceWorklistRow[]
  blinding: BlindingWorklistRow[]
  testingPrecomm: TestingPrecommWorklistRow[]
  reinstatement: ReinstatementWorklistRow[]
  reinstatementTargets: FlangeJointReadinessRow[]
  effectiveReinstatementRecords: FlangeReinstatementRecordRow[]
}

export interface TestPackWorkspaceSnapshot {
  pack: TestPackCatalogRow
  readiness: TestPackReadinessRow | null
  members: TestPackMemberRow[]
  isoStatus: TestPackIsoStatusRow[]
  spoolStatus: TestPackSpoolStatusRow[]
  worklists: TestPackScopedWorklists
  referenceLabels: TestPackReferenceLabels
  pressureUnit: Database["public"]["Enums"]["pressure_unit"] | null
}

export type TestPackWorkspaceResult =
  | { status: "available"; snapshot: TestPackWorkspaceSnapshot }
  | { status: "unavailable"; reason: string }

export interface TestPackLoaderRepository {
  getTestPackCatalogRow: (projectId: string, id: string) => Promise<TestPackCatalogRow | null>
  getTestPackReadinessRow: (projectId: string, id: string) => Promise<TestPackReadinessRow | null>
  listTestPackMembers: (projectId: string, testPackId: string) => Promise<TestPackMemberRow[]>
  listTestPackIsoStatus: (projectId: string, testPackId: string) => Promise<TestPackIsoStatusRow[]>
  listTestPackSpoolStatus: (projectId: string, testPackId: string) => Promise<TestPackSpoolStatusRow[]>
  listLineCheckWorklist: (projectId: string, testPackId: string) => Promise<LineCheckWorklistRow[]>
  listItemClearanceWorklist: (projectId: string, testPackId: string) => Promise<ItemClearanceWorklistRow[]>
  listBlindingWorklist: (projectId: string, testPackId: string) => Promise<BlindingWorklistRow[]>
  listTestingPrecommWorklist: (projectId: string, testPackId: string) => Promise<TestingPrecommWorklistRow[]>
  listReinstatementWorklist: (projectId: string, testPackId: string) => Promise<ReinstatementWorklistRow[]>
  listTestPackReinstatementTargets: (projectId: string, testPackId: string) => Promise<FlangeJointReadinessRow[]>
  listFlangeReinstatementRecords: (
    projectId: string,
    targetRevisionIds: readonly string[],
  ) => Promise<FlangeReinstatementRecordRow[]>
  listProjectSystems: (projectId: string) => Promise<ProjectReferenceOptionRow[]>
  listProjectSubsystems: (projectId: string) => Promise<ProjectSubsystemOptionRow[]>
  listProjectServiceClasses: (projectId: string) => Promise<ProjectReferenceOptionRow[]>
  listProjectLineServices: (projectId: string) => Promise<ProjectReferenceOptionRow[]>
  getProjectPressureUnit: (projectId: string) => Promise<Database["public"]["Enums"]["pressure_unit"] | null>
}

export function createSupabaseTestPackLoaderRepository(
  client: SupabaseClient<Database>,
): TestPackLoaderRepository {
  return {
    getTestPackCatalogRow: (projectId, id) => getTestPackCatalogRow(client, projectId, id),
    getTestPackReadinessRow: (projectId, id) => getTestPackReadinessRow(client, projectId, id),
    listTestPackMembers: (projectId, testPackId) => listTestPackMembers(client, projectId, testPackId),
    listTestPackIsoStatus: (projectId, testPackId) => listTestPackIsoStatus(client, projectId, testPackId),
    listTestPackSpoolStatus: (projectId, testPackId) => listTestPackSpoolStatus(client, projectId, testPackId),
    listLineCheckWorklist: (projectId, testPackId) => listLineCheckWorklist(client, projectId, testPackId),
    listItemClearanceWorklist: (projectId, testPackId) => listItemClearanceWorklist(client, projectId, testPackId),
    listBlindingWorklist: (projectId, testPackId) => listBlindingWorklist(client, projectId, testPackId),
    listTestingPrecommWorklist: (projectId, testPackId) => listTestingPrecommWorklist(client, projectId, testPackId),
    listReinstatementWorklist: (projectId, testPackId) => listReinstatementWorklist(client, projectId, testPackId),
    listTestPackReinstatementTargets: (projectId, testPackId) =>
      listTestPackReinstatementTargets(client, projectId, testPackId),
    listFlangeReinstatementRecords: (projectId, targetRevisionIds) =>
      listFlangeReinstatementRecords(client, projectId, targetRevisionIds),
    listProjectSystems: (projectId) => listProjectSystems(client, projectId),
    listProjectSubsystems: (projectId) => listProjectSubsystems(client, projectId),
    listProjectServiceClasses: (projectId) => listProjectServiceClasses(client, projectId),
    listProjectLineServices: (projectId) => listProjectLineServices(client, projectId),
    getProjectPressureUnit: (projectId) => getProjectPressureUnit(client, projectId),
  }
}

function resolveReferenceLabel(
  id: string | undefined,
  options: readonly { id: string; code: string; description: string | null }[],
): string | null {
  if (!id) return null
  const matched = options.find((opt) => opt.id === id)
  if (!matched) return "Reference unavailable"
  return matched.description ? `${matched.code} · ${matched.description}` : matched.code
}

export async function loadTestPackWorkspaceSnapshot(
  repo: TestPackLoaderRepository,
  projectId: string,
  packId: string | null,
): Promise<TestPackWorkspaceResult> {
  if (!packId) {
    return { status: "unavailable", reason: "No test pack selected" }
  }

  // 1. Direct lookup first. If the pack is missing or belongs to another project, abort detail reads.
  const pack = await repo.getTestPackCatalogRow(projectId, packId)
  if (!pack) {
    return { status: "unavailable", reason: "Test Pack not found in current project" }
  }

  // 2. Load detail reads in parallel.
  const [
    readiness,
    members,
    isoStatus,
    spoolStatus,
    lineCheck,
    itemClearance,
    blinding,
    testingPrecomm,
    reinstatement,
    reinstatementTargets,
    systems,
    subsystems,
    serviceClasses,
    lineServices,
    projectPressureUnit,
  ] = await Promise.all([
    repo.getTestPackReadinessRow(projectId, packId),
    repo.listTestPackMembers(projectId, packId),
    repo.listTestPackIsoStatus(projectId, packId),
    repo.listTestPackSpoolStatus(projectId, packId),
    repo.listLineCheckWorklist(projectId, packId),
    repo.listItemClearanceWorklist(projectId, packId),
    repo.listBlindingWorklist(projectId, packId),
    repo.listTestingPrecommWorklist(projectId, packId),
    repo.listReinstatementWorklist(projectId, packId),
    repo.listTestPackReinstatementTargets(projectId, packId),
    repo.listProjectSystems(projectId),
    repo.listProjectSubsystems(projectId),
    repo.listProjectServiceClasses(projectId),
    repo.listProjectLineServices(projectId),
    repo.getProjectPressureUnit(projectId),
  ])

  // 3. Load effective reinstatement records for current targets.
  const targetRevisionIds = reinstatementTargets
    .map((target) => target.flange_joint_revision_id)
    .filter((id): id is string => Boolean(id))

  const effectiveReinstatementRecords = await repo.listFlangeReinstatementRecords(
    projectId,
    targetRevisionIds,
  )

  const referenceLabels: TestPackReferenceLabels = {
    system: resolveReferenceLabel(pack.systemId, systems),
    subsystem: resolveReferenceLabel(pack.subsystemId, subsystems),
    serviceClass: resolveReferenceLabel(pack.serviceClassId, serviceClasses),
    lineService: resolveReferenceLabel(pack.lineServiceId, lineServices),
  }

  const snapshot: TestPackWorkspaceSnapshot = {
    pack,
    readiness,
    members,
    isoStatus,
    spoolStatus,
    worklists: {
      lineCheck,
      itemClearance,
      blinding,
      testingPrecomm,
      reinstatement,
      reinstatementTargets,
      effectiveReinstatementRecords,
    },
    referenceLabels,
    pressureUnit: pack.pressureUnit ?? projectPressureUnit ?? null,
  }

  return { status: "available", snapshot }
}
