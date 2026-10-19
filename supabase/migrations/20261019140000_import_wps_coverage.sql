-- The import warns about a joint no WPS covers the way the manual defines "covers".
--
-- Manual 3.5 and 14.2: the import checks that a WPS exists for the new joints by diameter, thickness and
-- material type, and alerts the user otherwise. The check looked at diameter and thickness only, so a
-- carbon-steel WPS covered a stainless spool. It also ignored who may weld the joint: the weld progress
-- command accepts only a WPS of the subcontractor the PDS area names for the joint's location (see
-- 20261019120000), so a shop subcontractor's WPS "covered" a field joint it could never be used on.
--
-- Still a warning, never a blocker. Where the area names no subcontractor, or the spool's material class is
-- not mapped, that part of the test does not apply.
--
-- Test: 134_import_wps_coverage.test.sql.

do $migration$
declare
  function_definition text;
  old_block text := $old$  -- 6. Covering WPS. Dossier 11.6 and 14.2: WARNING, never a blocker.
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'weld_number', 'warning', 'SRV_WPS_MISSING',
         format('No approved WPS covers weld %s at %s inch / %s mm. The import may still proceed.',
                s.entity_values ->> 'weld_number',
                s.entity_values ->> 'diameter_inch',
                s.entity_values ->> 'thickness_mm')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1 from public.project_welding_procedures wp
      where wp.project_id = job.project_id
        and wp.status = 'active'
        and public.engineering_numeric(s.entity_values ->> 'diameter_inch')
              between wp.diameter_from and wp.diameter_to
        and public.engineering_numeric(s.entity_values ->> 'thickness_mm')
              between wp.thickness_from and wp.thickness_to
    );

$old$;
  new_block text := $new$
  -- 6. Covering WPS. Dossier 11.6 and 14.2: WARNING, never a blocker.
  -- A WPS covers a joint by diameter, thickness and material type (manual 3.5, 14.2). Once the isometric's PDS
  -- area names the shop or field subcontractor for the joint's location, only a WPS of that subcontractor
  -- counts, because that is the only one the weld progress command accepts.
  with staged as materialized (
    select * from public.spooling_staging(target_job_id)
  ), iso_area as (
    select iso_row.entity_values ->> 'iso_number' as iso_number,
           area.shop_subcontractor_id, area.field_subcontractor_id
    from staged iso_row
    join public.project_pds_areas area
      on area.project_id = job.project_id and area.code = iso_row.entity_values ->> 'pds_area'
    where iso_row.entity_kind = 'isometric'
  ), spool_material as (
    select spool_row.entity_values ->> 'iso_number' as iso_number,
           spool_row.entity_values ->> 'spool_number' as spool_number,
           entry.id as material_type_id
    from staged spool_row
    join public.project_spooling_material_classes mapped
      on mapped.project_id = job.project_id
     and mapped.external_class_code = spool_row.entity_values ->> 'material_class'
     and mapped.status = 'active'
    join public.project_spooling_material_types mtype on mtype.id = mapped.material_type_id
    join public.system_reference_entries entry on entry.kind = 'material_type' and entry.code = mtype.code
    where spool_row.entity_kind = 'spool'
  ), joint as (
    select s.staging_row_number, s.entity_values,
           case coalesce(s.entity_values ->> 'weld_location', 'shop')
             when 'field' then iso_area.field_subcontractor_id
             else iso_area.shop_subcontractor_id
           end as area_subcontractor_id,
           spool_material.material_type_id
    from staged s
    left join iso_area on iso_area.iso_number = s.entity_values ->> 'iso_number'
    left join spool_material
      on spool_material.iso_number = s.entity_values ->> 'iso_number'
     and spool_material.spool_number = s.entity_values ->> 'spool_number'
    where s.entity_kind = 'weld_joint'
  )
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, j.staging_row_number, 'weld_number', 'warning', 'SRV_WPS_MISSING',
         format('No approved WPS covers weld %s at %s inch / %s mm. The import may still proceed.',
                j.entity_values ->> 'weld_number',
                j.entity_values ->> 'diameter_inch',
                j.entity_values ->> 'thickness_mm')
  from joint j
  where not exists (
      select 1 from public.project_welding_procedures wp
      where wp.project_id = job.project_id
        and wp.status = 'active'
        and public.engineering_numeric(j.entity_values ->> 'diameter_inch')
              between wp.diameter_from and wp.diameter_to
        and public.engineering_numeric(j.entity_values ->> 'thickness_mm')
              between wp.thickness_from and wp.thickness_to
        and (j.material_type_id is null or wp.material_type_id = j.material_type_id)
        and (j.area_subcontractor_id is null
             or wp.subcontractor_id is null
             or wp.subcontractor_id = j.area_subcontractor_id)
    );

$new$;
begin
  select pg_get_functiondef('public.revalidate_spooling_import_job_base(uuid)'::regprocedure)
  into function_definition;
  if position(old_block in function_definition) = 0 then
    raise exception 'The import validation no longer has the WPS check this migration replaces';
  end if;
  execute replace(function_definition, old_block, new_block);
end
$migration$;
