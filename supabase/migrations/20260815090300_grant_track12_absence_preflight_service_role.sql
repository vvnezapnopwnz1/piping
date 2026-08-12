-- Track 12's demo:prepare embeds a read-only preflight that proves every operational-outcome
-- table is empty on a freshly prepared stand (scripts/demo/manifest.ts EMPTY_AT_DEMO_START,
-- scripts/demo/supabase-demo-stand.ts EMPTY_TABLE_STRATEGIES). It is the first code in the
-- repository that reads all of these tables as service_role in one pass; most of them were never
-- granted to service_role by any earlier track, because earlier fixture scripts only ever wrote
-- referentials, not read across every operational table. demo:prepare fails with "permission
-- denied for table import_jobs" (and the same error for the other tables below) on a clean reset
-- because of this gap. Read-only: demo:prepare never writes to these tables.

grant select on table
  public.import_jobs,
  public.construction_progress_events,
  public.material_check_records,
  public.weld_progress_records,
  public.pwht_requirements,
  public.pwht_results,
  public.paint_progress_records,
  public.quality_release_records,
  public.laydown_records,
  public.support_progress_records,
  public.nde_batches,
  public.nde_results,
  public.flange_reinstatement_records,
  public.line_check_results,
  public.punch_items,
  public.blinding_records,
  public.pressure_test_requests,
  public.pressure_test_stage_events
to service_role;
