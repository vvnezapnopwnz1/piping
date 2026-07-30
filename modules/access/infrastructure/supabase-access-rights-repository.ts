import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"

import {
  FUNCTIONAL_ROLES,
  PROJECT_ACCESS_ROLES,
  type FunctionalRole,
  type ProjectAccessRole,
} from "../domain/capability"
import {
  normalizeAccessMemberEmail,
  validateAccessMemberInput,
  type AccessMemberInput,
  type AccessMemberRow,
} from "../domain/access-rights"

export class AccessDeniedError extends Error {
  constructor() {
    super("You do not have permission to manage project access.")
    this.name = "AccessDeniedError"
  }
}

export class AccessConfigurationError extends Error {
  constructor() {
    super("The access request is not valid for this project.")
    this.name = "AccessConfigurationError"
  }
}

export class AccessMutationError extends Error {
  constructor() {
    super("Unable to update project access.")
    this.name = "AccessMutationError"
  }
}

export interface AccessScopeOption {
  id: string
  code: string
  description: string
}

interface AccessMatrixRpcRow {
  membership_id: string
  user_id: string
  full_name: string
  email: string
  is_active: boolean
  access_role_code: string
  functional_role_codes: string[] | null
  subcontractor_ids: string[] | null
  pds_area_ids: string[] | null
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
    throw new AccessConfigurationError()
  }
  return normalized
}

function normalizeMatrixRow(row: AccessMatrixRpcRow): AccessMemberRow {
  const accessRole = normalizeCodes<ProjectAccessRole>(
    [row.access_role_code],
    PROJECT_ACCESS_ROLES,
  )[0]
  const validation = validateAccessMemberInput({
    accessRole,
    functionalRoles: normalizeCodes<FunctionalRole>(
      row.functional_role_codes,
      FUNCTIONAL_ROLES,
    ),
    subcontractorIds: row.subcontractor_ids ?? [],
    pdsAreaIds: row.pds_area_ids ?? [],
  })

  if (!validation.ok) throw new AccessConfigurationError()

  return {
    membershipId: row.membership_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    isActive: row.is_active,
    ...validation.value,
  }
}

function accessError(error: { code?: string } | null): Error {
  if (error?.code === "42501") return new AccessDeniedError()
  if (error?.code?.startsWith("PQC")) return new AccessConfigurationError()
  return new AccessMutationError()
}

function toRpcInput(input: AccessMemberInput) {
  const validation = validateAccessMemberInput(input)
  if (!validation.ok) throw new AccessConfigurationError()

  return {
    requested_access_role: validation.value.accessRole,
    requested_functional_roles: validation.value.functionalRoles,
    requested_subcontractor_ids: validation.value.subcontractorIds,
    requested_pds_area_ids: validation.value.pdsAreaIds,
  }
}

export async function loadProjectAccessMatrix(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<AccessMemberRow[]> {
  const { data, error } = await client.rpc("get_project_access_matrix", {
    target_project_id: projectId,
  })
  if (error) throw accessError(error)

  return (data ?? []).map((row) => normalizeMatrixRow(row as AccessMatrixRpcRow))
}

export async function loadProjectAccessScopeOptions(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<{ subcontractors: AccessScopeOption[]; pdsAreas: AccessScopeOption[] }> {
  const [subcontractorResponse, pdsResponse] = await Promise.all([
    client
      .from("project_subcontractors")
      .select("id, code, description")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
    client
      .from("project_pds_areas")
      .select("id, code, description")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
  ])

  if (subcontractorResponse.error) throw accessError(subcontractorResponse.error)
  if (pdsResponse.error) throw accessError(pdsResponse.error)

  return {
    subcontractors: subcontractorResponse.data ?? [],
    pdsAreas: pdsResponse.data ?? [],
  }
}

export async function addProjectMember(
  client: SupabaseClient<Database>,
  projectId: string,
  email: string,
  input: AccessMemberInput,
): Promise<void> {
  const { error } = await client.rpc("add_project_member_by_email", {
    target_project_id: projectId,
    target_email: normalizeAccessMemberEmail(email),
    ...toRpcInput(input),
  })
  if (error) throw accessError(error)
}

export async function updateProjectMember(
  client: SupabaseClient<Database>,
  membershipId: string,
  input: AccessMemberInput,
): Promise<void> {
  const { error } = await client.rpc("update_project_member_access", {
    target_membership_id: membershipId,
    ...toRpcInput(input),
  })
  if (error) throw accessError(error)
}

export async function setProjectMemberActive(
  client: SupabaseClient<Database>,
  membershipId: string,
  active: boolean,
): Promise<void> {
  const { error } = await client.rpc("set_project_member_active", {
    target_membership_id: membershipId,
    requested_active: active,
  })
  if (error) throw accessError(error)
}
