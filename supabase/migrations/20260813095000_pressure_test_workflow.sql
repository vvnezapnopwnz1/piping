-- Track 10: downstream pressure-test workflow facts.

create table public.blinding_request_items (
  request_id uuid primary key references public.pressure_test_requests(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict
);

create table public.blinding_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  request_id uuid not null references public.pressure_test_requests(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  completed_on date not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (request_id)
);

create table public.pressure_test_stage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  stage text not null check (stage in ('testing_started', 'testing_completed', 'precommissioning_completed')),
  occurred_on date not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (test_pack_id, stage)
);

create table public.reinstatement_request_items (
  request_id uuid not null references public.pressure_test_requests(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  flange_joint_revision_id uuid not null references public.flange_joint_revisions(id) on delete restrict,
  category_snapshot text not null check (category_snapshot in ('Y', 'Z')),
  timing_snapshot text not null,
  primary key (request_id, flange_joint_revision_id)
);

create table public.flange_reinstatement_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  request_id uuid not null references public.pressure_test_requests(id) on delete restrict,
  flange_joint_revision_id uuid not null references public.flange_joint_revisions(id) on delete restrict,
  category_snapshot text not null check (category_snapshot in ('Y', 'Z')),
  timing_snapshot text not null,
  joint_date date not null,
  report_number text not null check (length(trim(report_number)) > 0),
  jointer_team_id uuid not null references public.project_teams(id) on delete restrict,
  tag_number text not null check (length(trim(tag_number)) > 0),
  supersedes_record_id uuid references public.flange_reinstatement_records(id) on delete restrict,
  superseded_at timestamptz,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index flange_reinstatement_one_effective_idx
  on public.flange_reinstatement_records(flange_joint_revision_id)
  where superseded_at is null;

create index pressure_test_stage_events_pack_idx on public.pressure_test_stage_events (test_pack_id, occurred_on);

create or replace function public.test_pack_composition_is_locked(target_test_pack_id uuid, target_isometric_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.line_check_request_items item where item.test_pack_id = target_test_pack_id and item.isometric_id = target_isometric_id)
    or exists (select 1 from public.line_check_results result where result.test_pack_id = target_test_pack_id and result.isometric_id = target_isometric_id)
    or exists (select 1 from public.punch_items punch where punch.test_pack_id = target_test_pack_id and punch.isometric_id = target_isometric_id)
    or exists (select 1 from public.pressure_test_requests request where request.test_pack_id = target_test_pack_id and request.request_type in ('blinding', 'reinstatement'))
    or exists (select 1 from public.pressure_test_stage_events event where event.test_pack_id = target_test_pack_id);
$$;

create or replace function public.assign_blinding(target_test_pack_id uuid, target_team_id uuid, target_assigned_on date, target_idempotency_key text default null)
returns public.pressure_test_requests language plpgsql security definer set search_path = public, pg_temp
as $$
declare pack public.test_packs; team public.project_teams; request_row public.pressure_test_requests; claimed jsonb; next_number integer;
begin
  pack := public.pressure_test_assert_pack(target_test_pack_id);
  if not exists (select 1 from public.test_pack_readiness where test_pack_id = pack.id and is_rft) then raise exception 'Test Pack is not RFT' using errcode = 'PQT06'; end if;
  select * into team from public.project_teams where id = target_team_id and project_id = pack.project_id and status = 'active' and team_type = 'blinding';
  if not found then raise exception 'Blinding team is missing, inactive, or wrong type' using errcode = 'PQC97'; end if;
  if exists (select 1 from public.pressure_test_requests where test_pack_id = pack.id and request_type = 'blinding' and cancelled_at is null) then raise exception 'Blinding request already exists' using errcode = 'PQT07'; end if;
  claimed := public.claim_command_receipt(pack.project_id, 'assign_blinding', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into request_row from public.pressure_test_requests where id = (claimed -> 'result' ->> 'id')::uuid; return request_row; end if;
  select count(*) + 1 into next_number from public.pressure_test_requests where project_id = pack.project_id and request_type = 'blinding';
  insert into public.pressure_test_requests(project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
  values (pack.project_id, 'blinding', pack.id, pack.revision_no, team.id, target_assigned_on, format('BL-%s', lpad(next_number::text, 6, '0')), auth.uid()) returning * into request_row;
  insert into public.blinding_request_items(request_id, project_id, test_pack_id) values (request_row.id, pack.project_id, pack.id);
  perform public.complete_command_receipt(pack.project_id, 'assign_blinding', target_idempotency_key, jsonb_build_object('id', request_row.id));
  return request_row;
end;
$$;

create or replace function public.record_blinding(target_request_id uuid, target_completed_on date, target_idempotency_key text default null)
returns public.blinding_records language plpgsql security definer set search_path = public, pg_temp
as $$
declare request_row public.pressure_test_requests; record_row public.blinding_records; claimed jsonb;
begin
  select * into request_row from public.pressure_test_requests where id = target_request_id and request_type = 'blinding' and cancelled_at is null for update;
  if not found then raise exception 'Blinding request is missing or cancelled' using errcode = 'PQT01'; end if;
  claimed := public.claim_command_receipt(request_row.project_id, 'record_blinding', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into record_row from public.blinding_records where id = (claimed -> 'result' ->> 'id')::uuid; return record_row; end if;
  insert into public.blinding_records(project_id, request_id, test_pack_id, completed_on, recorded_by) values (request_row.project_id, request_row.id, request_row.test_pack_id, target_completed_on, auth.uid()) returning * into record_row;
  perform public.complete_command_receipt(request_row.project_id, 'record_blinding', target_idempotency_key, jsonb_build_object('id', record_row.id));
  return record_row;
end;
$$;

create or replace function public.record_pressure_test_stage(target_test_pack_id uuid, target_stage text, target_occurred_on date, target_idempotency_key text default null)
returns public.pressure_test_stage_events language plpgsql security definer set search_path = public, pg_temp
as $$
declare pack public.test_packs; event_row public.pressure_test_stage_events; claimed jsonb; prior_date date;
begin
  pack := public.pressure_test_assert_pack(target_test_pack_id);
  if target_stage not in ('testing_started', 'testing_completed', 'precommissioning_completed') then raise exception 'Unsupported pressure-test stage' using errcode = 'PQT08'; end if;
  if target_stage <> 'testing_started' and not exists (select 1 from public.blinding_records where test_pack_id = pack.id) then raise exception 'Blinding must be completed first' using errcode = 'PQT09'; end if;
  if target_stage = 'testing_completed' and not exists (select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_started') then raise exception 'Testing must be started first' using errcode = 'PQT10'; end if;
  if target_stage = 'precommissioning_completed' and not exists (select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_completed') then raise exception 'Testing must be completed first' using errcode = 'PQT11'; end if;
  select max(occurred_on) into prior_date from public.pressure_test_stage_events where test_pack_id = pack.id;
  if prior_date is not null and target_occurred_on < prior_date then raise exception 'Pressure-test dates must be monotonic' using errcode = 'PQT12'; end if;
  claimed := public.claim_command_receipt(pack.project_id, 'record_pressure_test_stage', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into event_row from public.pressure_test_stage_events where id = (claimed -> 'result' ->> 'id')::uuid; return event_row; end if;
  insert into public.pressure_test_stage_events(project_id, test_pack_id, stage, occurred_on, recorded_by) values (pack.project_id, pack.id, target_stage, target_occurred_on, auth.uid()) returning * into event_row;
  perform public.complete_command_receipt(pack.project_id, 'record_pressure_test_stage', target_idempotency_key, jsonb_build_object('id', event_row.id));
  return event_row;
end;
$$;

create or replace function public.assign_reinstatement(target_test_pack_id uuid, target_flange_joint_revision_ids uuid[], target_team_id uuid, target_assigned_on date, target_idempotency_key text default null)
returns public.pressure_test_requests language plpgsql security definer set search_path = public, pg_temp
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

create or replace function public.record_reinstatement(target_request_id uuid, target_flange_joint_revision_id uuid, target_joint_date date, target_report_number text, target_jointer_team_id uuid, target_tag_number text, target_idempotency_key text default null)
returns public.flange_reinstatement_records language plpgsql security definer set search_path = public, pg_temp
as $$
declare request_row public.pressure_test_requests; item record; team public.project_teams; record_row public.flange_reinstatement_records; claimed jsonb;
begin
  select * into request_row from public.pressure_test_requests where id = target_request_id and request_type = 'reinstatement' and cancelled_at is null for update;
  if not found then raise exception 'Reinstatement request is missing or cancelled' using errcode = 'PQT01'; end if;
  select * into item from public.reinstatement_request_items where request_id = request_row.id and flange_joint_revision_id = target_flange_joint_revision_id;
  if not found then raise exception 'Flange is not assigned to the request' using errcode = 'PQT02'; end if;
  select * into team from public.project_teams where id = target_jointer_team_id and project_id = request_row.project_id and status = 'active' and team_type = 'jointer';
  if not found then raise exception 'Jointer team is missing, inactive, or wrong type' using errcode = 'PQT15'; end if;
  claimed := public.claim_command_receipt(request_row.project_id, 'record_reinstatement', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into record_row from public.flange_reinstatement_records where id = (claimed -> 'result' ->> 'id')::uuid; return record_row; end if;
  insert into public.flange_reinstatement_records(project_id, request_id, flange_joint_revision_id, category_snapshot, timing_snapshot, joint_date, report_number, jointer_team_id, tag_number, recorded_by)
  values (request_row.project_id, request_row.id, item.flange_joint_revision_id, item.category_snapshot, item.timing_snapshot, target_joint_date, trim(target_report_number), target_jointer_team_id, trim(target_tag_number), auth.uid()) returning * into record_row;
  perform public.complete_command_receipt(request_row.project_id, 'record_reinstatement', target_idempotency_key, jsonb_build_object('id', record_row.id));
  return record_row;
end;
$$;

alter table public.blinding_request_items enable row level security;
alter table public.blinding_records enable row level security;
alter table public.pressure_test_stage_events enable row level security;
alter table public.reinstatement_request_items enable row level security;
alter table public.flange_reinstatement_records enable row level security;
create policy "blinding targets scoped" on public.blinding_request_items for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "blinding facts scoped" on public.blinding_records for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "pressure stages scoped" on public.pressure_test_stage_events for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "reinstatement targets scoped" on public.reinstatement_request_items for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "reinstatement facts scoped" on public.flange_reinstatement_records for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
revoke all on public.blinding_request_items, public.blinding_records, public.pressure_test_stage_events, public.reinstatement_request_items, public.flange_reinstatement_records from anon, authenticated;
grant select on public.blinding_request_items, public.blinding_records, public.pressure_test_stage_events, public.reinstatement_request_items, public.flange_reinstatement_records to authenticated;
revoke all on function public.assign_blinding(uuid, uuid, date, text), public.record_blinding(uuid, date, text), public.record_pressure_test_stage(uuid, text, date, text), public.assign_reinstatement(uuid, uuid[], uuid, date, text), public.record_reinstatement(uuid, uuid, date, text, uuid, text, text) from public, anon;
grant execute on function public.assign_blinding(uuid, uuid, date, text), public.record_blinding(uuid, date, text), public.record_pressure_test_stage(uuid, text, date, text), public.assign_reinstatement(uuid, uuid[], uuid, date, text), public.record_reinstatement(uuid, uuid, date, text, uuid, text, text) to authenticated;

create or replace view public.blinding_worklist with (security_invoker = true) as
select request.id as request_id, request.project_id, request.test_pack_id, request.request_number, request.assigned_on, request.cancelled_at, record.id as record_id, record.completed_on
from public.pressure_test_requests request join public.blinding_request_items item on item.request_id = request.id left join public.blinding_records record on record.request_id = request.id
where request.request_type = 'blinding';
create or replace view public.testing_precomm_worklist with (security_invoker = true) as
select pack.id as test_pack_id, pack.project_id, max(event.occurred_on) filter (where event.stage = 'testing_started') as testing_started_on, max(event.occurred_on) filter (where event.stage = 'testing_completed') as testing_completed_on, max(event.occurred_on) filter (where event.stage = 'precommissioning_completed') as precommissioning_completed_on
from public.test_packs pack left join public.pressure_test_stage_events event on event.test_pack_id = pack.id group by pack.id;
create or replace view public.reinstatement_worklist with (security_invoker = true) as
select request.id as request_id, request.project_id, request.test_pack_id, request.request_number, item.flange_joint_revision_id, item.category_snapshot, record.id as record_id
from public.pressure_test_requests request join public.reinstatement_request_items item on item.request_id = request.id left join public.flange_reinstatement_records record on record.request_id = request.id and record.flange_joint_revision_id = item.flange_joint_revision_id
where request.request_type = 'reinstatement';

revoke all on public.blinding_worklist, public.testing_precomm_worklist, public.reinstatement_worklist from anon, authenticated;
grant select on public.blinding_worklist, public.testing_precomm_worklist, public.reinstatement_worklist to authenticated;
