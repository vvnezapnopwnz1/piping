begin;
select plan(32);

-- 1-3: Function presence
select has_function('public', 'assert_material_check_read_target', array['uuid'], 'internal read target guard exists');
select has_function('public', 'read_material_check_workspace', array['uuid', 'uuid', 'integer'], 'read workspace RPC exists');
select has_function('public', 'search_material_trace_candidates', array['uuid', 'text', 'text', 'uuid', 'integer'], 'candidate search RPC exists');

-- 4-8: Privileges
select is(
  has_function_privilege('authenticated', 'public.assert_material_check_read_target(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot invoke the internal read target guard directly'
);
select is(
  has_function_privilege('authenticated', 'public.read_material_check_workspace(uuid, uuid, integer)', 'EXECUTE'),
  true,
  'authenticated can invoke read_material_check_workspace'
);
select is(
  has_function_privilege('authenticated', 'public.search_material_trace_candidates(uuid, text, text, uuid, integer)', 'EXECUTE'),
  true,
  'authenticated can invoke search_material_trace_candidates'
);
select is(
  has_function_privilege('anon', 'public.read_material_check_workspace(uuid, uuid, integer)', 'EXECUTE'),
  false,
  'anon cannot invoke read_material_check_workspace'
);
select is(
  has_function_privilege('anon', 'public.search_material_trace_candidates(uuid, text, text, uuid, integer)', 'EXECUTE'),
  false,
  'anon cannot invoke search_material_trace_candidates'
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

-- 9-10: Read workspace as QC Engineer (no spooling.view)
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000109', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000109","role":"authenticated"}', true);
select is(
  (public.read_material_check_workspace('36000000-0000-0000-0000-000000000108') -> 'lines' -> 0 ->> 'identCode'),
  'ID-1',
  'qc_engineer can read material workspace without spooling.view'
);
select is(
  jsonb_array_length(public.read_material_check_workspace('36000000-0000-0000-0000-000000000108') -> 'lines'),
  4,
  'read_material_check_workspace returns all 4 BOM rows'
);

-- 11-13: Search candidates
select is(
  (select count(*)::integer from public.search_material_trace_candidates('50000000-0000-0000-0000-000000000001')),
  1,
  'candidate search filters by exact expected trace Heat-ab12'
);
select is(
  (select trace_number from public.search_material_trace_candidates('50000000-0000-0000-0000-000000000001') limit 1),
  'Heat-ab12',
  'candidate search returns exact case Heat-ab12'
);
select is(
  (select count(*)::integer from public.search_material_trace_candidates('50000000-0000-0000-0000-000000000003')),
  1,
  'candidate search for null expected trace returns only active PML rows (excludes inactive)'
);

-- 14: Search candidate with needle
select is(
  (select count(*)::integer from public.search_material_trace_candidates('50000000-0000-0000-0000-000000000003', 'MRR-201')),
  1,
  'candidate search matches MRR number needle'
);

-- 15: Invalid cursor error (23514)
select throws_ok(
  $$select * from public.search_material_trace_candidates('50000000-0000-0000-0000-000000000003', '', 'trace', null)$$,
  '23514',
  null,
  'composite cursor mismatch raises 23514'
);

-- 16: Unauthorized read attempt
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000111', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000111","role":"authenticated"}', true);
select throws_ok(
  $$select public.read_material_check_workspace('36000000-0000-0000-0000-000000000108')$$,
  '42501',
  null,
  'user without project membership is denied workspace read'
);

-- 17: Non-UUID in write payload raises 23514
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000109', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000109","role":"authenticated"}', true);
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(jsonb_build_object(
      'spool_revision_material_id', 'not-a-uuid',
      'piping_material_record_id', '60000000-0000-0000-0000-000000000001',
      'ident_code', 'ID-1',
      'trace_number', 'Heat-ab12'
    ))
  )$$,
  '23514',
  null,
  'invalid UUID text raises 23514'
);

-- 18: Empty UUID in write payload raises 23514
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(jsonb_build_object(
      'spool_revision_material_id', '',
      'piping_material_record_id', '60000000-0000-0000-0000-000000000001',
      'ident_code', 'ID-1',
      'trace_number', 'Heat-ab12'
    ))
  )$$,
  '23514',
  null,
  'empty UUID property raises 23514'
);

-- 19: Duplicate BOM row in single command raises 23514
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000001',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000001',
        'ident_code', 'ID-1',
        'trace_number', 'Heat-ab12'
      ),
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000001',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000001',
        'ident_code', 'ID-1',
        'trace_number', 'Heat-ab12'
      )
    )
  )$$,
  '23514',
  null,
  'duplicate BOM row ID in single command raises 23514'
);

-- 20-21: Successful record of same Ident across two distinct BOM rows in single command!
select lives_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000001',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000001',
        'ident_code', 'ID-1',
        'trace_number', 'Heat-ab12',
        'quantity', 1
      ),
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000002',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000002',
        'ident_code', 'ID-1',
        'trace_number', 'H2',
        'quantity', 1
      )
    )
  )$$,
  'distinct BOM rows with same Ident accept both items in single command'
);

select is(
  (select count(*)::integer from public.material_check_items
   where spool_revision_material_id in ('50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002')),
  2,
  'both material check items persisted'
);

-- 22-23: Workspace reflects accepted evidence with source details
select is(
  (public.read_material_check_workspace('36000000-0000-0000-0000-000000000108') -> 'lines' -> 0 -> 'accepted' ->> 'traceNumber'),
  'Heat-ab12',
  'read_material_check_workspace returns accepted evidence with exact trace'
);

select is(
  (public.read_material_check_workspace('36000000-0000-0000-0000-000000000108') -> 'lines' -> 0 -> 'accepted' ->> 'mrrNumber'),
  'MRR-101',
  'read_material_check_workspace returns accepted evidence with MRR'
);

-- 24: Attempt to rewrite accepted material evidence raises 23514
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000001',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000001',
        'ident_code', 'ID-1',
        'trace_number', 'Heat-ab12',
        'quantity', 2
      )
    )
  )$$,
  '23514',
  null,
  'rewriting accepted material evidence raises 23514'
);

-- 25: Legacy payload without BOM row ID succeeds for unambiguous BOM row (ID-3)
select lives_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'ident_code', 'ID-3',
        'trace_number', 'Trace-301'
      )
    )
  )$$,
  'legacy payload without BOM row ID succeeds when row is unambiguous'
);

-- 26: Ambiguous legacy payload raises PQC58
reset role;
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, description, quantity, unit, trace_number)
values ('50000000-0000-0000-0000-000000000005', '36000000-0000-0000-0000-000000000108', 'ID-1', 'Second Pipe', 1, 'ea', null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000109', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000109","role":"authenticated"}', true);
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'ident_code', 'ID-1',
        'trace_number', 'Heat-ab12'
      )
    )
  )$$,
  'PQC58',
  null,
  'ambiguous legacy payload matching multiple BOM rows raises PQC58'
);

-- 27: Foreign BOM row ID raises PQC30
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '99000000-0000-0000-0000-000000000999',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000004',
        'ident_code', 'ID-2',
        'trace_number', 'Trace-201'
      )
    )
  )$$,
  'PQC30',
  null,
  'foreign BOM row ID raises PQC30'
);

-- 28: Foreign PML row ID raises PQC33
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000003',
        'piping_material_record_id', '99000000-0000-0000-0000-000000000999',
        'ident_code', 'ID-2',
        'trace_number', 'Trace-201'
      )
    )
  )$$,
  'PQC33',
  null,
  'foreign PML record ID raises PQC33'
);

-- 29: Read-only user cannot execute write command (raises 42501)
reset role;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000111', '30000000-0000-0000-0000-000000000108', '10000000-0000-0000-0000-000000000111', 'qc_engineer', 'project_reader', true);
insert into public.project_membership_functional_roles (membership_id, role_code)
values ('20000000-0000-0000-0000-000000000111', 'qc_engineer');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000111', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000111","role":"authenticated"}', true);
select throws_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000003',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000004',
        'ident_code', 'ID-2',
        'trace_number', 'Trace-201'
      )
    )
  )$$,
  '42501',
  null,
  'read-only user is denied write command'
);

-- 30: Erection contributor can read workspace in their project
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000110', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000110","role":"authenticated"}', true);
select is(
  (public.read_material_check_workspace('36000000-0000-0000-0000-000000000108') -> 'lines' -> 0 ->> 'identCode'),
  'ID-1',
  'erection_contributor can read workspace via erection.view capability'
);

-- 31-32: Idempotency replay
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000109', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000109","role":"authenticated"}', true);
select lives_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000004',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000006',
        'ident_code', 'ID-3',
        'trace_number', 'Trace-301'
      )
    ),
    null,
    'idempotent-key-108'
  )$$,
  'initial command with idempotency key succeeds'
);

select lives_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000108',
    '2026-10-06'::date,
    jsonb_build_array(
      jsonb_build_object(
        'spool_revision_material_id', '50000000-0000-0000-0000-000000000004',
        'piping_material_record_id', '60000000-0000-0000-0000-000000000006',
        'ident_code', 'ID-3',
        'trace_number', 'Trace-301'
      )
    ),
    null,
    'idempotent-key-108'
  )$$,
  'replayed command with same idempotency key succeeds'
);

rollback;
