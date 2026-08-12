-- Track 10: stable Test Pack identity and revision-bound ISO composition.

do $$
begin
  create type public.test_pack_medium as enum ('H', 'P', 'V');
exception when duplicate_object then null;
end;
$$;

create table public.test_packs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_number text not null check (length(trim(test_pack_number)) > 0),
  revision_no integer not null default 0 check (revision_no >= 0),
  system_id uuid not null references public.project_systems(id) on delete restrict,
  subsystem_id uuid not null references public.project_subsystems(id) on delete restrict,
  service_class_id uuid not null references public.project_service_classes(id) on delete restrict,
  line_service_id uuid not null references public.project_line_services(id) on delete restrict,
  pressure_unit public.pressure_unit not null,
  planned_start_on date not null,
  planned_end_on date not null check (planned_end_on >= planned_start_on),
  priority text not null check (length(trim(priority)) > 0),
  test_medium public.test_pack_medium not null,
  test_pressure numeric not null check (test_pressure > 0),
  location text not null check (length(trim(location)) > 0),
  volume_m3 numeric check (volume_m3 is null or volume_m3 > 0),
  lifecycle text not null default 'active' check (lifecycle in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, test_pack_number)
);

create unique index test_packs_number_ci_uq
  on public.test_packs (project_id, upper(btrim(test_pack_number)));

create table public.test_pack_isometrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  test_pack_id uuid not null references public.test_packs(id) on delete restrict,
  isometric_id uuid not null references public.isometrics(id) on delete restrict,
  assigned_isometric_revision_id uuid not null references public.isometric_revisions(id) on delete restrict,
  source_kind text not null default 'manual' check (source_kind in ('manual', 'import')),
  source_import_job_id uuid references public.import_jobs(id) on delete set null,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references public.profiles(id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (removed_at is null or removed_by is not null)
);

create unique index test_pack_isometrics_one_active
  on public.test_pack_isometrics (isometric_id)
  where removed_at is null;
create index test_pack_isometrics_pack_idx
  on public.test_pack_isometrics (test_pack_id, removed_at);

create or replace function public.test_pack_composition_is_locked(
  target_test_pack_id uuid,
  target_isometric_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select false;
$$;

create or replace function public.test_pack_assert_references(
  target_project_id uuid,
  target_system_id uuid,
  target_subsystem_id uuid,
  target_service_class_id uuid,
  target_line_service_id uuid,
  target_pds_area_id uuid default null
)
returns public.pressure_unit
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare resolved_unit public.pressure_unit;
begin
  if not public.current_user_has_capability(target_project_id, 'testpack.manage') then
    raise exception 'Test Pack management is not authorized' using errcode = '42501';
  end if;
  if target_pds_area_id is not null and not public.current_user_in_pds_scope(target_project_id, target_pds_area_id) then
    raise exception 'Test Pack reference is outside your PDS scope' using errcode = '42501';
  end if;
  if not exists (select 1 from public.project_systems where id = target_system_id and project_id = target_project_id and status = 'active') then
    raise exception 'System is missing, inactive, or outside the project' using errcode = 'PQC80';
  end if;
  if not exists (
    select 1 from public.project_subsystems
    where id = target_subsystem_id and project_id = target_project_id and system_id = target_system_id and status = 'active'
  ) then
    raise exception 'Subsystem is missing, inactive, or does not belong to the system' using errcode = 'PQC81';
  end if;
  if not exists (select 1 from public.project_service_classes where id = target_service_class_id and project_id = target_project_id and status = 'active') then
    raise exception 'Service class is missing, inactive, or outside the project' using errcode = 'PQC82';
  end if;
  if not exists (select 1 from public.project_line_services where id = target_line_service_id and project_id = target_project_id and status = 'active') then
    raise exception 'Line service is missing, inactive, or outside the project' using errcode = 'PQC83';
  end if;
  select unit into resolved_unit from public.project_pressure_units where project_id = target_project_id;
  if resolved_unit is null then
    raise exception 'Project pressure unit is not configured' using errcode = 'PQC84';
  end if;
  return resolved_unit;
end;
$$;

create or replace function public.test_pack_assert_iso(
  target_project_id uuid,
  target_isometric_id uuid
)
returns table (project_id uuid, isometric_id uuid, revision_id uuid, pds_area_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select iso.project_id, iso.id, revision.id, revision.pds_area_id
  from public.isometrics iso
  join public.isometric_revisions revision on revision.isometric_id = iso.id and revision.status = 'accepted'
  where iso.id = target_isometric_id and iso.project_id = target_project_id
  order by revision.revision_ordinal desc
  limit 1;
  if not found then
    raise exception 'ISO is missing, cross-project, or has no accepted revision' using errcode = 'PQC85';
  end if;
end;
$$;

create or replace function public.test_pack_audit(
  target_project_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  target_action text,
  target_before jsonb default null,
  target_after jsonb default null
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (target_project_id, auth.uid(), target_entity_type, target_entity_id, target_action, target_before, target_after);
$$;

create or replace function public.create_test_pack(
  target_project_id uuid,
  target_test_pack_number text,
  target_system_id uuid,
  target_subsystem_id uuid,
  target_service_class_id uuid,
  target_line_service_id uuid,
  target_planned_start_on date,
  target_planned_end_on date,
  target_priority text,
  target_test_medium public.test_pack_medium,
  target_test_pressure numeric,
  target_location text,
  target_volume_m3 numeric default null,
  target_idempotency_key text default null
)
returns public.test_packs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare claimed jsonb; pack public.test_packs; resolved_unit public.pressure_unit;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_project_id::text || ':' || upper(trim(target_test_pack_number)), 0));
  resolved_unit := public.test_pack_assert_references(target_project_id, target_system_id, target_subsystem_id, target_service_class_id, target_line_service_id);
  if target_planned_end_on < target_planned_start_on then raise exception 'Planned end cannot be before planned start' using errcode = 'PQC86'; end if;
  if target_test_pressure <= 0 or target_volume_m3 is not null and target_volume_m3 <= 0 then raise exception 'Pressure and volume must be positive' using errcode = 'PQC87'; end if;
  claimed := public.claim_command_receipt(target_project_id, 'create_test_pack', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into pack from public.test_packs where id = (claimed -> 'result' ->> 'id')::uuid;
    if pack.test_pack_number <> upper(trim(target_test_pack_number)) then raise exception 'Idempotency key has a different payload' using errcode = 'PQC76'; end if;
    return pack;
  end if;
  insert into public.test_packs (project_id, test_pack_number, system_id, subsystem_id, service_class_id, line_service_id, pressure_unit,
    planned_start_on, planned_end_on, priority, test_medium, test_pressure, location, volume_m3, created_by, updated_by)
  values (target_project_id, upper(trim(target_test_pack_number)), target_system_id, target_subsystem_id, target_service_class_id, target_line_service_id,
    resolved_unit, target_planned_start_on, target_planned_end_on, trim(target_priority), target_test_medium, target_test_pressure, trim(target_location), target_volume_m3, auth.uid(), auth.uid())
  returning * into pack;
  perform public.test_pack_audit(target_project_id, 'test_packs', pack.id, 'create_test_pack', null, to_jsonb(pack));
  perform public.complete_command_receipt(target_project_id, 'create_test_pack', target_idempotency_key, jsonb_build_object('id', pack.id, 'test_pack_number', pack.test_pack_number));
  return pack;
end;
$$;

create or replace function public.update_test_pack(
  target_test_pack_id uuid,
  target_system_id uuid,
  target_subsystem_id uuid,
  target_service_class_id uuid,
  target_line_service_id uuid,
  target_planned_start_on date,
  target_planned_end_on date,
  target_priority text,
  target_test_medium public.test_pack_medium,
  target_test_pressure numeric,
  target_location text,
  target_volume_m3 numeric default null,
  target_idempotency_key text default null
)
returns public.test_packs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pack public.test_packs; before_pack public.test_packs; resolved_unit public.pressure_unit; claimed jsonb;
begin
  select * into pack from public.test_packs where id = target_test_pack_id for update;
  if not found then raise exception 'Test Pack is missing' using errcode = 'PQC88'; end if;
  if pack.lifecycle <> 'active' then raise exception 'Archived Test Pack is read-only' using errcode = 'PQC89'; end if;
  resolved_unit := public.test_pack_assert_references(pack.project_id, target_system_id, target_subsystem_id, target_service_class_id, target_line_service_id);
  if target_planned_end_on < target_planned_start_on then raise exception 'Planned end cannot be before planned start' using errcode = 'PQC86'; end if;
  claimed := public.claim_command_receipt(pack.project_id, 'update_test_pack', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then return pack; end if;
  before_pack := pack;
  update public.test_packs set system_id = target_system_id, subsystem_id = target_subsystem_id, service_class_id = target_service_class_id,
    line_service_id = target_line_service_id, pressure_unit = resolved_unit, planned_start_on = target_planned_start_on, planned_end_on = target_planned_end_on,
    priority = trim(target_priority), test_medium = target_test_medium, test_pressure = target_test_pressure, location = trim(target_location), volume_m3 = target_volume_m3,
    revision_no = revision_no + 1, updated_by = auth.uid(), updated_at = timezone('utc', now())
  where id = target_test_pack_id returning * into pack;
  perform public.test_pack_audit(pack.project_id, 'test_packs', pack.id, 'update_test_pack', to_jsonb(before_pack), to_jsonb(pack));
  perform public.complete_command_receipt(pack.project_id, 'update_test_pack', target_idempotency_key, jsonb_build_object('id', pack.id));
  return pack;
end;
$$;

create or replace function public.compose_test_pack(
  target_test_pack_id uuid,
  target_isometric_id uuid,
  target_source_kind text default 'manual',
  target_source_import_job_id uuid default null,
  target_idempotency_key text default null
)
returns public.test_pack_isometrics
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pack public.test_packs; iso record; member public.test_pack_isometrics; claimed jsonb;
begin
  select * into pack from public.test_packs where id = target_test_pack_id for update;
  if not found then raise exception 'Test Pack is missing' using errcode = 'PQC88'; end if;
  if pack.lifecycle <> 'active' then raise exception 'Archived Test Pack is read-only' using errcode = 'PQC89'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_isometric_id::text, 0));
  select * into iso from public.test_pack_assert_iso(pack.project_id, target_isometric_id);
  if not public.current_user_in_pds_scope(pack.project_id, iso.pds_area_id) then raise exception 'ISO is outside your PDS scope' using errcode = '42501'; end if;
  if public.test_pack_composition_is_locked(pack.id, iso.isometric_id) then raise exception 'Test Pack composition is locked' using errcode = 'PQC90'; end if;
  claimed := public.claim_command_receipt(pack.project_id, 'compose_test_pack', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into member from public.test_pack_isometrics where id = (claimed -> 'result' ->> 'id')::uuid; return member; end if;
  insert into public.test_pack_isometrics (project_id, test_pack_id, isometric_id, assigned_isometric_revision_id, source_kind, source_import_job_id, assigned_by)
  values (pack.project_id, pack.id, iso.isometric_id, iso.revision_id, target_source_kind, target_source_import_job_id, auth.uid()) returning * into member;
  perform public.test_pack_audit(pack.project_id, 'test_pack_isometrics', member.id, 'compose_test_pack', null, to_jsonb(member));
  perform public.complete_command_receipt(pack.project_id, 'compose_test_pack', target_idempotency_key, jsonb_build_object('id', member.id));
  return member;
end;
$$;

create or replace function public.remove_test_pack_isometric(
  target_test_pack_id uuid,
  target_isometric_id uuid,
  target_idempotency_key text default null
)
returns public.test_pack_isometrics
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare member public.test_pack_isometrics; claimed jsonb;
begin
  select membership.* into member from public.test_pack_isometrics membership join public.test_packs pack on pack.id = membership.test_pack_id
    where membership.test_pack_id = target_test_pack_id and membership.isometric_id = target_isometric_id and membership.removed_at is null for update;
  if not found then raise exception 'Active Test Pack membership is missing' using errcode = 'PQC91'; end if;
  if not public.current_user_has_capability(member.project_id, 'testpack.manage') then raise exception 'Test Pack management is not authorized' using errcode = '42501'; end if;
  claimed := public.claim_command_receipt(member.project_id, 'remove_test_pack_isometric', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into member from public.test_pack_isometrics where id = (claimed -> 'result' ->> 'id')::uuid; return member; end if;
  update public.test_pack_isometrics set removed_at = timezone('utc', now()), removed_by = auth.uid() where id = member.id returning * into member;
  perform public.test_pack_audit(member.project_id, 'test_pack_isometrics', member.id, 'remove_test_pack_isometric', null, to_jsonb(member));
  perform public.complete_command_receipt(member.project_id, 'remove_test_pack_isometric', target_idempotency_key, jsonb_build_object('id', member.id));
  return member;
end;
$$;

create or replace function public.move_test_pack_isometric(
  target_isometric_id uuid,
  target_target_test_pack_id uuid,
  target_idempotency_key text default null
)
returns public.test_pack_isometrics
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare old_member public.test_pack_isometrics; new_member public.test_pack_isometrics;
begin
  select * into old_member from public.test_pack_isometrics where isometric_id = target_isometric_id and removed_at is null for update;
  if not found then raise exception 'Active Test Pack membership is missing' using errcode = 'PQC91'; end if;
  perform public.remove_test_pack_isometric(old_member.test_pack_id, target_isometric_id, null);
  select public.compose_test_pack(target_target_test_pack_id, target_isometric_id, 'manual', null, target_idempotency_key) into new_member;
  return new_member;
end;
$$;

create or replace function public.archive_test_pack(
  target_test_pack_id uuid,
  target_idempotency_key text default null
)
returns public.test_packs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare pack public.test_packs; claimed jsonb;
begin
  select * into pack from public.test_packs where id = target_test_pack_id for update;
  if not found then raise exception 'Test Pack is missing' using errcode = 'PQC88'; end if;
  if not public.current_user_has_capability(pack.project_id, 'testpack.manage') then raise exception 'Test Pack management is not authorized' using errcode = '42501'; end if;
  claimed := public.claim_command_receipt(pack.project_id, 'archive_test_pack', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into pack from public.test_packs where id = (claimed -> 'result' ->> 'id')::uuid; return pack; end if;
  update public.test_packs set lifecycle = 'archived', updated_by = auth.uid(), updated_at = timezone('utc', now()) where id = pack.id returning * into pack;
  perform public.test_pack_audit(pack.project_id, 'test_packs', pack.id, 'archive_test_pack', null, to_jsonb(pack));
  perform public.complete_command_receipt(pack.project_id, 'archive_test_pack', target_idempotency_key, jsonb_build_object('id', pack.id));
  return pack;
end;
$$;

alter table public.test_packs enable row level security;
alter table public.test_pack_isometrics enable row level security;

create policy "test pack catalog is scoped" on public.test_packs for select to authenticated
using (
  public.current_user_has_capability(project_id, 'testpack.view')
  and (
    not exists (select 1 from public.test_pack_isometrics member where member.test_pack_id = test_packs.id and member.removed_at is null)
    or not exists (
      select 1
      from public.test_pack_isometrics member
      join public.isometric_revisions revision on revision.id = member.assigned_isometric_revision_id
      where member.test_pack_id = test_packs.id and member.removed_at is null
        and not public.current_user_in_pds_scope(test_packs.project_id, revision.pds_area_id)
    )
  )
);

create policy "test pack members are scoped" on public.test_pack_isometrics for select to authenticated
using (
  public.current_user_has_capability(project_id, 'testpack.view')
  and exists (
    select 1 from public.isometric_revisions revision
    where revision.id = assigned_isometric_revision_id
      and public.current_user_in_pds_scope(project_id, revision.pds_area_id)
  )
);

create or replace view public.test_pack_catalog
with (security_invoker = true)
as
select pack.*, count(member.id) filter (where member.removed_at is null)::integer as active_iso_count
from public.test_packs pack
left join public.test_pack_isometrics member on member.test_pack_id = pack.id
group by pack.id;

create or replace view public.test_pack_member_worklist
with (security_invoker = true)
as
select member.id, member.project_id, member.test_pack_id, pack.test_pack_number, member.isometric_id,
  iso.iso_number, member.assigned_isometric_revision_id, member.source_kind, member.assigned_at, member.removed_at
from public.test_pack_isometrics member
join public.test_packs pack on pack.id = member.test_pack_id
join public.isometrics iso on iso.id = member.isometric_id;

create trigger test_packs_updated_at before update on public.test_packs
for each row execute function public.set_updated_at();

revoke all on public.test_packs, public.test_pack_isometrics from anon, authenticated;
grant select on public.test_packs, public.test_pack_isometrics, public.test_pack_catalog, public.test_pack_member_worklist to authenticated;
revoke insert, update, delete, truncate on public.test_packs, public.test_pack_isometrics from authenticated, anon;
revoke all on function public.test_pack_assert_references(uuid, uuid, uuid, uuid, uuid, uuid), public.test_pack_assert_iso(uuid, uuid), public.test_pack_audit(uuid, text, uuid, text, jsonb, jsonb), public.test_pack_composition_is_locked(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_test_pack(uuid, text, uuid, uuid, uuid, uuid, date, date, text, public.test_pack_medium, numeric, text, numeric, text), public.update_test_pack(uuid, uuid, uuid, uuid, uuid, date, date, text, public.test_pack_medium, numeric, text, numeric, text), public.compose_test_pack(uuid, uuid, text, uuid, text), public.remove_test_pack_isometric(uuid, uuid, text), public.move_test_pack_isometric(uuid, uuid, text), public.archive_test_pack(uuid, text) from public, anon;
grant execute on function public.create_test_pack(uuid, text, uuid, uuid, uuid, uuid, date, date, text, public.test_pack_medium, numeric, text, numeric, text), public.update_test_pack(uuid, uuid, uuid, uuid, uuid, date, date, text, public.test_pack_medium, numeric, text, numeric, text), public.compose_test_pack(uuid, uuid, text, uuid, text), public.remove_test_pack_isometric(uuid, uuid, text), public.move_test_pack_isometric(uuid, uuid, text), public.archive_test_pack(uuid, text) to authenticated;
