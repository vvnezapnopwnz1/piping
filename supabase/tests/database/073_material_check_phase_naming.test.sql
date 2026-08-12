-- T07-D2: pins the accepted shape of material_check_records and the honest naming that
-- follows from it. One check per spool revision, whatever phase performed it, and readiness
-- columns that do not claim to be field-only.
--
-- The overwrite asserted below is the deliberate consequence of that decision, not a defect
-- this test tolerates by accident: if someone later gives material_check_records a phase, this
-- test is the one that must be rewritten, and the rename it guards reversed.

begin;
select plan(15);

select has_column('public', 'spool_erection_readiness', 'material_line_total',
  'readiness names the phase-agnostic material line count honestly');
select has_column('public', 'spool_erection_readiness', 'material_line_checked',
  'readiness names the checked line count honestly');
select has_column('public', 'spool_erection_readiness', 'material_checked_on',
  'readiness names the material check date honestly');
select hasnt_column('public', 'spool_erection_readiness', 'field_line_total',
  'the false field_ prefix is gone from the line count');
select hasnt_column('public', 'spool_erection_readiness', 'field_material_checked_on',
  'the false field_ prefix is gone from the check date');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000731', 'authenticated', 'authenticated',
        'material.phase@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000731';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000731', 'MATPH-07', 'Material check phase', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000731');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'PDS-07M', 'Track 07 PDS');
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'ISO-07-M');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000000731', '33000000-0000-0000-0000-000000000731', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000000731', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'SP-07-M');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000731', '35000000-0000-0000-0000-000000000731',
        '34000000-0000-0000-0000-000000000731', 1);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000731', '36000000-0000-0000-0000-000000000731', 'IDN-07M', 1, 'ea', 'HEAT-07M');
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731',
        'MRR-07M', 'IDN-07M', 'HEAT-07M');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000731', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000731","role":"authenticated"}', true);

select lives_ok(
  $$select public.record_erection_progress(
    '36000000-0000-0000-0000-000000000731', 'to_site', date '2026-08-10', '{}'::jsonb, 'matph-to-site')$$,
  'to site opens the field material check'
);
select lives_ok(
  $$select public.record_field_material_check(
    '36000000-0000-0000-0000-000000000731', date '2026-08-12',
    '[{"ident_code":"IDN-07M","trace_number":"HEAT-07M","quantity":1}]'::jsonb, null, 'matph-field')$$,
  'the field material check is accepted'
);
select is(
  (select count(*)::int from public.material_check_records
   where spool_revision_id = '36000000-0000-0000-0000-000000000731'),
  1, 'the field check files one material check record'
);
select is(
  (select material_checked_on from public.spool_erection_readiness
   where spool_revision_id = '36000000-0000-0000-0000-000000000731'),
  date '2026-08-12', 'readiness reports the field check date'
);

select lives_ok(
  $$select public.record_construction_progress(
    '36000000-0000-0000-0000-000000000731', 'fabrication', 'start_fab', date '2026-08-01', '{}'::jsonb, 'matph-fab-start')$$,
  'fabrication may start on the same spool revision'
);
select lives_ok(
  $$select public.record_material_check(
    '36000000-0000-0000-0000-000000000731', date '2026-08-20',
    '[{"ident_code":"IDN-07M","trace_number":"HEAT-07M","quantity":1}]'::jsonb, null, 'matph-shop')$$,
  'the shop material check is accepted on a spool already checked in the field'
);
select is(
  (select count(*)::int from public.material_check_records
   where spool_revision_id = '36000000-0000-0000-0000-000000000731'),
  1, 'a spool revision still holds exactly one material check record after both phases'
);
-- The accepted cost of the one-record shape: the later check owns the date, and the view
-- cannot say which phase it came from. This is why the columns are no longer called field_*.
select is(
  (select material_checked_on from public.spool_erection_readiness
   where spool_revision_id = '36000000-0000-0000-0000-000000000731'),
  date '2026-08-20', 'the later check owns the date, whichever phase recorded it'
);
select is(
  (select material_line_checked from public.spool_erection_readiness
   where spool_revision_id = '36000000-0000-0000-0000-000000000731'),
  1::int, 'the checked line count survives a re-confirmation'
);
-- Phase is still recoverable where it matters: the derived ledger event carries it.
select is(
  (select count(distinct phase)::int from public.construction_progress_events
   where spool_revision_id = '36000000-0000-0000-0000-000000000731' and stage = 'material_check'),
  2, 'the ledger keeps one material-check event per phase even though the record is shared'
);

select * from finish();
rollback;
