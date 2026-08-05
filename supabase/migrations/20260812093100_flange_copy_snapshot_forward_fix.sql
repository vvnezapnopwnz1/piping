-- Forward-only companion for local stacks that already applied 20260812092000.
create or replace function public.enforce_flange_progress_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then return new; end if;
  if tg_op = 'UPDATE' and current_setting('pipeqc.flange_progress_command', true) = 'copy'
     and (to_jsonb(new) - array['ut_project_quantity','ut_coefficient_diameter','ut_coefficient_rating','ut_coefficient_punch','calculated_ut'])
       = (to_jsonb(old) - array['ut_project_quantity','ut_coefficient_diameter','ut_coefficient_rating','ut_coefficient_punch','calculated_ut']) then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.superseded_at is null and new.superseded_at is not null
     and (to_jsonb(new) - 'superseded_at') = (to_jsonb(old) - 'superseded_at')
     and current_setting('pipeqc.flange_progress_command', true) = 'on' then
    return new;
  end if;
  raise exception 'Flange progress business history is append-only' using errcode = 'PQC79';
end;
$$;

create or replace function public.snapshot_flange_copy_ut()
returns trigger
language plpgsql security definer
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
