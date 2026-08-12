begin;
select plan(21);

select has_function('public', 'record_erection_progress', array['uuid', 'construction_stage', 'date', 'jsonb', 'text'],
  'erection progress RPC exists');
select has_function('public', 'record_field_material_check', array['uuid', 'date', 'jsonb', 'uuid', 'text'],
  'field material check RPC exists');
select has_function('public', 'record_field_support_progress', array['uuid', 'date', 'text'],
  'field support RPC exists');
select has_view('public', 'spool_erection_readiness', 'erection readiness view exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000721', 'authenticated', 'authenticated',
        'erection.progress@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000721';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000721', 'ERECT-07', 'Erection progress', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000721');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000721', '30000000-0000-0000-0000-000000000721', 'PDS-07', 'Track 07 PDS');
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000000721', '30000000-0000-0000-0000-000000000721', 'ISO-07-E');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000000721', '33000000-0000-0000-0000-000000000721', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000000721', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000721', '30000000-0000-0000-0000-000000000721', 'SP-07-E');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000721', '35000000-0000-0000-0000-000000000721',
        '34000000-0000-0000-0000-000000000721', 1);
insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000000721', '30000000-0000-0000-0000-000000000721', 'SUP-07-E');
insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4a000000-0000-0000-0000-000000000721', '49000000-0000-0000-0000-000000000721',
        '36000000-0000-0000-0000-000000000721', 'shoe', 1);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000721', '36000000-0000-0000-0000-000000000721', 'IDN-07', 1, 'ea', 'HEAT-07');
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000721', '30000000-0000-0000-0000-000000000721',
        'MRR-07', 'IDN-07', 'HEAT-07');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000721', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000721","role":"authenticated"}', true);

select throws_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000721', 'erected', current_date, '{}'::jsonb, null)$$,
  'PQC54', null, 'erected requires the spool to be at site'
);
select throws_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000721', 'rft', current_date, '{}'::jsonb, null)$$,
  'PQC55', null, 'RFT is never manually recorded'
);
select lives_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000721', 'to_site', date '2026-08-10', '{}'::jsonb, 'erection-to-site')$$,
  'to site is recorded through the erection command'
);
select lives_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000721', 'erected', date '2026-08-11', '{}'::jsonb, 'erection-erected')$$,
  'erected is recorded after to site'
);
select throws_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000721', 'supported', date '2026-08-12', '{}'::jsonb, null)$$,
  'PQC53', null, 'supported requires the welded or bolted predecessor'
);
-- Deliberately before any fabrication progress: a field check must not depend on start_fab,
-- and this caller holds the fabrication capability too.
select lives_ok(
  $$select public.record_field_material_check(
    '36000000-0000-0000-0000-000000000721', date '2026-08-12',
    '[{"ident_code":"IDN-07","trace_number":"HEAT-07","quantity":1}]'::jsonb, null, 'field-material')$$,
  'field material check reuses PML evidence validation without a fabrication start'
);
select is(
  (select count(*)::int from public.material_check_records
   where spool_revision_id = '36000000-0000-0000-0000-000000000721'),
  1, 'field material evidence is durable on the spool'
);
select is(
  (select phase from public.construction_progress_events
   where spool_revision_id = '36000000-0000-0000-0000-000000000721' and stage = 'material_check'),
  'erection'::public.construction_phase, 'the derived material-check event is filed under erection'
);
select lives_ok(
  $$select public.record_construction_progress(
    '36000000-0000-0000-0000-000000000721', 'fabrication', 'start_fab', date '2026-08-01', '{}'::jsonb, 'erection-fab-start')$$,
  'fabrication remains available for the same spool'
);
select lives_ok(
  $$select public.record_field_support_progress(
    '4a000000-0000-0000-0000-000000000721', date '2026-08-13', 'field-support')$$,
  'field support installation is durable'
);
select is(
  (select phase from public.support_progress_records
   where support_revision_id = '4a000000-0000-0000-0000-000000000721'),
  'erection'::public.construction_phase, 'field support is marked as erection progress'
);
select is(
  (select count(*)::int from public.construction_progress_events
   where spool_revision_id = '36000000-0000-0000-0000-000000000721'
     and phase = 'erection' and stage in ('to_site', 'erected')),
  2, 'erection events use the shared construction ledger'
);
select is(
  (select material_line_total from public.spool_erection_readiness
   where spool_revision_id = '36000000-0000-0000-0000-000000000721'),
  1::int, 'erection readiness counts the spool material lines'
);
select is(
  (select is_rft from public.spool_erection_readiness
   where spool_revision_id = '36000000-0000-0000-0000-000000000721'),
  false, 'RFT stays closed before welded or bolted and supported'
);
select lives_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000721', 'welded_bolted', date '2026-08-14', '{}'::jsonb, 'erection-welded')$$,
  'welded or bolted is recordable after erection'
);
select lives_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000721', 'supported', date '2026-08-15', '{}'::jsonb, 'erection-supported')$$,
  'supported is recordable after welded or bolted'
);
select is(
  (select is_rft from public.spool_erection_readiness
   where spool_revision_id = '36000000-0000-0000-0000-000000000721'),
  true, 'RFT is derived when all predecessor stages and quality gates are clear'
);

select * from finish();
rollback;
