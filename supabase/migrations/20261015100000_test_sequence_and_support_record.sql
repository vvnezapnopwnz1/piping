-- The server keeps the order of the pressure test and never overwrites a support record.
--
-- Easy Piping (dossier §29, §30.9): a pressure-test step cannot start before its predecessor;
-- Y flanges are reinstated once testing is done, Z flanges once pre-commissioning is done.
-- Until now only the client kept that order: testing_started needed no blinding, and a
-- reinstatement request accepted Y and Z flanges at any time (L4/F7, L5 in
-- docs/audits/2026-10-09-fabrication-to-test-pack-logic.md).
--
-- A support has one progress record (unique per support revision). Recording it on site
-- silently replaced the shop record — phase and installation date — and the shop command did
-- the same the other way round (F5 in docs/acceptance/2026-10-09-upg-dry-run.md). Both commands
-- now refuse a support the other phase has already recorded; correcting a date within the same
-- phase stays as it was. Where the shop/field boundary of a support lies is an open owner
-- decision (Q1 in docs/audits/2026-10-14-project-review-and-roadmap.md).
--
-- A Test Pack whose member ISO has no accepted revision was neither RFT nor not-RFT (null), and
-- its RFT date was the first member's, not the last one's (L11).
--
-- Each function below is the live definition with only the marked change.

create or replace function public.record_pressure_test_stage(target_test_pack_id uuid, target_stage text, target_occurred_on date, target_idempotency_key text default null::text)
returns public.pressure_test_stage_events
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare pack public.test_packs; event_row public.pressure_test_stage_events; claimed jsonb; prior_date date;
begin
  pack := public.pressure_test_assert_pack(target_test_pack_id);
  if target_stage not in ('testing_started', 'testing_completed', 'precommissioning_completed') then raise exception 'Unsupported pressure-test stage' using errcode = 'PQT08'; end if;
  -- Changed: testing_started needs completed blinding too, like every later stage.
  if not exists (select 1 from public.blinding_records where test_pack_id = pack.id) then raise exception 'Blinding must be completed first' using errcode = 'PQT09'; end if;
  if target_stage = 'testing_completed' and not exists (select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_started') then raise exception 'Testing must be started first' using errcode = 'PQT10'; end if;
  if target_stage = 'precommissioning_completed' and not exists (select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_completed') then raise exception 'Testing must be completed first' using errcode = 'PQT11'; end if;
  if target_stage = 'precommissioning_completed' and exists (
    select 1
    from public.flange_joint_readiness flange
    join public.test_pack_isometrics member on member.isometric_id = flange.isometric_id
    where member.test_pack_id = pack.id
      and member.removed_at is null
      and flange.revision_status = 'accepted'
      and not flange.is_removed
      and flange.requires_reinstatement
      and flange.category_code = 'Y'
      and not exists (
        select 1
        from public.flange_reinstatement_records reinstatement
        where reinstatement.flange_joint_revision_id = flange.flange_joint_revision_id
          and reinstatement.superseded_at is null
      )
  ) then raise exception 'Every Y flange must be reinstated before pre-commissioning' using errcode = 'PQT16'; end if;
  select max(occurred_on) into prior_date from public.pressure_test_stage_events where test_pack_id = pack.id;
  if prior_date is not null and target_occurred_on < prior_date then raise exception 'Pressure-test dates must be monotonic' using errcode = 'PQT12'; end if;
  claimed := public.claim_command_receipt(pack.project_id, 'record_pressure_test_stage', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into event_row from public.pressure_test_stage_events where id = (claimed -> 'result' ->> 'id')::uuid; return event_row; end if;
  insert into public.pressure_test_stage_events(project_id, test_pack_id, stage, occurred_on, recorded_by) values (pack.project_id, pack.id, target_stage, target_occurred_on, auth.uid()) returning * into event_row;
  perform public.complete_command_receipt(pack.project_id, 'record_pressure_test_stage', target_idempotency_key, jsonb_build_object('id', event_row.id));
  return event_row;
end;
$$;

create or replace function public.assign_reinstatement(target_test_pack_id uuid, target_flange_joint_revision_ids uuid[], target_team_id uuid, target_assigned_on date, target_idempotency_key text default null::text)
returns public.pressure_test_requests
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare pack public.test_packs; team public.project_teams; request_row public.pressure_test_requests; flange_id uuid; flange record; claimed jsonb; next_number integer;
begin
  pack := public.pressure_test_assert_pack(target_test_pack_id);
  select * into team from public.project_teams where id = target_team_id and project_id = pack.project_id and status = 'active' and team_type = 'reinstatement';
  if not found then raise exception 'Reinstatement team is missing, inactive, or wrong type' using errcode = 'PQC97'; end if;
  if coalesce(array_length(target_flange_joint_revision_ids, 1), 0) = 0 then raise exception 'At least one flange is required' using errcode = 'PQT13'; end if;
  foreach flange_id in array target_flange_joint_revision_ids loop
    select * into flange from public.flange_joint_readiness where flange_joint_revision_id = flange_id and revision_status = 'accepted' and not is_removed and isometric_id in (select isometric_id from public.test_pack_isometrics where test_pack_id = pack.id and removed_at is null);
    if not found or not flange.requires_reinstatement then raise exception 'Flange is not an eligible current Y/Z reinstatement target' using errcode = 'PQT14'; end if;
    -- Changed: Y waits for the completed test, Z for completed pre-commissioning.
    if flange.category_code = 'Y' and not exists (select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_completed') then raise exception 'Y flanges are reinstated after testing is completed' using errcode = 'PQT17'; end if;
    if flange.category_code = 'Z' and not exists (select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'precommissioning_completed') then raise exception 'Z flanges are reinstated after pre-commissioning is completed' using errcode = 'PQT18'; end if;
  end loop;
  claimed := public.claim_command_receipt(pack.project_id, 'assign_reinstatement', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into request_row from public.pressure_test_requests where id = (claimed -> 'result' ->> 'id')::uuid; return request_row; end if;
  select count(*) + 1 into next_number from public.pressure_test_requests where project_id = pack.project_id and request_type = 'reinstatement';
  insert into public.pressure_test_requests(project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
  values (pack.project_id, 'reinstatement', pack.id, pack.revision_no, team.id, target_assigned_on, format('RI-%s', lpad(next_number::text, 6, '0')), auth.uid()) returning * into request_row;
  foreach flange_id in array target_flange_joint_revision_ids loop
    select * into flange from public.flange_joint_readiness where flange_joint_revision_id = flange_id;
    insert into public.reinstatement_request_items(request_id, project_id, test_pack_id, flange_joint_revision_id, category_snapshot, timing_snapshot) values (request_row.id, pack.project_id, pack.id, flange_id, flange.category_code, flange.timing);
  end loop;
  perform public.complete_command_receipt(pack.project_id, 'assign_reinstatement', target_idempotency_key, jsonb_build_object('id', request_row.id));
  return request_row;
end;
$$;

create or replace function public.record_support_progress(
  target_support_revision_id uuid,
  installed_on date,
  idempotency_key text default null
)
returns public.support_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owning_spool_revision_id uuid;
  ctx public.spool_context;
  claim jsonb;
  created public.support_progress_records;
begin
  select supr.spool_revision_id into owning_spool_revision_id
  from public.support_revisions supr where supr.id = target_support_revision_id;

  if owning_spool_revision_id is null then
    raise exception 'The support revision was not found' using errcode = 'PQC30';
  end if;

  ctx := public.assert_construction_target(
    owning_spool_revision_id, 'fabrication.progress.record');

  claim := public.claim_command_receipt(ctx.project_id, 'record_support_progress', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into created from public.support_progress_records
    where id = (claim -> 'result' ->> 'record_id')::uuid;
    return created;
  end if;

  if installed_on is null then
    raise exception 'An installation date is required' using errcode = '23514';
  end if;

  -- Changed: a support recorded on site is not rewritten from the shop.
  if exists (
    select 1 from public.support_progress_records
    where support_revision_id = target_support_revision_id and phase <> 'fabrication'
  ) then
    raise exception 'The support is already recorded as installed on site' using errcode = 'PQC59';
  end if;

  insert into public.support_progress_records (
    project_id, support_revision_id, spool_revision_id, installed_on, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_support_revision_id, owning_spool_revision_id, installed_on,
    nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  )
  on conflict (support_revision_id) do update set installed_on = excluded.installed_on
  returning * into created;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'support_progress_records', created.id,
    'record_support_progress', null, to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_support_progress', idempotency_key, jsonb_build_object('record_id', created.id));

  return created;
end;
$$;

create or replace function public.record_field_support_progress(
  target_support_revision_id uuid,
  installed_on date,
  idempotency_key text default null
)
returns public.support_progress_records
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  owning_spool_revision_id uuid;
  context public.spool_context;
  claimed jsonb;
  created public.support_progress_records;
begin
  select support.spool_revision_id into owning_spool_revision_id
  from public.support_revisions support
  where support.id = target_support_revision_id;
  if owning_spool_revision_id is null then
    raise exception 'The support revision was not found' using errcode = 'PQC30';
  end if;
  context := public.assert_construction_target(owning_spool_revision_id, 'erection.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'record_field_support_progress', idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into created from public.support_progress_records
    where id = (claimed -> 'result' ->> 'record_id')::uuid;
    return created;
  end if;
  if installed_on is null then
    raise exception 'An installation date is required' using errcode = '23514';
  end if;
  -- Changed: a support recorded in the shop is not rewritten from site.
  if exists (
    select 1 from public.support_progress_records
    where support_revision_id = target_support_revision_id and phase <> 'erection'
  ) then
    raise exception 'The support is already recorded as installed in the shop' using errcode = 'PQC59';
  end if;
  insert into public.support_progress_records (
    project_id, support_revision_id, spool_revision_id, phase, installed_on,
    receipt_id, recorded_by
  ) values (
    context.project_id, target_support_revision_id, owning_spool_revision_id, 'erection', installed_on,
    nullif(claimed ->> 'receipt_id', '')::uuid, auth.uid()
  )
  on conflict (support_revision_id) do update
    set installed_on = excluded.installed_on
  returning * into created;
  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    context.project_id, auth.uid(), 'support_progress_records', created.id,
    'record_field_support_progress', null, to_jsonb(created)
  );
  perform public.complete_command_receipt(
    context.project_id, 'record_field_support_progress', idempotency_key,
    jsonb_build_object('record_id', created.id)
  );
  return created;
end;
$$;

-- Changed: a pack is RFT only when every member resolves to an accepted revision, and it became
-- RFT when its last member did.
create or replace view public.test_pack_readiness with (security_invoker = true) as
select pack.id as test_pack_id,
  pack.project_id,
  pack.test_pack_number,
  pack.revision_no,
  pack.lifecycle,
  (count(member.id) filter (where member.removed_at is null))::integer as member_count,
  (count(readiness.isometric_id))::integer as current_member_count,
  (coalesce(sum(readiness.spool_total), 0::bigint))::integer as spool_total,
  (coalesce(sum(readiness.weld_total), 0::bigint))::integer as weld_total,
  (coalesce(sum(readiness.flange_total), 0::bigint))::integer as flange_total,
  (coalesce(sum((readiness.blocker_counts ->> 'NO_SPOOLS')::integer), 0::bigint))::integer as no_spools_count,
  (coalesce(sum((readiness.blocker_counts ->> 'WELD_OR_SUPPORT_PENDING')::integer), 0::bigint))::integer as weld_or_support_pending_count,
  (coalesce(sum((readiness.blocker_counts ->> 'FLANGE_PENDING')::integer), 0::bigint))::integer as flange_pending_count,
  (coalesce(sum((readiness.blocker_counts ->> 'NDE_PENDING')::integer), 0::bigint))::integer as nde_pending_count,
  (coalesce(sum((readiness.blocker_counts ->> 'PWHT_PENDING')::integer), 0::bigint))::integer as pwht_pending_count,
  (coalesce(sum((readiness.blocker_counts ->> 'LINE_CHECK_PENDING')::integer), 0::bigint))::integer as line_check_pending_count,
  (coalesce(sum((readiness.blocker_counts ->> 'X_OPEN')::integer), 0::bigint))::integer as x_open_count,
  coalesce(sum(readiness.unit_time), 0::numeric) as unit_time,
  (
    coalesce(bool_and(readiness.is_rft) filter (where readiness.isometric_id is not null), false)
    and pack.lifecycle = 'active'
    and count(member.id) filter (where member.removed_at is null) > 0
    and count(member.id) filter (where member.removed_at is null) = count(readiness.isometric_id)
  ) as is_rft,
  case
    when coalesce(bool_and(readiness.is_rft) filter (where readiness.isometric_id is not null), false)
      and pack.lifecycle = 'active'
      and count(member.id) filter (where member.removed_at is null) > 0
      and count(member.id) filter (where member.removed_at is null) = count(readiness.isometric_id)
    then max(readiness.rft_on)
  end as rft_on
from public.test_packs pack
left join public.test_pack_isometrics member on member.test_pack_id = pack.id and member.removed_at is null
left join public.isometric_readiness readiness on readiness.isometric_id = member.isometric_id
group by pack.id;
