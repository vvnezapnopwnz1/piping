-- The capability checks on the import templates have to be RESTRICTIVE.
--
-- 20261020104000 gave spooling_import_templates four PERMISSIVE policies, each carrying its own capability
-- check (spooling.view to read, spooling.manage to write). PERMISSIVE policies combine with OR, so the day a
-- second PERMISSIVE policy grants the same command (a role that reads all of a project's data, a service
-- screen) the capability check stops narrowing anything. The same defect let a scoped subcontractor read every
-- PDS area (20260817091000).
--
-- Now one PERMISSIVE policy opens the door for the members of the project (the broad base), and the
-- capability checks are RESTRICTIVE, AND-ed with whatever permissive set exists or comes later. Who can do
-- what is unchanged: a member with spooling.view reads, a member with spooling.manage writes, no one else and
-- no other project's member does anything. Tests: 137_spooling_import_templates.test.sql.

drop policy "spooling viewers read import templates" on public.spooling_import_templates;
drop policy "spooling managers insert import templates" on public.spooling_import_templates;
drop policy "spooling managers update import templates" on public.spooling_import_templates;
drop policy "spooling managers delete import templates" on public.spooling_import_templates;

-- The base: a member of the project. It opens the door and narrows nothing.
create policy "project members reach import templates" on public.spooling_import_templates
  for all to authenticated
  using (project_id in (select private.user_project_ids('project.view')))
  with check (project_id in (select private.user_project_ids('project.view')));

-- The narrowing: what the member may do. The read uses the project set built once per query
-- (20261018122000_rls_capability_as_project_set.sql).
create policy "import templates read needs spooling.view" on public.spooling_import_templates
  as restrictive
  for select to authenticated
  using (project_id in (select private.user_project_ids('spooling.view')));

create policy "import templates insert needs spooling.manage" on public.spooling_import_templates
  as restrictive
  for insert to authenticated
  with check (public.current_user_has_capability(project_id, 'spooling.manage'));

create policy "import templates update needs spooling.manage" on public.spooling_import_templates
  as restrictive
  for update to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.manage'))
  with check (public.current_user_has_capability(project_id, 'spooling.manage'));

create policy "import templates delete needs spooling.manage" on public.spooling_import_templates
  as restrictive
  for delete to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.manage'));
