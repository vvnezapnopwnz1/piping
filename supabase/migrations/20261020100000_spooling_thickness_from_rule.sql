-- A weld whose file gives no wall thickness takes it from the project's thickness rule.
--
-- A PCF file carries no wall thickness, and a weld.txt may leave the cell empty. The project already says
-- what the wall is: project_thickness_flange_rules holds one thickness per service class and diameter, and
-- SRV_THICKNESS_MISSING blocks any weld that no active rule covers. So a staged weld_joint row with an empty
-- or absent thickness_mm takes the active rule's thickness for its project, service class and diameter.
-- A thickness the file gives is kept as it is.
--
-- The fill lives in spooling_staging because every check (SRV_ issues, the WPS coverage warning), the
-- revision preview and the apply read the staged rows through it; nothing else changes. Same signature,
-- same grants as 20260803092000.
--
-- Test: 135_spooling_thickness_from_rule.test.sql.

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
  select r.row_number,
         r.normalized_values ->> 'entity_type',
         r.normalized_values || coalesce(rule.filled, '{}'::jsonb)
  from public.import_job_rows r
  join public.import_jobs j on j.id = r.job_id
  left join lateral (
    select jsonb_build_object('thickness_mm', t.thickness_mm::text) as filled
    from public.project_thickness_flange_rules t
    join public.project_service_classes c on c.id = t.service_class_id
    where r.normalized_values ->> 'entity_type' = 'weld_joint'
      and nullif(btrim(r.normalized_values ->> 'thickness_mm'), '') is null
      and t.project_id = j.project_id
      and t.status = 'active'
      and c.project_id = j.project_id
      and c.code = r.normalized_values ->> 'service_class'
      and t.diameter_inch = public.engineering_numeric(r.normalized_values ->> 'diameter_inch')
    -- At most one rule matches (unique per project, class and diameter). The limit keeps the subquery from
    -- being flattened into the join, so the two row conditions above become a gate and the lookup never
    -- runs for a row that is not a weld or already has a thickness.
    limit 1
  ) rule on true
  where r.job_id = target_job_id
    and r.action <> 'skip'
  order by r.row_number;
$$;

revoke all on function public.spooling_staging(uuid) from public, anon;
grant execute on function public.spooling_staging(uuid) to authenticated;
