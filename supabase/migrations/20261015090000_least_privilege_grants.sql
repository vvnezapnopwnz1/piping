-- anon and authenticated hold only what a migration grants them by name.
--
-- The migrations were written for a database whose default privileges grant nothing to anon or
-- authenticated: a table or function is closed until a `grant` names it. A freshly created
-- Supabase project — the hosted stand included — instead grants every privilege on every new
-- object in public to both roles. There the column-level grants never narrowed anything, and
-- `revoke ... from public` left the explicit authenticated grant on internal helpers in place:
-- a signed-in user could call claim_command_receipt directly or move a WPS to another project.
--
-- This migration sets the default the migrations assume, then removes what the generous default
-- had already granted. The lists below are exactly the grants a fresh stack holds and the stand
-- the suite was written against does not (pg_class/pg_proc privilege diff, 2026-10-15).

-- 1. Objects created from now on are closed until a migration grants them.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- 2. anon reaches nothing in public: every read and command needs a signed-in member.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

-- Four access helpers from the first migrations are still executable by PUBLIC, which includes
-- anon. Signed-in users keep them by name.
revoke execute on function
  public.has_project_access(uuid),
  public.is_platform_admin(),
  public.can_administer_project(uuid),
  public.is_welder_on_joint(uuid, uuid)
from public;
grant execute on function
  public.has_project_access(uuid),
  public.is_platform_admin(),
  public.can_administer_project(uuid),
  public.is_welder_on_joint(uuid, uuid)
to authenticated;

-- No caller needs to truncate, reference, trigger on or maintain a table through the API.
revoke truncate, references, trigger, maintain on all tables in schema public from authenticated;
revoke usage, select on all sequences in schema public from authenticated;

-- 3. Internal helpers run inside commands, never on their own.
revoke execute on function
  public.claim_command_receipt(uuid, text, text),
  public.complete_command_receipt(uuid, text, text, jsonb),
  public.assert_construction_target(uuid, text),
  public.pressure_test_assert_pack(uuid)
from authenticated;

-- 4. Projections, worklists and command-written records are read, never written, directly.
revoke select on public.profiles from authenticated;

revoke insert, update, delete on
  public.construction_phase_stages,
  public.flange_joint_readiness,
  public.flange_joint_worklist,
  public.flange_progress_history,
  public.item_clearance_worklist,
  public.line_check_worklist,
  public.material_check_lines,
  public.material_trace_candidates,
  public.nde_batch_items,
  public.nde_batches,
  public.nde_penalty_population_members,
  public.nde_penalty_populations,
  public.nde_results,
  public.pressure_test_request_details,
  public.spool_construction_status,
  public.spool_current_location,
  public.spool_effective_location_events,
  public.spool_erection_readiness,
  public.spool_fabrication_readiness,
  public.spool_progress_dates,
  public.spool_stage_events,
  public.spool_tracking_inconsistencies,
  public.spool_tracking_worklist,
  public.spool_transit_alerts,
  public.test_pack_catalog,
  public.test_pack_member_worklist,
  public.tracking_device_management,
  public.tracking_device_usage,
  public.tracking_location_occupancy,
  public.weld_progress_summary
from authenticated;

revoke insert, delete on public.profiles from authenticated;

-- 5. Two referentials are written directly under RLS, column by column. A table-level revoke also
-- drops the column grants, so they are granted again exactly as 20260729190000 and
-- 20260801091000 meant them.
revoke insert, update, delete on public.project_welding_procedures from authenticated;
grant insert (
  project_id, subcontractor_id, material_type_id, code, description, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on, status
) on public.project_welding_procedures to authenticated;
grant update (
  subcontractor_id, material_type_id, code, description, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on, status
) on public.project_welding_procedures to authenticated;

revoke insert, update on public.system_reference_entries from authenticated;
grant insert (kind, code, description, status) on public.system_reference_entries to authenticated;
grant update (code, description, status) on public.system_reference_entries to authenticated;
