import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../lib/supabase/database.types"

type FixtureUserKey =
  | "platform_admin"
  | "platform_observer"
  | "project_admin_a"
  | "reader_qc"
  | "qc_editor"
  | "nde_subcontractor"

interface FixtureUserDefinition {
  key: FixtureUserKey
  email: string
  fullName: string
  isPlatformAdmin: boolean
}

export const TRACK01_FIXTURE_USERS: readonly FixtureUserDefinition[] = [
  {
    key: "platform_admin",
    email: "track01.platform-admin@example.test",
    fullName: "Track 01 Platform Admin",
    isPlatformAdmin: true,
  },
  {
    key: "platform_observer",
    email: "track01.platform-observer@example.test",
    fullName: "Track 01 Platform Observer",
    isPlatformAdmin: true,
  },
  {
    key: "project_admin_a",
    email: "track01.project-admin-a@example.test",
    fullName: "Track 01 Project Admin A",
    isPlatformAdmin: false,
  },
  {
    key: "reader_qc",
    email: "track01.reader-qc@example.test",
    fullName: "Track 01 Reader QC",
    isPlatformAdmin: false,
  },
  {
    key: "qc_editor",
    email: "track01.qc-editor@example.test",
    fullName: "Track 01 QC Editor",
    isPlatformAdmin: false,
  },
  {
    key: "nde_subcontractor",
    email: "track01.nde-subcontractor@example.test",
    fullName: "Track 01 NDE Subcontractor",
    isPlatformAdmin: false,
  },
] as const

export function assertLocalSupabaseUrl(value: string): void {
  const url = new URL(value)
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("TRACK01 bootstrap requires a local Supabase URL.")
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} must be set for the local fixture bootstrap.`)
  return value
}

function throwOnError(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || JSON.stringify(error))
}

async function findOrCreateUser(
  client: SupabaseClient<Database>,
  definition: FixtureUserDefinition,
  password: string,
): Promise<string> {
  const { data: listed, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  throwOnError(listError)
  const existing = listed.users.find((user) => user.email === definition.email)
  if (existing) {
    const { error } = await client.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: definition.fullName },
    })
    throwOnError(error)
    return existing.id
  }

  const { data, error } = await client.auth.admin.createUser({
    email: definition.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: definition.fullName },
  })
  throwOnError(error)
  if (!data.user) throw new Error(`Auth user creation returned no user for ${definition.key}.`)
  return data.user.id
}

async function getOrCreateProject(
  client: SupabaseClient<Database>,
  activityCode: string,
  title: string,
  createdBy: string,
): Promise<string> {
  const { data: existing, error: readError } = await client
    .from("projects")
    .select("id")
    .eq("activity_code", activityCode)
    .maybeSingle()
  throwOnError(readError)
  if (existing) return existing.id

  const { data, error } = await client
    .from("projects")
    .insert({
      activity_code: activityCode,
      title,
      owner_name: "Track 01 Browser Fixtures",
      contractor_name: "PipeQC",
      maximum_transit_time_days: 1,
      created_by: createdBy,
    })
    .select("id")
    .single()
  throwOnError(error)
  if (!data) throw new Error(`Project creation returned no project for ${activityCode}.`)
  return data.id
}

async function ensureMember(
  client: SupabaseClient<Database>,
  projectId: string,
  userId: string,
  role: Database["public"]["Enums"]["app_role"],
  accessRole: "project_admin" | "project_editor" | "project_reader" | "subcontractor",
  functionalRoles: string[],
): Promise<string> {
  const { data: membership, error: membershipError } = await client
    .from("project_memberships")
    .upsert(
      {
        project_id: projectId,
        user_id: userId,
        role,
        access_role_code: accessRole,
        is_active: true,
      },
      { onConflict: "project_id,user_id" },
    )
    .select("id")
    .single()
  throwOnError(membershipError)
  if (!membership) throw new Error(`Membership upsert returned no row for ${userId}.`)

  const { error: removeRolesError } = await client
    .from("project_membership_functional_roles")
    .delete()
    .eq("membership_id", membership.id)
  throwOnError(removeRolesError)
  if (functionalRoles.length > 0) {
    const { error } = await client
      .from("project_membership_functional_roles")
      .insert(functionalRoles.map((roleCode) => ({ membership_id: membership.id, role_code: roleCode })))
    throwOnError(error)
  }

  return membership.id
}

async function getOrCreateSubcontractor(
  client: SupabaseClient<Database>,
  projectId: string,
  code: string,
): Promise<string> {
  const { data, error } = await client
    .from("project_subcontractors")
    .upsert(
      { project_id: projectId, code, description: `Track 01 ${code}` },
      { onConflict: "project_id,code" },
    )
    .select("id")
    .single()
  throwOnError(error)
  if (!data) throw new Error(`Subcontractor upsert returned no row for ${code}.`)
  return data.id
}

async function getOrCreatePdsArea(
  client: SupabaseClient<Database>,
  projectId: string,
  code: string,
  fieldSubcontractorId: string,
): Promise<string> {
  const { data, error } = await client
    .from("project_pds_areas")
    .upsert(
      {
        project_id: projectId,
        code,
        description: `Track 01 ${code}`,
        field_subcontractor_id: fieldSubcontractorId,
      },
      { onConflict: "project_id,code" },
    )
    .select("id")
    .single()
  throwOnError(error)
  if (!data) throw new Error(`PDS area upsert returned no row for ${code}.`)
  return data.id
}

async function replaceScopes(
  client: SupabaseClient<Database>,
  membershipId: string,
  subcontractorId: string,
  pdsAreaId: string,
): Promise<void> {
  const { error: deleteSubcontractorScopesError } = await client
    .from("membership_subcontractor_scopes")
    .delete()
    .eq("membership_id", membershipId)
  throwOnError(deleteSubcontractorScopesError)
  const { error: deletePdsScopesError } = await client
    .from("membership_pds_area_scopes")
    .delete()
    .eq("membership_id", membershipId)
  throwOnError(deletePdsScopesError)
  const { error: subcontractorScopeError } = await client
    .from("membership_subcontractor_scopes")
    .insert({ membership_id: membershipId, subcontractor_id: subcontractorId })
  throwOnError(subcontractorScopeError)
  const { error: pdsScopeError } = await client
    .from("membership_pds_area_scopes")
    .insert({ membership_id: membershipId, pds_area_id: pdsAreaId })
  throwOnError(pdsScopeError)
}

async function main(): Promise<void> {
  const url = requiredEnvironment("SUPABASE_URL")
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY")
  const password = requiredEnvironment("TRACK01_FIXTURE_PASSWORD")
  assertLocalSupabaseUrl(url)
  if (password.length < 12) throw new Error("TRACK01_FIXTURE_PASSWORD must be at least 12 characters.")

  const client = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const users = new Map<FixtureUserKey, string>()
  for (const definition of TRACK01_FIXTURE_USERS) {
    users.set(definition.key, await findOrCreateUser(client, definition, password))
  }
  for (const definition of TRACK01_FIXTURE_USERS.filter((user) => user.isPlatformAdmin)) {
    const { error } = await client
      .from("profiles")
      .update({ is_platform_admin: true })
      .eq("id", users.get(definition.key)!)
    throwOnError(error)
  }

  const projectA = await getOrCreateProject(client, "TRACK01-A", "Track 01 Project A", users.get("platform_admin")!)
  await getOrCreateProject(client, "TRACK01-B", "Track 01 Project B", users.get("platform_admin")!)
  await ensureMember(client, projectA, users.get("project_admin_a")!, "system_admin", "project_admin", [])
  await ensureMember(client, projectA, users.get("reader_qc")!, "project_manager", "project_reader", ["qc_engineer"])
  await ensureMember(client, projectA, users.get("qc_editor")!, "qc_engineer", "project_editor", ["qc_engineer"])
  const ndeMembershipId = await ensureMember(client, projectA, users.get("nde_subcontractor")!, "subcontractor", "subcontractor", ["nde_inspector"])

  const subcontractorA = await getOrCreateSubcontractor(client, projectA, "TRACK01-SUB-A")
  await getOrCreateSubcontractor(client, projectA, "TRACK01-SUB-B")
  const pdsAreaA = await getOrCreatePdsArea(client, projectA, "TRACK01-PDS-A", subcontractorA)
  await getOrCreatePdsArea(client, projectA, "TRACK01-PDS-B", subcontractorA)
  await replaceScopes(client, ndeMembershipId, subcontractorA, pdsAreaA)

  console.log("Track 01 browser fixtures are ready for local Supabase.")
  console.log("Created or reconciled 6 fixture users and projects TRACK01-A / TRACK01-B.")
  console.log("Passwords are the value supplied through TRACK01_FIXTURE_PASSWORD and are not printed.")
}

if (process.argv[1]?.endsWith("bootstrap-track01-browser-fixtures.ts")) {
  void main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
