-- L1/L2: mechanical completion is an authoritative server-side predicate.

create or replace function public.field_welds_complete(target_spool_revision_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1
    from public.weld_joint_revisions joint
    left join public.weld_progress_records progress
      on progress.weld_joint_revision_id = joint.id
     and progress.phase = 'erection'
     and progress.weld_on is not null
    where joint.spool_revision_id = target_spool_revision_id
      and joint.weld_location = 'field'
      and not joint.is_removed
      and progress.id is null
  );
$$;

create or replace function public.record_erection_progress(
  target_spool_revision_id uuid,
  target_stage public.construction_stage,
  target_occurred_on date,
  target_payload jsonb default '{}'::jsonb,
  target_idempotency_key text default null
)
returns public.construction_progress_events
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  context public.spool_context;
  claimed jsonb;
  event_row public.construction_progress_events;
  policy_row public.construction_phase_stages;
begin
  context := public.assert_construction_target(target_spool_revision_id, 'erection.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'record_erection_progress', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into event_row from jsonb_populate_record(null::public.construction_progress_events, claimed -> 'result' -> 'event');
    return event_row;
  end if;
  select * into policy_row from public.construction_phase_stages where phase = 'erection' and stage = target_stage;
  if policy_row.phase is null then raise exception 'This stage does not belong to the erection phase' using errcode = 'PQC52'; end if;
  if target_stage = 'rft' then raise exception 'RFT is derived and cannot be set by hand' using errcode = 'PQC55'; end if;
  if not policy_row.is_recordable then
    raise exception 'This stage is derived or does not belong to this phase, and cannot be recorded manually' using errcode = 'PQC52';
  end if;
  if target_occurred_on is null or jsonb_typeof(coalesce(target_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'A date and object payload are required' using errcode = '23514';
  end if;
  if target_stage <> 'to_site' and public.effective_stage_date(target_spool_revision_id, 'erection', 'to_site') is null then
    raise exception 'The spool must be recorded To Site before this erection step' using errcode = 'PQC54';
  end if;
  if target_stage in ('welded_bolted', 'supported') and public.effective_stage_date(target_spool_revision_id, 'erection', 'erected') is null then
    raise exception 'An earlier erection step has not been recorded for this spool' using errcode = 'PQC53';
  end if;
  if target_stage = 'supported' and public.effective_stage_date(target_spool_revision_id, 'erection', 'welded_bolted') is null then
    raise exception 'An earlier erection step has not been recorded for this spool' using errcode = 'PQC53';
  end if;
  if target_stage = 'welded_bolted' and not public.field_welds_complete(target_spool_revision_id) then
    raise exception 'Every field weld of the spool must be completed before Welded or Bolted' using errcode = 'PQC56';
  end if;
  insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on, payload, actor_id)
  values (context.project_id, target_spool_revision_id, 'erection', target_stage, target_occurred_on, coalesce(target_payload, '{}'::jsonb), auth.uid())
  returning * into event_row;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'construction_progress_events', event_row.id, 'record_erection_progress', to_jsonb(event_row));
  perform public.complete_command_receipt(context.project_id, 'record_erection_progress', target_idempotency_key, jsonb_build_object('event', to_jsonb(event_row)));
  return event_row;
end;
$$;

create or replace view public.isometric_readiness with (security_invoker = true) as
with current_revision as (
  select iso.id as isometric_id, iso.project_id, revision.id as isometric_revision_id, revision.pds_area_id
  from public.isometrics iso join public.isometric_revisions revision on revision.isometric_id = iso.id and revision.status = 'accepted'
), spool_facts as (
  select current_revision.isometric_id,
    count(spool_revision.id)::int as spool_total,
    count(spool_revision.id) filter (where coalesce(erection.is_rft, false))::int as spool_complete,
    coalesce(sum(fabrication.weld_total), 0)::int as weld_total,
    coalesce(sum(fabrication.weld_complete), 0)::int as weld_complete,
    coalesce(sum(fabrication.support_total), 0)::int as support_total,
    coalesce(sum(fabrication.support_recorded), 0)::int as support_complete,
    coalesce(sum(erection.nde_pending), 0)::int as nde_pending,
    coalesce(sum(erection.pwht_pending), 0)::int as pwht_pending,
    bool_and(coalesce(fabrication.is_releasable, false)) as qc_released,
    max(erection.rft_on) as rft_on
  from current_revision
  left join public.spool_revisions spool_revision on spool_revision.isometric_revision_id = current_revision.isometric_revision_id and not spool_revision.is_removed
  left join public.spool_erection_readiness erection on erection.spool_revision_id = spool_revision.id
  left join public.spool_fabrication_readiness fabrication on fabrication.spool_revision_id = spool_revision.id
  group by current_revision.isometric_id
), flange_facts as (
  select current_revision.isometric_id,
    count(flange.flange_joint_revision_id)::int as flange_total,
    count(flange.flange_joint_revision_id) filter (where flange.effective_progress_id is not null)::int as flange_complete,
    coalesce(sum(flange.calculated_ut) filter (where flange.effective_progress_id is not null), 0)::numeric as unit_time
  from current_revision
  left join public.flange_joint_readiness flange on flange.isometric_id = current_revision.isometric_id and flange.revision_status = 'accepted' and not flange.is_removed
  group by current_revision.isometric_id
), line_facts as (
  select member.isometric_id, count(*)::int as line_check_assigned, count(*) filter (where result.id is not null)::int as line_check_completed
  from public.line_check_request_items member join public.pressure_test_requests request on request.id = member.request_id and request.cancelled_at is null
  left join public.line_check_results result on result.request_id = member.request_id and result.isometric_id = member.isometric_id group by member.isometric_id
), punch_facts as (
  select punch.isometric_id, count(*)::int as open_x_count from public.punch_items punch
  left join public.punch_item_clearances clearance on clearance.punch_item_id = punch.id where clearance.id is null group by punch.isometric_id
)
select current_revision.isometric_id, current_revision.project_id, current_revision.isometric_revision_id, current_revision.pds_area_id,
  coalesce(spool_facts.spool_total, 0) as spool_total, coalesce(spool_facts.spool_complete, 0) as spool_complete,
  coalesce(spool_facts.weld_total, 0) as weld_total, coalesce(spool_facts.weld_complete, 0) as weld_complete,
  coalesce(spool_facts.support_total, 0) as support_total, coalesce(spool_facts.support_complete, 0) as support_complete,
  coalesce(flange_facts.flange_total, 0) as flange_total, coalesce(flange_facts.flange_complete, 0) as flange_complete,
  coalesce(spool_facts.nde_pending, 0) as nde_pending, coalesce(spool_facts.pwht_pending, 0) as pwht_pending,
  coalesce(line_facts.line_check_assigned, 0) as line_check_assigned, coalesce(line_facts.line_check_completed, 0) as line_check_completed,
  coalesce(punch_facts.open_x_count, 0) as open_x_count, coalesce(flange_facts.unit_time, 0)::numeric as unit_time,
  coalesce(spool_facts.qc_released, false) as is_qc_released,
  jsonb_build_object(
    'NO_CURRENT_REVISION', 0,
    'NO_SPOOLS', case when coalesce(spool_facts.spool_total, 0) = 0 then 1 else 0 end,
    'WELD_OR_SUPPORT_PENDING', greatest(coalesce(spool_facts.weld_total, 0) - coalesce(spool_facts.weld_complete, 0), 0) + greatest(coalesce(spool_facts.support_total, 0) - coalesce(spool_facts.support_complete, 0), 0),
    'FLANGE_PENDING', greatest(coalesce(flange_facts.flange_total, 0) - coalesce(flange_facts.flange_complete, 0), 0),
    'NDE_PENDING', coalesce(spool_facts.nde_pending, 0), 'PWHT_PENDING', coalesce(spool_facts.pwht_pending, 0),
    'LINE_CHECK_PENDING', case when coalesce(line_facts.line_check_assigned, 0) > 0 and line_facts.line_check_assigned = line_facts.line_check_completed then 0 else 1 end,
    'X_OPEN', coalesce(punch_facts.open_x_count, 0)
  ) as blocker_counts,
  (
    coalesce(spool_facts.spool_total, 0) > 0
    and coalesce(spool_facts.weld_total, 0) = coalesce(spool_facts.weld_complete, 0)
    and coalesce(spool_facts.support_total, 0) = coalesce(spool_facts.support_complete, 0)
    and coalesce(flange_facts.flange_total, 0) = coalesce(flange_facts.flange_complete, 0)
    and coalesce(spool_facts.nde_pending, 0) = 0 and coalesce(spool_facts.pwht_pending, 0) = 0
    and coalesce(line_facts.line_check_assigned, 0) > 0 and line_facts.line_check_assigned = line_facts.line_check_completed
    and coalesce(punch_facts.open_x_count, 0) = 0
  ) as is_complete,
  (
    coalesce(spool_facts.spool_total, 0) > 0
    and coalesce(spool_facts.spool_total, 0) = coalesce(spool_facts.spool_complete, 0)
    and coalesce(spool_facts.weld_total, 0) = coalesce(spool_facts.weld_complete, 0)
    and coalesce(spool_facts.support_total, 0) = coalesce(spool_facts.support_complete, 0)
    and coalesce(flange_facts.flange_total, 0) = coalesce(flange_facts.flange_complete, 0)
    and coalesce(spool_facts.nde_pending, 0) = 0 and coalesce(spool_facts.pwht_pending, 0) = 0
    and coalesce(line_facts.line_check_assigned, 0) > 0 and line_facts.line_check_assigned = line_facts.line_check_completed
    and coalesce(punch_facts.open_x_count, 0) = 0 and coalesce(spool_facts.qc_released, false)
  ) as is_rft,
  case when coalesce(spool_facts.rft_on, null) is not null then spool_facts.rft_on end as rft_on
from current_revision
left join spool_facts on spool_facts.isometric_id = current_revision.isometric_id
left join flange_facts on flange_facts.isometric_id = current_revision.isometric_id
left join line_facts on line_facts.isometric_id = current_revision.isometric_id
left join punch_facts on punch_facts.isometric_id = current_revision.isometric_id;

revoke all on function public.field_welds_complete(uuid) from public, anon, authenticated;
