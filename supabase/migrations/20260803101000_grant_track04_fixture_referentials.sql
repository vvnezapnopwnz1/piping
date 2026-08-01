-- Local service-role fixture bootstrap must be able to seed the two referentials
-- required for a clean SpoolGen validation. Browser roles remain governed by RLS.
grant select, insert, update, delete on table
  public.project_thickness_flange_rules,
  public.nde_matrix_rules
to service_role;
