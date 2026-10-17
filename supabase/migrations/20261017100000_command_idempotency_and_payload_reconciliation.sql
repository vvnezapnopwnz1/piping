-- Migration: Unified idempotency receipt contract and payload reconciliation (F6 and B9).
--
-- 1. claim_command_receipt verifies target_payload against stored payload_hash.
--    Replay with identical payload returns stored result (or in-flight PQC38).
--    Replay with differing payload raises PQC60 (Idempotency key reused with another payload).
-- 2. Affected commands (record_nde_result, allocate_nde_batch_candidates, issue_nde_batch,
--    close_nde_batch, record_pressure_test_stage) check completed receipt before state/preconditions,
--    preventing false refusals (PQC41, PQC42, PQT12) on retries of already completed actions.

alter table public.command_receipts
  add column if not exists payload_hash text;

create or replace function public.claim_command_receipt(
  target_project_id uuid,
  target_command_name text,
  target_idempotency_key text,
  target_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  receipt public.command_receipts;
  calc_hash text;
begin
  if coalesce(trim(target_idempotency_key), '') = '' then
    return jsonb_build_object('status', 'unkeyed');
  end if;

  if target_payload is not null then
    calc_hash := md5(target_payload::text);
  end if;

  insert into public.command_receipts (
    project_id, command_name, idempotency_key, actor_id, payload_hash
  )
  values (
    target_project_id, trim(target_command_name), trim(target_idempotency_key),
    auth.uid(), calc_hash
  )
  on conflict (project_id, command_name, idempotency_key) do nothing
  returning * into receipt;

  if found then
    return jsonb_build_object('status', 'claimed', 'receipt_id', receipt.id);
  end if;

  select * into receipt from public.command_receipts
  where project_id = target_project_id and command_name = trim(target_command_name)
    and idempotency_key = trim(target_idempotency_key)
  for update;

  if receipt.payload_hash is not null and calc_hash is not null and receipt.payload_hash <> calc_hash then
    raise exception 'This command idempotency key was reused with another payload' using errcode = 'PQC60';
  end if;

  if receipt.completed_at is not null then
    return jsonb_build_object('status', 'completed', 'result', receipt.result);
  end if;

  raise exception 'This command is already in flight' using errcode = 'PQC38';
end;
$$;

create or replace function public.claim_command_receipt(
  target_project_id uuid,
  target_command_name text,
  target_idempotency_key text
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.claim_command_receipt(target_project_id, target_command_name, target_idempotency_key, null::jsonb);
$$;

revoke execute on function public.claim_command_receipt(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.claim_command_receipt(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_command_receipt(uuid, text, text) to postgres, service_role;
grant execute on function public.claim_command_receipt(uuid, text, text, jsonb) to postgres, service_role;

-- -----------------------------------------------------------------------------
-- NDE Commands (F6 / F07)
-- -----------------------------------------------------------------------------

create or replace function public.record_nde_result(
  target_obligation_id uuid,
  outcome text,
  examined_on date,
  report_number text default null,
  defect_rework_code_id uuid default null,
  responsible_welder_qualification_id uuid default null,
  comment text default null,
  idempotency_key text default null
)
returns public.nde_results
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  obligation_row public.nde_obligations;
  ctx public.weld_context;
  batch_item_row public.nde_batch_items;
  claim jsonb;
  created public.nde_results;
  joint_project_id uuid;
  joint_revision_status public.revision_status;
  joint_removed boolean;
  named_welder_id uuid := responsible_welder_qualification_id;
  normalized_payload jsonb;
begin
  select * into obligation_row from public.nde_obligations where id = target_obligation_id;
  if obligation_row.id is null then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
      using errcode = 'PQC42';
  end if;

  ctx := public.weld_joint_context(obligation_row.weld_joint_revision_id);

  if not public.current_user_has_capability(ctx.project_id, 'nde.result.record') then
    raise exception 'You do not have permission to record NDE results' using errcode = '42501';
  end if;

  if not public.current_user_in_pds_scope(ctx.project_id, ctx.pds_area_id) then
    raise exception 'This joint is outside your PDS area scope' using errcode = '42501';
  end if;

  normalized_payload := jsonb_build_object(
    'obligation_id', target_obligation_id,
    'outcome', outcome,
    'examined_on', examined_on,
    'report_number', report_number,
    'defect_rework_code_id', defect_rework_code_id,
    'responsible_welder_qualification_id', responsible_welder_qualification_id,
    'comment', comment
  );

  claim := public.claim_command_receipt(ctx.project_id, 'record_nde_result', idempotency_key, normalized_payload);
  if claim ->> 'status' = 'completed' then
    select * into created from public.nde_results
    where id = (claim -> 'result' ->> 'result_id')::uuid;
    return created;
  end if;

  select iso.project_id, rev.status, wjr.is_removed
    into joint_project_id, joint_revision_status, joint_removed
  from public.weld_joint_revisions wjr
  join public.spool_revisions sr on sr.id = wjr.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where wjr.id = obligation_row.weld_joint_revision_id;

  if joint_project_id is distinct from obligation_row.project_id
     or joint_revision_status <> 'accepted'
     or coalesce(joint_removed, true) then
    raise exception 'That obligation belongs to another project or to a superseded revision'
      using errcode = 'PQC45';
  end if;

  if obligation_row.disposition <> 'issued' then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
      using errcode = 'PQC42';
  end if;

  if exists (select 1 from public.nde_results where obligation_id = target_obligation_id) then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
      using errcode = 'PQC42';
  end if;

  if outcome not in ('accepted', 'rejected') then
    raise exception 'Outcome must be accepted or rejected' using errcode = 'PQC42';
  end if;

  if outcome = 'rejected' and defect_rework_code_id is null then
    raise exception 'A rejected result must carry a defect rework code' using errcode = 'PQC42';
  end if;

  if named_welder_id is not null then
    if not public.is_welder_on_joint(obligation_row.weld_joint_revision_id, named_welder_id) then
      raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
        using errcode = 'PQC42';
    end if;
  end if;

  select * into batch_item_row from public.nde_batch_items where obligation_id = target_obligation_id;

  insert into public.nde_results (
    project_id, obligation_id, batch_item_id, outcome,
    examined_on, report_number, defect_rework_code_id,
    responsible_welder_qualification_id, comment, receipt_id, recorded_by
  ) values (
    ctx.project_id, target_obligation_id, batch_item_row.id, outcome,
    examined_on, report_number, defect_rework_code_id,
    named_welder_id, comment, (claim ->> 'receipt_id')::uuid, auth.uid()
  ) returning * into created;

  if outcome = 'accepted' then
    update public.nde_obligations set disposition = 'satisfied' where id = target_obligation_id;
  else
    update public.nde_obligations set disposition = 'defective' where id = target_obligation_id;
    perform public.derive_repair_and_tracers(created.id);
  end if;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    ctx.project_id, auth.uid(), 'nde_results', created.id,
    'record_nde_result', to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_nde_result', idempotency_key,
    jsonb_build_object('result_id', created.id)
  );

  return created;
end;
$$;

create or replace function public.issue_nde_batch(
  target_batch_id uuid,
  idempotency_key text default null
)
returns public.nde_batches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  batch_row public.nde_batches;
  claim jsonb;
  updated public.nde_batches;
  item_count integer;
  normalized_payload jsonb;
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  if not public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
  end if;

  normalized_payload := jsonb_build_object('batch_id', target_batch_id);

  claim := public.claim_command_receipt(batch_row.project_id, 'issue_nde_batch', idempotency_key, normalized_payload);
  if claim ->> 'status' = 'completed' then
    select * into updated from public.nde_batches where id = target_batch_id;
    return updated;
  end if;

  if batch_row.status <> 'draft' then
    raise exception 'This batch is not in a state that allows that action' using errcode = 'PQC41';
  end if;

  select count(*) into item_count from public.nde_batch_items where batch_id = target_batch_id;
  if item_count = 0 then
    raise exception 'This batch is not in a state that allows that action' using errcode = 'PQC41';
  end if;

  if exists (
    select 1
    from public.nde_batch_items bi
    join public.nde_obligations o on o.id = bi.obligation_id
    where bi.batch_id = target_batch_id
      and (o.method <> batch_row.method
           or o.coverage_regime <> batch_row.coverage_regime
           or o.project_id <> batch_row.project_id)
  ) then
    raise exception 'A batch must cover one method, one category and one welder. Split this selection'
      using errcode = 'PQC40';
  end if;

  update public.nde_batches
  set status = 'issued', issued_on = coalesce(issued_on, current_date)
  where id = target_batch_id
  returning * into updated;

  update public.nde_obligations
  set disposition = 'issued'
  where id in (select obligation_id from public.nde_batch_items where batch_id = target_batch_id);

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    batch_row.project_id, auth.uid(), 'nde_batches', batch_row.id,
    'issue_nde_batch', to_jsonb(batch_row), to_jsonb(updated)
  );

  perform public.complete_command_receipt(
    batch_row.project_id, 'issue_nde_batch', idempotency_key,
    jsonb_build_object('batch_id', updated.id)
  );

  return updated;
end;
$$;

create or replace function public.close_nde_batch(
  target_batch_id uuid,
  report_number_override text default null,
  returned_on_date date default null,
  idempotency_key text default null
)
returns public.nde_batches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  batch_row public.nde_batches;
  claim jsonb;
  updated public.nde_batches;
  unexamined_count int;
  normalized_payload jsonb;
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  if not public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
  end if;

  normalized_payload := jsonb_build_object(
    'batch_id', target_batch_id,
    'report_number_override', report_number_override,
    'returned_on_date', returned_on_date
  );

  claim := public.claim_command_receipt(batch_row.project_id, 'close_nde_batch', idempotency_key, normalized_payload);
  if claim ->> 'status' = 'completed' then
    select * into updated from public.nde_batches where id = target_batch_id;
    return updated;
  end if;

  if batch_row.status <> 'issued' then
    raise exception 'This batch is not in a state that allows that action' using errcode = 'PQC41';
  end if;

  select count(*) into unexamined_count
  from public.nde_batch_items bi
  where bi.batch_id = target_batch_id
    and not exists (select 1 from public.nde_results r where r.batch_item_id = bi.id);

  if unexamined_count > 0 then
    raise exception 'This batch is not in a state that allows that action' using errcode = 'PQC41';
  end if;

  update public.nde_batches
  set status = 'closed',
      returned_on = coalesce(returned_on_date, returned_on, current_date),
      closed_on = current_date,
      report_number = coalesce(report_number_override, report_number)
  where id = target_batch_id
  returning * into updated;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    batch_row.project_id, auth.uid(), 'nde_batches', batch_row.id,
    'close_nde_batch', to_jsonb(batch_row), to_jsonb(updated)
  );

  perform public.complete_command_receipt(
    batch_row.project_id, 'close_nde_batch', idempotency_key,
    jsonb_build_object('batch_id', updated.id)
  );

  return updated;
end;
$$;

create or replace function public.allocate_nde_batch_candidates(
  target_batch_id uuid,
  target_percentage numeric default 100,
  idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  batch_row public.nde_batches;
  claim jsonb;
  candidate_record record;
  allocated_count int := 0;
  effective_percentage numeric;
  candidate_total int;
  candidate_target int;
  normalized_payload jsonb;
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  if not public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
  end if;

  normalized_payload := jsonb_build_object(
    'batch_id', target_batch_id,
    'percentage', target_percentage
  );

  claim := public.claim_command_receipt(batch_row.project_id, 'allocate_nde_batch_candidates', idempotency_key, normalized_payload);
  if claim ->> 'status' = 'completed' then
    return (claim -> 'result' ->> 'allocated_count')::int;
  end if;

  if batch_row.status <> 'draft' then
    raise exception 'This batch is not in a state that allows that action' using errcode = 'PQC41';
  end if;

  effective_percentage := least(greatest(coalesce(target_percentage, 100), 0), 100);

  select count(*)::int into candidate_total
  from public.nde_batch_candidates(target_batch_id) c;

  candidate_target := ceil(candidate_total * effective_percentage / 100.0)::int;

  for candidate_record in
    select c.candidate_obligation_id
    from public.nde_batch_candidates(target_batch_id) c
    limit candidate_target
  loop
    insert into public.nde_batch_items (batch_id, obligation_id)
    values (batch_row.id, candidate_record.candidate_obligation_id)
    on conflict (obligation_id) do nothing;

    if found then
      allocated_count := allocated_count + 1;
    end if;
  end loop;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    batch_row.project_id, auth.uid(), 'nde_batches', batch_row.id,
    'allocate_nde_batch_candidates',
    jsonb_build_object(
      'allocated_count', allocated_count,
      'candidate_total', candidate_total,
      'target_percentage', target_percentage
    )
  );

  perform public.complete_command_receipt(
    batch_row.project_id, 'allocate_nde_batch_candidates', idempotency_key,
    jsonb_build_object('allocated_count', allocated_count)
  );

  return allocated_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Pressure Test Stage (F6)
-- -----------------------------------------------------------------------------

create or replace function public.record_pressure_test_stage(
  target_test_pack_id uuid,
  target_stage text,
  target_occurred_on date,
  target_idempotency_key text default null::text
)
returns public.pressure_test_stage_events
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  pack public.test_packs;
  event_row public.pressure_test_stage_events;
  claimed jsonb;
  prior_date date;
  normalized_payload jsonb;
begin
  pack := public.pressure_test_assert_pack(target_test_pack_id);

  normalized_payload := jsonb_build_object(
    'test_pack_id', target_test_pack_id,
    'stage', target_stage,
    'occurred_on', target_occurred_on
  );

  claimed := public.claim_command_receipt(pack.project_id, 'record_pressure_test_stage', target_idempotency_key, normalized_payload);
  if claimed ->> 'status' = 'completed' then
    select * into event_row from public.pressure_test_stage_events where id = (claimed -> 'result' ->> 'id')::uuid;
    return event_row;
  end if;

  if target_stage not in ('testing_started', 'testing_completed', 'precommissioning_completed') then
    raise exception 'Unsupported pressure-test stage' using errcode = 'PQT08';
  end if;

  if not exists (select 1 from public.blinding_records where test_pack_id = pack.id) then
    raise exception 'Blinding must be completed first' using errcode = 'PQT09';
  end if;

  if target_stage = 'testing_completed' and not exists (
    select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_started'
  ) then
    raise exception 'Testing must be started first' using errcode = 'PQT10';
  end if;

  if target_stage = 'precommissioning_completed' and not exists (
    select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_completed'
  ) then
    raise exception 'Testing must be completed first' using errcode = 'PQT11';
  end if;

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
  ) then
    raise exception 'Every Y flange must be reinstated before pre-commissioning' using errcode = 'PQT16';
  end if;

  select max(occurred_on) into prior_date from public.pressure_test_stage_events where test_pack_id = pack.id;
  if prior_date is not null and target_occurred_on < prior_date then
    raise exception 'Pressure-test dates must be monotonic' using errcode = 'PQT12';
  end if;

  insert into public.pressure_test_stage_events (
    project_id, test_pack_id, stage, occurred_on, recorded_by
  ) values (
    pack.project_id, pack.id, target_stage, target_occurred_on, auth.uid()
  ) returning * into event_row;

  perform public.complete_command_receipt(
    pack.project_id, 'record_pressure_test_stage', target_idempotency_key,
    jsonb_build_object('id', event_row.id)
  );

  return event_row;
end;
$$;
