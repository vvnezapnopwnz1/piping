-- Keep the read model transactionally aligned with the canonical fabrication records. The
-- triggers cover both browser commands and engineering/revision writes, so a new ingestion path
-- cannot silently reintroduce a stale projection.
create function public.refresh_fabrication_projection_from_spool_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_spool_revision_id uuid;
begin
  target_spool_revision_id := case when tg_op = 'DELETE' then old.id else new.id end;
  perform public.recompute_fabrication_spool_projection(target_spool_revision_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function public.refresh_fabrication_projection_from_spool_child()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_spool_revision_id uuid;
begin
  target_spool_revision_id := case
    when tg_op = 'DELETE' then old.spool_revision_id
    else new.spool_revision_id
  end;
  perform public.recompute_fabrication_spool_projection(target_spool_revision_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function public.refresh_fabrication_projection_from_pwht_result()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_requirement_id uuid;
declare target_spool_revision_id uuid;
begin
  target_requirement_id := case
    when tg_op = 'DELETE' then old.pwht_requirement_id
    else new.pwht_requirement_id
  end;
  select spool_revision_id into target_spool_revision_id
  from public.pwht_requirements
  where id = target_requirement_id;
  if target_spool_revision_id is not null then
    perform public.recompute_fabrication_spool_projection(target_spool_revision_id);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function public.refresh_fabrication_projection_from_isometric_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_spool_revision_id uuid;
begin
  for target_spool_revision_id in
    select id
    from public.spool_revisions
    where isometric_revision_id = case when tg_op = 'DELETE' then old.id else new.id end
  loop
    perform public.recompute_fabrication_spool_projection(target_spool_revision_id);
  end loop;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger fabrication_projection_on_spool_revision
after insert or update or delete on public.spool_revisions
for each row execute function public.refresh_fabrication_projection_from_spool_revision();

create trigger fabrication_projection_on_isometric_revision
after insert or update or delete on public.isometric_revisions
for each row execute function public.refresh_fabrication_projection_from_isometric_revision();

create trigger fabrication_projection_on_spool_material
after insert or update or delete on public.spool_revision_materials
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_weld_joint
after insert or update or delete on public.weld_joint_revisions
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_support_revision
after insert or update or delete on public.support_revisions
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_progress_event
after insert or update or delete on public.construction_progress_events
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_weld_progress
after insert or update or delete on public.weld_progress_records
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_support_progress
after insert or update or delete on public.support_progress_records
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_nde_obligation
after insert or update or delete on public.nde_obligations
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_pwht_requirement
after insert or update or delete on public.pwht_requirements
for each row execute function public.refresh_fabrication_projection_from_spool_child();

create trigger fabrication_projection_on_pwht_result
after insert or update or delete on public.pwht_results
for each row execute function public.refresh_fabrication_projection_from_pwht_result();

revoke all on function public.refresh_fabrication_projection_from_spool_revision() from public, anon, authenticated;
revoke all on function public.refresh_fabrication_projection_from_spool_child() from public, anon, authenticated;
revoke all on function public.refresh_fabrication_projection_from_pwht_result() from public, anon, authenticated;
revoke all on function public.refresh_fabrication_projection_from_isometric_revision() from public, anon, authenticated;
