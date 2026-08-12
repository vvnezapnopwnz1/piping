-- Track 05: fabrication progress is an append-only, revision-bound ledger.

create type public.construction_phase as enum ('fabrication', 'assembly', 'erection');
create type public.construction_stage as enum (
  'start_fab', 'material_check', 'fabricated', 'qc_release',
  'sent_to_paint', 'painted', 'final_qc', 'laydown'
);

create type public.spool_context as (
  project_id uuid,
  spool_revision_id uuid,
  isometric_revision_id uuid,
  pds_area_id uuid
);

create table public.command_receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  command_name text not null check (length(trim(command_name)) > 0),
  idempotency_key text not null check (length(trim(idempotency_key)) > 0),
  actor_id uuid references public.profiles(id) on delete set null,
  result jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (project_id, command_name, idempotency_key)
);

create table public.construction_progress_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null,
  stage public.construction_stage not null,
  occurred_on date not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  source text not null default 'manual' check (source in ('manual', 'revision_copy', 'compensation')),
  compensates_event_id uuid references public.construction_progress_events(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check ((source = 'compensation') = (compensates_event_id is not null))
);

create index construction_progress_events_spool_stage_idx
  on public.construction_progress_events (spool_revision_id, stage, created_at desc);

create table public.qc13_progress_forms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  form_number text not null,
  requested_on date not null,
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, form_number)
);

create index qc13_progress_forms_spool_idx on public.qc13_progress_forms (spool_revision_id);

create or replace function public.claim_command_receipt(
  target_project_id uuid,
  target_command_name text,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare receipt public.command_receipts;
begin
  if coalesce(trim(target_idempotency_key), '') = '' then
    return jsonb_build_object('status', 'unkeyed');
  end if;
  insert into public.command_receipts (project_id, command_name, idempotency_key, actor_id)
  values (target_project_id, trim(target_command_name), trim(target_idempotency_key), auth.uid())
  on conflict (project_id, command_name, idempotency_key) do nothing
  returning * into receipt;
  if found then
    return jsonb_build_object('status', 'claimed', 'receipt_id', receipt.id);
  end if;

  select * into receipt from public.command_receipts
  where project_id = target_project_id and command_name = trim(target_command_name)
    and idempotency_key = trim(target_idempotency_key)
  for update;

  if receipt.completed_at is not null then
    return jsonb_build_object('status', 'completed', 'result', receipt.result);
  end if;
  raise exception 'This command is already in flight' using errcode = 'PQC38';
end;
$$;

create or replace function public.complete_command_receipt(
  target_project_id uuid,
  target_command_name text,
  target_idempotency_key text,
  command_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(trim(target_idempotency_key), '') = '' then return command_result; end if;
  update public.command_receipts
  set result = command_result, completed_at = timezone('utc', now())
  where project_id = target_project_id and command_name = trim(target_command_name)
    and idempotency_key = trim(target_idempotency_key) and completed_at is null;
  return command_result;
end;
$$;

create or replace function public.assert_construction_target(
  target_spool_revision_id uuid,
  required_capability text
)
returns public.spool_context
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare context public.spool_context;
begin
  select iso.project_id, sr.id, rev.id, rev.pds_area_id
  into context
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id;
  if not found then
    raise exception 'Construction target is missing' using errcode = 'PQC30';
  end if;
  if not public.current_user_has_capability(context.project_id, required_capability)
     or not public.current_user_in_pds_scope(context.project_id, context.pds_area_id) then
    raise exception 'Construction target is outside your authorized scope' using errcode = '42501';
  end if;
  if (select is_removed from public.spool_revisions where id = target_spool_revision_id)
     or (select status from public.isometric_revisions where id = context.isometric_revision_id) <> 'accepted' then
    raise exception 'Construction target revision is not current' using errcode = 'PQC31';
  end if;
  return context;
end;
$$;

create or replace function public.construction_stage_ordinal(target_stage public.construction_stage)
returns integer language sql immutable set search_path = public, pg_temp as $$
  select case target_stage
    when 'start_fab' then 10 when 'material_check' then 20 when 'fabricated' then 30
    when 'qc_release' then 40 when 'sent_to_paint' then 50 when 'painted' then 60
    when 'final_qc' then 70 when 'laydown' then 80 end;
$$;

create or replace function public.effective_stage_date(
  target_spool_revision_id uuid,
  target_stage public.construction_stage
)
returns date language sql stable security definer set search_path = public, pg_temp as $$
  select e.occurred_on
  from public.construction_progress_events e
  where e.spool_revision_id = target_spool_revision_id and e.stage = target_stage
    and e.source <> 'compensation'
    and not exists (select 1 from public.construction_progress_events c where c.compensates_event_id = e.id)
  order by e.created_at desc limit 1;
$$;

create or replace function public.reject_construction_event_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'Construction progress events are append-only' using errcode = 'PQC31';
end;
$$;
create trigger construction_progress_events_append_only
  before update or delete on public.construction_progress_events
  for each row execute function public.reject_construction_event_mutation();

create or replace function public.record_construction_progress(
  target_spool_revision_id uuid,
  target_phase public.construction_phase,
  target_stage public.construction_stage,
  target_occurred_on date,
  target_payload jsonb default '{}'::jsonb,
  target_idempotency_key text default null
)
returns public.construction_progress_events
language plpgsql security definer set search_path = public, pg_temp as $$
declare context public.spool_context; claimed jsonb; event_row public.construction_progress_events;
begin
  context := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'record_construction_progress', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into event_row from jsonb_populate_record(null::public.construction_progress_events, claimed -> 'result' -> 'event');
    return event_row;
  end if;
  if target_phase <> 'fabrication' or target_stage not in ('start_fab', 'sent_to_paint') then
    raise exception 'This stage is derived and cannot be recorded manually' using errcode = 'PQC32';
  end if;
  if target_occurred_on is null or jsonb_typeof(coalesce(target_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'A date and object payload are required' using errcode = '23514';
  end if;
  if target_stage = 'sent_to_paint' and public.effective_stage_date(target_spool_revision_id, 'start_fab') is null then
    raise exception 'Fabrication must start before painting is sent' using errcode = 'PQC32';
  end if;
  insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on, payload, actor_id)
  values (context.project_id, target_spool_revision_id, target_phase, target_stage, target_occurred_on, coalesce(target_payload, '{}'::jsonb), auth.uid())
  returning * into event_row;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'construction_progress_events', event_row.id, 'record_construction_progress', to_jsonb(event_row));
  perform public.complete_command_receipt(context.project_id, 'record_construction_progress', target_idempotency_key, jsonb_build_object('event', to_jsonb(event_row)));
  return event_row;
end;
$$;

create or replace function public.request_qc13_form(
  target_spool_revision_id uuid,
  requested_date date default current_date,
  target_idempotency_key text default null
)
returns public.qc13_progress_forms
language plpgsql security definer set search_path = public, pg_temp as $$
declare context public.spool_context; claimed jsonb; form_row public.qc13_progress_forms; next_number integer;
begin
  context := public.assert_construction_target(target_spool_revision_id, 'fabrication.qc.release');
  claimed := public.claim_command_receipt(context.project_id, 'request_qc13_form', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into form_row from jsonb_populate_record(null::public.qc13_progress_forms, claimed -> 'result' -> 'form'); return form_row;
  end if;
  if public.effective_stage_date(target_spool_revision_id, 'start_fab') is null then
    raise exception 'Fabrication must start before QC-13 is requested' using errcode = 'PQC32';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(context.project_id::text, 0));
  select count(*) + 1 into next_number from public.qc13_progress_forms where project_id = context.project_id;
  insert into public.qc13_progress_forms (project_id, spool_revision_id, form_number, requested_on, requested_by)
  values (context.project_id, target_spool_revision_id, format('QC13-%s', lpad(next_number::text, 6, '0')), coalesce(requested_date, current_date), auth.uid())
  returning * into form_row;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'qc13_progress_forms', form_row.id, 'request_qc13_form', to_jsonb(form_row));
  perform public.complete_command_receipt(context.project_id, 'request_qc13_form', target_idempotency_key, jsonb_build_object('form', to_jsonb(form_row)));
  return form_row;
end;
$$;

create or replace function public.materialize_progress_copies(
  target_isometric_revision_id uuid,
  target_idempotency_key text default null
)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare copy_row record; stage_value public.construction_stage; source_date date; context public.spool_context; target_spool_revision_id uuid; created_count integer := 0; event_row public.construction_progress_events; claimed jsonb;
begin
  select sr.id into target_spool_revision_id
  from public.spool_revisions sr
  where sr.isometric_revision_id = target_isometric_revision_id
  order by sr.id limit 1;
  context := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'materialize_progress_copies', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    return (claimed -> 'result' ->> 'created_count')::integer;
  end if;
  for copy_row in
    select rpc.*, item.project_id from public.revision_progress_copies rpc
    join public.revision_change_items item on item.id = rpc.change_item_id
    where (select isometric_revision_id from public.spool_revisions where id = rpc.target_spool_revision_id) = target_isometric_revision_id
      and rpc.copied_payload = '{}'::jsonb
    order by case rpc.progress_kind when 'fabrication_start' then 10 when 'sent_to_paint' then 50 else 60 end
    for update of rpc skip locked
  loop
    context := public.assert_construction_target(copy_row.target_spool_revision_id, 'fabrication.progress.record');
    stage_value := case copy_row.progress_kind when 'fabrication_start' then 'start_fab'::public.construction_stage when 'sent_to_paint' then 'sent_to_paint'::public.construction_stage else 'painted'::public.construction_stage end;
    source_date := public.effective_stage_date(copy_row.source_spool_revision_id, stage_value);
    if source_date is null then continue; end if;
    insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on, payload, source, actor_id)
    values (context.project_id, copy_row.target_spool_revision_id, 'fabrication', stage_value, source_date,
      jsonb_build_object('source_spool_revision_id', copy_row.source_spool_revision_id, 'revision_progress_copy_id', copy_row.id), 'revision_copy', auth.uid())
    returning * into event_row;
    update public.revision_progress_copies set copied_payload = jsonb_build_object('event_id', event_row.id, 'stage', stage_value, 'occurred_on', source_date)
    where id = copy_row.id;
    insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
    values (context.project_id, auth.uid(), 'construction_progress_events', event_row.id, 'materialize_progress_copy', to_jsonb(event_row));
    insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
    values (context.project_id, auth.uid(), 'revision_progress_copies', copy_row.id, 'mark_progress_copy_materialized',
      jsonb_build_object('event_id', event_row.id, 'stage', stage_value, 'occurred_on', source_date));
    created_count := created_count + 1;
  end loop;
  perform public.complete_command_receipt(
    context.project_id, 'materialize_progress_copies', target_idempotency_key,
    jsonb_build_object('created_count', created_count)
  );
  return created_count;
end;
$$;

alter table public.command_receipts enable row level security;
alter table public.construction_progress_events enable row level security;
alter table public.qc13_progress_forms enable row level security;

create policy "read construction progress events" on public.construction_progress_events for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view') and exists (
    select 1 from public.spool_revisions sr join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where sr.id = construction_progress_events.spool_revision_id
      and public.current_user_in_pds_scope(project_id, rev.pds_area_id)));
create policy "read QC13 progress forms" on public.qc13_progress_forms for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view') and exists (
    select 1 from public.spool_revisions sr join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where sr.id = qc13_progress_forms.spool_revision_id
      and public.current_user_in_pds_scope(project_id, rev.pds_area_id)));

revoke select, insert, update, delete, truncate on public.command_receipts from authenticated, anon;
grant select on public.construction_progress_events, public.qc13_progress_forms to authenticated;
revoke insert, update, delete, truncate on public.construction_progress_events, public.qc13_progress_forms from authenticated, anon;
revoke all on function public.claim_command_receipt(uuid, text, text), public.complete_command_receipt(uuid, text, text, jsonb), public.assert_construction_target(uuid, text), public.construction_stage_ordinal(public.construction_stage), public.effective_stage_date(uuid, public.construction_stage), public.record_construction_progress(uuid, public.construction_phase, public.construction_stage, date, jsonb, text), public.request_qc13_form(uuid, date, text), public.materialize_progress_copies(uuid, text) from public, anon;
grant execute on function public.construction_stage_ordinal(public.construction_stage), public.record_construction_progress(uuid, public.construction_phase, public.construction_stage, date, jsonb, text), public.request_qc13_form(uuid, date, text), public.materialize_progress_copies(uuid, text) to authenticated;
