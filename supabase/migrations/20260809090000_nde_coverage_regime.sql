-- Track 06 follow-up: the NDE category was the wrong model, and the NDE100
-- escalation had no effect.
--
-- The plan's section 3.6 left the six "category codes" as an open question and
-- asked for a stop-and-report before Task 2. That report was never made, and
-- the column shipped filled with `case when coverage >= 100 then 'NDE100' else 'S' end`.
--
-- The answer is in the project's own documentation. Per the Easy Piping manual
-- dossier (docs/research/2026-07-30-easy-piping-documentation-dossier.md, 19.6)
-- and the demo implementation in lib/nde-status.ts, S / SS / NR / H / HS /
-- T1 / T2 are *per-joint selection statuses inside a batch* - a state machine
-- running candidate -> selected -> released - and not populations at all:
--
--   S    candidate, not yet selected        H   mandatory 100 %, not selected
--   SS   selected, awaiting examination     HS  mandatory 100 %, selected
--   NR   released with the batch, not examined
--   T1/T2, T1S/T2S   tracer candidate / selected tracer
--
-- What actually discriminates a population is the coverage regime the NDE
-- matrix rule assigns: a spot rate (10 %, 20 %) or mandatory 100 %. So
-- `category_code` becomes `coverage_regime`, sourced from the rule instead of
-- invented, and the manual's labels are derived on read by
-- nde_joint_status_label - nothing about them is stored, so no second status
-- can drift out of step with `disposition`.
--
-- The escalation is the other half. nde_penalty_populations was written and
-- then read by nothing: no obligation changed, no batch changed, no screen
-- showed it. Manual 19.10 says the escalation selects every remaining weld at
-- 100 %. evaluate_nde_penalty now does that, and records the batch that
-- triggered it.

-- ---------------------------------------------------------------------------
-- 1. coverage_regime replaces category_code
-- ---------------------------------------------------------------------------
alter table public.nde_obligations
  add column coverage_regime text not null default 'spot'
    check (coverage_regime in ('spot', 'mandatory_100'));

update public.nde_obligations
set coverage_regime = case
  when category_code = 'NDE100' or required_coverage >= 100 then 'mandatory_100'
  else 'spot'
end;

alter table public.nde_obligations drop column category_code;

alter table public.nde_batches
  add column coverage_regime text not null default 'spot'
    check (coverage_regime in ('spot', 'mandatory_100'));

update public.nde_batches
set coverage_regime = case when category_code = 'NDE100' then 'mandatory_100' else 'spot' end;

alter table public.nde_batches drop column category_code;

-- A welder is either on 100 % control or not; the regime was never part of that
-- identity, it only ever came along for the ride from the old category column.
-- Dropping the column takes the composite unique with it, so the new key is
-- added afterwards rather than guessing the generated constraint name.
alter table public.nde_penalty_populations drop column category_code;

alter table public.nde_penalty_populations
  add constraint nde_penalty_populations_welder_key
    unique (project_id, welder_qualification_id);

alter table public.nde_penalty_populations
  add column source_batch_id uuid references public.nde_batches(id) on delete set null,
  add column escalation_reason text
    check (escalation_reason in ('four_rejections', 'second_level_tracer'));

alter table public.nde_batches
  add column escalated_at timestamptz,
  add column escalation_reason text
    check (escalation_reason in ('four_rejections', 'second_level_tracer'));

-- ---------------------------------------------------------------------------
-- 2. The manual's joint status, derived rather than stored
-- ---------------------------------------------------------------------------
create or replace function public.nde_joint_status_label(
  disposition text,
  cycle_kind text,
  cycle_ordinal smallint,
  coverage_regime text
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    -- A tracer is a candidate (T1/T2) until it is selected into a batch, at
    -- which point the manual suffixes it with S.
    when cycle_kind = 'tracer' then
      'T' || cycle_ordinal::text
      || case when disposition in ('pending') then '' else 'S' end
    when cycle_kind = 'repair' then 'R' || cycle_ordinal::text
    when coverage_regime = 'mandatory_100' then
      case when disposition = 'pending' then 'H' else 'HS' end
    when disposition = 'satisfied' then 'NR'
    when disposition = 'pending' then 'S'
    else 'SS'
  end;
$$;

comment on function public.nde_joint_status_label(text, text, smallint, text) is
  'Easy Piping manual 19.6 joint status. Derived, never stored: disposition and '
  'cycle_kind are the truth, this is how the manual spells them.';

-- ---------------------------------------------------------------------------
-- 3. Obligations carry the regime the matrix rule gave them
-- ---------------------------------------------------------------------------
create or replace function public.generate_weld_obligations(ctx public.weld_context)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rule public.nde_matrix_rules;
  method_name text;
  coverage numeric;
  created_count integer := 0;
begin
  select * into rule
  from public.nde_matrix_rules matrix
  where matrix.project_id = ctx.project_id
    and matrix.service_class_id = ctx.service_class_id
    and matrix.weld_type_id = ctx.weld_type_id
    and matrix.weld_location = ctx.weld_location
    and matrix.status = 'active';

  if rule.id is null then
    raise exception
      'No active NDE matrix rule covers this service class, weld type and location'
      using errcode = 'PQC39';
  end if;

  foreach method_name in array array['rt', 'ut', 'mt', 'pt', 'pmi', 'ht']
  loop
    coverage := case method_name
      when 'rt' then rule.rt_coverage
      when 'ut' then rule.ut_coverage
      when 'mt' then rule.mt_coverage
      when 'pt' then rule.pt_coverage
      when 'pmi' then rule.pmi_coverage
      when 'ht' then rule.ht_coverage
    end;

    if coalesce(coverage, 0) <= 0 then
      continue;
    end if;

    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, coverage_regime, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      method_name::public.ndt_method, coverage,
      case when coverage >= 100 then 'full' else 'spot' end,
      -- The regime is the rule's, not a guess: a 100 % rate is mandatory
      -- coverage, anything less is a spot rate.
      case when coverage >= 100 then 'mandatory_100' else 'spot' end,
      rule.id
    )
    on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;

    if found then
      created_count := created_count + 1;
    end if;
  end loop;

  if rule.pwht_required
     and (rule.pwht_thickness_threshold is null
          or coalesce(ctx.thickness_mm, 0) >= rule.pwht_thickness_threshold) then
    insert into public.pwht_requirements (
      project_id, weld_joint_revision_id, spool_revision_id,
      thickness_threshold_mm, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      rule.pwht_thickness_threshold, rule.id
    )
    on conflict (weld_joint_revision_id) do nothing;
  end if;

  return created_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Batches, candidates and tracers speak of the regime
-- ---------------------------------------------------------------------------
-- `create or replace` cannot rename an input parameter, and category_code
-- becomes coverage_regime, so the old signature is dropped first.
drop function if exists public.create_nde_batch(uuid, public.ndt_method, text, uuid, uuid, text, text);

create function public.create_nde_batch(
  target_project_id uuid,
  method public.ndt_method,
  coverage_regime text,
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

  if coverage_regime not in ('spot', 'mandatory_100') then
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
    project_id, batch_number, method, coverage_regime,
    responsible_welder_qualification_id, ndt_subcontractor_id,
    receipt_id, created_by
  ) values (
    target_project_id, generated_batch_number, method, coverage_regime,
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
    and o.coverage_regime = batch_row.coverage_regime
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
           or o.coverage_regime <> batch_row.coverage_regime
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
        and population.coverage_regime = parent_ob.coverage_regime
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
    -- Manual 19.8: every repaired joint is mandatory 100 % for its method,
    -- whatever regime the original carried.
    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, coverage_regime,
      responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
    ) values (
      ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
      100, 'full', 'mandatory_100',
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
        required_coverage, selection_mode, coverage_regime,
        responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
      ) values (
        ob.project_id, candidate.weld_joint_revision_id, tracer_spool_revision_id, ob.method,
        ob.required_coverage, ob.selection_mode, ob.coverage_regime,
        ob.responsible_welder_qualification_id, 'tracer', 1, ob.id
      ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
    end loop;

    return true;

  elsif ob.cycle_kind = 'repair' then
    if ob.cycle_ordinal = 1 then
      insert into public.nde_obligations (
        project_id, weld_joint_revision_id, spool_revision_id, method,
        required_coverage, selection_mode, coverage_regime,
        responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
      ) values (
        ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
        100, 'full', 'mandatory_100',
        ob.responsible_welder_qualification_id, 'repair', 2, ob.id
      ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
      return true;
    elsif ob.cycle_ordinal >= 2 then
      raise exception 'This repair cycle is not allowed. R2 follows a rejected R1; there is no R3'
        using errcode = 'PQC44';
    end if;

  elsif ob.cycle_kind = 'tracer' then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.assign_tracer_obligation(
  target_parent_obligation_id uuid,
  tracer_weld_joint_revision_id uuid,
  idempotency_key text default null
)
returns public.nde_obligations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_ob public.nde_obligations;
  tracer_spool_revision_id uuid;
  tracer_ob public.nde_obligations;
  claim jsonb;
  target_ordinal smallint;
begin
  select * into parent_ob from public.nde_obligations where id = target_parent_obligation_id;
  if parent_ob.id is null then
    raise exception 'Parent obligation not found' using errcode = 'PQC43';
  end if;

  if not public.current_user_has_capability(parent_ob.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage tracer assignments' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.eligible_tracer_candidates(target_parent_obligation_id)
    where weld_joint_revision_id = tracer_weld_joint_revision_id
  ) then
    raise exception 'That joint cannot serve as a tracer: it is already used, or outside the eligible population'
      using errcode = 'PQC43';
  end if;

  select spool_revision_id into tracer_spool_revision_id
  from public.weld_joint_revisions where id = tracer_weld_joint_revision_id;

  target_ordinal := case when parent_ob.cycle_kind = 'tracer' then parent_ob.cycle_ordinal + 1 else 1 end;
  if target_ordinal > 2 then
    raise exception 'Maximum tracer ordinal exceeded' using errcode = 'PQC43';
  end if;

  claim := public.claim_command_receipt(parent_ob.project_id, 'assign_tracer_obligation', idempotency_key);
  if claim ->> 'status' = 'completed' then
    select * into tracer_ob from public.nde_obligations
    where id = (claim -> 'result' ->> 'obligation_id')::uuid;
    return tracer_ob;
  end if;

  insert into public.nde_obligations (
    project_id, weld_joint_revision_id, spool_revision_id, method,
    required_coverage, selection_mode, coverage_regime,
    responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
  ) values (
    parent_ob.project_id, tracer_weld_joint_revision_id, tracer_spool_revision_id, parent_ob.method,
    parent_ob.required_coverage, parent_ob.selection_mode, parent_ob.coverage_regime,
    parent_ob.responsible_welder_qualification_id, 'tracer', target_ordinal, parent_ob.id
  ) returning * into tracer_ob;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    parent_ob.project_id, auth.uid(), 'nde_obligations', tracer_ob.id,
    'assign_tracer_obligation', to_jsonb(tracer_ob)
  );

  perform public.complete_command_receipt(
    parent_ob.project_id, 'assign_tracer_obligation', idempotency_key,
    jsonb_build_object('obligation_id', tracer_ob.id)
  );

  return tracer_ob;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. The escalation now escalates
-- ---------------------------------------------------------------------------
-- Manual 19.10: the whole batch goes to 100 % when it has four rejected weld
-- points, or when any second-level tracer is rejected. The count is per batch,
-- which is what the manual and the roadmap both say; the second-level tracer
-- rule is per welder, because a tracer is examined wherever it lands.
--
-- The effect is what was missing. Every obligation of that welder still
-- awaiting a result is flipped to mandatory 100 % coverage and recorded as a
-- member of the snapshot, so the next allocation takes all of them. Welds made
-- after the snapshot do not retroactively join it (plan 3.4).
drop function if exists public.evaluate_nde_penalty(uuid, uuid, text);

create or replace function public.evaluate_nde_penalty(
  target_project_id uuid,
  welder_id uuid,
  source_batch_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rejection_count int := 0;
  has_rejected_t2 boolean := false;
  reason text;
  pop_id uuid;
  member_count int := 0;
begin
  -- Section 3.5: an unattributed rejection still forces the repair and its
  -- tracers, but no welder carries a penalty the report did not assign.
  if target_project_id is null or welder_id is null then
    return false;
  end if;

  select id into pop_id from public.nde_penalty_populations
  where project_id = target_project_id and welder_qualification_id = welder_id;
  if pop_id is not null then
    return true;
  end if;

  if source_batch_id is not null then
    select count(*)::int into rejection_count
    from public.nde_results r
    join public.nde_batch_items bi on bi.id = r.batch_item_id
    where bi.batch_id = source_batch_id and r.outcome = 'rejected';
  end if;

  select exists (
    select 1
    from public.nde_results r
    join public.nde_obligations o on o.id = r.obligation_id
    where r.project_id = target_project_id
      and r.responsible_welder_qualification_id = welder_id
      and o.cycle_kind = 'tracer'
      and o.cycle_ordinal = 2
      and r.outcome = 'rejected'
  ) into has_rejected_t2;

  if rejection_count >= 4 then
    reason := 'four_rejections';
  elsif has_rejected_t2 then
    reason := 'second_level_tracer';
  else
    return false;
  end if;

  insert into public.nde_penalty_populations (
    project_id, welder_qualification_id, source_batch_id, escalation_reason
  ) values (
    target_project_id, welder_id, source_batch_id, reason
  ) returning id into pop_id;

  if pop_id is null then
    raise exception 'The NDE100 population snapshot is missing or empty' using errcode = 'PQC46';
  end if;

  -- Everything this welder still owes a result on becomes mandatory 100 %.
  with remaining as (
    select o.id, o.weld_joint_revision_id
    from public.nde_obligations o
    where o.project_id = target_project_id
      and o.coverage_regime = 'spot'
      and o.disposition in ('pending', 'issued')
      and not exists (select 1 from public.nde_results r where r.obligation_id = o.id)
      and public.is_welder_on_joint(o.weld_joint_revision_id, welder_id)
  ), flipped as (
    update public.nde_obligations o
    set coverage_regime = 'mandatory_100', required_coverage = 100, selection_mode = 'full'
    from remaining
    where o.id = remaining.id
    returning o.weld_joint_revision_id
  )
  insert into public.nde_penalty_population_members (penalty_population_id, weld_joint_revision_id)
  select distinct pop_id, flipped.weld_joint_revision_id from flipped
  on conflict (penalty_population_id, weld_joint_revision_id) do nothing;

  get diagnostics member_count = row_count;

  if source_batch_id is not null then
    update public.nde_batches
    set escalated_at = coalesce(escalated_at, timezone('utc', now())),
        escalation_reason = coalesce(escalation_reason, reason)
    where id = source_batch_id;
  end if;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    target_project_id, auth.uid(), 'nde_penalty_populations', pop_id,
    'evaluate_nde_penalty',
    jsonb_build_object(
      'welder_qualification_id', welder_id,
      'reason', reason,
      'batch_id', source_batch_id,
      'obligations_escalated', member_count
    )
  );

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Recording a result, against the regime
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

  if outcome = 'accepted' then
    perform set_config('pipeqc.weld_correction', 'on', true);
    update public.weld_progress_records
    set is_locked = true, locked_at = coalesce(locked_at, timezone('utc', now()))
    where weld_joint_revision_id = obligation_row.weld_joint_revision_id and not is_locked;
    perform set_config('pipeqc.weld_correction', 'off', true);
  end if;

  if outcome = 'rejected' then
    perform public.derive_repair_and_tracers(target_obligation_id);
    perform public.evaluate_nde_penalty(
      ctx.project_id, named_welder_id,
      (select bi.batch_id from public.nde_batch_items bi where bi.id = batch_item_row.id));
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

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------
revoke all on function
  public.create_nde_batch(uuid, public.ndt_method, text, uuid, uuid, text, text),
  public.evaluate_nde_penalty(uuid, uuid, uuid),
  public.nde_joint_status_label(text, text, smallint, text)
from public, anon;

grant execute on function
  public.create_nde_batch(uuid, public.ndt_method, text, uuid, uuid, text, text),
  public.evaluate_nde_penalty(uuid, uuid, uuid),
  public.nde_joint_status_label(text, text, smallint, text)
to authenticated;
