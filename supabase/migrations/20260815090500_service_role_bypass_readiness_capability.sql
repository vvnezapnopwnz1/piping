-- get_project_setup_readiness gates on current_user_has_capability(target_project_id,
-- 'project_referential.view'), which decides access through auth.uid() and is_platform_admin().
-- Neither means anything for a raw service_role call (no signed-in user, no JWT sub), so the
-- function rejects Track 12's demo:prepare preflight with "Permission denied to view project
-- setup readiness" even though service_role already bypasses RLS on every table this function
-- reads directly. This adds a service_role bypass scoped to this one function only -- it does not
-- change current_user_has_capability itself, so no other RPC or policy is affected.

create or replace function public.get_project_setup_readiness(target_project_id uuid)
returns table (
  ready_for_import boolean,
  admin_complete boolean,
  missing_codes text[]
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  missing text[] := array[]::text[];
  is_assembly_enabled boolean;
  has_materials boolean;
  has_subs boolean;
  has_pds boolean;
  has_svc boolean;
  has_weld_types boolean;
  has_wps boolean;
  has_welders boolean;
  has_nde_shop boolean;
  has_nde_assembly boolean;
  has_nde_field boolean;
  has_thick boolean;
  has_pml boolean;
  has_teams boolean;
  has_systems boolean;
  has_subsystems boolean;
  has_line_services boolean;
  has_locations boolean;
  has_pressure boolean;
  has_pw_pref boolean;
  has_pw_paint boolean;
  has_pw_assembly boolean;
  has_pw_erection boolean;
  has_spool_mat_types boolean;
  has_spool_mat_classes boolean;
  has_spool_checklist boolean;
  has_ral boolean;
  has_paint_matrix boolean;
  has_devices boolean;

  is_gate_b_ready boolean;
  is_admin_done boolean;
begin
  if not (
    auth.role() = 'service_role'
    or public.current_user_has_capability(target_project_id, 'project_referential.view')
  ) then
    raise exception 'Permission denied to view project setup readiness'
      using errcode = '42501';
  end if;

  select coalesce(enabled, false) into is_assembly_enabled
  from public.project_assembly_settings
  where project_id = target_project_id;

  select exists (select 1 from public.system_reference_entries where kind = 'material_type' and status = 'active') into has_materials;
  select exists (select 1 from public.project_subcontractors where project_id = target_project_id and status = 'active') into has_subs;
  select exists (select 1 from public.project_pds_areas where project_id = target_project_id and status = 'active') into has_pds;
  select exists (select 1 from public.project_service_classes where project_id = target_project_id and status = 'active') into has_svc;
  select exists (select 1 from public.project_weld_types where project_id = target_project_id and status = 'active') into has_weld_types;
  select exists (select 1 from public.project_welding_procedures where project_id = target_project_id and status = 'active') into has_wps;
  select exists (select 1 from public.welder_qualifications where project_id = target_project_id and status = 'active') into has_welders;
  select exists (select 1 from public.nde_matrix_rules where project_id = target_project_id and weld_location = 'shop' and status = 'active') into has_nde_shop;
  select exists (select 1 from public.nde_matrix_rules where project_id = target_project_id and weld_location = 'assembly' and status = 'active') into has_nde_assembly;
  select exists (select 1 from public.nde_matrix_rules where project_id = target_project_id and weld_location = 'field' and status = 'active') into has_nde_field;
  select exists (select 1 from public.project_thickness_flange_rules where project_id = target_project_id and status = 'active') into has_thick;
  select exists (select 1 from public.piping_material_records where project_id = target_project_id and status = 'active') into has_pml;

  select exists (select 1 from public.project_teams where project_id = target_project_id and status = 'active') into has_teams;
  select exists (select 1 from public.project_systems where project_id = target_project_id and status = 'active') into has_systems;
  select exists (select 1 from public.project_subsystems where project_id = target_project_id and status = 'active') into has_subsystems;
  select exists (select 1 from public.project_line_services where project_id = target_project_id and status = 'active') into has_line_services;
  select exists (select 1 from public.project_locations where project_id = target_project_id and status = 'active') into has_locations;
  select exists (select 1 from public.project_pressure_units where project_id = target_project_id) into has_pressure;
  select (coalesce(sum(weight), 0) = 100.0000) from public.project_progress_weights where project_id = target_project_id and phase = 'prefabrication' and status = 'active' into has_pw_pref;
  select (coalesce(sum(weight), 0) = 100.0000) from public.project_progress_weights where project_id = target_project_id and phase = 'painting' and status = 'active' into has_pw_paint;
  select (coalesce(sum(weight), 0) = 100.0000) from public.project_progress_weights where project_id = target_project_id and phase = 'assembly' and status = 'active' into has_pw_assembly;
  select (coalesce(sum(weight), 0) = 100.0000) from public.project_progress_weights where project_id = target_project_id and phase = 'erection' and status = 'active' into has_pw_erection;
  select exists (select 1 from public.project_spooling_material_types where project_id = target_project_id and status = 'active') into has_spool_mat_types;
  select exists (select 1 from public.project_spooling_material_classes where project_id = target_project_id and status = 'active') into has_spool_mat_classes;
  select exists (select 1 from public.project_spooling_checklist_items where project_id = target_project_id and status = 'active') into has_spool_checklist;
  select exists (select 1 from public.project_ral_codes where project_id = target_project_id and status = 'active') into has_ral;
  select exists (select 1 from public.project_paint_matrix_rules where project_id = target_project_id and status = 'active') into has_paint_matrix;
  select exists (select 1 from public.project_devices where project_id = target_project_id and status = 'active') into has_devices;

  if not has_materials then missing := array_append(missing, 'material_types'); end if;
  if not has_subs then missing := array_append(missing, 'subcontractors'); end if;
  if not has_pds then missing := array_append(missing, 'pds_areas'); end if;
  if not has_svc then missing := array_append(missing, 'service_classes'); end if;
  if not has_weld_types then missing := array_append(missing, 'weld_types'); end if;
  if not has_wps then missing := array_append(missing, 'welding_procedures'); end if;
  if not has_welders then missing := array_append(missing, 'welder_qualifications'); end if;
  if not has_nde_shop then missing := array_append(missing, 'nde_matrix_shop'); end if;
  if is_assembly_enabled and not has_nde_assembly then missing := array_append(missing, 'nde_matrix_assembly'); end if;
  if not has_nde_field then missing := array_append(missing, 'nde_matrix_field'); end if;
  if not has_thick then missing := array_append(missing, 'thickness_flange_rules'); end if;
  if not has_pml then missing := array_append(missing, 'piping_material_records'); end if;

  is_gate_b_ready := (coalesce(array_length(missing, 1), 0) = 0);

  if not has_teams then missing := array_append(missing, 'teams'); end if;
  if not has_systems then missing := array_append(missing, 'systems'); end if;
  if not has_subsystems then missing := array_append(missing, 'subsystems'); end if;
  if not has_line_services then missing := array_append(missing, 'line_services'); end if;
  if not has_locations then missing := array_append(missing, 'locations'); end if;
  if not has_pressure then missing := array_append(missing, 'pressure_unit'); end if;
  if not has_pw_pref then missing := array_append(missing, 'progress_weights_prefabrication'); end if;
  if not has_pw_paint then missing := array_append(missing, 'progress_weights_painting'); end if;
  if is_assembly_enabled and not has_pw_assembly then missing := array_append(missing, 'progress_weights_assembly'); end if;
  if not has_pw_erection then missing := array_append(missing, 'progress_weights_erection'); end if;
  if not has_spool_mat_types then missing := array_append(missing, 'spooling_material_types'); end if;
  if not has_spool_mat_classes then missing := array_append(missing, 'spooling_material_classes'); end if;
  if not has_spool_checklist then missing := array_append(missing, 'spooling_checklist'); end if;
  if not has_ral then missing := array_append(missing, 'ral_codes'); end if;
  if not has_paint_matrix then missing := array_append(missing, 'paint_matrix'); end if;
  if not has_devices then missing := array_append(missing, 'devices'); end if;

  is_admin_done := (coalesce(array_length(missing, 1), 0) = 0);

  return query select is_gate_b_ready, is_admin_done, missing;
end;
$$;

revoke all on function public.get_project_setup_readiness(uuid) from public;
grant execute on function public.get_project_setup_readiness(uuid) to authenticated, service_role;
