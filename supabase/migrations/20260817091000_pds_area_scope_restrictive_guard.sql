-- The PDS area scope guard has to be RESTRICTIVE.
--
-- "project_pds_areas capability read" carries the scope check
-- (current_user_in_pds_scope), but "tracking users read PDS areas" grants SELECT on
-- nothing more than the tracking.view capability. Both are PERMISSIVE, and PERMISSIVE
-- policies combine with OR, so any member holding tracking.view read every PDS area of
-- the project and the scope check had no effect.
--
-- The subcontractor access role does hold tracking.view (through the tracking_operator
-- functional role, since it does not bypass the functional gate), which is exactly the
-- role for which current_user_in_pds_scope is meant to restrict rows.
--
-- A RESTRICTIVE policy is AND-ed with the permissive set, so the scope now holds no
-- matter how many read paths are added later.
--
-- Covered by supabase/tests/database/014_pds_area_scope_rls.test.sql.
--
-- SELECT only: project_referential.manage is granted to project_admin and site_admin
-- only, so the insert/update policies are unreachable for scoped subcontractors.

drop policy if exists "project_pds_areas scope guard" on public.project_pds_areas;

create policy "project_pds_areas scope guard"
  on public.project_pds_areas
  as restrictive
  for select
  to authenticated
  using (public.current_user_in_pds_scope(project_id, id));
