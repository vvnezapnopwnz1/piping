-- Migration: spool_sequence_not_a_rule
-- spool_revisions.sequence_number is the spool's position in the SpoolGen package the parser read
-- (1, 2, … across the whole package). It is shown nowhere and depends on what else the package
-- holds, so no rule reads it any more:
--   * preview_spooling_import compares spools without it, so a revision imported alone no longer
--     reports its unchanged spools as revised;
--   * revalidate_test_pack_import_job no longer compares the Spool Revision column with it. The
--     spool is named by ISO, ISO revision and spool number, which the import still checks.
-- Both functions are otherwise as they are live. Test: 111_spool_sequence_not_a_rule.test.sql.

CREATE OR REPLACE FUNCTION public.preview_spooling_import(target_job_id uuid)
 RETURNS TABLE(iso_number text, entity_type engineering_entity_type, entity_key text, change_type revision_change_type, requires_decision boolean, decision revision_decision, previous_payload jsonb, next_payload jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.view') then
    raise exception 'Spooling view capability is required' using errcode = '42501';
  end if;

  return query
  with staged as (
    select s.entity_kind, s.entity_values from public.spooling_staging(target_job_id) s
  ),
  -- The accepted revision of every ISO named by the file set, if there is one.
  previous_revision as (
    select distinct on (iso.iso_number)
      iso.iso_number,
      rev.id as revision_id
    from staged st
    join public.isometrics iso
      on iso.project_id = job.project_id
     and iso.iso_number = st.entity_values ->> 'iso_number'
    join public.isometric_revisions rev
      on rev.isometric_id = iso.id and rev.status = 'accepted'
  ),
  staged_spool as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'spool_number' as entity_key,
      jsonb_build_object(
        'sequence_number', coalesce(st.entity_values ->> 'sequence_number', '1'),
        'weight_kg', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'weight_kg')),
        'material_class', coalesce(st.entity_values ->> 'material_class', '')
      ) as payload
    from staged st where st.entity_kind = 'spool'
  ),
  previous_spool as (
    select
      pr.iso_number,
      sp.spool_number as entity_key,
      jsonb_build_object(
        'sequence_number', sr.sequence_number::text,
        'weight_kg', public.engineering_numeric_key(sr.weight_kg),
        'material_class', coalesce(sr.material_class, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    where sr.is_removed = false
  ),
  staged_weld as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'weld_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'weld_type', coalesce(st.entity_values ->> 'weld_type', ''),
        'weld_location', coalesce(st.entity_values ->> 'weld_location', 'shop'),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'thickness_mm', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'thickness_mm'))
      ) as payload
    from staged st where st.entity_kind = 'weld_joint'
  ),
  previous_weld as (
    select
      pr.iso_number,
      wj.weld_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'weld_type', coalesce(wt.code, ''),
        'weld_location', wjr.weld_location,
        'diameter_inch', public.engineering_numeric_key(wjr.diameter_inch),
        'thickness_mm', public.engineering_numeric_key(wjr.thickness_mm)
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.weld_joint_revisions wjr on wjr.spool_revision_id = sr.id
    join public.weld_joints wj on wj.id = wjr.weld_joint_id
    left join public.project_weld_types wt on wt.id = wjr.weld_type_id
    where wjr.is_removed = false
  ),
  staged_support as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'support_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'support_type', coalesce(st.entity_values ->> 'support_type', ''),
        'quantity', coalesce(st.entity_values ->> 'quantity', '1')
      ) as payload
    from staged st where st.entity_kind = 'support'
  ),
  previous_support as (
    select
      pr.iso_number,
      su.support_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'support_type', coalesce(supr.support_type, ''),
        'quantity', supr.quantity::text
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.support_revisions supr on supr.spool_revision_id = sr.id
    join public.supports su on su.id = supr.support_id
    where supr.is_removed = false
  ),
  staged_flange as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'flange_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'flange_rating', coalesce(st.entity_values ->> 'flange_rating', ''),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'bolt_size', coalesce(st.entity_values ->> 'bolt_size', ''),
        'bolt_quantity', coalesce(st.entity_values ->> 'bolt_quantity', ''),
        'joint_type', coalesce(st.entity_values ->> 'joint_type', '')
      ) as payload
    from staged st where st.entity_kind = 'flange_joint'
  ),
  previous_flange as (
    select
      pr.iso_number,
      fj.flange_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'flange_rating', coalesce(fjr.flange_rating, ''),
        'diameter_inch', public.engineering_numeric_key(fjr.diameter_inch),
        'bolt_size', coalesce(fjr.bolt_size, ''),
        'bolt_quantity', coalesce(fjr.bolt_quantity::text, ''),
        'joint_type', coalesce(fjr.joint_type, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.flange_joint_revisions fjr on fjr.spool_revision_id = sr.id
    join public.flange_joints fj on fj.id = fjr.flange_joint_id
    where fjr.is_removed = false
  ),
  combined as (
    select 'spool'::public.engineering_entity_type as et,
           coalesce(s.iso_number, p.iso_number) as iso_number,
           coalesce(s.entity_key, p.entity_key) as entity_key,
           p.payload as previous_payload, s.payload as next_payload
    from staged_spool s full outer join previous_spool p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'weld_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_weld s full outer join previous_weld p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'support', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_support s full outer join previous_support p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'flange_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_flange s full outer join previous_flange p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
  ),
  typed as (
    select
      c.iso_number,
      c.et,
      c.entity_key,
      case
        when c.previous_payload is null then 'new'
        when c.next_payload is null then 'removed'
        when c.previous_payload - 'sequence_number' = c.next_payload - 'sequence_number' then 'unchanged'
        else 'revised'
      end::public.revision_change_type as change_type,
      c.previous_payload,
      c.next_payload,
      exists (select 1 from previous_revision pr where pr.iso_number = c.iso_number) as iso_is_revised
    from combined c
  ),
  spool_decision as (
    select d.entity_key, d.decision
    from public.import_revision_decisions d
    where d.job_id = target_job_id and d.entity_type = 'spool'
  )
  select
    t.iso_number,
    t.et,
    t.entity_key,
    t.change_type,
    case
      -- Dossier 15.2: every spool of a revised ISO needs a decision.
      when t.et = 'spool' then t.iso_is_revised
      -- Dossier 15.3: a weld needs its own decision only inside a rework spool.
      when t.et = 'weld_joint' then t.iso_is_revised and exists (
        select 1 from spool_decision sd
        where sd.decision = 'rework'
          and sd.entity_key = coalesce(
            t.next_payload ->> 'spool_number', t.previous_payload ->> 'spool_number')
      )
      else false
    end as requires_decision,
    (select d.decision from public.import_revision_decisions d
     where d.job_id = target_job_id and d.entity_type = t.et and d.entity_key = t.entity_key),
    t.previous_payload,
    t.next_payload
  from typed t
  order by t.iso_number, t.et, t.entity_key;
end;
$function$;

CREATE OR REPLACE FUNCTION public.revalidate_test_pack_import_job(target_job_id uuid)
 RETURNS TABLE(blocker_count integer, conflict_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare job public.import_jobs; row_rec record; accepted record; pack public.test_packs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found or job.import_type <> 'test_pack_composition' then raise exception 'Test Pack import job was not found' using errcode = 'PQC12'; end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') or not public.current_user_has_capability(job.project_id, 'testpack.manage') then
    raise exception 'Test Pack import needs both import and Test Pack management permissions' using errcode = 'PQC92';
  end if;
  delete from public.import_job_issues where job_id = target_job_id and code like 'SRV_TP_%';

  for row_rec in select * from public.import_job_rows where job_id = target_job_id and action <> 'skip' order by row_number loop
    select iso.id, iso.project_id, revision.id as revision_id, revision.revision_number, revision.pds_area_id
      into accepted
      from public.isometrics iso join public.isometric_revisions revision on revision.isometric_id = iso.id and revision.status = 'accepted'
      where iso.project_id = job.project_id and upper(iso.iso_number) = upper(row_rec.normalized_values ->> 'iso_number')
      order by revision.revision_ordinal desc limit 1;
    if not found then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'iso_number', 'blocker', 'SRV_TP_UNKNOWN_ISO', 'ISO does not exist in this project or has no accepted revision');
      continue;
    end if;
    if upper(coalesce(row_rec.normalized_values ->> 'iso_revision', '')) <> upper(accepted.revision_number) then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'iso_revision', 'blocker', 'SRV_TP_REVISION_MISMATCH', 'ISO revision is not the current accepted revision');
    end if;
    if not public.current_user_in_pds_scope(job.project_id, accepted.pds_area_id) then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'iso_number', 'blocker', 'SRV_TP_OUT_OF_SCOPE', 'ISO is outside the current user PDS scope');
    end if;
    if not exists (
      select 1 from public.spools spool join public.spool_revisions spool_revision on spool_revision.spool_id = spool.id
      where spool.project_id = job.project_id and spool_revision.isometric_revision_id = accepted.revision_id
        and upper(spool.spool_number) = upper(row_rec.normalized_values ->> 'spool_number')
    ) then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'spool_number', 'blocker', 'SRV_TP_UNKNOWN_SPOOL', 'Spool is not part of the accepted ISO revision');
    end if;
  end loop;

  for row_rec in
    select min(row_number) as row_number, normalized_values ->> 'test_pack_number' as test_pack_number
    from public.import_job_rows where job_id = target_job_id and action <> 'skip'
    group by normalized_values ->> 'test_pack_number'
  loop
    select * into pack from public.test_packs where project_id = job.project_id and upper(test_pack_number) = upper(row_rec.test_pack_number);
    if found then
      if not coalesce((select bool_and(upper(normalized_values ->> 'test_pack_revision') = pack.revision_no::text) from public.import_job_rows where job_id = target_job_id and normalized_values ->> 'test_pack_number' = row_rec.test_pack_number), false) then
        insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
        values (target_job_id, row_rec.row_number, 'test_pack_revision', 'conflict', 'SRV_TP_METADATA_CONFLICT', 'Existing Test Pack revision differs from the import');
      end if;
      if exists (
        select 1 from public.import_job_rows imported
        join public.isometrics iso on upper(iso.iso_number) = upper(imported.normalized_values ->> 'iso_number') and iso.project_id = job.project_id
        where imported.job_id = target_job_id and imported.normalized_values ->> 'test_pack_number' = row_rec.test_pack_number
          and not exists (select 1 from public.test_pack_isometrics member where member.test_pack_id = pack.id and member.isometric_id = iso.id and member.removed_at is null)
      ) then
        insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
        values (target_job_id, row_rec.row_number, 'iso_number', 'conflict', 'SRV_TP_MANUAL_ADD_REQUIRED', 'Adding an ISO to an existing Test Pack is a manual Builder action');
      end if;
    end if;
  end loop;

  select count(*) filter (where severity = 'blocker')::integer, count(*) filter (where severity = 'conflict')::integer
    into blocker_count, conflict_count from public.import_job_issues where job_id = target_job_id;
  return next;
end;
$function$;
