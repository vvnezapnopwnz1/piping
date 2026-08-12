-- Track 06: NDE Batches and Per-Joint Results

create table public.nde_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  batch_number text not null,
  method public.ndt_method not null,
  category_code text not null check (category_code in ('S', 'SS', 'NR', 'H', 'HS', 'NDE100')),
  responsible_welder_qualification_id uuid
    references public.welder_qualifications(id) on delete restrict,
  ndt_subcontractor_id uuid references public.project_subcontractors(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'returned', 'closed')),
  issued_on date, returned_on date, closed_on date,
  report_number text,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, batch_number)
);

create table public.nde_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.nde_batches(id) on delete cascade,
  obligation_id uuid not null references public.nde_obligations(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (obligation_id)
);

create table public.nde_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  obligation_id uuid not null references public.nde_obligations(id) on delete restrict,
  batch_item_id uuid references public.nde_batch_items(id) on delete restrict,
  outcome text not null check (outcome in ('accepted', 'rejected')),
  examined_on date not null,
  report_number text,
  defect_rework_code_id uuid references public.project_rework_codes(id) on delete restrict,
  responsible_welder_qualification_id uuid
    references public.welder_qualifications(id) on delete restrict,
  comment text,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (obligation_id)
);

-- RLS & Grants
alter table public.nde_batches enable row level security;
alter table public.nde_batch_items enable row level security;
alter table public.nde_results enable row level security;

create policy "nde_batches capability read" on public.nde_batches
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'nde.view'));

create policy "nde_batch_items capability read" on public.nde_batch_items
  for select to authenticated
  using (
    exists (
      select 1 from public.nde_batches b
      where b.id = batch_id and public.current_user_has_capability(b.project_id, 'nde.view')
    )
  );

create policy "nde_results capability read" on public.nde_results
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'nde.view'));

grant select on public.nde_batches, public.nde_batch_items, public.nde_results to authenticated;

-- Helper to check if welder is on joint
create or replace function public.is_welder_on_joint(
  target_weld_joint_revision_id uuid,
  target_welder_qualification_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.weld_progress_records wpr
    join public.weld_point_assignments wpa on wpa.weld_progress_record_id = wpr.id
    where wpr.weld_joint_revision_id = target_weld_joint_revision_id
      and wpa.welder_qualification_id = target_welder_qualification_id
  );
end;
$$;

-- Create NDE Batch RPC
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

  if category_code not in ('S', 'SS', 'NR', 'H', 'HS', 'NDE100') then
    raise exception 'Invalid category code' using errcode = 'PQC40';
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
    created_by
  ) values (
    target_project_id, generated_batch_number, method, category_code,
    welder_id, subcontractor_id, auth.uid()
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

-- Allocate candidate obligations into batch RPC
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
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;

  if not public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage NDE batches' using errcode = '42501';
  end if;

  if batch_row.status <> 'draft' then
    raise exception 'This batch is not in draft status' using errcode = 'PQC41';
  end if;

  claim := public.claim_command_receipt(batch_row.project_id, 'allocate_nde_batch_candidates', idempotency_key);
  if claim ->> 'status' = 'completed' then
    return (claim -> 'result' ->> 'allocated_count')::int;
  end if;

  -- Deterministic candidate selection by (weld_on, weld_number)
  for candidate_record in
    select o.id as obligation_id
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
    order by progress.weld_on asc nulls last, wj.weld_number asc
  loop
    insert into public.nde_batch_items (batch_id, obligation_id)
    values (batch_row.id, candidate_record.obligation_id)
    on conflict (obligation_id) do nothing;

    if found then
      allocated_count := allocated_count + 1;
    end if;
  end loop;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    batch_row.project_id, auth.uid(), 'nde_batches', batch_row.id,
    'allocate_nde_batch_candidates', jsonb_build_object('allocated_count', allocated_count)
  );

  perform public.complete_command_receipt(
    batch_row.project_id, 'allocate_nde_batch_candidates', idempotency_key,
    jsonb_build_object('allocated_count', allocated_count)
  );

  return allocated_count;
end;
$$;

-- Issue NDE Batch RPC
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
    raise exception 'This batch is not in draft status' using errcode = 'PQC41';
  end if;

  select count(*) into item_count from public.nde_batch_items where batch_id = target_batch_id;
  if item_count = 0 then
    raise exception 'Cannot issue an empty batch' using errcode = 'PQC41';
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

-- Record NDE Result RPC
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
  batch_row public.nde_batches;
  claim jsonb;
  created public.nde_results;
begin
  select * into obligation_row from public.nde_obligations where id = target_obligation_id;
  if obligation_row.id is null then
    raise exception 'The NDE obligation was not found' using errcode = 'PQC42';
  end if;

  ctx := public.weld_joint_context(obligation_row.weld_joint_revision_id);

  if not public.current_user_has_capability(ctx.project_id, 'nde.result.record') then
    raise exception 'You do not have permission to record NDE results' using errcode = '42501';
  end if;

  if not public.current_user_in_pds_scope(ctx.project_id, ctx.pds_area_id) then
    raise exception 'This joint is outside your PDS area scope' using errcode = '42501';
  end if;

  if obligation_row.disposition <> 'issued' then
    raise exception 'Obligation must be in an issued batch to record result' using errcode = 'PQC42';
  end if;

  if exists (select 1 from public.nde_results where obligation_id = target_obligation_id) then
    raise exception 'A result has already been recorded for this obligation' using errcode = 'PQC42';
  end if;

  if outcome not in ('accepted', 'rejected') then
    raise exception 'Outcome must be accepted or rejected' using errcode = 'PQC42';
  end if;

  if outcome = 'rejected' and defect_rework_code_id is null then
    raise exception 'A rejected result must carry a defect rework code' using errcode = 'PQC42';
  end if;

  if responsible_welder_qualification_id is not null then
    if not public.is_welder_on_joint(obligation_row.weld_joint_revision_id, responsible_welder_qualification_id) then
      raise exception 'The named welder did not weld this joint' using errcode = 'PQC42';
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
    responsible_welder_qualification_id, comment, recorded_by
  ) values (
    ctx.project_id, target_obligation_id, batch_item_row.id, outcome,
    examined_on, report_number, defect_rework_code_id,
    responsible_welder_qualification_id, comment, auth.uid()
  ) returning * into created;

  -- Update obligation disposition & lock joint
  if outcome = 'accepted' then
    update public.nde_obligations
    set disposition = 'satisfied', satisfied_at = timezone('utc', now()), satisfied_by = auth.uid()
    where id = target_obligation_id;
  else
    update public.nde_obligations
    set disposition = 'rejected'
    where id = target_obligation_id;
  end if;

  -- Lock joint progress
  perform set_config('pipeqc.weld_correction', 'on', true);
  update public.weld_progress_records
  set is_locked = true, locked_at = coalesce(locked_at, timezone('utc', now()))
  where weld_joint_revision_id = obligation_row.weld_joint_revision_id and not is_locked;
  perform set_config('pipeqc.weld_correction', 'off', true);

  -- Call repair/tracer derivation if function exists
  begin
    if outcome = 'rejected' then
      perform public.derive_repair_and_tracers(target_obligation_id);
    end if;
  exception when undefined_function then
    -- Function will be defined in Task 5
    null;
  end;

  -- Call penalty evaluation if function exists
  begin
    perform public.evaluate_nde_penalty(ctx.project_id, responsible_welder_qualification_id, obligation_row.category_code);
  exception when undefined_function then
    -- Function will be defined in Task 6
    null;
  end;

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

-- Close NDE Batch RPC
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
    raise exception 'This batch is not in issued status' using errcode = 'PQC41';
  end if;

  select count(*) into unexamined_count
  from public.nde_batch_items bi
  where bi.batch_id = target_batch_id
    and not exists (select 1 from public.nde_results r where r.batch_item_id = bi.id);

  if unexamined_count > 0 then
    raise exception 'All batch items must have a recorded result before closing' using errcode = 'PQC41';
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

revoke all on function
  public.create_nde_batch(uuid, public.ndt_method, text, uuid, uuid, text, text),
  public.allocate_nde_batch_candidates(uuid, numeric, text),
  public.issue_nde_batch(uuid, text),
  public.record_nde_result(uuid, text, date, text, uuid, uuid, text, text),
  public.close_nde_batch(uuid, text, date, text)
from public, anon;

grant execute on function
  public.create_nde_batch(uuid, public.ndt_method, text, uuid, uuid, text, text),
  public.allocate_nde_batch_candidates(uuid, numeric, text),
  public.issue_nde_batch(uuid, text),
  public.record_nde_result(uuid, text, date, text, uuid, uuid, text, text),
  public.close_nde_batch(uuid, text, date, text)
to authenticated;
