-- A spot batch is a population, not a list of joints.
--
-- The matrix rule says "10 % of the welds of this class are examined". Allocation took that
-- share into the batch and left every other joint "waiting for a batch" for ever, so ten spot
-- joints at 10 % gave one examination and nine obligations that nothing could close, and the
-- spool they sit on never completed (docs/superpowers/specs/2026-10-17-testpacks-nde-redesign-design.md §7).
-- Easy Piping manual 19.7 reads it the other way: the batch is the population, the examined joints
-- are its sample, and once the sample is accepted the remaining joints are released.
--
-- What this changes:
--   * allocate_nde_batch_candidates, for a spot batch, takes the sample as before and reserves
--     the remaining candidates as the batch's population (nde_batch_population). A reserved joint
--     is not a candidate for another batch.
--   * close_nde_batch releases the population when the sample was accepted (the joints become
--     `waived`, which readiness already counts as done and the screens read NRW). When a sample
--     joint was rejected, the population is not judged: the reservation is lifted, the joints stay
--     pending for a later batch, and the repair/tracer path that rejection started carries on.
--   * only original obligations are reserved and released. A tracer or a repair is a mandatory
--     examination of its own and is never decided by somebody else's sample.
--
-- Mandatory 100 % batches are unchanged: they have no population, every joint is in the batch.

create table public.nde_batch_population (
  batch_id uuid not null references public.nde_batches(id) on delete cascade,
  obligation_id uuid not null references public.nde_obligations(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (batch_id, obligation_id),
  unique (obligation_id)
);

comment on table public.nde_batch_population is
  'Spot joints reserved by a batch: decided by the batch''s sample (waived when it is accepted, '
  'returned to the pool when it is not). The sample itself is in nde_batch_items.';

create index nde_batch_population_batch_id_idx on public.nde_batch_population (batch_id);

alter table public.nde_batch_population enable row level security;

create policy "nde_batch_population capability read" on public.nde_batch_population
  for select to authenticated
  using (
    exists (
      select 1 from public.nde_batches b
      where b.id = batch_id and b.project_id in (select private.user_project_ids('nde.view'::text))
    )
  );

revoke all on public.nde_batch_population from public, anon, authenticated;
grant select on public.nde_batch_population to authenticated;

-- ---------------------------------------------------------------------------
-- A reserved joint is not a candidate. Body of 20261015110000 plus the marked exclusion.
-- ---------------------------------------------------------------------------
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
  if auth.uid() is not null and not (
    public.current_user_has_capability(batch_row.project_id, 'nde.view')
    or public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage')
    or public.current_user_has_capability(batch_row.project_id, 'nde.result.record')
  ) then
    raise exception 'NDE is outside your project access' using errcode = '42501';
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
    -- Added: a joint another batch already holds in its population is decided by that batch.
    and not exists (select 1 from public.nde_batch_population bp where bp.obligation_id = o.id)
    and (
      batch_row.responsible_welder_qualification_id is null
      or public.is_welder_on_joint(wjr.id, batch_row.responsible_welder_qualification_id)
    )
  order by progress.weld_on asc nulls last, wj.weld_number asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Allocation: the sample into the batch, the rest of a spot batch into its population.
-- Body of 20261017100000 plus the marked parts.
-- ---------------------------------------------------------------------------
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
  population_count int := 0;
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

  -- Added: allocating again on a draft re-reads the whole pool, so the reservation of the last
  -- call is given back first.
  delete from public.nde_batch_population where batch_id = target_batch_id;

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

  -- Added: whoever is left of a spot population is decided by the sample. Originals only; a
  -- tracer is an examination of its own.
  if batch_row.coverage_regime = 'spot' then
    insert into public.nde_batch_population (batch_id, obligation_id)
    select batch_row.id, c.candidate_obligation_id
    from public.nde_batch_candidates(target_batch_id) c
    join public.nde_obligations o on o.id = c.candidate_obligation_id
    where o.cycle_kind = 'original'
    on conflict (obligation_id) do nothing;
    get diagnostics population_count = row_count;
  end if;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    batch_row.project_id, auth.uid(), 'nde_batches', batch_row.id,
    'allocate_nde_batch_candidates',
    jsonb_build_object(
      'allocated_count', allocated_count,
      'population_count', population_count,
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

-- ---------------------------------------------------------------------------
-- Closing: an accepted sample releases the population, a rejected one gives it back.
-- Body of 20261017100000 plus the marked part.
-- ---------------------------------------------------------------------------
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
  released_count int := 0;
  returned_count int := 0;
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

  -- Added: the sample decides the population. One rejected joint and the population is not
  -- judged: it goes back to the pool (a tracer path is already running); otherwise it is released.
  if exists (select 1 from public.nde_batch_population where batch_id = target_batch_id) then
    if exists (
      select 1
      from public.nde_results r
      join public.nde_batch_items bi on bi.id = r.batch_item_id
      where bi.batch_id = target_batch_id and r.outcome = 'rejected'
    ) then
      delete from public.nde_batch_population where batch_id = target_batch_id;
      get diagnostics returned_count = row_count;
    else
      update public.nde_obligations
      set disposition = 'waived'
      where id in (select obligation_id from public.nde_batch_population where batch_id = target_batch_id)
        and disposition = 'pending'
        and cycle_kind = 'original'
        and coverage_regime = 'spot';
      get diagnostics released_count = row_count;
    end if;

    insert into public.audit_events (
      project_id, actor_id, entity_type, entity_id, action, after_state
    ) values (
      batch_row.project_id, auth.uid(), 'nde_batches', batch_row.id,
      case when released_count > 0 then 'release_nde_batch_population' else 'return_nde_batch_population' end,
      jsonb_build_object('released_count', released_count, 'returned_count', returned_count)
    );
  end if;

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

-- ---------------------------------------------------------------------------
-- A released joint reads NRW. NR already means "result recorded" for the examined joint, so the joint
-- nobody examined gets its own code. Body of 20260809090000 plus the marked line.
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
    when cycle_kind = 'tracer' then
      'T' || cycle_ordinal::text
      || case when disposition in ('pending') then '' else 'S' end
    when cycle_kind = 'repair' then 'R' || cycle_ordinal::text
    when coverage_regime = 'mandatory_100' then
      case when disposition = 'pending' then 'H' else 'HS' end
    when disposition = 'satisfied' then 'NR'
    when disposition = 'waived' then 'NRW'
    when disposition = 'pending' then 'S'
    else 'SS'
  end;
$$;
