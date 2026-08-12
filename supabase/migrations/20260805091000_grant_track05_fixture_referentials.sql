-- Local service-role fixture bootstrap must be able to seed the referentials a Track 05
-- walkthrough needs: a laydown location, a paint matrix rule with its line service and RAL
-- code, the project PML, and the WPS and welder qualifications the shop weld screen reads.
-- Browser roles remain governed by RLS; this follows the precedent of
-- 20260801093000_fix_system_reference_grants.sql and
-- 20260803101000_grant_track04_fixture_referentials.sql.
grant select, insert, update, delete on table
  public.project_location_categories,
  public.project_locations,
  public.project_line_services,
  public.project_ral_codes,
  public.project_paint_matrix_rules,
  public.piping_material_records,
  public.project_welding_procedures,
  public.welder_qualifications,
  public.welder_wps_qualifications
to service_role;
