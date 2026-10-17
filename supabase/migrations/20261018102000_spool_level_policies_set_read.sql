-- N2: spool-level read policies read a set once per statement instead of calling a helper once per row.
--
-- weld_joint_revisions, support_revisions, spool_revision_materials, weld_points and flange_joint_revisions
-- were guarded by current_user_has_capability(spool_revision_project_id(spool_revision_id), ...). The helper
-- is security invoker, so every call re-ran the row-level security of spool_revisions, isometric_revisions
-- and isometrics (about 2 ms), on every row of every read. UPG-1: weld_joint_revisions 1.8 s for 702 rows.
--
-- The rule is unchanged: a row is visible when the caller can see its spool revision, isometric revision
-- and isometric (their own row-level security), and holds the capability on the project. It is now written
-- as `spool_revision_id in (select ... from spool_revision_projects where capability)`: the subquery runs
-- under the caller's rights exactly like the helper did, once per statement. No SECURITY DEFINER is added,
-- so no narrowing is lost. Test 121 pins the rows seen by an admin, a PDS-scoped subcontractor, a reader
-- and an outsider.

create or replace view public.spool_revision_projects with (security_invoker = true) as
select sr.id as spool_revision_id, iso.project_id
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id;

revoke all on public.spool_revision_projects from anon, authenticated;
grant select on public.spool_revision_projects to authenticated;

alter policy "read weld joint revisions" on public.weld_joint_revisions
  using (spool_revision_id in (
    select scope.spool_revision_id from public.spool_revision_projects scope
    where public.current_user_has_capability(scope.project_id, 'spooling.view')));

alter policy "read support revisions" on public.support_revisions
  using (spool_revision_id in (
    select scope.spool_revision_id from public.spool_revision_projects scope
    where public.current_user_has_capability(scope.project_id, 'spooling.view')));

alter policy "read spool revision materials" on public.spool_revision_materials
  using (spool_revision_id in (
    select scope.spool_revision_id from public.spool_revision_projects scope
    where public.current_user_has_capability(scope.project_id, 'spooling.view')));

-- A weld point is visible when its weld joint revision is (that policy already holds the capability).
alter policy "read weld points" on public.weld_points
  using (weld_joint_revision_id in (select wjr.id from public.weld_joint_revisions wjr));

alter policy "read flange joint revisions" on public.flange_joint_revisions
  using (
    spool_revision_id in (
      select scope.spool_revision_id from public.spool_revision_projects scope
      where public.current_user_has_capability(scope.project_id, 'spooling.view'))
    or (
      public.flange_revision_in_pds_scope(id)
      and spool_revision_id in (
        select scope.spool_revision_id from public.spool_revision_projects scope
        where public.current_user_has_capability(scope.project_id, 'flange.view'))));
