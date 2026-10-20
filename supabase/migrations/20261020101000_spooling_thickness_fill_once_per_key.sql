-- The thickness fill looks up the rule once per class and diameter of the job, not once per staged row.
--
-- 20261020100000 filled an empty weld thickness with a lateral rule lookup per staged row. Every check, the
-- preview and the apply read spooling_staging, about twenty times per apply, so the per-row cost counts
-- twenty times. Measured on the isolated pgTAP stack, 7,500 welds without a thickness plus 4,000 other rows,
-- 39 thickness rules for the class: depending on statistics the planner scanned the class's rules and
-- evaluated engineering_numeric (plpgsql, one subtransaction per call) on every candidate rule of every weld:
-- 100-215 ms per staging call, 2.0-3.5 s per revalidate, against 6-7 ms and about 0.8-1.0 s with no fill.
--
-- Now the welds that need a thickness are grouped by their service class and diameter text (a few dozen keys
-- per job). Only those keys are read as numbers and matched to the rule, and the staged rows take their
-- thickness from that small set by a hash join on the same text. Same rows and values as 20261020100000:
-- 22-28 ms per staging call, about 1.0 s per revalidate on the same data. A thickness the file gives is still
-- kept; a weld with no rule still stays empty and is blocked by SRV_THICKNESS_MISSING.
--
-- Same signature, same grants. Test: 135_spooling_thickness_from_rule.test.sql.

create or replace function public.spooling_staging(target_job_id uuid)
returns table (
  staging_row_number integer,
  entity_kind text,
  entity_values jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  -- The service class and diameter, as written in the file, of every weld that has no thickness.
  with weld_key as (
    select r.normalized_values ->> 'service_class' as service_class,
           r.normalized_values ->> 'diameter_inch' as diameter_text,
           public.engineering_numeric(r.normalized_values ->> 'diameter_inch') as diameter_inch
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and r.normalized_values ->> 'entity_type' = 'weld_joint'
      and nullif(btrim(r.normalized_values ->> 'thickness_mm'), '') is null
    group by 1, 2
  ),
  -- The active rule of the job's project for each key; at most one (unique per class and diameter).
  fill as (
    select k.service_class, k.diameter_text,
           jsonb_build_object('thickness_mm', t.thickness_mm::text) as filled
    from weld_key k
    join public.import_jobs j on j.id = target_job_id
    join public.project_service_classes c on c.project_id = j.project_id and c.code = k.service_class
    join public.project_thickness_flange_rules t
      on t.project_id = j.project_id
     and t.service_class_id = c.id
     and t.diameter_inch = k.diameter_inch
     and t.status = 'active'
  )
  select r.row_number,
         r.normalized_values ->> 'entity_type',
         r.normalized_values || coalesce(f.filled, '{}'::jsonb)
  from public.import_job_rows r
  left join fill f
    on r.normalized_values ->> 'entity_type' = 'weld_joint'
   and nullif(btrim(r.normalized_values ->> 'thickness_mm'), '') is null
   and f.service_class = r.normalized_values ->> 'service_class'
   and f.diameter_text = r.normalized_values ->> 'diameter_inch'
  where r.job_id = target_job_id
    and r.action <> 'skip'
  order by r.row_number;
$$;

revoke all on function public.spooling_staging(uuid) from public, anon;
grant execute on function public.spooling_staging(uuid) to authenticated;
