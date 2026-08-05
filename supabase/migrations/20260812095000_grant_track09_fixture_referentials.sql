-- Track 09 fixture script permissions for flange progress

grant select, insert, update, delete on table
  public.project_joint_categories,
  public.project_unit_time_references,
  public.project_teams,
  public.system_ut_calculation_rules
to service_role;

grant select on table
  public.isometrics,
  public.isometric_revisions,
  public.spool_revisions,
  public.flange_joint_revisions
to service_role;
