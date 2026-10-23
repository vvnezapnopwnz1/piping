-- A new project starts with no referentials, and spooling cannot be imported until about twenty of them are
-- filled. Copy the referentials of an existing project (an example, or an earlier project of the same customer)
-- into the new one in one command.
--
-- Only the referentials: the tables that hold the project's codes, rules and procedures. No spools, welds or
-- progress, no memberships, no devices assigned to people. Every row gets a new id; a reference from one copied
-- row to another is pointed at the copy, a reference to a system entry stays as it is.
--
-- The command is security definer because some referential tables take no direct insert from a user
-- (project_welding_procedures), so the access check is made here: manage on the target, view on the source.
--
-- Test: 139_copy_project_references.test.sql.

create function public.copy_project_references(source_project_id uuid, target_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- Parents before the tables that point at them.
  copy_order constant text[] := array[
    'project_subcontractors', 'project_units', 'project_weld_types', 'project_line_services',
    'project_location_categories', 'project_systems', 'project_teams', 'project_punch_codes',
    'project_rework_codes', 'project_unit_time_references', 'project_pressure_units',
    'project_spooling_material_types', 'project_spooling_checklist_items', 'piping_material_records',
    'project_assembly_settings', 'project_devices', 'project_area_classifications', 'project_pds_areas',
    'project_service_classes', 'project_welding_procedures', 'welder_qualifications',
    'project_thickness_flange_rules', 'nde_matrix_rules', 'project_subsystems', 'project_locations',
    'project_spooling_material_classes', 'project_ral_codes', 'project_paint_matrix_rules',
    'project_joint_categories', 'project_progress_weights'
  ];
  ref_table text;
  rel regclass;
  has_id boolean;
  column_list text;
  select_list text;
  existing bigint;
  copied integer;
  total integer := 0;
begin
  if source_project_id = target_project_id then
    raise exception 'A project cannot copy its own referentials' using errcode = '23514';
  end if;
  if not public.current_user_has_capability(target_project_id, 'project_referential.manage')
     or not public.current_user_has_capability(source_project_id, 'project_referential.view') then
    raise exception 'Permission denied to copy project referentials' using errcode = '42501';
  end if;

  foreach ref_table in array copy_order loop
    execute format('select count(*) from public.%I where project_id = $1', ref_table)
      into existing using target_project_id;
    if existing > 0 then
      raise exception 'The target project already has referentials (%)', ref_table using errcode = '23514';
    end if;
  end loop;

  create temporary table if not exists ref_copy_map (
    table_name text not null,
    old_id uuid not null,
    new_id uuid not null,
    primary key (table_name, old_id)
  ) on commit drop;
  truncate ref_copy_map;

  foreach ref_table in array copy_order loop
    rel := format('public.%I', ref_table)::regclass;
    has_id := exists (
      select 1 from pg_attribute where attrelid = rel and attname = 'id' and not attisdropped
    );

    select string_agg(format('%I', a.attname), ', ' order by a.attnum),
           string_agg(
             case
               when a.attname = 'id' then 'm.new_id'
               when a.attname = 'project_id' then '$2'
               when f.parent_table is not null then format(
                 '(select r.new_id from ref_copy_map r where r.table_name = %L and r.old_id = s.%I)',
                 f.parent_table, a.attname)
               else format('s.%I', a.attname)
             end, ', ' order by a.attnum)
    into column_list, select_list
    from pg_attribute a
    left join (
      select c.conkey[1] as attnum, c.confrelid::regclass::text as parent_table
      from pg_constraint c
      where c.conrelid = rel and c.contype = 'f' and cardinality(c.conkey) = 1
        and c.confrelid::regclass::text = any (copy_order)
    ) f on f.attnum = a.attnum
    where a.attrelid = rel and a.attnum > 0 and not a.attisdropped
      and a.attname not in ('created_at', 'updated_at');

    if has_id then
      execute format(
        'insert into ref_copy_map select %L, s.id, gen_random_uuid() from public.%I s where s.project_id = $1',
        ref_table, ref_table) using source_project_id;
      execute format(
        'insert into public.%I (%s) select %s from public.%I s join ref_copy_map m on m.table_name = %L and m.old_id = s.id where s.project_id = $1',
        ref_table, column_list, select_list, ref_table, ref_table) using source_project_id, target_project_id;
    else
      execute format(
        'insert into public.%I (%s) select %s from public.%I s where s.project_id = $1',
        ref_table, column_list, select_list, ref_table) using source_project_id, target_project_id;
    end if;
    get diagnostics copied = row_count;
    total := total + copied;
  end loop;

  -- The one referential table with no project_id: its rows follow the welder and the procedure they join.
  insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
  select welder.new_id, wps.new_id
  from public.welder_wps_qualifications q
  join ref_copy_map welder on welder.table_name = 'welder_qualifications' and welder.old_id = q.welder_qualification_id
  join ref_copy_map wps on wps.table_name = 'project_welding_procedures' and wps.old_id = q.wps_id;
  get diagnostics copied = row_count;
  total := total + copied;

  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (target_project_id, auth.uid(), 'project_references', target_project_id, 'copy_project_references',
          '{}'::jsonb, jsonb_build_object('source_project_id', source_project_id, 'rows', total));

  return total;
end;
$$;

revoke all on function public.copy_project_references(uuid, uuid) from public;
grant execute on function public.copy_project_references(uuid, uuid) to authenticated;
