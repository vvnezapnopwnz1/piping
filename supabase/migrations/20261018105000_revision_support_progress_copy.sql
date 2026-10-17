-- F3b: a done-without-modification decision also carries the installed supports.
-- A support installed on the old revision stays installed on the unchanged spool; before this
-- the new revision showed 0 of N supports and the spool could not be QC released again.

alter table public.revision_progress_copies
  drop constraint revision_progress_copies_progress_kind_check,
  add constraint revision_progress_copies_progress_kind_check
    check (progress_kind in (
      'fabrication_start', 'material_check', 'weld_progress', 'support_progress', 'sent_to_paint', 'paint'
    ));

create or replace function public.authorize_complete_revision_progress_copy()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.progress_kind <> 'fabrication_start'
     or not exists (
       select 1
       from public.revision_decisions decision
       where decision.change_item_id = new.change_item_id
         and decision.decision = 'done_without_modification'
     ) then
    return new;
  end if;

  insert into public.revision_progress_copies (
    change_item_id,
    source_spool_revision_id,
    target_spool_revision_id,
    progress_kind,
    copied_by
  )
  values
    (new.change_item_id, new.source_spool_revision_id, new.target_spool_revision_id, 'material_check', new.copied_by),
    (new.change_item_id, new.source_spool_revision_id, new.target_spool_revision_id, 'weld_progress', new.copied_by),
    (new.change_item_id, new.source_spool_revision_id, new.target_spool_revision_id, 'support_progress', new.copied_by)
  on conflict (change_item_id, progress_kind) do nothing;

  return new;
end;
$$;

-- Decisions made before this migration have no support ledger row yet.
insert into public.revision_progress_copies (
  change_item_id,
  source_spool_revision_id,
  target_spool_revision_id,
  progress_kind,
  copied_by
)
select
  copy.change_item_id,
  copy.source_spool_revision_id,
  copy.target_spool_revision_id,
  'support_progress',
  copy.copied_by
from public.revision_progress_copies copy
join public.revision_decisions decision on decision.change_item_id = copy.change_item_id
where copy.progress_kind = 'fabrication_start'
  and decision.decision = 'done_without_modification'
on conflict (change_item_id, progress_kind) do nothing;

create or replace function public.materialize_progress_copies(
  target_isometric_revision_id uuid,
  target_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  copy_row record;
  source_material_check public.material_check_records;
  target_material_check public.material_check_records;
  source_weld record;
  source_assignment record;
  source_date date;
  stage_value public.construction_stage;
  context public.spool_context;
  target_spool_revision_id uuid;
  target_spool_material_id uuid;
  target_weld_joint_revision_id uuid;
  target_weld_point_id uuid;
  target_weld_progress public.weld_progress_records;
  event_row public.construction_progress_events;
  copied_weld_ids jsonb;
  copied_support_ids jsonb;
  source_support record;
  target_support_revision_id uuid;
  target_support_progress public.support_progress_records;
  claimed jsonb;
  created_count integer := 0;
begin
  select spool_revision.id into target_spool_revision_id
  from public.spool_revisions spool_revision
  where spool_revision.isometric_revision_id = target_isometric_revision_id
  order by spool_revision.id
  limit 1;

  context := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'materialize_progress_copies', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    return (claimed -> 'result' ->> 'created_count')::integer;
  end if;

  for copy_row in
    select copy.*, item.project_id
    from public.revision_progress_copies copy
    join public.revision_change_items item on item.id = copy.change_item_id
    where (
      select spool_revision.isometric_revision_id
      from public.spool_revisions spool_revision
      where spool_revision.id = copy.target_spool_revision_id
    ) = target_isometric_revision_id
      and copy.copied_payload = '{}'::jsonb
    order by case copy.progress_kind
      when 'fabrication_start' then 10
      when 'material_check' then 20
      when 'weld_progress' then 30
      when 'support_progress' then 40
      when 'sent_to_paint' then 50
      else 60
    end
    for update of copy skip locked
  loop
    context := public.assert_construction_target(copy_row.target_spool_revision_id, 'fabrication.progress.record');

    if copy_row.progress_kind in ('fabrication_start', 'sent_to_paint', 'paint') then
      stage_value := case copy_row.progress_kind
        when 'fabrication_start' then 'start_fab'::public.construction_stage
        when 'sent_to_paint' then 'sent_to_paint'::public.construction_stage
        else 'painted'::public.construction_stage
      end;
      source_date := public.effective_stage_date(copy_row.source_spool_revision_id, stage_value);
      if source_date is null then
        continue;
      end if;

      insert into public.construction_progress_events (
        project_id, spool_revision_id, phase, stage, occurred_on, payload, source, actor_id
      ) values (
        context.project_id, copy_row.target_spool_revision_id, 'fabrication', stage_value, source_date,
        jsonb_build_object(
          'source_spool_revision_id', copy_row.source_spool_revision_id,
          'revision_progress_copy_id', copy_row.id
        ),
        'revision_copy', auth.uid()
      ) returning * into event_row;

      update public.revision_progress_copies
      set copied_payload = jsonb_build_object(
        'event_id', event_row.id,
        'stage', stage_value,
        'occurred_on', source_date
      )
      where id = copy_row.id;

      insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
      values (context.project_id, auth.uid(), 'construction_progress_events', event_row.id, 'materialize_progress_copy', to_jsonb(event_row));
      insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
      values (
        context.project_id, auth.uid(), 'revision_progress_copies', copy_row.id,
        'mark_progress_copy_materialized',
        jsonb_build_object('event_id', event_row.id, 'stage', stage_value, 'occurred_on', source_date)
      );
      created_count := created_count + 1;
      continue;
    end if;

    if copy_row.progress_kind = 'material_check' then
      select * into source_material_check
      from public.material_check_records material_check
      where material_check.spool_revision_id = copy_row.source_spool_revision_id;
      if not found then
        continue;
      end if;

      insert into public.material_check_records (
        project_id, spool_revision_id, checked_on, checked_by
      ) values (
        context.project_id, copy_row.target_spool_revision_id,
        source_material_check.checked_on, source_material_check.checked_by
      ) returning * into target_material_check;

      for source_assignment in
        select item.*, source_material.ident_code, source_material.trace_number
        from public.material_check_items item
        join public.spool_revision_materials source_material
          on source_material.id = item.spool_revision_material_id
        where item.material_check_record_id = source_material_check.id
      loop
        select target_material.id into target_spool_material_id
        from public.spool_revision_materials target_material
        where target_material.spool_revision_id = copy_row.target_spool_revision_id
          and target_material.ident_code = source_assignment.ident_code
          and target_material.trace_number is not distinct from source_assignment.trace_number;
        if target_spool_material_id is null then
          raise exception 'Material check evidence has no matching target BOM line' using errcode = 'PQC30';
        end if;

        insert into public.material_check_items (
          material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity
        ) values (
          target_material_check.id, target_spool_material_id,
          source_assignment.piping_material_record_id, source_assignment.checked_quantity
        );
      end loop;

      insert into public.construction_progress_events (
        project_id, spool_revision_id, phase, stage, occurred_on, payload, source, actor_id
      ) values (
        context.project_id, copy_row.target_spool_revision_id, 'fabrication', 'material_check',
        source_material_check.checked_on,
        jsonb_build_object(
          'source_spool_revision_id', copy_row.source_spool_revision_id,
          'revision_progress_copy_id', copy_row.id,
          'material_check_record_id', target_material_check.id
        ),
        'revision_copy', auth.uid()
      ) returning * into event_row;

      update public.revision_progress_copies
      set copied_payload = jsonb_build_object(
        'material_check_record_id', target_material_check.id,
        'event_id', event_row.id,
        'checked_on', source_material_check.checked_on
      )
      where id = copy_row.id;

      insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
      values (context.project_id, auth.uid(), 'material_check_records', target_material_check.id, 'materialize_progress_copy', to_jsonb(target_material_check));
      insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
      values (
        context.project_id, auth.uid(), 'revision_progress_copies', copy_row.id,
        'mark_progress_copy_materialized',
        jsonb_build_object('material_check_record_id', target_material_check.id, 'event_id', event_row.id)
      );
      created_count := created_count + 1;
      continue;
    end if;

    if copy_row.progress_kind = 'support_progress' then
      copied_support_ids := '[]'::jsonb;
      for source_support in
        select progress.*, source_revision.support_id
        from public.support_progress_records progress
        join public.support_revisions source_revision on source_revision.id = progress.support_revision_id
        where progress.spool_revision_id = copy_row.source_spool_revision_id
        order by progress.id
      loop
        select target_revision.id into target_support_revision_id
        from public.support_revisions target_revision
        where target_revision.spool_revision_id = copy_row.target_spool_revision_id
          and target_revision.support_id = source_support.support_id
          and not target_revision.is_removed;
        if target_support_revision_id is null then
          raise exception 'Support progress has no corresponding target support' using errcode = 'PQC30';
        end if;

        insert into public.support_progress_records (
          project_id, support_revision_id, spool_revision_id, phase, installed_on, receipt_id, recorded_by
        ) values (
          context.project_id, target_support_revision_id, copy_row.target_spool_revision_id,
          source_support.phase, source_support.installed_on, null, source_support.recorded_by
        ) returning * into target_support_progress;

        copied_support_ids := copied_support_ids || jsonb_build_array(target_support_progress.id);
        insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
        values (context.project_id, auth.uid(), 'support_progress_records', target_support_progress.id, 'materialize_progress_copy', to_jsonb(target_support_progress));
      end loop;
      if copied_support_ids = '[]'::jsonb then
        continue;
      end if;

      update public.revision_progress_copies
      set copied_payload = jsonb_build_object('support_progress_record_ids', copied_support_ids)
      where id = copy_row.id;
      insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
      values (
        context.project_id, auth.uid(), 'revision_progress_copies', copy_row.id,
        'mark_progress_copy_materialized', jsonb_build_object('support_progress_record_ids', copied_support_ids)
      );
      created_count := created_count + 1;
      continue;
    end if;

    copied_weld_ids := '[]'::jsonb;
    for source_weld in
      select weld_progress.*, source_joint.weld_joint_id
      from public.weld_progress_records weld_progress
      join public.weld_joint_revisions source_joint on source_joint.id = weld_progress.weld_joint_revision_id
      where weld_progress.spool_revision_id = copy_row.source_spool_revision_id
      order by weld_progress.id
    loop
      select target_joint.id into target_weld_joint_revision_id
      from public.weld_joint_revisions target_joint
      where target_joint.spool_revision_id = copy_row.target_spool_revision_id
        and target_joint.weld_joint_id = source_weld.weld_joint_id;
      if target_weld_joint_revision_id is null then
        raise exception 'Weld progress has no corresponding target joint' using errcode = 'PQC30';
      end if;

      insert into public.weld_progress_records (
        project_id, weld_joint_revision_id, spool_revision_id, phase, subcontractor_id, welding_procedure_id,
        cutting_on, beveling_on, fitup_on, preheat_on, weld_on, dwir_number, qc_form_number,
        qc13_form_id, rework_code_id, is_locked, locked_at, version, receipt_id, recorded_by
      ) values (
        context.project_id, target_weld_joint_revision_id, copy_row.target_spool_revision_id,
        source_weld.phase, source_weld.subcontractor_id, source_weld.welding_procedure_id,
        source_weld.cutting_on, source_weld.beveling_on, source_weld.fitup_on, source_weld.preheat_on,
        source_weld.weld_on, source_weld.dwir_number, source_weld.qc_form_number,
        null, null, false, null, 1, null, source_weld.recorded_by
      ) returning * into target_weld_progress;

      for source_assignment in
        select *
        from public.weld_point_assignments
        where weld_progress_record_id = source_weld.id
        order by point_type, id
      loop
        select target_point.id into target_weld_point_id
        from public.weld_points target_point
        where target_point.weld_joint_revision_id = target_weld_joint_revision_id
          and target_point.point_type = source_assignment.point_type;
        if target_weld_point_id is null then
          raise exception 'Weld progress assignment has no matching target weld point' using errcode = 'PQC30';
        end if;

        insert into public.weld_point_assignments (
          weld_progress_record_id, weld_point_id, point_type, welder_qualification_id, completion_percent, welded_on
        ) values (
          target_weld_progress.id, target_weld_point_id, source_assignment.point_type,
          source_assignment.welder_qualification_id, source_assignment.completion_percent, source_assignment.welded_on
        );
      end loop;

      copied_weld_ids := copied_weld_ids || jsonb_build_array(target_weld_progress.id);
      insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
      values (context.project_id, auth.uid(), 'weld_progress_records', target_weld_progress.id, 'materialize_progress_copy', to_jsonb(target_weld_progress));
    end loop;
    if copied_weld_ids = '[]'::jsonb then
      continue;
    end if;

    update public.revision_progress_copies
    set copied_payload = jsonb_build_object('weld_progress_record_ids', copied_weld_ids)
    where id = copy_row.id;
    insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
    values (
      context.project_id, auth.uid(), 'revision_progress_copies', copy_row.id,
      'mark_progress_copy_materialized', jsonb_build_object('weld_progress_record_ids', copied_weld_ids)
    );
    created_count := created_count + 1;
  end loop;

  perform public.complete_command_receipt(
    context.project_id, 'materialize_progress_copies', target_idempotency_key,
    jsonb_build_object('created_count', created_count)
  );
  return created_count;
end;
$$;
