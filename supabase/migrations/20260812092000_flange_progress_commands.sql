-- Track 09: the single server-side write path for manual flange progress.
-- Imports and revision copies call the same invariant routine in later migrations.

create or replace function public.record_flange_progress_invariant(
  target_project_id uuid,
  target_flange_joint_revision_id uuid,
  target_joint_category_id uuid,
  target_torquing_requirement_id uuid,
  target_jointing_value numeric,
  target_joint_date date,
  target_report_number text,
  target_tag_number text,
  target_jointer_ids uuid[],
  target_source_kind public.flange_progress_source default 'manual',
  target_source_import_job_id uuid default null,
  target_source_revision_progress_copy_id uuid default null,
  target_replaces_progress_id uuid default null,
  target_actor_id uuid default null
)
returns public.flange_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  revision_row public.flange_joint_revisions;
  revision_project_id uuid;
  category_row public.project_joint_categories;
  requirement_row public.system_reference_entries;
  unit_row public.project_unit_time_references;
  ut_rule public.system_ut_calculation_rules;
  effective_row public.flange_progress_records;
  record_row public.flange_progress_records;
  jointer_row public.project_teams;
  jointer_id uuid;
  normalized_rating text;
  ut_quantity numeric;
  ut_diameter numeric;
  ut_rating numeric;
  ut_punch numeric;
  calculated numeric;
  source_snapshot public.flange_progress_records;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(target_project_id::text || ':' || target_flange_joint_revision_id::text, 0)
  );

  select fjr.* into revision_row
  from public.flange_joint_revisions fjr
  where fjr.id = target_flange_joint_revision_id;
  if revision_row.id is null then
    raise exception 'Flange joint revision is missing' using errcode = 'PQC71';
  end if;

  select iso.project_id into revision_project_id
  from public.spool_revisions sr
  join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = ir.isometric_id
  where sr.id = revision_row.spool_revision_id;
  if revision_project_id is distinct from target_project_id then
    raise exception 'Flange joint revision is outside the target project' using errcode = 'PQC71';
  end if;
  if not exists (
    select 1
    from public.spool_revisions sr
    join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
    where sr.id = revision_row.spool_revision_id
      and ir.status = 'accepted'
      and not sr.is_removed
  ) or revision_row.is_removed then
    raise exception 'Flange joint revision is not current' using errcode = 'PQC72';
  end if;

  if coalesce(target_jointing_value, 0) <= 0
     or target_joint_date is null
     or target_joint_date > current_date
     or coalesce(trim(target_report_number), '') = ''
     or coalesce(trim(target_tag_number), '') = '' then
    raise exception 'Invalid flange progress fields' using errcode = 'PQC74';
  end if;
  if target_source_kind = 'revision_copy' and target_source_revision_progress_copy_id is null then
    raise exception 'Revision copy provenance is required' using errcode = 'PQC78';
  end if;

  select * into category_row
  from public.project_joint_categories
  where id = target_joint_category_id;
  if category_row.id is null or category_row.project_id <> target_project_id or category_row.status <> 'active' then
    raise exception 'Joint category is missing, inactive or outside the project' using errcode = 'PQC73';
  end if;

  select * into requirement_row
  from public.system_reference_entries
  where id = target_torquing_requirement_id
    and kind = 'torquing_requirement';
  if requirement_row.id is null or requirement_row.status <> 'active' then
    raise exception 'Torquing requirement is missing or inactive' using errcode = 'PQC73';
  end if;

  select * into unit_row
  from public.project_unit_time_references
  where project_id = target_project_id
    and activity = 'FLANGE_JOINTING'
    and status = 'active';
  if unit_row.id is null then
    raise exception 'Flange jointing unit time is not configured' using errcode = 'PQC73';
  end if;

  if target_jointer_ids is null or coalesce(array_length(target_jointer_ids, 1), 0) = 0
     or exists (
       select 1 from unnest(target_jointer_ids) ids
       group by ids having count(*) > 1
     ) then
    raise exception 'At least one unique jointer is required' using errcode = 'PQC75';
  end if;
  foreach jointer_id in array target_jointer_ids loop
    select * into jointer_row
    from public.project_teams
    where id = jointer_id
      and project_id = target_project_id
      and team_type = 'jointer'
      and status = 'active';
    if jointer_row.id is null then
      raise exception 'Jointer is missing, inactive or outside the project' using errcode = 'PQC75';
    end if;
  end loop;

  select * into effective_row
  from public.flange_progress_records
  where flange_joint_revision_id = target_flange_joint_revision_id
    and superseded_at is null
  for update;
  if effective_row.id is not null then
    if target_replaces_progress_id is null or target_replaces_progress_id <> effective_row.id then
      raise exception 'Effective flange progress already exists; provide its id for correction' using errcode = 'PQC76';
    end if;
  elsif target_replaces_progress_id is not null then
    raise exception 'The correction target is stale or no longer effective' using errcode = 'PQC76';
  end if;

  if target_source_kind = 'revision_copy' then
    select source.* into source_snapshot
    from public.revision_progress_copies copy_row
    join public.revision_change_items item on item.id = copy_row.change_item_id
    join public.flange_joint_revisions source_revision
      on source_revision.flange_joint_id = item.entity_id
     and source_revision.spool_revision_id = copy_row.source_spool_revision_id
    join public.flange_progress_records source
      on source.flange_joint_revision_id = source_revision.id
     and source.superseded_at is null
    where copy_row.id = target_source_revision_progress_copy_id;
    if source_snapshot.id is null then
      raise exception 'Revision copy source snapshot is missing' using errcode = 'PQC78';
    end if;
    ut_quantity := source_snapshot.ut_project_quantity;
    ut_diameter := source_snapshot.ut_coefficient_diameter;
    ut_rating := source_snapshot.ut_coefficient_rating;
    ut_punch := source_snapshot.ut_coefficient_punch;
    calculated := source_snapshot.calculated_ut;
  else
    normalized_rating := nullif(upper(btrim(revision_row.flange_rating)), '');
    select * into ut_rule
    from public.system_ut_calculation_rules rule
    where revision_row.diameter_inch between rule.diameter_from_inch and rule.diameter_to_inch
      and (rule.flange_rating is null or upper(btrim(rule.flange_rating)) = normalized_rating)
    order by (rule.flange_rating is null), rule.id
    limit 1;
    if ut_rule.id is not null and unit_row.project_ut > 0 and category_row.coefficient is not null then
      ut_quantity := unit_row.project_ut;
      ut_diameter := ut_rule.coefficient_diameter;
      ut_rating := ut_rule.coefficient_rating;
      ut_punch := category_row.coefficient;
      calculated := ut_quantity * ut_diameter * ut_rating * ut_punch;
    end if;
  end if;

  if effective_row.id is not null then
    perform set_config('pipeqc.flange_progress_command', 'on', true);
    update public.flange_progress_records
    set superseded_at = timezone('utc', now())
    where id = effective_row.id;
  end if;

  insert into public.flange_progress_records (
    project_id, flange_joint_revision_id, joint_category_id, torquing_requirement_id,
    jointing_method_snapshot, jointing_value, joint_date, report_number, tag_number,
    source_kind, source_import_job_id, source_revision_progress_copy_id,
    supersedes_record_id, ut_project_quantity, ut_coefficient_diameter,
    ut_coefficient_rating, ut_coefficient_punch, calculated_ut, recorded_by
  ) values (
    target_project_id, target_flange_joint_revision_id, target_joint_category_id,
    target_torquing_requirement_id, requirement_row.code, target_jointing_value,
    target_joint_date, btrim(target_report_number), btrim(target_tag_number),
    target_source_kind, target_source_import_job_id, target_source_revision_progress_copy_id,
    effective_row.id, ut_quantity, ut_diameter, ut_rating, ut_punch, calculated,
    coalesce(target_actor_id, auth.uid())
  ) returning * into record_row;

  foreach jointer_id in array target_jointer_ids loop
    select * into jointer_row from public.project_teams where id = jointer_id;
    insert into public.flange_jointer_assignments (
      progress_record_id, jointer_team_id, jointer_code_snapshot, jointer_name_snapshot
    ) values (record_row.id, jointer_row.id, jointer_row.code, jointer_row.description);
  end loop;
  return record_row;
end;
$$;

create or replace function public.record_flange_progress(
  target_project_id uuid,
  target_flange_joint_revision_id uuid,
  target_joint_category_id uuid,
  target_torquing_requirement_id uuid,
  target_jointing_value numeric,
  target_joint_date date,
  target_report_number text,
  target_tag_number text,
  target_jointer_ids uuid[],
  target_idempotency_key text,
  target_replaces_progress_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claim jsonb;
  record_row public.flange_progress_records;
begin
  if not public.current_user_has_capability(target_project_id, 'flange.manage') then
    raise exception 'Flange progress management is required' using errcode = 'PQC70';
  end if;
  if not public.current_user_in_pds_scope(target_project_id, (
    select ir.pds_area_id
    from public.flange_joint_revisions fjr
    join public.spool_revisions sr on sr.id = fjr.spool_revision_id
    join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
    where fjr.id = target_flange_joint_revision_id
  )) then
    raise exception 'Flange progress is outside your PDS scope' using errcode = 'PQC71';
  end if;

  claim := public.claim_command_receipt(target_project_id, 'record_flange_progress', target_idempotency_key);
  if claim ->> 'status' = 'completed' then
    return claim -> 'result';
  end if;

  record_row := public.record_flange_progress_invariant(
    target_project_id, target_flange_joint_revision_id, target_joint_category_id,
    target_torquing_requirement_id, target_jointing_value, target_joint_date,
    target_report_number, target_tag_number, target_jointer_ids, 'manual', null, null,
    target_replaces_progress_id, auth.uid()
  );
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state)
  values (target_project_id, auth.uid(), 'flange_progress_records', record_row.id,
    'record_flange_progress', to_jsonb(record_row));
  return public.complete_command_receipt(
    target_project_id, 'record_flange_progress', target_idempotency_key,
    jsonb_build_object('record', to_jsonb(record_row))
  );
end;
$$;

revoke all on function public.record_flange_progress_invariant(uuid, uuid, uuid, uuid, numeric, date, text, text, uuid[], public.flange_progress_source, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_flange_progress(uuid, uuid, uuid, uuid, numeric, date, text, text, uuid[], text, uuid) from public, anon;
grant execute on function public.record_flange_progress(uuid, uuid, uuid, uuid, numeric, date, text, text, uuid[], text, uuid) to authenticated;
