import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"

import {
  CAPABILITIES,
  FUNCTIONAL_ROLES,
  PROJECT_ACCESS_ROLES,
  type Capability,
  type FunctionalRole,
  type ProjectAccessRole,
} from "../domain/capability"
import type { EffectiveAccess } from "../domain/effective-access"

export interface ProjectAccessSummary extends EffectiveAccess {
  activityCode: string
  title: string
  projectStatus: "active" | "inactive" | "archived"
  projectCreatedAt: string
}

export class AccessLoadError extends Error {
  constructor() {
    super("Unable to load project access.")
    this.name = "AccessLoadError"
  }
}

export class AccessContractError extends Error {
  constructor() {
    super("The project access response is invalid.")
    this.name = "AccessContractError"
  }
}

interface ProjectAccessRpcRow {
  membership_id: string | null
  project_id: string
  activity_code: string
  title: string
  project_status: string
  project_created_at: string
  access_role_code: string | null
  functional_role_codes: string[] | null
  capability_codes: string[] | null
  subcontractor_ids: string[] | null
  pds_area_ids: string[] | null
  is_platform_admin: boolean
}

function isOneOf<Value extends string>(
  value: string,
  values: readonly Value[],
): value is Value {
  return values.includes(value as Value)
}

function normalizeCodes<Value extends string>(
  values: string[] | null,
  allowed: readonly Value[],
): Value[] {
  const normalized = values ?? []
  if (!normalized.every((value) => isOneOf(value, allowed))) {
    throw new AccessContractError()
  }

  return normalized
}

function normalizeAccessRole(value: string | null): ProjectAccessRole | null {
  if (value === null) return null
  if (!isOneOf(value, PROJECT_ACCESS_ROLES)) {
    throw new AccessContractError()
  }

  return value
}

function normalizeProjectStatus(
  value: string,
): ProjectAccessSummary["projectStatus"] {
  if (value === "active" || value === "inactive" || value === "archived") {
    return value
  }

  throw new AccessContractError()
}

function normalizeProjectAccess(row: ProjectAccessRpcRow): ProjectAccessSummary {
  return {
    membershipId: row.membership_id,
    projectId: row.project_id,
    activityCode: row.activity_code,
    title: row.title,
    projectStatus: normalizeProjectStatus(row.project_status),
    projectCreatedAt: row.project_created_at,
    accessRole: normalizeAccessRole(row.access_role_code),
    functionalRoles: normalizeCodes<FunctionalRole>(
      row.functional_role_codes,
      FUNCTIONAL_ROLES,
    ),
    capabilities: normalizeCodes<Capability>(row.capability_codes, CAPABILITIES),
    subcontractorIds: row.subcontractor_ids ?? [],
    pdsAreaIds: row.pds_area_ids ?? [],
    isPlatformAdmin: row.is_platform_admin,
  }
}

export async function listCurrentUserProjects(
  client: SupabaseClient<Database>,
): Promise<ProjectAccessSummary[]> {
  const { data, error } = await client.rpc("list_current_user_projects")

  if (error) {
    throw new AccessLoadError()
  }

  return (data ?? []).map((row) =>
    normalizeProjectAccess(row as ProjectAccessRpcRow),
  )
}
