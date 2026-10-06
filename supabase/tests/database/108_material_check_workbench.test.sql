begin;
select plan(30);

select has_view('public', 'material_check_lines', 'material_check_lines view exists');
select has_view('public', 'material_trace_candidates', 'material_trace_candidates view exists');
select ok(
  (select bool_and('security_invoker=true' = any(coalesce(c.reloptions, '{}')))
   from pg_class c
   where c.oid in ('public.material_check_lines'::regclass, 'public.material_trace_candidates'::regclass)),
  'both material views apply the caller''s RLS (security_invoker)'
);
select is(
  has_function_privilege('anon', 'public.construction_spool_project_id(uuid)', 'EXECUTE'),
  false,
  'anon cannot call the construction spool project helper'
);

-- Fixture setup
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000108', 'authenticated', 'authenticated', 'admin108@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000109', 'authenticated', 'authenticated', 'qc108@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000110', 'authenticated', 'authenticated', 'erect108@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000111', 'authenticated', 'authenticated', 'unauth108@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000108';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000108', 'P108', 'Material Workbench Project', 'Owner', 'Contractor', 3, '10000000-0000-0000-0000-000000000108');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000109', '30000000-0000-0000-0000-000000000108', '10000000-0000-0000-0000-000000000109', 'qc_engineer', 'project_editor', true),
  ('20000000-0000-0000-0000-000000000110', '30000000-0000-0000-0000-000000000108', '10000000-0000-0000-0000-000000000110', 'subcontractor', 'project_editor', true);

insert into public.project_membership_functional_roles (membership_id, role_code)
values
  ('20000000-0000-0000-0000-000000000109', 'qc_engineer'),
  ('20000000-0000-0000-0000-000000000110', 'erection_contributor');

insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000108', '30000000-0000-0000-0000-000000000108', 'PDS-108', 'Area 108');

insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000000108', '30000000-0000-0000-0000-000000000108', 'ISO-108');

insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000000108', '33000000-0000-0000-0000-000000000108', 'R0', 1, 'accepted', '31000000-0000-0000-0000-000000000108', now());

insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000108', '30000000-0000-0000-0000-000000000108', 'SP-108');

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000108', '35000000-0000-0000-0000-000000000108', '34000000-0000-0000-0000-000000000108', 1);

-- BOM rows: two rows with Ident ID-1, different expected trace; one with ID-2, null trace; one with ID-3
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, description, quantity, unit, trace_number)
values
  ('50000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000108', 'ID-1', 'Pipe 4in H1', 1, 'ea', 'Heat-ab12'),
  ('50000000-0000-0000-0000-000000000002', '36000000-0000-0000-0000-000000000108', 'ID-1', 'Pipe 4in H2', 1, 'ea', 'H2'),
  ('50000000-0000-0000-0000-000000000003', '36000000-0000-0000-0000-000000000108', 'ID-2', 'Elbow 4in', 2, 'ea', null),
  ('50000000-0000-0000-0000-000000000004', '36000000-0000-0000-0000-000000000108', 'ID-3', 'Flange 4in', 1, 'ea', null);

-- PML rows
insert into public.piping_material_records (id, project_id, ident_code, trace_number, mrr_number, status)
values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000108', 'ID-1', 'Heat-ab12', 'MRR-101', 'active'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000108', 'ID-1', 'H2', 'MRR-102', 'active'),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000108', 'ID-1', 'HEAT-AB12', 'MRR-103', 'active'),
  ('60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000108', 'ID-2', 'Trace-201', 'MRR-201', 'active'),
  ('60000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000108', 'ID-2', 'Trace-202-Inactive', 'MRR-202', 'inactive'),
  ('60000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000108', 'ID-3', 'Trace-301', 'MRR-301', 'active');

-- Start fab recorded for fabrication testing
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000108', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000108","role":"authenticated"}', true);
select public.record_construction_progress('36000000-0000-0000-0000-000000000108', 'fabrication', 'start_fab', '2026-10-01', '{}'::jsonb);

reset role;
-- A fourth user: Erection contributor scoped to another PDS area of the same project.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000112', 'authenticated', 'authenticated', 'scoped108@example.test', 'not-used', now(), now(), now());
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000109', '30000000-0000-0000-0000-000000000108', 'PDS-109', 'Other area');
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000112', '30000000-0000-0000-0000-000000000108', '10000000-0000-0000-0000-000000000112', 'subcontractor', 'subcontractor', true);
insert into public.project_membership_functional_roles (membership_id, role_code)
values ('20000000-0000-0000-0000-000000000112', 'erection_contributor');
insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
values ('20000000-0000-0000-0000-000000000112', '31000000-0000-0000-0000-000000000109');
insert into public.qc13_progress_forms (id, project_id, spool_revision_id, form_number, requested_on)
values ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000108', '36000000-0000-0000-0000-000000000108', 'QC13-108-A', '2026-10-01');

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;

-- QC engineer: fabrication.view, no spooling.view
select pg_temp.act_as('10000000-0000-0000-0000-000000000109');
select is((select count(*)::int from public.material_check_lines where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 4,
  'qc_engineer reads all four BOM rows without spooling.view');
select results_eq(
  $$select trace_number from public.material_trace_candidates where spool_revision_material_id = '50000000-0000-0000-0000-000000000001'$$,
  $$values ('Heat-ab12'::text)$$,
  'a BOM row that expects Heat-ab12 offers exactly Heat-ab12, not HEAT-AB12');
select is((select count(*)::int from public.material_trace_candidates where spool_revision_material_id = '50000000-0000-0000-0000-000000000003'), 1,
  'a BOM row without an expected trace offers only the active PML records of its Ident');

-- Erection contributor: erection.view only
select pg_temp.act_as('10000000-0000-0000-0000-000000000110');
select is((select count(*)::int from public.material_check_lines where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 4,
  'an erection contributor reads the BOM of a spool in its project');
select is((select count(*)::int from public.material_trace_candidates where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 4,
  'an erection contributor sees one eligible candidate per BOM row');
select is((select count(*)::int from public.qc13_progress_forms where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 1,
  'an erection contributor reads the QC-13 form of the spool');

-- No membership
select pg_temp.act_as('10000000-0000-0000-0000-000000000111');
select is((select count(*)::int from public.material_check_lines), 0, 'a user without project access reads no BOM rows');

-- Scoped to another PDS area
select pg_temp.act_as('10000000-0000-0000-0000-000000000112');
select is((select count(*)::int from public.material_trace_candidates where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 0,
  'a user scoped to another PDS area sees no candidates for this spool');
select is((select count(*)::int from public.material_check_lines where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 0,
  'a user scoped to another PDS area reads no BOM rows of this spool');

-- Commands, as the QC engineer
select pg_temp.act_as('10000000-0000-0000-0000-000000000109');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000003"}]'::jsonb)$$,
  'PQC33', null, 'HEAT-AB12 is not eligible for a row that expects Heat-ab12');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000003","piping_material_record_id":"60000000-0000-0000-0000-000000000005"}]'::jsonb)$$,
  'PQC33', null, 'an inactive PML record is not eligible');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000004","piping_material_record_id":"60000000-0000-0000-0000-000000000004"}]'::jsonb)$$,
  'PQC33', null, 'a PML record of another Ident is not eligible');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000099","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  'PQC30', null, 'a BOM row outside this spool revision is rejected');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  '23514', null, 'an item without a PML record id is rejected');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"not-a-uuid","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  '23514', null, 'a non-UUID reference is rejected');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"},
    {"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  '23514', null, 'a BOM row may appear only once per command');

select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"},
    {"spool_revision_material_id":"50000000-0000-0000-0000-000000000002","piping_material_record_id":"60000000-0000-0000-0000-000000000002"}]'::jsonb,
  '70000000-0000-0000-0000-000000000001', 'mc108-first')$$,
  'two BOM rows with the same Ident are recorded separately in one command');
select is((select count(*)::int from public.material_check_lines
  where spool_revision_id = '36000000-0000-0000-0000-000000000108' and accepted_piping_material_record_id is not null), 2,
  'both ID-1 rows show accepted evidence');
select is((select checked_quantity::numeric from public.material_check_items
  where spool_revision_material_id = '50000000-0000-0000-0000-000000000003'), null::numeric,
  'an unrecorded row has no item');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000003"}]'::jsonb)$$,
  '23514', null, 'accepted evidence cannot switch to another PML record');
select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-03',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  'resubmitting an accepted row with its own PML record is accepted');

reset role;
insert into public.qc13_progress_forms (id, project_id, spool_revision_id, form_number, requested_on)
values ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000108', '36000000-0000-0000-0000-000000000108', 'QC13-108-B', '2026-10-04');
set local role authenticated;
select pg_temp.act_as('10000000-0000-0000-0000-000000000109');
select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-04',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000003","piping_material_record_id":"60000000-0000-0000-0000-000000000004"},
    {"spool_revision_material_id":"50000000-0000-0000-0000-000000000004","piping_material_record_id":"60000000-0000-0000-0000-000000000006"}]'::jsonb,
  '70000000-0000-0000-0000-000000000002', 'mc108-rest')$$,
  'the remaining rows are recorded against a newer QC-13');
select is((select qc13_form_id from public.material_check_records where spool_revision_id = '36000000-0000-0000-0000-000000000108'),
  '70000000-0000-0000-0000-000000000001'::uuid,
  'the material check keeps the QC-13 it was first recorded with');
select is((select checked_quantity::numeric from public.material_check_items
  where spool_revision_material_id = '50000000-0000-0000-0000-000000000003'), 2::numeric,
  'checked quantity is taken from the BOM row');
select is((select count(*)::int from public.construction_progress_events
  where spool_revision_id = '36000000-0000-0000-0000-000000000108' and stage = 'material_check'), 1,
  'completing every BOM row derives Material Check exactly once');

select pg_temp.act_as('10000000-0000-0000-0000-000000000111');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-04',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000003","piping_material_record_id":"60000000-0000-0000-0000-000000000004"}]'::jsonb)$$,
  '42501', null, 'a user without project access cannot record');

select * from finish();
rollback;
