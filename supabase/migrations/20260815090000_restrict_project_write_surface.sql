-- `public.projects` still carried Supabase's default table-level GRANT ALL for anon and
-- authenticated. A column-level grant cannot narrow a table-level one, so 20260729130501 --
-- "Keep the browser's writable surface limited to the Project Definition form" -- never actually
-- took effect: the browser role could also write id, status, created_at, updated_at and the logo
-- paths, and could DELETE a project outright.
--
-- Row-level security is unchanged and still decides which rows are reachable. This migration only
-- narrows which columns the browser role may write, and drops the privileges nothing uses.
-- service_role and postgres are untouched, so the demo stand scripts are unaffected.

revoke all on public.projects from anon, authenticated;

grant select on public.projects to authenticated;

-- Creation. Policy "authenticated users can create projects" checks
-- `created_by = auth.uid() and public.is_platform_admin()`, so created_by must be writable;
-- id, status and both timestamps stay on their column defaults.
grant insert (
  activity_code,
  title,
  owner_name,
  contractor_name,
  contract_number,
  maximum_transit_time_days,
  created_by
) on public.projects to authenticated;

-- Editing. Unchanged from 20260729130501: the same seven columns the Project Definition form owns.
-- The logo paths are written back by the branding upload, not typed by hand.
grant update (
  activity_code,
  title,
  owner_name,
  contractor_name,
  owner_logo_path,
  contractor_logo_path,
  maximum_transit_time_days
) on public.projects to authenticated;
