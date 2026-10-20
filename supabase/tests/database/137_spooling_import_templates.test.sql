begin;
select plan(22);

-- Import templates are project data: a person who can view spooling reads them, a person who can manage
-- spooling writes them, nobody else (another project, anon) reaches them. Access lives in the policies only.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000001371', 'authenticated', 'authenticated', 'tpl.owner@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001372', 'authenticated', 'authenticated', 'tpl.manager@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001373', 'authenticated', 'authenticated', 'tpl.viewer@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001374', 'authenticated', 'authenticated', 'tpl.outsider@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001371';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000001371', 'TPL-A', 'Templates A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001371'),
  ('30000000-0000-0000-0000-000000001372', 'TPL-B', 'Templates B', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001371');

-- Project Admin manages spooling; Project Reader views it and nothing more; the outsider belongs to project B only.
-- The manager also manages project B, so a row could be moved there if the table let a manager write project_id.
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000001371', '30000000-0000-0000-0000-000000001371', '10000000-0000-0000-0000-000000001372', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000001372', '30000000-0000-0000-0000-000000001371', '10000000-0000-0000-0000-000000001373', 'project_manager', 'project_reader', true),
  ('20000000-0000-0000-0000-000000001373', '30000000-0000-0000-0000-000000001372', '10000000-0000-0000-0000-000000001374', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000001374', '30000000-0000-0000-0000-000000001372', '10000000-0000-0000-0000-000000001372', 'system_admin', 'project_admin', true);

insert into public.spooling_import_templates (id, project_id, source, name, settings)
values ('70000000-0000-0000-0000-000000001371', '30000000-0000-0000-0000-000000001371', 'aveva', 'E3D seeded', '{"kind":"pcf"}');

-- The viewer: reads, cannot write -------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001373","role":"authenticated"}', true);

select is(
  (select name from public.spooling_import_templates where project_id = '30000000-0000-0000-0000-000000001371'),
  'E3D seeded',
  'a user with spooling.view reads the project templates');

select throws_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings)
    values ('30000000-0000-0000-0000-000000001371', 'table', 'Viewer made', '{"kind":"table","columns":{}}')$$,
  '42501',
  null,
  'a user with spooling.view and without spooling.manage cannot insert a template');

select is_empty(
  $$update public.spooling_import_templates set name = 'Viewer renamed'
    where id = '70000000-0000-0000-0000-000000001371' returning id$$,
  'the same user changes no template row');

select is_empty(
  $$delete from public.spooling_import_templates
    where id = '70000000-0000-0000-0000-000000001371' returning id$$,
  'the same user deletes no template row');

select is(
  (select name from public.spooling_import_templates where id = '70000000-0000-0000-0000-000000001371'),
  'E3D seeded',
  'the template is as it was after the viewer tried to change and delete it');

-- The manager: writes -------------------------------------------------------------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001372","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings)
    values ('30000000-0000-0000-0000-000000001371', 'table', 'Excel registry', '{"kind":"table","columns":{"weld":{"weld_number":"Weld"}}}')$$,
  'a user with spooling.manage inserts a template');

select is(
  (select created_by from public.spooling_import_templates where name = 'Excel registry'),
  '10000000-0000-0000-0000-000000001372'::uuid,
  'the template remembers who created it');

select throws_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings, created_by)
    values ('30000000-0000-0000-0000-000000001371', 'table', 'Forged author', '{"kind":"table","columns":{}}', '10000000-0000-0000-0000-000000001371')$$,
  '42501',
  null,
  'a manager cannot name another profile as the creator of a template');

select results_eq(
  $$update public.spooling_import_templates set name = 'Excel registry 2', settings = '{"kind":"table","columns":{}}'
    where name = 'Excel registry' returning name$$,
  $$values ('Excel registry 2')$$,
  'a user with spooling.manage changes a template');

select throws_ok(
  $$update public.spooling_import_templates set project_id = '30000000-0000-0000-0000-000000001372'
    where name = 'Excel registry 2'$$,
  '42501',
  null,
  'a manager of both projects cannot move a template from one to the other');

select throws_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings)
    values ('30000000-0000-0000-0000-000000001371', 'table', 'Excel registry 2', '{"kind":"table","columns":{}}')$$,
  '23505',
  null,
  'a template name is taken once per project');

select throws_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings)
    values ('30000000-0000-0000-0000-000000001371', 'aveva', 'List settings', '[]')$$,
  '23514',
  null,
  'settings that are not a JSON object are refused');

select throws_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings)
    values ('30000000-0000-0000-0000-000000001371', 'spoolgen', 'Four files', '{"kind":"table","columns":{}}')$$,
  '23514',
  null,
  'only a source that takes a project template is accepted');

select throws_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings)
    values ('30000000-0000-0000-0000-000000001371', 'aveva', '   ', '{"kind":"pcf"}')$$,
  '23514',
  null,
  'a blank template name is refused');

select results_eq(
  $$delete from public.spooling_import_templates where name = 'Excel registry 2' returning name$$,
  $$values ('Excel registry 2')$$,
  'a user with spooling.manage deletes a template');

-- The outsider: another project sees nothing ----------------------------------------------------------------

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001374","role":"authenticated"}', true);

select is_empty(
  $$select id from public.spooling_import_templates where project_id = '30000000-0000-0000-0000-000000001371'$$,
  'a member of another project reads no template of this project');

select is_empty(
  $$update public.spooling_import_templates set name = 'Outsider renamed'
    where id = '70000000-0000-0000-0000-000000001371' returning id$$,
  'a member of another project changes no template of this project');

select is_empty(
  $$delete from public.spooling_import_templates
    where id = '70000000-0000-0000-0000-000000001371' returning id$$,
  'a member of another project deletes no template of this project');

select throws_ok(
  $$insert into public.spooling_import_templates (project_id, source, name, settings)
    values ('30000000-0000-0000-0000-000000001371', 'aveva', 'Into project A', '{"kind":"pcf"}')$$,
  '42501',
  null,
  'a member of another project cannot write a template into this project');

-- anon: nothing -----------------------------------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  $$select id from public.spooling_import_templates$$,
  '42501',
  null,
  'anon holds no privilege on the templates');

-- The seeded template survived every attempt ------------------------------------------------------------------

reset role;

select is(
  (select count(*)::int from public.spooling_import_templates where id = '70000000-0000-0000-0000-000000001371' and name = 'E3D seeded'),
  1,
  'the seeded template is untouched');

select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'spooling_import_templates'),
  4,
  'one policy per command: select, insert, update, delete');

select * from finish();
rollback;
