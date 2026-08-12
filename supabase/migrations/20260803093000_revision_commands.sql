-- Track 04: manual revision (dossier 15.5) and the guard that keeps the Track 03
-- generic import path away from spooling definitions.

-- Dossier 15.5: the same semantics without a new .txt. The accepted revision is
-- cloned, per-spool decisions are applied, and the old revision goes to history.
create or replace function public.create_manual_revision(
  target_isometric_id uuid,
  new_revision_number text,
  revision_comment text default null,
  decisions jsonb default '[]'::jsonb
)
returns public.isometric_revisions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  isometric_row public.isometrics;
  previous_revision public.isometric_revisions;
  new_revision public.isometric_revisions;
  next_ordinal integer;
  spool_rec record;
  new_spool_revision_id uuid;
  spool_decision public.revision_decision;
  change_item_id uuid;
  progress_kind text;
begin
  select * into isometric_row from public.isometrics where id = target_isometric_id;
  if not found then
    raise exception 'Isometric was not found' using errcode = 'PQC20';
  end if;
  if not public.current_user_has_capability(isometric_row.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if coalesce(trim(new_revision_number), '') = '' then
    raise exception 'A revision number is required' using errcode = '23514';
  end if;

  select * into previous_revision
  from public.isometric_revisions
  where isometric_id = target_isometric_id and status = 'accepted'
  for update;

  if not found then
    raise exception 'This isometric has no accepted revision to revise' using errcode = 'PQC20';
  end if;

  if exists (
    select 1 from public.isometric_revisions
    where isometric_id = target_isometric_id
      and revision_number = trim(new_revision_number)
  ) then
    raise exception 'Revision % already exists for this isometric', trim(new_revision_number)
      using errcode = 'PQC23';
  end if;

  select coalesce(max(revision_ordinal), 0) + 1 into next_ordinal
  from public.isometric_revisions where isometric_id = target_isometric_id;

  insert into public.isometric_revisions (
    isometric_id, revision_number, revision_ordinal, status,
    pds_area_id, service_class_id, line_number, sheet_number, comment, created_by
  )
  values (
    target_isometric_id, trim(new_revision_number), next_ordinal, 'draft',
    previous_revision.pds_area_id, previous_revision.service_class_id,
    previous_revision.line_number, previous_revision.sheet_number,
    revision_comment, auth.uid()
  )
  returning * into new_revision;

  for spool_rec in
    select sr.*, sp.spool_number
    from public.spool_revisions sr
    join public.spools sp on sp.id = sr.spool_id
    where sr.isometric_revision_id = previous_revision.id
    order by sp.spool_number
  loop
    select (entry ->> 'decision')::public.revision_decision into spool_decision
    from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
    where entry ->> 'entity_type' = 'spool'
      and entry ->> 'entity_key' = spool_rec.spool_number
    limit 1;

    spool_decision := coalesce(spool_decision, 'done_without_modification');

    insert into public.spool_revisions (
      spool_id, isometric_revision_id, sequence_number, weight_kg, material_class, is_removed
    )
    values (
      spool_rec.spool_id, new_revision.id, spool_rec.sequence_number,
      spool_rec.weight_kg, spool_rec.material_class,
      spool_decision = 'cancelled' or spool_rec.is_removed
    )
    returning id into new_spool_revision_id;

    insert into public.revision_change_items (
      project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
      entity_type, entity_id, entity_key, change_type, previous_payload, next_payload
    )
    values (
      isometric_row.project_id, target_isometric_id, new_revision.id, previous_revision.id,
      'spool', spool_rec.spool_id, spool_rec.spool_number,
      case when spool_decision = 'cancelled' then 'removed'
           when spool_decision = 'done_without_modification' then 'unchanged'
           else 'revised' end,
      jsonb_build_object('spool_number', spool_rec.spool_number),
      jsonb_build_object('spool_number', spool_rec.spool_number)
    )
    returning id into change_item_id;

    insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
    values (change_item_id, spool_decision, revision_comment, auth.uid());

    if spool_decision in ('done_without_modification', 'rework') then
      foreach progress_kind in array array['fabrication_start', 'sent_to_paint', 'paint']
      loop
        insert into public.revision_progress_copies (
          change_item_id, source_spool_revision_id, target_spool_revision_id,
          progress_kind, copied_by
        )
        values (change_item_id, spool_rec.id, new_spool_revision_id, progress_kind, auth.uid());
      end loop;
    end if;

    if spool_decision = 'cancelled' then
      continue;
    end if;

    insert into public.weld_joint_revisions (
      weld_joint_id, spool_revision_id, weld_type_id, weld_location,
      diameter_inch, thickness_mm, is_removed
    )
    select wjr.weld_joint_id, new_spool_revision_id, wjr.weld_type_id, wjr.weld_location,
           wjr.diameter_inch, wjr.thickness_mm, wjr.is_removed
    from public.weld_joint_revisions wjr
    where wjr.spool_revision_id = spool_rec.id;

    insert into public.weld_points (weld_joint_revision_id, point_type, sequence_number)
    select new_wjr.id, old_point.point_type, old_point.sequence_number
    from public.weld_joint_revisions new_wjr
    join public.weld_joint_revisions old_wjr
      on old_wjr.weld_joint_id = new_wjr.weld_joint_id
     and old_wjr.spool_revision_id = spool_rec.id
    join public.weld_points old_point on old_point.weld_joint_revision_id = old_wjr.id
    where new_wjr.spool_revision_id = new_spool_revision_id;

    insert into public.support_revisions (
      support_id, spool_revision_id, support_type, quantity, is_removed
    )
    select supr.support_id, new_spool_revision_id, supr.support_type, supr.quantity, supr.is_removed
    from public.support_revisions supr
    where supr.spool_revision_id = spool_rec.id;

    insert into public.flange_joint_revisions (
      flange_joint_id, spool_revision_id, flange_rating, diameter_inch,
      bolt_size, bolt_quantity, joint_type, is_removed
    )
    select fjr.flange_joint_id, new_spool_revision_id, fjr.flange_rating, fjr.diameter_inch,
           fjr.bolt_size, fjr.bolt_quantity, fjr.joint_type, fjr.is_removed
    from public.flange_joint_revisions fjr
    where fjr.spool_revision_id = spool_rec.id;

    insert into public.spool_revision_materials (
      spool_revision_id, ident_code, description, quantity, unit, trace_number
    )
    select new_spool_revision_id, m.ident_code, m.description, m.quantity, m.unit, m.trace_number
    from public.spool_revision_materials m
    where m.spool_revision_id = spool_rec.id;
  end loop;

  update public.isometric_revisions
  set status = 'superseded', superseded_at = timezone('utc', now())
  where id = previous_revision.id;

  update public.isometric_revisions
  set status = 'accepted', accepted_at = timezone('utc', now())
  where id = new_revision.id
  returning * into new_revision;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    isometric_row.project_id, auth.uid(), 'isometric_revisions', new_revision.id,
    'create_manual_revision', to_jsonb(previous_revision), to_jsonb(new_revision)
  );

  return new_revision;
end;
$$;

revoke all on function public.create_manual_revision(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_manual_revision(uuid, text, text, jsonb) to authenticated;

-- Plan section 3.10: imports.manage must not open a spooling definition job through
-- the Track 03 generic path. Replacing the function in a new migration is the
-- forward-only way to harden it.
create or replace function public.create_import_job(
  target_project_id uuid,
  requested_import_type text,
  file_name text,
  media_type text,
  size_bytes bigint,
  checksum text
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_job public.import_jobs;
begin
  if requested_import_type = 'spooling_definition' then
    raise exception 'SpoolGen imports are created through create_spooling_import_job'
      using errcode = 'PQC24';
  end if;

  if not public.current_user_has_capability(target_project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;

  if coalesce(trim(file_name), '') = '' then
    raise exception 'Source file name is required' using errcode = '23514';
  end if;

  if coalesce(size_bytes, 0) <= 0 then
    raise exception 'Source file size must be positive' using errcode = '23514';
  end if;

  insert into public.import_jobs (
    project_id, kind, import_type, status, requested_by,
    source_file_name, source_media_type, source_size_bytes, source_checksum
  )
  values (
    target_project_id, requested_import_type, requested_import_type, 'draft', auth.uid(),
    trim(file_name), media_type, size_bytes, checksum
  )
  returning * into created_job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'import_jobs', created_job.id,
    'create_import_job', null, to_jsonb(created_job)
  );

  return created_job;
end;
$$;
