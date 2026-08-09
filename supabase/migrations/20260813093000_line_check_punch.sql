-- Track 10: Line Check assignment, immutable result facts and Category X punches.

create table public.pressure_test_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  request_type text not null check (request_type in ('line_check', 'item_clearance', 'blinding', 'reinstatement')),
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  test_pack_revision_no integer not null check (test_pack_revision_no >= 0),
  team_id uuid not null references public.project_teams(id) on delete restrict,
  assigned_on date not null,
  request_number text not null check (length(trim(request_number)) > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  unique (project_id, request_number),
  check (cancelled_at is null or cancelled_by is not null)
);

create table public.line_check_request_items (
  request_id uuid not null references public.pressure_test_requests(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  isometric_id uuid not null references public.isometrics(id) on delete restrict,
  primary key (request_id, isometric_id)
);

create table public.line_check_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  request_id uuid not null references public.pressure_test_requests(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  isometric_id uuid not null references public.isometrics(id) on delete restrict,
  completed_on date not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (request_id, isometric_id)
);

create table public.punch_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  isometric_id uuid not null references public.isometrics(id) on delete restrict,
  spool_id uuid references public.spools(id) on delete restrict,
  punch_code_id uuid not null references public.project_punch_codes(id) on delete restrict,
  category text not null default 'X' check (category = 'X'),
  item_number text not null check (length(trim(item_number)) > 0),
  description text not null check (length(trim(description)) > 0),
  checking_date date not null,
  completion_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (test_pack_id, item_number),
  check (completion_date is null or completion_date >= checking_date)
);

create table public.item_clearance_request_items (
  request_id uuid not null references public.pressure_test_requests(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  punch_item_id uuid not null references public.punch_items(id) on delete restrict,
  primary key (request_id, punch_item_id)
);

create table public.punch_item_clearances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  request_id uuid not null references public.pressure_test_requests(id) on delete restrict,
  punch_item_id uuid not null references public.punch_items(id) on delete restrict,
  cleared_on date not null,
  cleared_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (punch_item_id)
);

create index pressure_test_requests_pack_idx on public.pressure_test_requests (test_pack_id, request_type, created_at desc);
create index line_check_results_iso_idx on public.line_check_results (test_pack_id, isometric_id, created_at desc);
create index punch_items_pack_idx on public.punch_items (test_pack_id, isometric_id, created_at desc);

create or replace function public.test_pack_composition_is_locked(target_test_pack_id uuid, target_isometric_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.line_check_request_items item where item.test_pack_id = target_test_pack_id and item.isometric_id = target_isometric_id)
    or exists (select 1 from public.line_check_results result where result.test_pack_id = target_test_pack_id and result.isometric_id = target_isometric_id)
    or exists (select 1 from public.punch_items punch where punch.test_pack_id = target_test_pack_id and punch.isometric_id = target_isometric_id);
$$;

create or replace function public.pressure_test_assert_pack(target_test_pack_id uuid)
returns public.test_packs
language plpgsql security definer set search_path = public, pg_temp
as $$
declare pack public.test_packs;
begin
  select * into pack from public.test_packs where id = target_test_pack_id for update;
  if not found then raise exception 'Test Pack is missing' using errcode = 'PQC88'; end if;
  if pack.lifecycle <> 'active' then raise exception 'Archived Test Pack is read-only' using errcode = 'PQC89'; end if;
  if not public.current_user_has_capability(pack.project_id, 'testpack.manage') then raise exception 'Test Pack management is not authorized' using errcode = '42501'; end if;
  return pack;
end;
$$;

create or replace function public.assign_line_check(
  target_test_pack_id uuid,
  target_isometric_ids uuid[],
  target_team_id uuid,
  target_assigned_on date,
  target_idempotency_key text default null
)
returns public.pressure_test_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare pack public.test_packs; team public.project_teams; request_row public.pressure_test_requests; iso_id uuid; accepted record; claimed jsonb; next_number integer;
begin
  pack := public.pressure_test_assert_pack(target_test_pack_id);
  select * into team from public.project_teams where id = target_team_id and project_id = pack.project_id and status = 'active' and team_type = 'line_check';
  if not found then raise exception 'Line Check team is missing, inactive, or wrong type' using errcode = 'PQC97'; end if;
  if coalesce(array_length(target_isometric_ids, 1), 0) = 0 then raise exception 'At least one ISO is required' using errcode = 'PQC98'; end if;
  perform pg_advisory_xact_lock(hashtextextended(pack.id::text, 0));
  claimed := public.claim_command_receipt(pack.project_id, 'assign_line_check', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into request_row from public.pressure_test_requests where id = (claimed -> 'result' ->> 'id')::uuid; return request_row; end if;
  foreach iso_id in array target_isometric_ids loop
    select iso.id, revision.id as revision_id, revision.pds_area_id into accepted
      from public.isometrics iso join public.isometric_revisions revision on revision.isometric_id = iso.id and revision.status = 'accepted'
      where iso.id = iso_id and iso.project_id = pack.project_id limit 1;
    if not found or not public.current_user_in_pds_scope(pack.project_id, accepted.pds_area_id) then raise exception 'ISO is missing, stale, or outside PDS scope' using errcode = 'PQC93'; end if;
    if exists (
      select 1 from public.line_check_request_items item join public.pressure_test_requests existing on existing.id = item.request_id
      where item.test_pack_id = pack.id and item.isometric_id = iso_id and existing.cancelled_at is null
    ) then raise exception 'An open Line Check assignment already exists for this ISO' using errcode = 'PQC99'; end if;
  end loop;
  select count(*) + 1 into next_number from public.pressure_test_requests where project_id = pack.project_id and request_type = 'line_check';
  insert into public.pressure_test_requests(project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
  values (pack.project_id, 'line_check', pack.id, pack.revision_no, team.id, target_assigned_on, format('LC-%s', lpad(next_number::text, 6, '0')), auth.uid()) returning * into request_row;
  foreach iso_id in array target_isometric_ids loop
    insert into public.line_check_request_items(request_id, project_id, test_pack_id, isometric_id) values (request_row.id, pack.project_id, pack.id, iso_id);
  end loop;
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state) values (pack.project_id, auth.uid(), 'pressure_test_requests', request_row.id, 'assign_line_check', to_jsonb(request_row));
  perform public.complete_command_receipt(pack.project_id, 'assign_line_check', target_idempotency_key, jsonb_build_object('id', request_row.id));
  return request_row;
end;
$$;

create or replace function public.record_line_check_result(
  target_request_id uuid,
  target_isometric_id uuid,
  target_completed_on date,
  target_punches jsonb default '[]'::jsonb,
  target_idempotency_key text default null
)
returns public.line_check_results
language plpgsql security definer set search_path = public, pg_temp
as $$
declare request_row public.pressure_test_requests; result_row public.line_check_results; punch_entry jsonb; punch_code uuid; spool_id uuid; next_item integer; claimed jsonb;
begin
  select * into request_row from public.pressure_test_requests where id = target_request_id and request_type = 'line_check' for update;
  if not found then raise exception 'Line Check request is missing' using errcode = 'PQT01'; end if;
  if request_row.cancelled_at is not null then raise exception 'Cancelled request is read-only' using errcode = 'PQC89'; end if;
  if not public.current_user_has_capability(request_row.project_id, 'testpack.manage') then raise exception 'Test Pack management is not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.line_check_request_items where request_id = request_row.id and isometric_id = target_isometric_id) then raise exception 'ISO is not assigned to the Line Check request' using errcode = 'PQT02'; end if;
  claimed := public.claim_command_receipt(request_row.project_id, 'record_line_check_result', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into result_row from public.line_check_results where id = (claimed -> 'result' ->> 'id')::uuid; return result_row; end if;
  if exists (select 1 from public.line_check_results where request_id = request_row.id and isometric_id = target_isometric_id) then raise exception 'Line Check result already recorded' using errcode = 'PQT03'; end if;
  insert into public.line_check_results(project_id, request_id, test_pack_id, isometric_id, completed_on, recorded_by)
  values (request_row.project_id, request_row.id, request_row.test_pack_id, target_isometric_id, target_completed_on, auth.uid()) returning * into result_row;
  select count(*) + 1 into next_item from public.punch_items where test_pack_id = request_row.test_pack_id;
  for punch_entry in select * from jsonb_array_elements(coalesce(target_punches, '[]'::jsonb)) loop
    punch_code := (punch_entry ->> 'punch_code_id')::uuid;
    if not exists (select 1 from public.project_punch_codes where id = punch_code and project_id = request_row.project_id and status = 'active') then raise exception 'Punch code is missing or inactive' using errcode = 'PQC95'; end if;
    spool_id := nullif(punch_entry ->> 'spool_id', '')::uuid;
    if spool_id is not null and not exists (select 1 from public.spools where id = spool_id and project_id = request_row.project_id) then raise exception 'Spool is outside the project' using errcode = 'PQC93'; end if;
    insert into public.punch_items(project_id, test_pack_id, isometric_id, spool_id, punch_code_id, item_number, description, checking_date, completion_date, created_by)
    values (request_row.project_id, request_row.test_pack_id, target_isometric_id, spool_id, punch_code, format('X-%s', lpad(next_item::text, 6, '0')), trim(punch_entry ->> 'description'), (punch_entry ->> 'checking_date')::date, nullif(punch_entry ->> 'completion_date', '')::date, auth.uid());
    next_item := next_item + 1;
  end loop;
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state) values (request_row.project_id, auth.uid(), 'line_check_results', result_row.id, 'record_line_check_result', to_jsonb(result_row));
  perform public.complete_command_receipt(request_row.project_id, 'record_line_check_result', target_idempotency_key, jsonb_build_object('id', result_row.id));
  return result_row;
end;
$$;

create or replace function public.assign_item_clearance(
  target_test_pack_id uuid,
  target_punch_item_ids uuid[],
  target_team_id uuid,
  target_assigned_on date,
  target_idempotency_key text default null
)
returns public.pressure_test_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare pack public.test_packs; team public.project_teams; request_row public.pressure_test_requests; punch_id uuid; claimed jsonb; next_number integer;
begin
  pack := public.pressure_test_assert_pack(target_test_pack_id);
  select * into team from public.project_teams where id = target_team_id and project_id = pack.project_id and status = 'active' and team_type = 'finishing';
  if not found then raise exception 'Finishing team is missing, inactive, or wrong type' using errcode = 'PQC97'; end if;
  if coalesce(array_length(target_punch_item_ids, 1), 0) = 0 then raise exception 'At least one punch item is required' using errcode = 'PQC98'; end if;
  claimed := public.claim_command_receipt(pack.project_id, 'assign_item_clearance', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into request_row from public.pressure_test_requests where id = (claimed -> 'result' ->> 'id')::uuid; return request_row; end if;
  foreach punch_id in array target_punch_item_ids loop
    if not exists (select 1 from public.punch_items where id = punch_id and project_id = pack.project_id and test_pack_id = pack.id) or exists (select 1 from public.punch_item_clearances where punch_item_id = punch_id) then raise exception 'Punch item is missing or already cleared' using errcode = 'PQT04'; end if;
  end loop;
  select count(*) + 1 into next_number from public.pressure_test_requests where project_id = pack.project_id and request_type = 'item_clearance';
  insert into public.pressure_test_requests(project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
  values (pack.project_id, 'item_clearance', pack.id, pack.revision_no, team.id, target_assigned_on, format('IC-%s', lpad(next_number::text, 6, '0')), auth.uid()) returning * into request_row;
  foreach punch_id in array target_punch_item_ids loop
    insert into public.item_clearance_request_items(request_id, project_id, test_pack_id, punch_item_id) values (request_row.id, pack.project_id, pack.id, punch_id);
  end loop;
  perform public.complete_command_receipt(pack.project_id, 'assign_item_clearance', target_idempotency_key, jsonb_build_object('id', request_row.id));
  return request_row;
end;
$$;

create or replace function public.record_punch_clearance(target_request_id uuid, target_punch_item_id uuid, target_cleared_on date, target_idempotency_key text default null)
returns public.punch_item_clearances
language plpgsql security definer set search_path = public, pg_temp
as $$
declare request_row public.pressure_test_requests; clearance public.punch_item_clearances; claimed jsonb;
begin
  select * into request_row from public.pressure_test_requests where id = target_request_id and request_type = 'item_clearance' for update;
  if not found or request_row.cancelled_at is not null then raise exception 'Item Clearance request is missing or cancelled' using errcode = 'PQT01'; end if;
  if not exists (select 1 from public.item_clearance_request_items where request_id = target_request_id and punch_item_id = target_punch_item_id) then raise exception 'Punch item is not assigned to the request' using errcode = 'PQT02'; end if;
  claimed := public.claim_command_receipt(request_row.project_id, 'record_punch_clearance', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into clearance from public.punch_item_clearances where id = (claimed -> 'result' ->> 'id')::uuid; return clearance; end if;
  insert into public.punch_item_clearances(project_id, request_id, punch_item_id, cleared_on, cleared_by)
  values (request_row.project_id, request_row.id, target_punch_item_id, target_cleared_on, auth.uid()) returning * into clearance;
  perform public.complete_command_receipt(request_row.project_id, 'record_punch_clearance', target_idempotency_key, jsonb_build_object('id', clearance.id));
  return clearance;
end;
$$;

create or replace function public.cancel_pressure_test_request(target_request_id uuid, target_reason text default null, target_idempotency_key text default null)
returns public.pressure_test_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare request_row public.pressure_test_requests; claimed jsonb;
begin
  select * into request_row from public.pressure_test_requests where id = target_request_id for update;
  if not found then raise exception 'Pressure Test request is missing' using errcode = 'PQT01'; end if;
  if not public.current_user_has_capability(request_row.project_id, 'testpack.manage') then raise exception 'Test Pack management is not authorized' using errcode = '42501'; end if;
  if exists (select 1 from public.line_check_results where request_id = request_row.id) or exists (select 1 from public.punch_item_clearances where request_id = request_row.id) then raise exception 'Started request cannot be cancelled' using errcode = 'PQT05'; end if;
  claimed := public.claim_command_receipt(request_row.project_id, 'cancel_pressure_test_request', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into request_row from public.pressure_test_requests where id = (claimed -> 'result' ->> 'id')::uuid; return request_row; end if;
  update public.pressure_test_requests set cancelled_at = timezone('utc', now()), cancelled_by = auth.uid(), cancellation_reason = nullif(trim(target_reason), '') where id = request_row.id returning * into request_row;
  perform public.complete_command_receipt(request_row.project_id, 'cancel_pressure_test_request', target_idempotency_key, jsonb_build_object('id', request_row.id));
  return request_row;
end;
$$;

alter table public.pressure_test_requests enable row level security;
alter table public.line_check_request_items enable row level security;
alter table public.item_clearance_request_items enable row level security;
alter table public.line_check_results enable row level security;
alter table public.punch_items enable row level security;
alter table public.punch_item_clearances enable row level security;

create policy "pressure test requests are scoped" on public.pressure_test_requests for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "pressure test facts are scoped" on public.line_check_results for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "pressure test punches are scoped" on public.punch_items for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "pressure test clearance facts are scoped" on public.punch_item_clearances for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "line check targets are scoped" on public.line_check_request_items for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));
create policy "clearance targets are scoped" on public.item_clearance_request_items for select to authenticated using (public.current_user_has_capability(project_id, 'testpack.view'));

create or replace view public.line_check_worklist with (security_invoker = true) as
select request.id as request_id, request.project_id, request.test_pack_id, request.request_number, request.team_id, request.assigned_on, request.cancelled_at,
  item.isometric_id, result.id as result_id
from public.pressure_test_requests request
join public.line_check_request_items item on item.request_id = request.id
left join public.line_check_results result on result.request_id = request.id and result.isometric_id = item.isometric_id;

create or replace view public.item_clearance_worklist with (security_invoker = true) as
select request.id as request_id, request.project_id, request.test_pack_id, request.request_number, request.team_id, request.assigned_on, request.cancelled_at,
  item.punch_item_id, clearance.id as clearance_id
from public.pressure_test_requests request
join public.item_clearance_request_items item on item.request_id = request.id
left join public.punch_item_clearances clearance on clearance.request_id = request.id and clearance.punch_item_id = item.punch_item_id;

create or replace view public.pressure_test_request_details with (security_invoker = true) as
select request.*, team.code as team_code, team.description as team_description,
  (select count(*) from public.line_check_request_items item where item.request_id = request.id) as line_check_iso_count,
  (select count(*) from public.line_check_results result where result.request_id = request.id) as line_check_completed_count,
  (select count(*) from public.item_clearance_request_items item where item.request_id = request.id) as clearance_item_count,
  (select count(*) from public.punch_item_clearances clearance where clearance.request_id = request.id) as clearance_completed_count
from public.pressure_test_requests request join public.project_teams team on team.id = request.team_id;

revoke all on public.pressure_test_requests, public.line_check_request_items, public.item_clearance_request_items, public.line_check_results, public.punch_items, public.punch_item_clearances from anon, authenticated;
grant select on public.pressure_test_requests, public.line_check_request_items, public.item_clearance_request_items, public.line_check_results, public.punch_items, public.punch_item_clearances, public.line_check_worklist, public.item_clearance_worklist, public.pressure_test_request_details to authenticated;
revoke all on function public.pressure_test_assert_pack(uuid), public.assign_line_check(uuid, uuid[], uuid, date, text), public.record_line_check_result(uuid, uuid, date, jsonb, text), public.assign_item_clearance(uuid, uuid[], uuid, date, text), public.record_punch_clearance(uuid, uuid, date, text), public.cancel_pressure_test_request(uuid, text, text) from public, anon;
grant execute on function public.assign_line_check(uuid, uuid[], uuid, date, text), public.record_line_check_result(uuid, uuid, date, jsonb, text), public.assign_item_clearance(uuid, uuid[], uuid, date, text), public.record_punch_clearance(uuid, uuid, date, text), public.cancel_pressure_test_request(uuid, text, text) to authenticated;
