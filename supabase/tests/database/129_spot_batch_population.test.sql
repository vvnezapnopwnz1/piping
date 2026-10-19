-- 129: a spot batch is a population
--
-- A spot rule samples a share of a population: ten joints at 10 % are one examined joint, and the
-- other nine are decided by that one. Before this, allocation took the sample and left the other
-- nine "waiting for a batch" for ever, so a spool with a spot obligation never completed.
--   * allocation takes the sample into the batch and reserves the rest as the batch's population
--   * a reserved joint is not a candidate for another batch
--   * an accepted sample closes the batch and releases the population (waived, shown as NRW)
--   * a rejected sample leaves the population unjudged: it goes back to the pool and the existing
--     repair/tracer path runs
begin;
select plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000001291', 'authenticated', 'authenticated', 'spot.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001292', 'authenticated', 'authenticated', 'spot.outsider@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001291', 'SPOT-129', 'Spot population', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001291');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291',
        '10000000-0000-0000-0000-000000001291', 'system_admin', 'project_admin', true)
on conflict (project_id, user_id) do update set role = 'system_admin', access_role_code = 'project_admin', is_active = true;

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001291', 'material_type', 'CS-129', 'Carbon steel')
on conflict do nothing;

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291', 'SUB-129', 'Fabricator');

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291',
        '53000000-0000-0000-0000-000000001291', 'SC-129', 'Service class');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291', 'CS-129', 'Carbon steel');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291', 'A1',
        '54000000-0000-0000-0000-000000001291');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291',
        '50000000-0000-0000-0000-000000001291', '53000000-0000-0000-0000-000000001291',
        'WPS-129', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values ('57000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291',
        '50000000-0000-0000-0000-000000001291', 'W-129', 'Welder 129', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('57000000-0000-0000-0000-000000001291', '56000000-0000-0000-0000-000000001291');

-- 10 % on RT and on UT: both methods give every joint a spot obligation.
insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, ut_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291',
        '51000000-0000-0000-0000-000000001291', '52000000-0000-0000-0000-000000001291', 'shop',
        10, 10, false);

insert into public.project_rework_codes (id, project_id, code, description)
values ('59000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291', 'RW-129', 'Porosity');

insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291', 'ISO-129');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000001291', '30000000-0000-0000-0000-000000001291', 'SP-129');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000001291', '40000000-0000-0000-0000-000000001291', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000001291', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000001291', '41000000-0000-0000-0000-000000001291',
        '42000000-0000-0000-0000-000000001291', 1, 'A1');

-- Ten joints W-129-01 .. W-129-10, hex suffix so the ids stay uuids.
insert into public.weld_joints (id, project_id, weld_number)
select ('46000000-0000-0000-0000-0000000129' || lpad(to_hex(n), 2, '0'))::uuid,
       '30000000-0000-0000-0000-000000001291', 'W-129-' || lpad(n::text, 2, '0')
from generate_series(1, 10) as n;

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
select ('47000000-0000-0000-0000-0000000129' || lpad(to_hex(n), 2, '0'))::uuid,
       ('46000000-0000-0000-0000-0000000129' || lpad(to_hex(n), 2, '0'))::uuid,
       '43000000-0000-0000-0000-000000001291', '52000000-0000-0000-0000-000000001291', 'shop', 6, 8
from generate_series(1, 10) as n;

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
select ('48000000-0000-0000-0000-0000000129' || lpad(to_hex(n), 2, '0'))::uuid,
       ('47000000-0000-0000-0000-0000000129' || lpad(to_hex(n), 2, '0'))::uuid, 'root', 1
from generate_series(1, 10) as n;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001291', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000001291","role":"authenticated"}', true);

do $$
declare n int;
begin
  for n in 1..10 loop
    perform public.record_weld_progress(
      ('47000000-0000-0000-0000-0000000129' || lpad(to_hex(n), 2, '0'))::uuid,
      '50000000-0000-0000-0000-000000001291',
      '56000000-0000-0000-0000-000000001291',
      ('[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001291","completion_percent":100,"welded_on":"2026-08-' || lpad(n::text, 2, '0') || '"}]')::jsonb,
      ('{"weld_on":"2026-08-' || lpad(n::text, 2, '0') || '"}')::jsonb);
  end loop;
end;
$$;

-- ─── Accepted sample ───────────────────────────────────────────────────────
select public.create_nde_batch('30000000-0000-0000-0000-000000001291', 'rt'::public.ndt_method,
  'spot', null, null, 'SPOT-RT');

select is(
  (select public.allocate_nde_batch_candidates(id, 10) from public.nde_batches where batch_number = 'SPOT-RT'),
  1,
  'ten per cent of ten spot joints is one sampled joint'
);

select is(
  (select count(*)::int from public.nde_batch_population p
   join public.nde_batches b on b.id = p.batch_id where b.batch_number = 'SPOT-RT'),
  9,
  'the other nine are reserved as the batch population'
);

select is(
  (select array_agg(wj.weld_number)
   from public.nde_batch_items bi
   join public.nde_batches b on b.id = bi.batch_id
   join public.nde_obligations o on o.id = bi.obligation_id
   join public.weld_joint_revisions wjr on wjr.id = o.weld_joint_revision_id
   join public.weld_joints wj on wj.id = wjr.weld_joint_id
   where b.batch_number = 'SPOT-RT'),
  array['W-129-01'],
  'the sample is the head of the deterministic candidate order'
);

-- A reserved joint is decided by its batch; another batch may not sample it again.
select public.create_nde_batch('30000000-0000-0000-0000-000000001291', 'rt'::public.ndt_method,
  'spot', null, null, 'SPOT-RT-2');

select is(
  (select count(*)::int from public.nde_batch_candidates(
     (select id from public.nde_batches where batch_number = 'SPOT-RT-2'))),
  0,
  'a joint reserved by a batch is not a candidate for another'
);

select public.issue_nde_batch(id) from public.nde_batches where batch_number = 'SPOT-RT';

select is(
  (select count(*)::int from public.nde_batch_population p
   join public.nde_obligations o on o.id = p.obligation_id
   join public.nde_batches b on b.id = p.batch_id
   where b.batch_number = 'SPOT-RT' and o.disposition = 'pending'),
  9,
  'issuing sends the sample out; the population stays pending'
);

select throws_ok(
  $$select public.close_nde_batch(id) from public.nde_batches where batch_number = 'SPOT-RT'$$,
  'PQC41', null,
  'the batch cannot close while its sample has no result'
);

select public.record_nde_result(
  (select o.id from public.nde_obligations o
   join public.nde_batch_items bi on bi.obligation_id = o.id
   join public.nde_batches b on b.id = bi.batch_id where b.batch_number = 'SPOT-RT'),
  'accepted', date '2026-08-20', 'RPT-129-RT');

select lives_ok(
  $$select public.close_nde_batch(id) from public.nde_batches where batch_number = 'SPOT-RT'$$,
  'the batch closes once the sample is examined'
);

select is(
  (select count(*)::int from public.nde_batch_population p
   join public.nde_obligations o on o.id = p.obligation_id
   join public.nde_batches b on b.id = p.batch_id
   where b.batch_number = 'SPOT-RT' and o.disposition = 'waived'),
  9,
  'an accepted sample releases the whole population (waived)'
);

select is(
  (select count(*)::int from public.nde_obligations
   where method = 'rt' and cycle_kind = 'original' and disposition not in ('satisfied', 'waived')),
  0,
  'no rt obligation is left open on the spool'
);

select is(
  public.nde_joint_status_label('waived', 'original', 0::smallint, 'spot'),
  'NRW',
  'a released joint reads NRW, apart from the examined joint''s NR'
);

-- ─── Rejected sample ───────────────────────────────────────────────────────
select public.create_nde_batch('30000000-0000-0000-0000-000000001291', 'ut'::public.ndt_method,
  'spot', null, null, 'SPOT-UT');
select public.allocate_nde_batch_candidates(id, 10) from public.nde_batches where batch_number = 'SPOT-UT';
select public.issue_nde_batch(id) from public.nde_batches where batch_number = 'SPOT-UT';

select public.record_nde_result(
  (select o.id from public.nde_obligations o
   join public.nde_batch_items bi on bi.obligation_id = o.id
   join public.nde_batches b on b.id = bi.batch_id where b.batch_number = 'SPOT-UT'),
  'rejected', date '2026-08-21', 'RPT-129-UT',
  '59000000-0000-0000-0000-000000001291', '57000000-0000-0000-0000-000000001291');

select lives_ok(
  $$select public.close_nde_batch(id) from public.nde_batches where batch_number = 'SPOT-UT'$$,
  'a batch with a rejected sample closes'
);

select is(
  (select count(*)::int from public.nde_batch_population p
   join public.nde_batches b on b.id = p.batch_id where b.batch_number = 'SPOT-UT'),
  0,
  'a rejected sample does not judge the population: the reservation is lifted'
);

select is(
  (select count(*)::int from public.nde_obligations
   where method = 'ut' and cycle_kind = 'original' and disposition = 'pending'),
  9,
  'the nine unjudged joints are still pending, none waived'
);

select ok(
  exists (select 1 from public.nde_obligations where method = 'ut' and cycle_kind = 'repair')
  and exists (select 1 from public.nde_obligations where method = 'ut' and cycle_kind = 'tracer'),
  'the existing repair and tracer path ran for the rejection'
);

select public.create_nde_batch('30000000-0000-0000-0000-000000001291', 'ut'::public.ndt_method,
  'spot', null, null, 'SPOT-UT-2');

select ok(
  exists (select 1 from public.nde_batch_candidates(
            (select id from public.nde_batches where batch_number = 'SPOT-UT-2')) c
          where c.candidate_weld_number = 'W-129-02'),
  'a released joint can be sampled by a later batch'
);

-- ─── Reading the population is a project member's right ────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001292', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000001292","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.nde_batch_population),
  0,
  'a user outside the project reads no population'
);

select * from finish();
rollback;
