begin;
select plan(9);

select has_table('public', 'construction_phase_stages', 'construction phase policy table exists');
select is(
  (select count(*)::int from public.construction_phase_stages where phase = 'fabrication'),
  8,
  'fabrication keeps all eight existing stages in the policy'
);
select is(
  (select count(*)::int from public.construction_phase_stages where phase = 'erection'),
  5,
  'erection has the five-stage ladder in the policy'
);
select is(
  (select count(*)::int from public.construction_phase_stages where phase = 'fabrication' and is_recordable),
  2,
  'only start fab and sent to paint remain recordable for fabrication'
);
select is(
  (select count(*)::int from public.construction_phase_stages where phase = 'erection' and is_recordable),
  4,
  'RFT is derived and the four predecessor erection stages are recordable'
);
select is(
  (select ordinal from public.construction_phase_stages
   where phase = 'erection' and stage = 'rft'),
  5::smallint,
  'RFT is the final erection stage'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000701', 'authenticated', 'authenticated',
        'phase.policy@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000701';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000701', 'PHASE-07', 'Phase policy', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000701');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000701', '30000000-0000-0000-0000-000000000701', 'PDS-07', 'Track 07 PDS');
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000000701', '30000000-0000-0000-0000-000000000701', 'ISO-07-A');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000000701', '33000000-0000-0000-0000-000000000701', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000000701', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000701', '30000000-0000-0000-0000-000000000701', 'SP-07-A');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000701', '35000000-0000-0000-0000-000000000701',
        '34000000-0000-0000-0000-000000000701', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000701', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000701","role":"authenticated"}', true);

select throws_ok(
  $$select public.record_construction_progress(
    '36000000-0000-0000-0000-000000000701', 'fabrication', 'fabricated', current_date, '{}'::jsonb, null)$$,
  'PQC32', null,
  'the existing fabrication refusal remains unchanged for a derived stage'
);
select lives_ok(
  $$select public.record_construction_progress(
    '36000000-0000-0000-0000-000000000701', 'fabrication', 'start_fab', current_date, '{}'::jsonb, 'phase-start')$$,
  'the existing fabrication start command still works through the policy'
);
select throws_ok(
  $$select public.record_construction_progress(
    '36000000-0000-0000-0000-000000000701', 'assembly', 'to_site', current_date, '{}'::jsonb, null)$$,
  'PQC50', null,
  'assembly remains disabled in Track 07'
);
select * from finish();
rollback;
