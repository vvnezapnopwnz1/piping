-- Local fixture bootstraps use service_role only; browser users retain the existing RPC/RLS boundary.
-- These tables have no fixture RPC because the bootstrap must create an isolated
-- Y/Z flange graph before an authenticated browser starts the workflow.
grant select, insert, update on table
  public.flange_joints,
  public.flange_joint_revisions,
  public.flange_progress_records,
  public.project_joint_categories,
  public.system_reference_entries,
  public.project_teams,
  public.test_packs,
  public.test_pack_isometrics
to service_role;

grant select on table
  public.isometric_revisions,
  public.spool_revisions
to service_role;
