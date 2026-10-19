begin;
select plan(13);

-- A recorded Start Fab or Sent to Paint date can be corrected. Events are append-only, so a correction
-- compensates the event that stands and records the new date; the projection already ignores compensated
-- events. Before this the only way to change a date was to record again, which the projection (it reads the
-- latest date, not the latest event) could not honour for an earlier date.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000001311', 'authenticated', 'authenticated', 'correct.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001312', 'authenticated', 'authenticated', 'correct.outsider@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001311';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001311', 'CORR-131', 'Correct progress', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001311');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000001311', '30000000-0000-0000-0000-000000001311', 'PDS-131', 'Area');
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000001311', '30000000-0000-0000-0000-000000001311', 'ISO-131');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000001311', '33000000-0000-0000-0000-000000001311', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000001311', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000001311', '30000000-0000-0000-0000-000000001311', 'SP-131');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000001311', '35000000-0000-0000-0000-000000001311',
        '34000000-0000-0000-0000-000000001311', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001311', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001311","role":"authenticated"}', true);

select public.record_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'start_fab',
  date '2026-10-03', '{}'::jsonb, 'record-131');

-- A stage nobody recorded has nothing to correct.
select throws_ok(
  $$select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'sent_to_paint',
    date '2026-10-09', 'typo', 'corr-none')$$,
  'PQC57', null, 'a stage with no recorded date cannot be corrected');

select throws_ok(
  $$select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'start_fab',
    date '2026-10-01', '   ', 'corr-blank')$$,
  '23514', null, 'a correction needs a reason');

select throws_ok(
  $$select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'start_fab',
    date '2026-10-03', 'same date', 'corr-same')$$,
  'PQC57', null, 'a correction to the date that stands is refused');

select throws_ok(
  $$select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'fabricated',
    date '2026-10-01', 'derived', 'corr-derived')$$,
  'PQC32', null, 'a derived stage cannot be corrected');

select throws_ok(
  $$select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'assembly', 'to_site',
    date '2026-10-01', 'assembly', 'corr-assembly')$$,
  'PQC50', null, 'assembly stays disabled');

-- The date moves earlier: the case a re-record could not do.
select lives_ok(
  $$select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'start_fab',
    date '2026-10-01', 'Pressed the button on the wrong day', 'corr-1')$$,
  'a start date is corrected to an earlier day');

select is(
  (select start_fab_on from public.fabrication_spool_projections where spool_revision_id = '36000000-0000-0000-0000-000000001311'),
  date '2026-10-01',
  'the spool shows the corrected date');

select is(
  (select array_agg(event.occurred_on) from public.construction_progress_events event
   where event.spool_revision_id = '36000000-0000-0000-0000-000000001311' and event.stage = 'start_fab'
     and event.source <> 'compensation'
     and not exists (select 1 from public.construction_progress_events cancel where cancel.compensates_event_id = event.id)),
  array[date '2026-10-01'],
  'one event stands for the stage and it carries the corrected date');

select is(
  (select count(*)::int from public.construction_progress_events
   where spool_revision_id = '36000000-0000-0000-0000-000000001311' and stage = 'start_fab' and source = 'compensation'),
  1,
  'the event that stood is compensated, not rewritten');

-- A second correction compensates only what stands now.
select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'start_fab',
  date '2026-10-02', 'Second thoughts', 'corr-2');

select is(
  (select start_fab_on from public.fabrication_spool_projections where spool_revision_id = '36000000-0000-0000-0000-000000001311'),
  date '2026-10-02',
  'a second correction moves the date again');

-- A replay with the same key writes nothing.
select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'start_fab',
  date '2026-10-02', 'Second thoughts', 'corr-2');

select is(
  (select count(*)::int from public.construction_progress_events
   where spool_revision_id = '36000000-0000-0000-0000-000000001311' and stage = 'start_fab'),
  5,
  'a replay with the same key adds no events (record, 2 compensations, 2 corrections)');

select is(
  (select count(*)::int from public.audit_events where action = 'correct_construction_progress'
     and project_id = '30000000-0000-0000-0000-000000001311'),
  2,
  'each correction is audited');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001312', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001312","role":"authenticated"}', true);

select throws_ok(
  $$select public.correct_construction_progress('36000000-0000-0000-0000-000000001311', 'fabrication', 'start_fab',
    date '2026-10-05', 'outsider', 'corr-out')$$,
  '42501', null, 'a user outside the project cannot correct');

reset role;
select * from finish();
rollback;
