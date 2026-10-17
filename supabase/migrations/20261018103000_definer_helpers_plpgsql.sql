-- N2: three security-definer helpers become plpgsql, with the same answers.
--
-- On the KZ stand (UPG-1) current_user_can_read_fabrication_spool() cost 3.5 ms per call as a SQL function
-- and 0.29 ms as plpgsql: a SQL function body is planned again on every call, plpgsql keeps its plan.
-- material_check_records, material_check_items and qc13_progress_forms call it per row (weld_log_rows
-- spent 2.4 s of 3.6 s there), spool_revision_materials reaches it through construction_spool_project_id(),
-- flange_joint_revisions through flange_revision_in_pds_scope().
--
-- Bodies are the previous queries, split in two steps (find the row, then check rights). Same security
-- definer, same search_path, same results; test 122 pins them for an admin, a PDS-scoped subcontractor,
-- a reader and an outsider, and for an unknown id.

create or replace function public.current_user_can_read_fabrication_spool(target_project_id uuid, target_spool_revision_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  spool_pds_area_id uuid;
begin
  select revision.pds_area_id into spool_pds_area_id
  from public.spool_revisions spool_revision
  join public.isometric_revisions revision on revision.id = spool_revision.isometric_revision_id
  join public.isometrics iso on iso.id = revision.isometric_id
  where spool_revision.id = target_spool_revision_id
    and iso.project_id = target_project_id;
  if not found then
    return false;
  end if;
  return (public.current_user_has_capability(target_project_id, 'fabrication.view')
          or public.current_user_has_capability(target_project_id, 'erection.view'))
     and public.current_user_in_pds_scope(target_project_id, spool_pds_area_id);
end;
$function$;

create or replace function public.construction_spool_project_id(target_spool_revision_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  spool_project_id uuid;
begin
  select iso.project_id into spool_project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id;
  if not found then
    return null;
  end if;
  if public.current_user_can_read_fabrication_spool(spool_project_id, target_spool_revision_id) then
    return spool_project_id;
  end if;
  return null;
end;
$function$;

create or replace function public.flange_revision_in_pds_scope(target_revision_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  flange_project_id uuid;
  flange_pds_area_id uuid;
begin
  select iso.project_id, ir.pds_area_id into flange_project_id, flange_pds_area_id
  from public.flange_joint_revisions fjr
  join public.spool_revisions sr on sr.id = fjr.spool_revision_id
  join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = ir.isometric_id
  where fjr.id = target_revision_id;
  if not found then
    return false;
  end if;
  return public.current_user_in_pds_scope(flange_project_id, flange_pds_area_id);
end;
$function$;
