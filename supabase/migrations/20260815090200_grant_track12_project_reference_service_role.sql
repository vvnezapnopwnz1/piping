-- Track 12's demo:prepare (scripts/demo/supabase-demo-stand.ts, prepareProjectReferences) writes
-- the full manifest referential catalogue on every clean reset. Twelve of those tables --
-- independent/parent rows from the first project-reference wave, plus device assignments --
-- were created by earlier tracks (Track 02/09) without ever being granted to service_role,
-- unlike their siblings (e.g. project_weld_types, project_teams) that already carry the same
-- select/insert/update/delete grant used throughout this reference catalogue. demo:prepare fails
-- with "permission denied for table project_units" (and the same error for the other eleven) on
-- a clean reset because of this gap.

grant select, insert, update, delete on table
  public.project_units,
  public.project_area_classifications,
  public.project_systems,
  public.project_subsystems,
  public.project_pressure_units,
  public.project_progress_weights,
  public.project_assembly_settings,
  public.project_spooling_material_types,
  public.project_spooling_material_classes,
  public.project_spooling_checklist_items,
  public.project_devices,
  public.project_device_users
to service_role;
