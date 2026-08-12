-- Global Capability Helper Function
create function public.current_user_has_global_capability(
  requested_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.project_memberships membership
      where membership.user_id = auth.uid()
        and membership.is_active
        and public.current_user_has_capability(
          membership.project_id, requested_capability
        )
    );
$$;

revoke all on function public.current_user_has_global_capability(text) from public;
grant execute on function public.current_user_has_global_capability(text) to authenticated;

-- Audit Trigger Function
create function public.audit_project_reference_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  before_row jsonb;
  after_row jsonb;
  target_project_id uuid;
  target_entity_id uuid;
begin
  before_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  target_project_id := coalesce(
    nullif(after_row ->> 'project_id', '')::uuid,
    nullif(before_row ->> 'project_id', '')::uuid
  );
  target_entity_id := coalesce(
    nullif(after_row ->> 'id', '')::uuid,
    nullif(before_row ->> 'id', '')::uuid
  );

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id,
    action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), tg_argv[0], target_entity_id,
    lower(tg_op), before_row, after_row
  );
  return coalesce(new, old);
end;
$$;

-- Device membership same project guard
create function public.assert_device_membership_same_project()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  membership_project_id uuid;
begin
  select project_id into membership_project_id
  from public.project_memberships
  where id = new.membership_id;

  if membership_project_id is distinct from new.project_id then
    raise exception 'Device user membership must belong to the same project'
      using errcode = '23503';
  end if;
  return new;
end;
$$;

-- Custom field definition guard
create function public.enforce_custom_field_definition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  existing_count integer;
begin
  if tg_op = 'UPDATE' and new.field_key is distinct from old.field_key then
    raise exception 'Custom field key cannot be changed'
      using errcode = '23514';
  end if;

  if new.status <> 'archived' then
    select count(*) into existing_count
    from public.project_custom_field_definitions field
    where field.project_id = new.project_id
      and field.scope = new.scope
      and field.status <> 'archived'
      and field.id <> coalesce(new.id, gen_random_uuid());

    if existing_count >= 3 then
      raise exception 'At most three custom fields are allowed per scope'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

-- Apply RLS and Audit to all Project Referential Tables
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
    execute format('alter table public.%I enable row level security', t);

    -- Drop old policies
    execute format('drop policy if exists %I on public.%I', t || '_read_policy', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_policy', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_policy', t);
    execute format('drop policy if exists %I on public.%I', t || ' capability read', t);
    execute format('drop policy if exists %I on public.%I', t || ' capability insert', t);
    execute format('drop policy if exists %I on public.%I', t || ' capability update', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated read ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'project admins write ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'project subcontractors respect scope', t);
    execute format('drop policy if exists %I on public.%I', 'project PDS areas respect scope', t);
    execute format('drop policy if exists %I on public.%I', 'project WPS respect subcontractor scope', t);
    execute format('drop policy if exists %I on public.%I', 'welder qualifications respect subcontractor scope', t);

    -- Select Policy with subcontractor/pds scope check when applicable
    if t = 'project_subcontractors' then
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.current_user_has_capability(project_id, %L) and public.current_user_in_subcontractor_scope(project_id, id))',
        t || ' capability read', t, 'project_referential.view'
      );
    elsif t = 'project_pds_areas' then
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.current_user_has_capability(project_id, %L) and public.current_user_in_pds_scope(project_id, id))',
        t || ' capability read', t, 'project_referential.view'
      );
    elsif t = 'project_welding_procedures' or t = 'welder_qualifications' then
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.current_user_has_capability(project_id, %L) and public.current_user_in_subcontractor_scope(project_id, subcontractor_id))',
        t || ' capability read', t, 'project_referential.view'
      );
    else
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.current_user_has_capability(project_id, %L))',
        t || ' capability read', t, 'project_referential.view'
      );
    end if;

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.current_user_has_capability(project_id, %L))',
      t || ' capability insert', t, 'project_referential.manage'
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.current_user_has_capability(project_id, %L)) with check (public.current_user_has_capability(project_id, %L))',
      t || ' capability update', t, 'project_referential.manage', 'project_referential.manage'
    );

    -- Grants handling: keep existing column-level restrictions for project_welding_procedures
    if t <> 'project_welding_procedures' then
      execute format('revoke all on public.%I from anon, authenticated', t);
      execute format('grant select, insert, update on public.%I to authenticated', t);
    end if;

    -- Attach audit trigger
    execute format('drop trigger if exists audit_%I_trigger on public.%I', t, t);
    execute format(
      'create trigger audit_%I_trigger after insert or update on public.%I for each row execute function public.audit_project_reference_change(%L)',
      t, t, t
    );
  end loop;
end;
$$;

-- Global Structured Rules RLS & Grants
alter table public.system_film_quantity_rules enable row level security;
alter table public.system_ut_calculation_rules enable row level security;

drop policy if exists "system_film_quantity_rules capability read" on public.system_film_quantity_rules;
create policy "system_film_quantity_rules capability read"
on public.system_film_quantity_rules for select to authenticated
using (public.current_user_has_global_capability('system_referential.view'));

drop policy if exists "system_ut_calculation_rules capability read" on public.system_ut_calculation_rules;
create policy "system_ut_calculation_rules capability read"
on public.system_ut_calculation_rules for select to authenticated
using (public.current_user_has_global_capability('system_referential.view'));

revoke all on public.system_film_quantity_rules from anon, authenticated;
grant select on public.system_film_quantity_rules to authenticated;

revoke all on public.system_ut_calculation_rules from anon, authenticated;
grant select on public.system_ut_calculation_rules to authenticated;

-- System reference entries policies replacement
drop policy if exists "authenticated users read system referentials" on public.system_reference_entries;
drop policy if exists "platform admins manage system referentials" on public.system_reference_entries;
drop policy if exists "system reference capability read" on public.system_reference_entries;
drop policy if exists "system reference capability insert" on public.system_reference_entries;
drop policy if exists "system reference capability update" on public.system_reference_entries;

create policy "system reference capability read"
on public.system_reference_entries for select to authenticated
using (public.current_user_has_global_capability('system_referential.view'));

create policy "system reference capability insert"
on public.system_reference_entries for insert to authenticated
with check (public.current_user_has_global_capability('system_referential.manage'));

create policy "system reference capability update"
on public.system_reference_entries for update to authenticated
using (public.current_user_has_global_capability('system_referential.manage'))
with check (public.current_user_has_global_capability('system_referential.manage'));

-- Triggers for invariants
drop trigger if exists assert_device_membership_same_project_trigger on public.project_device_users;
create trigger assert_device_membership_same_project_trigger
  before insert or update on public.project_device_users
  for each row execute function public.assert_device_membership_same_project();

drop trigger if exists enforce_custom_field_definition_trigger on public.project_custom_field_definitions;
create trigger enforce_custom_field_definition_trigger
  before insert or update on public.project_custom_field_definitions
  for each row execute function public.enforce_custom_field_definition();

-- Cross project guards triggers for foreign references
drop trigger if exists assert_pds_subcontractor_same_project_trigger on public.project_pds_areas;
create trigger assert_pds_subcontractor_same_project_trigger
  before insert or update on public.project_pds_areas
  for each row execute function public.assert_same_project_reference();

drop trigger if exists assert_ral_line_service_same_project_trigger on public.project_ral_codes;
create trigger assert_ral_line_service_same_project_trigger
  before insert or update on public.project_ral_codes
  for each row execute function public.assert_same_project_reference();

drop trigger if exists assert_paint_matrix_same_project_trigger on public.project_paint_matrix_rules;
create trigger assert_paint_matrix_same_project_trigger
  before insert or update on public.project_paint_matrix_rules
  for each row execute function public.assert_same_project_reference();

drop trigger if exists assert_spool_class_material_type_same_project_trigger on public.project_spooling_material_classes;
create trigger assert_spool_class_material_type_same_project_trigger
  before insert or update on public.project_spooling_material_classes
  for each row execute function public.assert_same_project_reference();

-- Progress Weight Command RPC
create function public.set_project_progress_weights(
  target_project_id uuid,
  target_phase text,
  weight_items jsonb
)
returns setof public.project_progress_weights
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_assembly_enabled boolean;
  item_rec record;
  total_weight numeric := 0;
  old_rows jsonb;
  new_rows_json jsonb;
begin
  if not public.current_user_has_capability(target_project_id, 'project_referential.manage') then
    raise exception 'Permission denied to manage project referentials'
      using errcode = '42501';
  end if;

  if target_phase not in ('prefabrication', 'painting', 'assembly', 'erection') then
    raise exception 'Invalid phase: %', target_phase
      using errcode = '23514';
  end if;

  if target_phase = 'assembly' then
    select enabled into is_assembly_enabled
    from public.project_assembly_settings
    where project_id = target_project_id;

    if not coalesce(is_assembly_enabled, false) then
      raise exception 'Assembly phase is not enabled for this project'
        using errcode = '23514';
    end if;
  end if;

  if jsonb_typeof(weight_items) <> 'array' then
    raise exception 'weight_items must be a JSON array'
      using errcode = '23514';
  end if;

  for item_rec in select * from jsonb_to_recordset(weight_items) as x(activity text, weight numeric) loop
    if length(trim(coalesce(item_rec.activity, ''))) = 0 then
      raise exception 'Activity code cannot be blank' using errcode = '23514';
    end if;
    if item_rec.weight < 0 or item_rec.weight > 100 then
      raise exception 'Weight must be between 0 and 100' using errcode = '23514';
    end if;
    total_weight := total_weight + item_rec.weight;
  end loop;

  if total_weight <> 100.0000 then
    raise exception 'Progress weights total must be exactly 100' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) into old_rows
  from public.project_progress_weights w
  where w.project_id = target_project_id and w.phase = target_phase and w.status = 'active';

  update public.project_progress_weights
  set status = 'archived', updated_at = timezone('utc', now())
  where project_id = target_project_id and phase = target_phase and status <> 'archived';

  insert into public.project_progress_weights (project_id, phase, activity, weight, status)
  select target_project_id, target_phase, entry.activity, entry.weight, 'active'
  from jsonb_to_recordset(weight_items) as entry(activity text, weight numeric);

  select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) into new_rows_json
  from public.project_progress_weights w
  where w.project_id = target_project_id and w.phase = target_phase and w.status = 'active';

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id,
    action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'project_progress_weights', target_project_id,
    'replace_progress_weights', old_rows, new_rows_json
  );

  return query
  select *
  from public.project_progress_weights
  where project_id = target_project_id and phase = target_phase and status = 'active'
  order by activity;
end;
$$;

revoke all on function public.set_project_progress_weights(uuid, text, jsonb) from public;
grant execute on function public.set_project_progress_weights(uuid, text, jsonb) to authenticated;

-- Setup Readiness RPC
create function public.get_project_setup_readiness(target_project_id uuid)
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
  if not public.current_user_has_capability(target_project_id, 'project_referential.view') then
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
grant execute on function public.get_project_setup_readiness(uuid) to authenticated;

-- Welder Qualification Save RPC
create function public.save_welder_qualification(
  target_project_id uuid,
  target_welder_id uuid default null,
  welder_payload jsonb default '{}'::jsonb,
  target_wps_ids uuid[] default array[]::uuid[]
)
returns public.welder_qualifications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_welder public.welder_qualifications;
  wps_id_item uuid;
  wps_count integer;
  sub_project_id uuid;
  old_welder jsonb;
begin
  if not public.current_user_has_capability(target_project_id, 'project_referential.manage') then
    raise exception 'Permission denied to manage welder qualifications'
      using errcode = '42501';
  end if;

  if array_length(target_wps_ids, 1) is null or array_length(target_wps_ids, 1) = 0 then
    raise exception 'At least one WPS is required for a welder qualification'
      using errcode = '23514';
  end if;

  select project_id into sub_project_id
  from public.project_subcontractors
  where id = (welder_payload ->> 'subcontractor_id')::uuid;

  if sub_project_id is distinct from target_project_id then
    raise exception 'Subcontractor must belong to the same project'
      using errcode = '23503';
  end if;

  select count(*) into wps_count
  from public.project_welding_procedures
  where id = any(target_wps_ids) and project_id = target_project_id;

  if wps_count <> array_length(target_wps_ids, 1) then
    raise exception 'All approved WPS records must belong to the same project'
      using errcode = '23503';
  end if;

  if target_welder_id is not null then
    select to_jsonb(w) into old_welder
    from public.welder_qualifications w where id = target_welder_id and project_id = target_project_id;
  end if;

  if target_welder_id is null then
    insert into public.welder_qualifications(
      project_id, welder_code, full_name, subcontractor_id,
      certificate_number, expires_on, status
    ) values (
      target_project_id,
      upper(trim(welder_payload ->> 'welder_code')),
      trim(welder_payload ->> 'full_name'),
      (welder_payload ->> 'subcontractor_id')::uuid,
      nullif(trim(welder_payload ->> 'certificate_number'), ''),
      (welder_payload ->> 'expires_on')::date,
      coalesce((welder_payload ->> 'status')::public.project_reference_status, 'active')
    )
    returning * into saved_welder;
  else
    update public.welder_qualifications
    set welder_code = upper(trim(welder_payload ->> 'welder_code')),
        full_name = trim(welder_payload ->> 'full_name'),
        subcontractor_id = (welder_payload ->> 'subcontractor_id')::uuid,
        certificate_number = nullif(trim(welder_payload ->> 'certificate_number'), ''),
        expires_on = (welder_payload ->> 'expires_on')::date,
        status = coalesce((welder_payload ->> 'status')::public.project_reference_status, status),
        updated_at = timezone('utc', now())
    where id = target_welder_id and project_id = target_project_id
    returning * into saved_welder;
  end if;

  delete from public.welder_wps_qualifications
  where welder_qualification_id = saved_welder.id;

  foreach wps_id_item in array target_wps_ids loop
    insert into public.welder_wps_qualifications(welder_qualification_id, wps_id)
    values (saved_welder.id, wps_id_item);
  end loop;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id,
    action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'welder_qualifications', saved_welder.id,
    case when target_welder_id is null then 'insert' else 'update' end,
    old_welder,
    jsonb_build_object('welder', to_jsonb(saved_welder), 'wps_ids', to_jsonb(target_wps_ids))
  );

  return saved_welder;
end;
$$;

revoke all on function public.save_welder_qualification(uuid, uuid, jsonb, uuid[]) from public;
grant execute on function public.save_welder_qualification(uuid, uuid, jsonb, uuid[]) to authenticated;
