-- Track 06 corrections.
--
-- Forward-only per the plan's execution policy: every change here is a
-- `create or replace` in a new file, no applied migration is edited.
--
-- Defects corrected (plan section references in brackets):
--   1. eligible_tracer_candidates leaked joints from every project [3.4]
--   2. a rejected original created R1 but none of the two mandatory tracers [7 row 2]
--   3. the responsible welder was never persisted on the obligation, so the
--      population was not stable down the repair/tracer chain [3.4, task 5 step 3]
--   4. a rejected result froze the joint, making the R1 repair unrecordable [3.3]
--   5. no PQC45 scope refusal existed anywhere [7 row 8]
--   6. allocate_nde_batch_candidates ignored target_percentage [3.7]
--   7. PQC40 was raised for an invalid category code instead of a
--      heterogeneous batch, and heterogeneity was never checked [4]
--   8. evaluate_nde_penalty ran after accepted results too [task 6 step 2]
--   9. record_nde_result swallowed undefined_function, so a signature drift in
--      either derivation call would have been a silent no-op [1]

-- ---------------------------------------------------------------------------
-- 1. Tracer candidate population
-- ---------------------------------------------------------------------------
-- `select isometric_id from public.isometrics` named no column of that table,
-- so PostgreSQL resolved it to the outer `rev.isometric_id`. The predicate
-- degraded to "the project owns at least one isometric" and every joint in the
-- database became an eligible tracer. The population also has to be narrowed to
-- the parent's method and category: section 3.4 defines it as
-- (project, welder, category).
create or replace function public.eligible_tracer_candidates(
  target_obligation_id uuid
)
returns table (
  weld_joint_revision_id uuid,
  weld_number text,
  spool_number text,
  weld_on date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  parent_ob public.nde_obligations;
begin
  select * into parent_ob from public.nde_obligations where id = target_obligation_id;
  if parent_ob.id is null then
    raise exception 'The NDE obligation was not found' using errcode = 'PQC43';
  end if;

  return query
  select
    wjr.id as weld_joint_revision_id,
    wj.weld_number,
    s.spool_number,
    progress.weld_on
  from public.weld_joint_revisions wjr
  join public.weld_joints wj on wj.id = wjr.weld_joint_id
  join public.spool_revisions sr on sr.id = wjr.spool_revision_id
  join public.spools s on s.id = sr.spool_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
  where iso.project_id = parent_ob.project_id
    and not wjr.is_removed
    and rev.status = 'accepted'
    and wjr.id <> parent_ob.weld_joint_revision_id
    and exists (
      select 1 from public.nde_obligations population
      where population.weld_joint_revision_id = wjr.id
        and population.method = parent_ob.method
        and population.category_code = parent_ob.category_code
    )
    and not exists (
      select 1 from public.nde_obligations o
      where o.weld_joint_revision_id = wjr.id and o.disposition = 'rejected'
    )
    and not exists (
      select 1 from public.nde_obligations o
      where o.weld_joint_revision_id = wjr.id and o.cycle_kind = 'tracer'
    )
    and (
      parent_ob.responsible_welder_qualification_id is null
      or public.is_welder_on_joint(wjr.id, parent_ob.responsible_welder_qualification_id)
    )
  order by progress.weld_on asc nulls last, wj.weld_number asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Repair and tracer derivation
-- ---------------------------------------------------------------------------
-- Truth-table row 2 is "R1 created and mandatory, plus two first-level tracer
-- obligations". Only R1 was created. The two tracers now land on the first two
-- eligible candidates in the same deterministic (welded_on, weld_number) order
-- the batch allocator uses, so a QC engineer can explain the pick. Fewer than
-- two candidates yields fewer than two tracers rather than an exception: a
-- rejection must stay recordable in a project that has no other eligible joint.
create or replace function public.derive_repair_and_tracers(
  rejected_obligation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ob public.nde_obligations;
  candidate record;
  tracer_spool_revision_id uuid;
begin
  select * into ob from public.nde_obligations where id = rejected_obligation_id;
  if ob.id is null or ob.disposition <> 'rejected' then
    return false;
  end if;

  if ob.cycle_kind = 'original' then
    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, category_code,
      responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
    ) values (
      ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
      ob.required_coverage, ob.selection_mode, ob.category_code,
      ob.responsible_welder_qualification_id, 'repair', 1, ob.id
    ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;

    for candidate in
      select c.weld_joint_revision_id
      from public.eligible_tracer_candidates(ob.id) c
      limit 2
    loop
      select wjr.spool_revision_id into tracer_spool_revision_id
      from public.weld_joint_revisions wjr
      where wjr.id = candidate.weld_joint_revision_id;

      insert into public.nde_obligations (
        project_id, weld_joint_revision_id, spool_revision_id, method,
        required_coverage, selection_mode, category_code,
        responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
      ) values (
        ob.project_id, candidate.weld_joint_revision_id, tracer_spool_revision_id, ob.method,
        ob.required_coverage, ob.selection_mode, ob.category_code,
        ob.responsible_welder_qualification_id, 'tracer', 1, ob.id
      ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
    end loop;

    return true;

  elsif ob.cycle_kind = 'repair' then
    if ob.cycle_ordinal = 1 then
      insert into public.nde_obligations (
        project_id, weld_joint_revision_id, spool_revision_id, method,
        required_coverage, selection_mode, category_code,
        responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
      ) values (
        ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
        ob.required_coverage, ob.selection_mode, ob.category_code,
        ob.responsible_welder_qualification_id, 'repair', 2, ob.id
      ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
      return true;
    elsif ob.cycle_ordinal >= 2 then
      raise exception 'This repair cycle is not allowed. R2 follows a rejected R1; there is no R3'
        using errcode = 'PQC44';
    end if;

  elsif ob.cycle_kind = 'tracer' then
    -- A rejected tracer escalates through evaluate_nde_penalty, not through a
    -- derived obligation. A second-level tracer is assigned deliberately with
    -- assign_tracer_obligation.
    return true;
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Batch allocation honours the requested percentage, and PQC40 means what
--    section 4 says it means
-- ---------------------------------------------------------------------------
create or replace function public.create_nde_batch(
  target_project_id uuid,
  method public.ndt_method,
  category_code text,
  welder_id uuid default null,
  subcontractor_id uuid default null,
  batch_number_override text default null,
  idempotency_key text default null
)
returns public.nde_batches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claim jsonb;
  created public.nde_batches;
  generated_batch_number text;
  seq_num int;
begin
  if not public.current_user_has_capability(target_project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
  end if;

  -- PQC40 is reserved for a heterogeneous batch (section 4). An unknown
  -- category code is an out-of-vocabulary value, not a mixed selection.
  if category_code not in ('S', 'SS', 'NR', 'H', 'HS', 'NDE100') then
    raise exception 'One of the values entered is not allowed by the project rules'
      using errcode = '23514';
  end if;

  claim := public.claim_command_receipt(target_project_id, 'create_nde_batch', idempotency_key);
  if claim ->> 'status' = 'completed' then
    select * into created from public.nde_batches
    where id = (claim -> 'result' ->> 'batch_id')::uuid;
    return created;
  end if;

  if batch_number_override is not null and trim(batch_number_override) <> '' then
    generated_batch_number := trim(batch_number_override);
  else
    select count(*) + 1 into seq_num from public.nde_batches where project_id = target_project_id;
    generated_batch_number := 'NB-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(seq_num::text, 4, '0');
  end if;

  insert into public.nde_batches (
    project_id, batch_number, method, category_code,
    responsible_welder_qualification_id, ndt_subcontractor_id,
    receipt_id, created_by
  ) values (
    target_project_id, generated_batch_number, method, category_code,
    welder_id, subcontractor_id,
    nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  ) returning * into created;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    target_project_id, auth.uid(), 'nde_batches', created.id,
    'create_nde_batch', to_jsonb(created)
  );

  perform public.complete_command_receipt(
    target_project_id, 'create_nde_batch', idempotency_key,
    jsonb_build_object('batch_id', created.id)
  );

  return created;
end;
$$;

-- The candidate list is now a function of its own so the count and the slice
-- read from one definition and cannot drift apart.
create or replace function public.nde_batch_candidates(
  target_batch_id uuid
)
returns table (
  candidate_obligation_id uuid,
  candidate_weld_number text,
  candidate_welded_on date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  batch_row public.nde_batches;
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  return query
  select
    o.id,
    wj.weld_number,
    progress.weld_on
  from public.nde_obligations o
  join public.weld_joint_revisions wjr on wjr.id = o.weld_joint_revision_id
  join public.weld_joints wj on wj.id = wjr.weld_joint_id
  join public.spool_revisions sr on sr.id = o.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
  where o.project_id = batch_row.project_id
    and o.method = batch_row.method
    and o.category_code = batch_row.category_code
    and o.disposition = 'pending'
    and not wjr.is_removed
    and rev.status = 'accepted'
    and not exists (select 1 from public.nde_batch_items bi where bi.obligation_id = o.id)
    and (
      batch_row.responsible_welder_qualification_id is null
      or public.is_welder_on_joint(wjr.id, batch_row.responsible_welder_qualification_id)
    )
  order by progress.weld_on asc nulls last, wj.weld_number asc;
end;
$$;

-- target_percentage was accepted and then ignored: every candidate was always
-- allocated, so a 10 % spot rule produced a 100 % batch. The order is unchanged,
-- so the first N of the same deterministic list is itself deterministic.
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
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  if not public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
  end if;

  if batch_row.status <> 'draft' then
    raise exception 'This batch is not in a state that allows that action' using errcode = 'PQC41';
  end if;

  claim := public.claim_command_receipt(batch_row.project_id, 'allocate_nde_batch_candidates', idempotency_key);
  if claim ->> 'status' = 'completed' then
    return (claim -> 'result' ->> 'allocated_count')::int;
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
      'target_percentage', effective_percentage
    )
  );

  perform public.complete_command_receipt(
    batch_row.project_id, 'allocate_nde_batch_candidates', idempotency_key,
    jsonb_build_object('allocated_count', allocated_count)
  );

  return allocated_count;
end;
$$;

-- Issuing is where PQC40 becomes provable: nothing may leave for a
-- subcontractor as one batch unless every item shares the batch's method,
-- category and project.
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
  item_count int;
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  if not public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
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
           or o.category_code <> batch_row.category_code
           or o.project_id <> batch_row.project_id)
  ) then
    raise exception 'A batch must cover one method, one category and one welder. Split this selection'
      using errcode = 'PQC40';
  end if;

  claim := public.claim_command_receipt(batch_row.project_id, 'issue_nde_batch', idempotency_key);
  if claim ->> 'status' = 'completed' then
    select * into updated from public.nde_batches where id = target_batch_id;
    return updated;
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
    batch_row.project_id, auth.uid(), 'nde_batches', updated.id,
    'issue_nde_batch', to_jsonb(batch_row), to_jsonb(updated)
  );

  perform public.complete_command_receipt(
    batch_row.project_id, 'issue_nde_batch', idempotency_key,
    jsonb_build_object('batch_id', updated.id)
  );

  return updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Recording a result
-- ---------------------------------------------------------------------------
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
  -- The parameter shares its name with the nde_obligations column it is written
  -- to, which makes the UPDATE below an ambiguous reference. Alias it once.
  named_welder_id uuid := responsible_welder_qualification_id;
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

  -- PQC45: section 4 and truth-table row 8. Nothing raised this before.
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

  claim := public.claim_command_receipt(ctx.project_id, 'record_nde_result', idempotency_key);
  if claim ->> 'status' = 'completed' then
    select * into created from public.nde_results
    where id = (claim -> 'result' ->> 'result_id')::uuid;
    return created;
  end if;

  insert into public.nde_results (
    project_id, obligation_id, batch_item_id, outcome,
    examined_on, report_number, defect_rework_code_id,
    responsible_welder_qualification_id, comment, receipt_id, recorded_by
  ) values (
    ctx.project_id, target_obligation_id, batch_item_row.id, outcome,
    examined_on, report_number, defect_rework_code_id,
    named_welder_id, comment,
    nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  ) returning * into created;

  -- The welder the report names is what makes the population stable down the
  -- repair and tracer chain (task 5 step 3). Nothing persisted it before, so
  -- every derived obligation inherited a null.
  if outcome = 'accepted' then
    update public.nde_obligations
    set disposition = 'satisfied',
        satisfied_at = timezone('utc', now()),
        satisfied_by = auth.uid(),
        responsible_welder_qualification_id = coalesce(
          named_welder_id, obligation_row.responsible_welder_qualification_id)
    where id = target_obligation_id;
  else
    update public.nde_obligations
    set disposition = 'rejected',
        responsible_welder_qualification_id = coalesce(
          named_welder_id, obligation_row.responsible_welder_qualification_id)
    where id = target_obligation_id;
  end if;

  -- The Track 05 lock reads "locked after an accepted NDE result". Locking on a
  -- rejection froze weld_point_assignments (PQC36) and made the mandatory R1
  -- repair impossible to record against its welder.
  if outcome = 'accepted' then
    perform set_config('pipeqc.weld_correction', 'on', true);
    update public.weld_progress_records
    set is_locked = true, locked_at = coalesce(locked_at, timezone('utc', now()))
    where weld_joint_revision_id = obligation_row.weld_joint_revision_id and not is_locked;
    perform set_config('pipeqc.weld_correction', 'off', true);
  end if;

  -- No `exception when undefined_function` wrapper: a missing or renamed
  -- derivation must be a loud failure, never a silent skip.
  if outcome = 'rejected' then
    perform public.derive_repair_and_tracers(target_obligation_id);
    perform public.evaluate_nde_penalty(
      ctx.project_id, named_welder_id, obligation_row.category_code);
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
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  if not public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
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

  claim := public.claim_command_receipt(batch_row.project_id, 'close_nde_batch', idempotency_key);
  if claim ->> 'status' = 'completed' then
    select * into updated from public.nde_batches where id = target_batch_id;
    return updated;
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
    batch_row.project_id, auth.uid(), 'nde_batches', updated.id,
    'close_nde_batch', to_jsonb(batch_row), to_jsonb(updated)
  );

  perform public.complete_command_receipt(
    batch_row.project_id, 'close_nde_batch', idempotency_key,
    jsonb_build_object('batch_id', updated.id)
  );

  return updated;
end;
$$;

revoke all on function public.nde_batch_candidates(uuid) from public, anon;
grant execute on function public.nde_batch_candidates(uuid) to authenticated;
