-- Track 04 Gate B remediation. Existing migrations are immutable; replace the
-- affected command surfaces in this forward-only migration.

-- Keep the original referential validation body available only to this wrapper.
-- The wrapper adds the structural rule that the original implementation lacked.
alter function public.revalidate_spooling_import_job(uuid)
  rename to revalidate_spooling_import_job_base;

revoke all on function public.revalidate_spooling_import_job_base(uuid)
  from public, anon, authenticated;

create or replace function public.revalidate_spooling_import_job(target_job_id uuid)
returns table (blocker_count integer, warning_count integer, unresolved_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.revalidate_spooling_import_job_base(target_job_id);

  insert into public.import_job_issues (
    job_id, row_number, column_name, severity, code, message
  )
  select
    target_job_id,
    null,
    null,
    'blocker',
    'SRV_SPOOLING_SPINE_MISSING',
    'The SpoolGen submission must contain at least one isometric, spool and weld joint.'
  where not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'isometric'
        )
     or not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'spool'
        )
     or not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'weld_joint'
        );

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'warning'),
    (select count(*)::integer from public.preview_spooling_import(target_job_id) item
     where item.requires_decision and item.decision is null);
end;
$$;

revoke all on function public.revalidate_spooling_import_job(uuid) from public, anon;
grant execute on function public.revalidate_spooling_import_job(uuid) to authenticated;

-- A removed spool still needs a complete, durable revision history. The trigger
-- runs while the target revision is draft and the previous revision remains
-- accepted, which makes the source graph unambiguous.
create or replace function public.copy_removed_spool_revision_children()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_revision public.isometric_revisions;
  source_spool_revision public.spool_revisions;
  project_id uuid;
  source_import_job_id uuid;
  child record;
  target_weld_revision_id uuid;
begin
  if not new.is_removed then
    return new;
  end if;

  select revision.*
  into target_revision
  from public.isometric_revisions revision
  where revision.id = new.isometric_revision_id;

  select iso.project_id
  into project_id
  from public.isometrics iso
  where iso.id = target_revision.isometric_id;

  if not found or target_revision.status <> 'draft' then
    return new;
  end if;

  select previous_spool_revision.*
  into source_spool_revision
  from public.spool_revisions previous_spool_revision
  join public.isometric_revisions previous_revision
    on previous_revision.id = previous_spool_revision.isometric_revision_id
  where previous_spool_revision.spool_id = new.spool_id
    and previous_revision.isometric_id = target_revision.isometric_id
    and previous_revision.status = 'accepted';

  if not found then
    return new;
  end if;

  source_import_job_id := target_revision.source_import_job_id;

  for child in
    select revision.*, joint.weld_number
    from public.weld_joint_revisions revision
    join public.weld_joints joint on joint.id = revision.weld_joint_id
    where revision.spool_revision_id = source_spool_revision.id
  loop
    insert into public.weld_joint_revisions (
      weld_joint_id, spool_revision_id, weld_type_id, weld_location,
      diameter_inch, thickness_mm, is_removed
    )
    values (
      child.weld_joint_id, new.id, child.weld_type_id, child.weld_location,
      child.diameter_inch, child.thickness_mm, true
    )
    returning id into target_weld_revision_id;

    insert into public.revision_change_items (
      project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
      entity_type, entity_id, entity_key, change_type, previous_payload,
      next_payload, source_import_job_id
    )
    values (
      project_id, target_revision.isometric_id, target_revision.id,
      source_spool_revision.isometric_revision_id,
      'weld_joint', child.weld_joint_id, child.weld_number, 'removed',
      jsonb_build_object(
        'spool_number', (select spool_number from public.spools where id = new.spool_id),
        'weld_location', child.weld_location,
        'diameter_inch', public.engineering_numeric_key(child.diameter_inch),
        'thickness_mm', public.engineering_numeric_key(child.thickness_mm)
      ),
      null,
      source_import_job_id
    );
  end loop;

  for child in
    select revision.*, support.support_number
    from public.support_revisions revision
    join public.supports support on support.id = revision.support_id
    where revision.spool_revision_id = source_spool_revision.id
  loop
    insert into public.support_revisions (
      support_id, spool_revision_id, support_type, quantity, is_removed
    )
    values (child.support_id, new.id, child.support_type, child.quantity, true);

    insert into public.revision_change_items (
      project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
      entity_type, entity_id, entity_key, change_type, previous_payload,
      next_payload, source_import_job_id
    )
    values (
      project_id, target_revision.isometric_id, target_revision.id,
      source_spool_revision.isometric_revision_id,
      'support', child.support_id, child.support_number, 'removed',
      jsonb_build_object(
        'spool_number', (select spool_number from public.spools where id = new.spool_id),
        'support_type', coalesce(child.support_type, ''),
        'quantity', child.quantity::text
      ),
      null,
      source_import_job_id
    );
  end loop;

  for child in
    select revision.*, flange.flange_number
    from public.flange_joint_revisions revision
    join public.flange_joints flange on flange.id = revision.flange_joint_id
    where revision.spool_revision_id = source_spool_revision.id
  loop
    insert into public.flange_joint_revisions (
      flange_joint_id, spool_revision_id, flange_rating, diameter_inch,
      bolt_size, bolt_quantity, joint_type, is_removed
    )
    values (
      child.flange_joint_id, new.id, child.flange_rating, child.diameter_inch,
      child.bolt_size, child.bolt_quantity, child.joint_type, true
    );

    insert into public.revision_change_items (
      project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
      entity_type, entity_id, entity_key, change_type, previous_payload,
      next_payload, source_import_job_id
    )
    values (
      project_id, target_revision.isometric_id, target_revision.id,
      source_spool_revision.isometric_revision_id,
      'flange_joint', child.flange_joint_id, child.flange_number, 'removed',
      jsonb_build_object(
        'spool_number', (select spool_number from public.spools where id = new.spool_id),
        'flange_rating', coalesce(child.flange_rating, ''),
        'diameter_inch', public.engineering_numeric_key(child.diameter_inch),
        'bolt_size', coalesce(child.bolt_size, ''),
        'bolt_quantity', coalesce(child.bolt_quantity::text, ''),
        'joint_type', coalesce(child.joint_type, '')
      ),
      null,
      source_import_job_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists copy_removed_spool_revision_children_trigger
  on public.spool_revisions;

create trigger copy_removed_spool_revision_children_trigger
after insert on public.spool_revisions
for each row execute function public.copy_removed_spool_revision_children();

-- Manual revisions are command-equivalent to imported revisions: every spool
-- must be resolved, rework needs every weld resolved, and the decision history
-- is written with the cloned graph.
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
  weld_rec record;
  new_spool_revision_id uuid;
  new_weld_revision_id uuid;
  spool_decision public.revision_decision;
  weld_decision public.revision_decision;
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
    where isometric_id = target_isometric_id and revision_number = trim(new_revision_number)
  ) then
    raise exception 'Revision % already exists for this isometric', trim(new_revision_number)
      using errcode = 'PQC23';
  end if;

  if exists (
    select 1
    from public.spool_revisions revision
    join public.spools spool on spool.id = revision.spool_id
    where revision.isometric_revision_id = previous_revision.id
      and revision.is_removed = false
      and not exists (
        select 1 from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
        where entry ->> 'entity_type' = 'spool'
          and entry ->> 'entity_key' = spool.spool_number
      )
  ) then
    raise exception 'Every spool needs a decision' using errcode = 'PQC22';
  end if;

  if exists (
    select 1
    from public.spool_revisions spool_revision
    join public.spools spool on spool.id = spool_revision.spool_id
    join public.weld_joint_revisions weld_revision
      on weld_revision.spool_revision_id = spool_revision.id
    join public.weld_joints weld on weld.id = weld_revision.weld_joint_id
    where spool_revision.isometric_revision_id = previous_revision.id
      and exists (
        select 1 from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
        where entry ->> 'entity_type' = 'spool'
          and entry ->> 'entity_key' = spool.spool_number
          and entry ->> 'decision' = 'rework'
      )
      and not exists (
        select 1 from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
        where entry ->> 'entity_type' = 'weld_joint'
          and entry ->> 'entity_key' = weld.weld_number
      )
  ) then
    raise exception 'Every weld in a reworked spool needs a decision' using errcode = 'PQC22';
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
    select revision.*, spool.spool_number
    from public.spool_revisions revision
    join public.spools spool on spool.id = revision.spool_id
    where revision.isometric_revision_id = previous_revision.id
    order by spool.spool_number
  loop
    select (entry ->> 'decision')::public.revision_decision into spool_decision
    from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
    where entry ->> 'entity_type' = 'spool'
      and entry ->> 'entity_key' = spool_rec.spool_number
    limit 1;

    spool_decision := coalesce(
      spool_decision,
      case when spool_rec.is_removed then 'cancelled'::public.revision_decision end
    );

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
      case
        when spool_decision = 'cancelled' then 'removed'
        when spool_decision = 'done_without_modification' then 'unchanged'
        else 'revised'
      end::public.revision_change_type,
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

    for weld_rec in
      select revision.*, joint.weld_number
      from public.weld_joint_revisions revision
      join public.weld_joints joint on joint.id = revision.weld_joint_id
      where revision.spool_revision_id = spool_rec.id
    loop
      if spool_decision = 'rework' then
        select (entry ->> 'decision')::public.revision_decision into weld_decision
        from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
        where entry ->> 'entity_type' = 'weld_joint'
          and entry ->> 'entity_key' = weld_rec.weld_number
        limit 1;
      else
        weld_decision := null;
      end if;

      insert into public.weld_joint_revisions (
        weld_joint_id, spool_revision_id, weld_type_id, weld_location,
        diameter_inch, thickness_mm, is_removed
      )
      values (
        weld_rec.weld_joint_id, new_spool_revision_id, weld_rec.weld_type_id,
        weld_rec.weld_location, weld_rec.diameter_inch, weld_rec.thickness_mm,
        weld_rec.is_removed or weld_decision = 'cancelled'
      )
      returning id into new_weld_revision_id;

      if not weld_rec.is_removed and coalesce(weld_decision, 'not_done') <> 'cancelled' then
        insert into public.weld_points (weld_joint_revision_id, point_type, sequence_number)
        select new_weld_revision_id, point.point_type, point.sequence_number
        from public.weld_points point
        where point.weld_joint_revision_id = weld_rec.id;
      end if;

      insert into public.revision_change_items (
        project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
        entity_type, entity_id, entity_key, change_type, previous_payload, next_payload
      )
      values (
        isometric_row.project_id, target_isometric_id, new_revision.id, previous_revision.id,
        'weld_joint', weld_rec.weld_joint_id, weld_rec.weld_number,
        case
          when weld_rec.is_removed or weld_decision = 'cancelled' then 'removed'
          when spool_decision = 'rework' then 'revised'
          else 'unchanged'
        end::public.revision_change_type,
        jsonb_build_object('spool_number', spool_rec.spool_number),
        jsonb_build_object('spool_number', spool_rec.spool_number)
      )
      returning id into change_item_id;

      if weld_decision is not null then
        insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
        values (change_item_id, weld_decision, revision_comment, auth.uid());
      end if;
    end loop;

    insert into public.support_revisions (
      support_id, spool_revision_id, support_type, quantity, is_removed
    )
    select revision.support_id, new_spool_revision_id, revision.support_type,
           revision.quantity, revision.is_removed
    from public.support_revisions revision
    where revision.spool_revision_id = spool_rec.id;

    insert into public.flange_joint_revisions (
      flange_joint_id, spool_revision_id, flange_rating, diameter_inch,
      bolt_size, bolt_quantity, joint_type, is_removed
    )
    select revision.flange_joint_id, new_spool_revision_id, revision.flange_rating,
           revision.diameter_inch, revision.bolt_size, revision.bolt_quantity,
           revision.joint_type, revision.is_removed
    from public.flange_joint_revisions revision
    where revision.spool_revision_id = spool_rec.id;

    insert into public.spool_revision_materials (
      spool_revision_id, ident_code, description, quantity, unit, trace_number
    )
    select new_spool_revision_id, material.ident_code, material.description,
           material.quantity, material.unit, material.trace_number
    from public.spool_revision_materials material
    where material.spool_revision_id = spool_rec.id;
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
