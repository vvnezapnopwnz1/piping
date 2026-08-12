-- Additive migration: Security hardening & policy cleanup (A1, A2, Legacy RLS Policy Drop)

-- ========================================================
-- 1. A1 FIX: PROFILE EMAIL HIJACKING PREVENTION
-- ========================================================

-- Revoke UPDATE on profiles.email from authenticated role (only full_name can be updated)
revoke update (email) on public.profiles from authenticated;

-- Create unique index on lower(email) in profiles
create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email))
  where email is not null;

-- Update add_project_member_by_email to resolve user by auth.users.email (immune to profile spoofing)
create or replace function public.add_project_member_by_email(
  target_project_id uuid,
  target_email text,
  requested_access_role text,
  requested_functional_roles text[],
  requested_subcontractor_ids uuid[],
  requested_pds_area_ids uuid[]
)
returns setof public.project_memberships
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
  target_user_ids uuid[];
  created_membership public.project_memberships;
  functional_roles text[] := array(select distinct value from unnest(coalesce(requested_functional_roles, array[]::text[])) value order by value);
  subcontractor_ids uuid[] := array(select distinct value from unnest(coalesce(requested_subcontractor_ids, array[]::uuid[])) value order by value);
  pds_area_ids uuid[] := array(select distinct value from unnest(coalesce(requested_pds_area_ids, array[]::uuid[])) value order by value);
begin
  if not public.current_user_has_capability(target_project_id, 'access_rights.manage') then
    raise exception 'Access rights management is required' using errcode = '42501';
  end if;

  -- Resolve user strictly against auth.users.email
  select array_agg(u.id order by u.id) into target_user_ids
  from auth.users u
  where lower(u.email) = lower(trim(target_email));

  if coalesce(cardinality(target_user_ids), 0) <> 1 then
    raise exception 'Profile email was not found or is ambiguous' using errcode = 'PQC01';
  end if;

  target_user_id := target_user_ids[1];

  if exists (select 1 from public.project_memberships where project_id = target_project_id and user_id = target_user_id) then
    raise exception 'Profile is already a project member' using errcode = '23505';
  end if;

  perform public.assert_access_request_is_valid(target_project_id, requested_access_role, functional_roles, subcontractor_ids, pds_area_ids);

  insert into public.project_memberships (project_id, user_id, role, access_role_code)
  values (target_project_id, target_user_id, public.compatibility_membership_role(requested_access_role, functional_roles), requested_access_role)
  returning * into created_membership;

  insert into public.project_membership_functional_roles (membership_id, role_code)
  select created_membership.id, value from unnest(functional_roles) value;

  if requested_access_role = 'subcontractor' then
    insert into public.membership_subcontractor_scopes (membership_id, subcontractor_id)
    select created_membership.id, value from unnest(subcontractor_ids) value;

    insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
    select created_membership.id, value from unnest(pds_area_ids) value;
  end if;

  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (target_project_id, auth.uid(), 'project_membership', created_membership.id, 'membership.created', null, public.membership_access_state(created_membership.id));

  return next created_membership;
end;
$$;


-- ========================================================
-- 2. A2 FIX: REVOKE TRUNCATE/TRIGGER ON ACCESS TABLES
-- ========================================================

revoke all on public.project_memberships,
  public.project_membership_functional_roles,
  public.membership_subcontractor_scopes,
  public.membership_pds_area_scopes
from anon, authenticated;

grant select on public.project_memberships,
  public.project_membership_functional_roles,
  public.membership_subcontractor_scopes,
  public.membership_pds_area_scopes
to authenticated;


-- ========================================================
-- 3. LEGACY PERMISSIVE RLS POLICY CLEANUP
-- ========================================================

do $$
declare
  t text;
  project_tables text[] := array[
    'project_subcontractors',
    'project_units',
    'project_area_classifications',
    'project_pds_areas',
    'project_teams',
    'project_systems',
    'project_subsystems',
    'project_line_services',
    'project_service_classes',
    'project_weld_types',
    'project_welding_procedures',
    'welder_qualifications',
    'nde_matrix_rules',
    'project_rework_codes',
    'project_thickness_flange_rules',
    'piping_material_records',
    'project_joint_categories',
    'project_unit_time_references',
    'project_location_categories',
    'project_locations',
    'project_pressure_units',
    'project_progress_weights',
    'project_custom_field_definitions',
    'project_devices',
    'project_device_users',
    'project_spooling_material_types',
    'project_spooling_material_classes',
    'project_spooling_checklist_items',
    'project_ral_codes',
    'project_paint_matrix_rules',
    'project_assembly_settings'
  ];
begin
  foreach t in array project_tables loop
    execute format('drop policy if exists %I on public.%I', t || '_members_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admins_write', t);
  end loop;
end;
$$;
