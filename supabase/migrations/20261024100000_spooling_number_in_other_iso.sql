-- A staged number the project already holds under another isometric is refused.
--
-- A weld, spool, support or flange joint number names one thing of the project (unique per project). The apply puts
-- a staged row onto the row its number already names, so a number used by another isometric of an earlier upload
-- would silently join the two isometrics: one weld with two revisions (checked: two isometrics with weld "1" gave one
-- weld_joint with two revisions). The browser makes the same check inside one upload; this one is against what the
-- project already holds. Same isometric (a revision, a re-import) is not an issue.
--
-- The body is 20261021100000's, with the check added before the joint limit.
-- Test: 140_spooling_number_in_other_iso.test.sql.

create or replace function public.revalidate_spooling_import_job(target_job_id uuid)
returns table (blocker_count integer, warning_count integer, unresolved_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  joint_limit integer := public.spooling_job_joint_limit();
  joint_count integer;
  kind record;
begin
  perform public.revalidate_spooling_import_job_base(target_job_id);

  insert into public.import_job_issues (
    job_id, row_number, column_name, severity, code, message
  )
  select
    target_job_id,
    null,
    null,
    'blocker',
    'SRV_SPOOLING_SPINE_MISSING',
    'The SpoolGen submission must contain at least one isometric, spool and weld joint.'
  where not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'isometric'
        )
     or not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'spool'
        )
     or not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'weld_joint'
        );

  -- A weld whose stored thickness is empty while a rule now covers its class and diameter: the rule was added after
  -- the check, which filled nothing for it. The base raises SRV_THICKNESS_MISSING only for a weld no rule covers, so
  -- without this the apply would store an empty thickness. Same code, so the same screens show it; the sentence says
  -- what to do. A weld no rule covers is the base's, and is not raised twice.
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'thickness_mm', 'blocker', 'SRV_THICKNESS_MISSING',
         format('The thickness rule for service class "%s" at %s inch was added after these files were checked. Check the files again to use it.',
                s.entity_values ->> 'service_class', s.entity_values ->> 'diameter_inch')
  from public.spooling_staging(target_job_id) s
  join public.import_jobs j on j.id = target_job_id
  where s.entity_kind = 'weld_joint'
    and nullif(btrim(s.entity_values ->> 'thickness_mm'), '') is null
    and exists (
      select 1
      from public.project_thickness_flange_rules r
      join public.project_service_classes c on c.id = r.service_class_id
      where r.project_id = j.project_id
        and c.code = s.entity_values ->> 'service_class'
        and r.diameter_inch = public.engineering_numeric(s.entity_values ->> 'diameter_inch')
        and r.status = 'active'
    );

  -- A weld, spool, support or flange joint number is one thing of the project: the database keeps one row per number,
  -- and the apply puts a staged row onto the row the number already names. A number the project holds under another
  -- isometric would silently join two isometrics, so a staged row that uses it is refused. The same isometric (a new
  -- revision, or its welds imported again) is fine. The browser makes the same check inside one upload.
  for kind in
    select * from (values
      ('weld_joint',   'weld_number',    'Weld number',        'weld_joints',   'weld_number',    'weld_joint_revisions',   'weld_joint_id'),
      ('spool',        'spool_number',   'Spool number',       'spools',        'spool_number',   'spool_revisions',        'spool_id'),
      ('support',      'support_number', 'Support number',     'supports',      'support_number', 'support_revisions',      'support_id'),
      ('flange_joint', 'flange_number',  'Flange joint number', 'flange_joints', 'flange_number',  'flange_joint_revisions', 'flange_joint_id')
    ) as k(entity_kind, staged_key, label, thing_table, thing_number, revision_table, revision_fk)
  loop
    execute format($q$
      insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
      select $1, s.staging_row_number, %1$L, 'blocker', 'SRV_NUMBER_IN_OTHER_ISO',
             format('%%s "%%s" already belongs to isometric %%s of this project.', %2$L, s.entity_values ->> %1$L, held.iso_number)
      from public.spooling_staging($1) s
      join public.import_jobs j on j.id = $1
      cross join lateral (
        select i.iso_number
        from public.%3$I thing
        %4$s
        join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
        join public.isometrics i on i.id = ir.isometric_id
        where thing.project_id = j.project_id
          and thing.%5$I = s.entity_values ->> %1$L
          and i.iso_number <> s.entity_values ->> 'iso_number'
        limit 1
      ) held
      where s.entity_kind = %6$L
        and nullif(btrim(s.entity_values ->> %1$L), '') is not null
    $q$,
      kind.staged_key, kind.label, kind.thing_table,
      case when kind.thing_table = 'spools'
           then 'join public.spool_revisions sr on sr.spool_id = thing.id'
           else format('join public.%I rev on rev.%I = thing.id join public.spool_revisions sr on sr.id = rev.spool_revision_id', kind.revision_table, kind.revision_fk) end,
      kind.thing_number, kind.entity_kind)
    using target_job_id;
  end loop;

  if joint_limit is not null then
    select count(*)::integer into joint_count
    from public.spooling_staging(target_job_id)
    where entity_kind = 'weld_joint';

    if joint_count > joint_limit then
      insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
      values (
        target_job_id, null, null, 'blocker', 'SRV_SPOOLING_JOB_TOO_LARGE',
        format('This file set has %s weld joints; one job applies at most %s. Split the SpoolGen export by area and import the parts one after another.',
               joint_count, joint_limit)
      );
    end if;
  end if;

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'warning'),
    (select count(*)::integer from public.preview_spooling_import(target_job_id) item
     where item.requires_decision and item.decision is null);
end;
$$;
