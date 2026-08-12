import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  ProjectTeam,
  ProjectTeamInput,
  ProjectSystem,
  ProjectSystemInput,
  ProjectSubsystem,
  ProjectSubsystemInput,
  LineService,
  LocationCategory,
  LocationCategoryInput,
  Location,
  LocationInput,
  PressureUnit,
  UnitTimeReference,
  UnitTimeReferenceInput,
  PunchCode,
  PunchCodeInput,
} from "../domain/execution-reference"
import {
  validateLocationCapacity,
  validateLocationInput,
  validatePunchCodeInput,
  validateUnitTimeReferenceInput,
} from "../domain/execution-reference"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"
import { normalizeReferenceCode, type ReferenceStatus } from "../domain/reference"

export interface LoadedExecutionReferences {
  teams: ProjectTeam[]
  systems: ProjectSystem[]
  subsystems: ProjectSubsystem[]
  lineServices: LineService[]
  locationCategories: LocationCategory[]
  locations: Location[]
  pressureUnit: PressureUnit | null
  unitTimeReferences: UnitTimeReference[]
  punchCodes: PunchCode[]
}

export async function loadExecutionReferences(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<LoadedExecutionReferences> {
  const [teamsRes, sysRes, subRes, lineRes, catRes, locRes, pressRes, utRes, punchRes] = await Promise.all([
    client
      .from("project_teams")
      .select("id, project_id, code, description, team_type, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_systems")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_subsystems")
      .select("id, project_id, system_id, code, description, status, project_systems(code)")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_line_services")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_location_categories")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_locations")
      .select("id, project_id, category_id, code, description, mapped_progress_columns, capacity, status, project_location_categories(code)")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_pressure_units")
      .select("project_id, unit")
      .eq("project_id", projectId)
      .maybeSingle(),
    client
      .from("project_unit_time_references")
      .select("id, project_id, activity, project_ut, standard_reference, status")
      .eq("project_id", projectId)
      .order("activity", { ascending: true }),
    client
      .from("project_punch_codes")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
  ])

  if (teamsRes.error) throw new Error(mapSupabaseReferenceError(teamsRes.error))
  if (sysRes.error) throw new Error(mapSupabaseReferenceError(sysRes.error))
  if (subRes.error) throw new Error(mapSupabaseReferenceError(subRes.error))
  if (lineRes.error) throw new Error(mapSupabaseReferenceError(lineRes.error))
  if (catRes.error) throw new Error(mapSupabaseReferenceError(catRes.error))
  if (locRes.error) throw new Error(mapSupabaseReferenceError(locRes.error))
  if (pressRes.error) throw new Error(mapSupabaseReferenceError(pressRes.error))
  if (utRes.error) throw new Error(mapSupabaseReferenceError(utRes.error))
  if (punchRes.error) throw new Error(mapSupabaseReferenceError(punchRes.error))

  const teams: ProjectTeam[] = (teamsRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    teamType: row.team_type as ProjectTeam["teamType"],
    status: row.status,
  }))

  const systems: ProjectSystem[] = (sysRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const subsystems: ProjectSubsystem[] = (subRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    systemId: row.system_id,
    systemCode: row.project_systems?.code,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const lineServices: LineService[] = (lineRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const locationCategories: LocationCategory[] = (catRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const locations: Location[] = (locRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    categoryId: row.category_id,
    categoryCode: row.project_location_categories?.code,
    code: row.code,
    description: row.description,
    mappedProgressColumns: Array.isArray(row.mapped_progress_columns)
      ? row.mapped_progress_columns.filter((value): value is string => typeof value === "string")
      : [],
    capacity: row.capacity,
    status: row.status,
  }))

  const pressureUnit: PressureUnit | null = pressRes.data
    ? {
        projectId: pressRes.data.project_id,
        unit: pressRes.data.unit as PressureUnit["unit"],
      }
    : null

  const unitTimeReferences: UnitTimeReference[] = (utRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    activity: row.activity,
    projectUt: Number(row.project_ut),
    standardReference: row.standard_reference,
    status: row.status,
  }))

  const punchCodes: PunchCode[] = (punchRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  return {
    teams,
    systems,
    subsystems,
    lineServices,
    locationCategories,
    locations,
    pressureUnit,
    unitTimeReferences,
    punchCodes,
  }
}

export async function createLocation(
  client: SupabaseClient<Database>,
  projectId: string,
  input: LocationInput,
): Promise<Location> {
  const validation = validateLocationInput(input)
  if (!validation.ok) throw new Error(Object.values(validation.errors)[0] ?? "Invalid location")

  const { data, error } = await client
    .from("project_locations")
    .insert({
      project_id: projectId,
      category_id: validation.value.categoryId,
      code: normalizeReferenceCode(validation.value.code),
      description: validation.value.description.trim(),
      mapped_progress_columns: validation.value.mappedProgressColumns,
      capacity: validation.value.capacity,
    })
    .select("id, project_id, category_id, code, description, mapped_progress_columns, capacity, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))
  return {
    id: data.id,
    projectId: data.project_id,
    categoryId: data.category_id,
    code: data.code,
    description: data.description,
    mappedProgressColumns: Array.isArray(data.mapped_progress_columns)
      ? data.mapped_progress_columns.filter((value): value is string => typeof value === "string")
      : [],
    capacity: data.capacity,
    status: data.status,
  }
}

export async function createLocationCategory(
  client: SupabaseClient<Database>,
  projectId: string,
  input: LocationCategoryInput,
): Promise<LocationCategory> {
  const { data, error } = await client
    .from("project_location_categories")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
    })
    .select("id, project_id, code, description, status")
    .single()
  if (error) throw new Error(mapSupabaseReferenceError(error))
  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    status: data.status,
  }
}

export async function updateLocationCapacity(
  client: SupabaseClient<Database>,
  projectId: string,
  locationId: string,
  capacity: number,
): Promise<void> {
  const validation = validateLocationCapacity(capacity)
  if (!validation.ok) throw new Error(validation.errors.capacity)
  const { error } = await client
    .from("project_locations")
    .update({ capacity: validation.value.capacity })
    .eq("id", locationId)
    .eq("project_id", projectId)
  if (error) throw new Error(mapSupabaseReferenceError(error))
}

export async function createPunchCode(
  client: SupabaseClient<Database>,
  projectId: string,
  input: PunchCodeInput,
): Promise<PunchCode> {
  const validation = validatePunchCodeInput(input)
  if (!validation.ok) {
    throw new Error(Object.values(validation.errors)[0] ?? "Invalid punch code")
  }

  const { data, error } = await client
    .from("project_punch_codes")
    .insert({
      project_id: projectId,
      code: validation.value.code,
      description: validation.value.description,
    })
    .select("id, project_id, code, description, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    status: data.status,
  }
}

export async function setPunchCodeStatus(
  client: SupabaseClient<Database>,
  projectId: string,
  punchCodeId: string,
  status: ReferenceStatus,
): Promise<void> {
  const { error } = await client
    .from("project_punch_codes")
    .update({ status })
    .eq("id", punchCodeId)
    .eq("project_id", projectId)
  if (error) throw new Error(mapSupabaseReferenceError(error))
}

export async function createProjectTeam(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ProjectTeamInput
): Promise<ProjectTeam> {
  const { data, error } = await client
    .from("project_teams")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
      team_type: input.teamType,
    })
    .select("id, project_id, code, description, team_type, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    teamType: data.team_type as ProjectTeam["teamType"],
    status: data.status,
  }
}

export async function createProjectSystem(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ProjectSystemInput
): Promise<ProjectSystem> {
  const { data, error } = await client
    .from("project_systems")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
    })
    .select("id, project_id, code, description, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    status: data.status,
  }
}

export async function createProjectSubsystem(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ProjectSubsystemInput
): Promise<ProjectSubsystem> {
  const { data, error } = await client
    .from("project_subsystems")
    .insert({
      project_id: projectId,
      system_id: input.systemId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
    })
    .select("id, project_id, system_id, code, description, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    systemId: data.system_id,
    code: data.code,
    description: data.description,
    status: data.status,
  }
}

export async function createUnitTimeReference(
  client: SupabaseClient<Database>,
  projectId: string,
  input: UnitTimeReferenceInput
): Promise<UnitTimeReference> {
  const validation = validateUnitTimeReferenceInput(input)
  if (!validation.ok) {
    throw new Error(Object.values(validation.errors)[0] ?? "Invalid unit time reference")
  }

  const { data, error } = await client
    .from("project_unit_time_references")
    .insert({
      project_id: projectId,
      activity: validation.value.activity,
      project_ut: validation.value.projectUt,
      standard_reference: validation.value.standardReference,
    })
    .select("id, project_id, activity, project_ut, standard_reference, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    activity: data.activity,
    projectUt: Number(data.project_ut),
    standardReference: data.standard_reference,
    status: data.status,
  }
}
