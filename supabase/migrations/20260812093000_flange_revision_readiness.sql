-- Track 09: authorize and materialize only the flange progress that a revision
-- decision explicitly carries forward.

alter table public.revision_progress_copies
  drop constraint if exists revision_progress_copies_progress_kind_check;
alter table public.revision_progress_copies
  add constraint revision_progress_copies_progress_kind_check
  check (progress_kind in ('fabrication_start', 'sent_to_paint', 'paint', 'flange_progress'));

create or replace function public.authorize_flange_progress_revision_copies()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_flange record;
  source_flange record;
  change_id uuid;
begin
  if old.status = 'accepted' or new.status <> 'accepted' then
    return new;
  end if;

  for target_flange in
    select fjr.*, iso.project_id, iso.id as isometric_id
    from public.flange_joint_revisions fjr
    join public.spool_revisions sr on sr.id = fjr.spool_revision_id
    join public.isometrics iso on iso.id = (select isometric_id from public.isometric_revisions where id = new.id)
    where sr.isometric_revision_id = new.id
      and not fjr.is_removed
  loop
    select old_fjr.*, sr.id as source_spool_revision_id
    into source_flange
    from public.flange_joint_revisions old_fjr
    join public.spool_revisions sr on sr.id = old_fjr.spool_revision_id
    join public.isometric_revisions old_ir on old_ir.id = sr.isometric_revision_id
    where old_fjr.flange_joint_id = target_flange.flange_joint_id
      and old_ir.isometric_id = new.isometric_id
      and old_ir.status = 'superseded'
      and not old_fjr.is_removed
    order by old_ir.revision_ordinal desc
    limit 1;
    if source_flange.id is null or not exists (
      select 1 from public.flange_progress_records p
      where p.flange_joint_revision_id = source_flange.id and p.superseded_at is null
    ) then
      continue;
    end if;

    select id into change_id
    from public.revision_change_items
    where isometric_revision_id = new.id
      and entity_type = 'flange_joint'
      and entity_id = target_flange.flange_joint_id
    limit 1;
    if change_id is null then
      insert into public.revision_change_items (
        project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
        entity_type, entity_id, entity_key, change_type, previous_payload, next_payload
      ) values (
        target_flange.project_id, target_flange.isometric_id, new.id,
        (select id from public.isometric_revisions where isometric_id = new.isometric_id and status = 'superseded' order by revision_ordinal desc limit 1),
        'flange_joint', target_flange.flange_joint_id,
        (select flange_number from public.flange_joints where id = target_flange.flange_joint_id),
        'unchanged', to_jsonb(source_flange), to_jsonb(target_flange)
      ) returning id into change_id;
    end if;
    if not exists (
      select 1 from public.revision_decisions where change_item_id = change_id
    ) then
      insert into public.revision_decisions(change_item_id, decision, decided_by)
      values (change_id, 'done_without_modification', coalesce(new.created_by, auth.uid()));
    end if;
    if exists (
      select 1 from public.revision_decisions
      where change_item_id = change_id and decision = 'done_without_modification'
    ) then
      insert into public.revision_progress_copies (
        change_item_id, source_spool_revision_id, target_spool_revision_id,
        progress_kind, copied_by
      ) values (
        change_id, source_flange.source_spool_revision_id, target_flange.spool_revision_id,
        'flange_progress', coalesce(new.created_by, auth.uid())
      ) on conflict (change_item_id, progress_kind) do nothing;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists isometric_revision_flange_copy_authorization on public.isometric_revisions;
create trigger isometric_revision_flange_copy_authorization
  after update of status on public.isometric_revisions
  for each row execute function public.authorize_flange_progress_revision_copies();

create or replace function public.materialize_flange_progress_copies(
  target_project_id uuid,
  target_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claim jsonb;
  copy_row record;
  source_progress public.flange_progress_records;
  target_flange_id uuid;
  target_flange_revision_id uuid;
  jointer_ids uuid[];
  created_count integer := 0;
  copied public.flange_progress_records;
begin
  if not public.current_user_has_capability(target_project_id, 'flange.manage') then
    raise exception 'Flange progress management is required' using errcode = 'PQC70';
  end if;
  claim := public.claim_command_receipt(target_project_id, 'materialize_flange_progress_copies', target_idempotency_key);
  if claim ->> 'status' = 'completed' then
    return claim -> 'result';
  end if;

  for copy_row in
    select rpc.*, item.project_id, item.entity_id
    from public.revision_progress_copies rpc
    join public.revision_change_items item on item.id = rpc.change_item_id
    join public.spool_revisions target_sr on target_sr.id = rpc.target_spool_revision_id
    join public.isometric_revisions target_ir on target_ir.id = target_sr.isometric_revision_id
    where item.project_id = target_project_id
      and rpc.progress_kind = 'flange_progress'
      and rpc.copied_payload = '{}'::jsonb
      and target_ir.status = 'accepted'
    order by rpc.copied_at, rpc.id
    for update of rpc skip locked
  loop
    if not public.current_user_in_pds_scope(target_project_id, (
      select pds_area_id from public.isometric_revisions ir
      join public.spool_revisions sr on sr.isometric_revision_id = ir.id
      where sr.id = copy_row.target_spool_revision_id
    )) then
      raise exception 'Flange progress copy is outside your PDS scope' using errcode = 'PQC71';
    end if;
    select p.* into source_progress
    from public.flange_progress_records p
    where p.flange_joint_revision_id = (
      select id from public.flange_joint_revisions
      where spool_revision_id = copy_row.source_spool_revision_id
        and flange_joint_id = copy_row.entity_id
      limit 1
    ) and p.superseded_at is null;
    if source_progress.id is null then
      raise exception 'Source flange progress is missing' using errcode = 'PQC78';
    end if;
    select id into target_flange_revision_id
    from public.flange_joint_revisions
    where spool_revision_id = copy_row.target_spool_revision_id
      and flange_joint_id = copy_row.entity_id;
    if target_flange_revision_id is null then
      raise exception 'Target flange revision is missing' using errcode = 'PQC78';
    end if;
    select array_agg(jointer_team_id order by jointer_team_id) into jointer_ids
    from public.flange_jointer_assignments
    where progress_record_id = source_progress.id;
    copied := public.record_flange_progress_invariant(
      target_project_id, target_flange_revision_id, source_progress.joint_category_id,
      source_progress.torquing_requirement_id, source_progress.jointing_value,
      source_progress.joint_date, source_progress.report_number, source_progress.tag_number,
      jointer_ids, 'revision_copy', null, copy_row.id, null, auth.uid()
    );
    update public.revision_progress_copies
    set copied_payload = jsonb_build_object('materialized', true, 'record_id', copied.id)
    where id = copy_row.id;
    insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state)
    values (target_project_id, auth.uid(), 'revision_progress_copies', copy_row.id,
      'materialize_flange_progress_copy', jsonb_build_object('record_id', copied.id));
    created_count := created_count + 1;
  end loop;

  return public.complete_command_receipt(
    target_project_id, 'materialize_flange_progress_copies', target_idempotency_key,
    jsonb_build_object('created_count', created_count)
  );
end;
$$;

create or replace view public.flange_joint_readiness
with (security_invoker = true)
as
select
  worklist.*,
  category.category_code,
  category.timing,
  category.reason,
  category.coefficient as category_coefficient,
  (category.category_code in ('Y', 'Z')) as requires_reinstatement
from public.flange_joint_worklist worklist
left join public.project_joint_categories category
  on category.id = worklist.joint_category_id;

drop policy if exists "flange view joint categories" on public.project_joint_categories;
create policy "flange view joint categories"
on public.project_joint_categories for select to authenticated
using (public.current_user_has_capability(project_id, 'flange.view'));

revoke all on function public.authorize_flange_progress_revision_copies() from public, anon, authenticated;
revoke all on function public.materialize_flange_progress_copies(uuid, text) from public, anon;
grant execute on function public.materialize_flange_progress_copies(uuid, text) to authenticated;
grant select on public.flange_joint_readiness to authenticated;

-- A forward-safe snapshot guard also protects deployments that already have the
-- first command migration applied before the copy branch was added.
create or replace function public.enforce_flange_progress_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then return new; end if;
  if tg_op = 'UPDATE'
     and old.superseded_at is null
     and new.superseded_at is not null
     and new.project_id = old.project_id
     and new.flange_joint_revision_id = old.flange_joint_revision_id
     and new.joint_category_id = old.joint_category_id
     and new.torquing_requirement_id = old.torquing_requirement_id
     and new.jointing_method_snapshot = old.jointing_method_snapshot
     and new.jointing_value = old.jointing_value
     and new.joint_date = old.joint_date
     and new.report_number = old.report_number
     and new.tag_number = old.tag_number
     and new.source_kind = old.source_kind
     and new.source_import_job_id is not distinct from old.source_import_job_id
     and new.source_revision_progress_copy_id is not distinct from old.source_revision_progress_copy_id
     and new.supersedes_record_id is not distinct from old.supersedes_record_id
     and new.ut_project_quantity is not distinct from old.ut_project_quantity
     and new.ut_coefficient_diameter is not distinct from old.ut_coefficient_diameter
     and new.ut_coefficient_rating is not distinct from old.ut_coefficient_rating
     and new.ut_coefficient_punch is not distinct from old.ut_coefficient_punch
     and new.ut_formula_version = old.ut_formula_version
     and new.calculated_ut is not distinct from old.calculated_ut
     and new.recorded_by is not distinct from old.recorded_by
     and new.recorded_at = old.recorded_at
     and current_setting('pipeqc.flange_progress_command', true) = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.id = old.id
     and new.project_id = old.project_id
     and new.flange_joint_revision_id = old.flange_joint_revision_id
     and new.joint_category_id = old.joint_category_id
     and new.torquing_requirement_id = old.torquing_requirement_id
     and new.jointing_method_snapshot = old.jointing_method_snapshot
     and new.jointing_value = old.jointing_value
     and new.joint_date = old.joint_date
     and new.report_number = old.report_number
     and new.tag_number = old.tag_number
     and new.source_kind = old.source_kind
     and new.source_import_job_id is not distinct from old.source_import_job_id
     and new.source_revision_progress_copy_id is not distinct from old.source_revision_progress_copy_id
     and new.supersedes_record_id is not distinct from old.supersedes_record_id
     and new.ut_formula_version = old.ut_formula_version
     and new.recorded_by is not distinct from old.recorded_by
     and new.recorded_at = old.recorded_at
     and new.superseded_at is not distinct from old.superseded_at
     and current_setting('pipeqc.flange_progress_command', true) = 'copy' then
    return new;
  end if;
  raise exception 'Flange progress business history is append-only' using errcode = 'PQC79';
end;
$$;

create or replace function public.snapshot_flange_copy_ut()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare source public.flange_progress_records;
begin
  if new.source_kind <> 'revision_copy' then return new; end if;
  select p.* into source
  from public.revision_progress_copies copy_row
  join public.revision_change_items item on item.id = copy_row.change_item_id
  join public.flange_joint_revisions source_revision
    on source_revision.flange_joint_id = item.entity_id
   and source_revision.spool_revision_id = copy_row.source_spool_revision_id
  join public.flange_progress_records p
    on p.flange_joint_revision_id = source_revision.id and p.superseded_at is null
  where copy_row.id = new.source_revision_progress_copy_id;
  if source.id is not null then
    perform set_config('pipeqc.flange_progress_command', 'copy', true);
    update public.flange_progress_records
    set ut_project_quantity = source.ut_project_quantity,
        ut_coefficient_diameter = source.ut_coefficient_diameter,
        ut_coefficient_rating = source.ut_coefficient_rating,
        ut_coefficient_punch = source.ut_coefficient_punch,
        calculated_ut = source.calculated_ut
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists flange_progress_copy_ut_snapshot on public.flange_progress_records;
create trigger flange_progress_copy_ut_snapshot
  after insert on public.flange_progress_records
  for each row execute function public.snapshot_flange_copy_ut();
