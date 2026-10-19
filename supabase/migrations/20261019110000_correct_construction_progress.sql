-- A recorded stage date can be corrected.
--
-- Start Fab and Sent to Paint (and the recordable erection stages) are written once by
-- record_construction_progress, and the screen disables the button afterwards. A date pressed on the wrong
-- day stayed wrong: recording again appends an event, but the spool projection reads the latest *date*
-- (max(occurred_on)) while effective_stage_date reads the latest *event*, so a correction to an earlier day
-- would have shown two different answers.
--
-- Events are append-only (PQC31), and the table already has the `compensation` source for this: a
-- correction compensates every event that stands for the stage and records the new date as a manual event,
-- with the reason. The projection and effective_stage_date both ignore compensated events, so they agree
-- again. Nothing is rewritten; the history keeps what was pressed and why it changed.
--
-- Test: 131_correct_construction_progress.test.sql.

create or replace function public.correct_construction_progress(
  target_spool_revision_id uuid,
  target_phase public.construction_phase,
  target_stage public.construction_stage,
  new_occurred_on date,
  correction_reason text,
  target_idempotency_key text default null
)
returns public.construction_progress_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  context public.spool_context;
  claimed jsonb;
  policy_row public.construction_phase_stages;
  required_capability text;
  standing public.construction_progress_events;
  standing_count int := 0;
  standing_date date;
  trimmed_reason text := nullif(btrim(correction_reason), '');
  event_row public.construction_progress_events;
begin
  if target_phase = 'assembly' then
    raise exception 'Assembly is not enabled on this project' using errcode = 'PQC50';
  end if;

  required_capability := case target_phase
    when 'fabrication' then 'fabrication.progress.record'
    when 'erection' then 'erection.progress.record'
  end;
  context := public.assert_construction_target(target_spool_revision_id, required_capability);

  claimed := public.claim_command_receipt(
    context.project_id, 'correct_construction_progress', target_idempotency_key,
    jsonb_build_object(
      'spool_revision_id', target_spool_revision_id, 'phase', target_phase, 'stage', target_stage,
      'occurred_on', new_occurred_on, 'reason', trimmed_reason));
  if claimed ->> 'status' = 'completed' then
    select * into event_row
    from jsonb_populate_record(null::public.construction_progress_events, claimed -> 'result' -> 'event');
    return event_row;
  end if;

  select * into policy_row
  from public.construction_phase_stages
  where phase = target_phase and stage = target_stage;
  if policy_row.phase is null then
    raise exception 'This stage does not belong to the construction phase' using errcode = 'PQC52';
  end if;
  if not policy_row.is_recordable then
    if target_phase = 'fabrication' then
      raise exception 'This stage is derived and cannot be recorded manually' using errcode = 'PQC32';
    end if;
    raise exception 'This stage is derived or does not belong to this phase, and cannot be recorded manually'
      using errcode = 'PQC52';
  end if;
  if new_occurred_on is null or trimmed_reason is null then
    raise exception 'A date and a reason are required to correct a stage' using errcode = '23514';
  end if;

  -- The events that stand for this stage: not themselves compensations, not already compensated.
  select count(*), max(event.occurred_on) into standing_count, standing_date
  from public.construction_progress_events event
  where event.spool_revision_id = target_spool_revision_id
    and event.phase = target_phase
    and event.stage = target_stage
    and event.source <> 'compensation'
    and not exists (
      select 1 from public.construction_progress_events cancel
      where cancel.compensates_event_id = event.id);

  if standing_count = 0 then
    raise exception 'Nothing is recorded for this stage yet; record it instead' using errcode = 'PQC57';
  end if;
  if standing_date = new_occurred_on then
    raise exception 'This stage already has that date' using errcode = 'PQC57';
  end if;

  for standing in
    select event.*
    from public.construction_progress_events event
    where event.spool_revision_id = target_spool_revision_id
      and event.phase = target_phase
      and event.stage = target_stage
      and event.source <> 'compensation'
      and not exists (
        select 1 from public.construction_progress_events cancel
        where cancel.compensates_event_id = event.id)
    order by event.created_at, event.id
  loop
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on, payload, source, compensates_event_id, actor_id
    ) values (
      context.project_id, target_spool_revision_id, target_phase, target_stage, standing.occurred_on,
      jsonb_build_object('reason', trimmed_reason), 'compensation', standing.id, auth.uid());
  end loop;

  insert into public.construction_progress_events (
    project_id, spool_revision_id, phase, stage, occurred_on, payload, actor_id
  ) values (
    context.project_id, target_spool_revision_id, target_phase, target_stage, new_occurred_on,
    jsonb_build_object('reason', trimmed_reason, 'corrected_from', standing_date), auth.uid())
  returning * into event_row;

  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'construction_progress_events', event_row.id,
          'correct_construction_progress', to_jsonb(event_row));

  perform public.complete_command_receipt(
    context.project_id, 'correct_construction_progress', target_idempotency_key,
    jsonb_build_object('event', to_jsonb(event_row)));
  return event_row;
end;
$$;

revoke all on function public.correct_construction_progress(uuid, public.construction_phase, public.construction_stage, date, text, text)
  from public, anon;
grant execute on function public.correct_construction_progress(uuid, public.construction_phase, public.construction_stage, date, text, text)
  to authenticated;
