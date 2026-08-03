-- 064: Track 06 corrections
--
-- Covers the invariants the Track 06 suite asserted nowhere:
--   * tracer candidates are scoped to their own project (the project filter was
--     a correlated reference and matched every project)
--   * allocate_nde_batch_candidates honours target_percentage (it was ignored)
--   * PQC40 means a heterogeneous batch (it was raised for a bad category code)
--   * truth-table row 5: a rejected second-level tracer escalates to NDE100,
--     in a population holding only three rejections so the fourth-rejection
--     rule cannot account for the escalation
begin;
select plan(10);

-- ─── Fixture: two projects, so a cross-project leak is visible ──────────────
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000641', 'authenticated', 'authenticated', 'corr.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000642', 'authenticated', 'authenticated', 'corr.user@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000641';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000641', 'COR-A', 'Corrections A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000641'),
  ('30000000-0000-0000-0000-000000000642', 'COR-B', 'Corrections B', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000641');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641',
   '10000000-0000-0000-0000-000000000642', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642',
   '10000000-0000-0000-0000-000000000642', 'system_admin', 'project_admin', true);

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000641', 'material_type', 'CS', 'Carbon steel')
on conflict do nothing;

-- Referentials for both projects, distinguished by the 641/642 suffix.
insert into public.project_subcontractors (id, project_id, code, description)
values
  ('50000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641', 'SUB-C', 'Fab Sub C'),
  ('50000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642', 'SUB-D', 'Fab Sub D');

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values
  ('51000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641',
   '53000000-0000-0000-0000-000000000641', 'SC-C', 'Service class C'),
  ('51000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642',
   '53000000-0000-0000-0000-000000000641', 'SC-D', 'Service class D');

insert into public.project_weld_types (id, project_id, code, description)
values
  ('52000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641', 'BW', 'Butt weld'),
  ('52000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values
  ('54000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641', 'CS', 'Carbon steel'),
  ('54000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642', 'CS', 'Carbon steel');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values
  ('55000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641', 'A1',
   '54000000-0000-0000-0000-000000000641'),
  ('55000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642', 'A1',
   '54000000-0000-0000-0000-000000000642');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values
  ('56000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641',
   '50000000-0000-0000-0000-000000000641', '53000000-0000-0000-0000-000000000641',
   'WPS-C', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01'),
  ('56000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642',
   '50000000-0000-0000-0000-000000000642', '53000000-0000-0000-0000-000000000641',
   'WPS-D', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641',
   '50000000-0000-0000-0000-000000000641', 'W-C1', 'Welder C1', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642',
   '50000000-0000-0000-0000-000000000642', 'W-D1', 'Welder D1', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000641', '56000000-0000-0000-0000-000000000641'),
  ('57000000-0000-0000-0000-000000000642', '56000000-0000-0000-0000-000000000642');

insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required)
values
  ('58000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641',
   '51000000-0000-0000-0000-000000000641', '52000000-0000-0000-0000-000000000641', 'shop',
   100, 0, false),
  ('58000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642',
   '51000000-0000-0000-0000-000000000642', '52000000-0000-0000-0000-000000000642', 'shop',
   100, 0, false);

insert into public.project_rework_codes (id, project_id, code, description)
values
  ('59000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641', 'RW-C', 'Porosity'),
  ('59000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642', 'RW-D', 'Porosity');

-- Project A: six joints. Project B: two joints that must never be visible to A.
insert into public.isometrics (id, project_id, iso_number)
values
  ('40000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641', 'ISO-C641'),
  ('40000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642', 'ISO-D642');

insert into public.spools (id, project_id, spool_number)
values
  ('41000000-0000-0000-0000-000000000641', '30000000-0000-0000-0000-000000000641', 'SP-C641'),
  ('41000000-0000-0000-0000-000000000642', '30000000-0000-0000-0000-000000000642', 'SP-D642');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values
  ('42000000-0000-0000-0000-000000000641', '40000000-0000-0000-0000-000000000641', 'R0', 1,
   'accepted', '51000000-0000-0000-0000-000000000641', now()),
  ('42000000-0000-0000-0000-000000000642', '40000000-0000-0000-0000-000000000642', 'R0', 1,
   'accepted', '51000000-0000-0000-0000-000000000642', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values
  ('43000000-0000-0000-0000-000000000641', '41000000-0000-0000-0000-000000000641',
   '42000000-0000-0000-0000-000000000641', 1, 'A1'),
  ('43000000-0000-0000-0000-000000000642', '41000000-0000-0000-0000-000000000642',
   '42000000-0000-0000-0000-000000000642', 1, 'A1');

insert into public.weld_joints (id, project_id, weld_number)
select
  ('46000000-0000-0000-0000-00000000064' || n)::uuid,
  '30000000-0000-0000-0000-000000000641',
  'W-C641-0' || n
from generate_series(1, 6) as n;

insert into public.weld_joints (id, project_id, weld_number)
values
  ('46000000-0000-0000-0000-00000000064a', '30000000-0000-0000-0000-000000000642', 'W-D642-01'),
  ('46000000-0000-0000-0000-00000000064b', '30000000-0000-0000-0000-000000000642', 'W-D642-02');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
select
  ('47000000-0000-0000-0000-00000000064' || n)::uuid,
  ('46000000-0000-0000-0000-00000000064' || n)::uuid,
  '43000000-0000-0000-0000-000000000641',
  '52000000-0000-0000-0000-000000000641',
  'shop', 6, 8
from generate_series(1, 6) as n;

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values
  ('47000000-0000-0000-0000-00000000064a', '46000000-0000-0000-0000-00000000064a',
   '43000000-0000-0000-0000-000000000642', '52000000-0000-0000-0000-000000000642', 'shop', 6, 8),
  ('47000000-0000-0000-0000-00000000064b', '46000000-0000-0000-0000-00000000064b',
   '43000000-0000-0000-0000-000000000642', '52000000-0000-0000-0000-000000000642', 'shop', 6, 8);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
select
  ('48000000-0000-0000-0000-00000000064' || n)::uuid,
  ('47000000-0000-0000-0000-00000000064' || n)::uuid,
  'root', 1
from generate_series(1, 6) as n;

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-00000000064a', '47000000-0000-0000-0000-00000000064a', 'root', 1),
  ('48000000-0000-0000-0000-00000000064b', '47000000-0000-0000-0000-00000000064b', 'root', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000642', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000642","role":"authenticated"}', true);

do $$
declare n int;
begin
  for n in 1..6 loop
    perform public.record_weld_progress(
      ('47000000-0000-0000-0000-00000000064' || n)::uuid,
      '50000000-0000-0000-0000-000000000641',
      '56000000-0000-0000-0000-000000000641',
      ('[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000641","completion_percent":100,"welded_on":"2026-08-0' || n::text || '"}]')::jsonb,
      ('{"weld_on":"2026-08-0' || n::text || '"}')::jsonb);
  end loop;
end;
$$;

do $$
declare joint text;
begin
  foreach joint in array array['a', 'b'] loop
    perform public.record_weld_progress(
      ('47000000-0000-0000-0000-00000000064' || joint)::uuid,
      '50000000-0000-0000-0000-000000000642',
      '56000000-0000-0000-0000-000000000642',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000642","completion_percent":100,"welded_on":"2026-08-01"}]'::jsonb,
      '{"weld_on":"2026-08-01"}'::jsonb);
  end loop;
end;
$$;

-- ─── Allocation honours target_percentage ──────────────────────────────────
-- Six pending rt/NDE100 obligations in project A. 50 % must take three.
select public.create_nde_batch(
  '30000000-0000-0000-0000-000000000641', 'rt'::public.ndt_method,
  'mandatory_100', null, null, 'BATCH-COR-PCT');

select is(
  (select public.allocate_nde_batch_candidates(id, 50)
   from public.nde_batches where batch_number = 'BATCH-COR-PCT'),
  3,
  'allocate_nde_batch_candidates honours target_percentage'
);

-- The pick is the head of the deterministic (welded_on, weld_number) list.
select is(
  (select array_agg(wj.weld_number order by wj.weld_number)
   from public.nde_batch_items bi
   join public.nde_batches b on b.id = bi.batch_id
   join public.nde_obligations o on o.id = bi.obligation_id
   join public.weld_joint_revisions wjr on wjr.id = o.weld_joint_revision_id
   join public.weld_joints wj on wj.id = wjr.weld_joint_id
   where b.batch_number = 'BATCH-COR-PCT'),
  array['W-C641-01', 'W-C641-02', 'W-C641-03'],
  'the allocated slice is the head of the deterministic candidate order'
);

-- A second batch over the identical remaining population yields the identical
-- list — Gate D2 asks for reproducibility, not a pasted screenshot of it.
select public.create_nde_batch(
  '30000000-0000-0000-0000-000000000641', 'rt'::public.ndt_method,
  'mandatory_100', null, null, 'BATCH-COR-REST');

select is(
  (select array_agg(c.candidate_weld_number order by c.candidate_weld_number)
   from public.nde_batch_candidates(
     (select id from public.nde_batches where batch_number = 'BATCH-COR-REST')) c),
  array['W-C641-04', 'W-C641-05', 'W-C641-06'],
  'the candidate list is reproducible and excludes already-allocated obligations'
);

-- ─── PQC40 is a heterogeneous batch ────────────────────────────────────────
set local role postgres;
update public.nde_obligations set coverage_regime = 'spot'
where weld_joint_revision_id = '47000000-0000-0000-0000-000000000643';
set local role authenticated;

select throws_ok(
  $$select public.issue_nde_batch(id) from public.nde_batches where batch_number = 'BATCH-COR-PCT'$$,
  'PQC40', null,
  'a batch mixing coverage regimes is refused with PQC40'
);

set local role postgres;
update public.nde_obligations set coverage_regime = 'mandatory_100'
where weld_joint_revision_id = '47000000-0000-0000-0000-000000000643';
set local role authenticated;

select lives_ok(
  $$select public.issue_nde_batch(id) from public.nde_batches where batch_number = 'BATCH-COR-PCT'$$,
  'a homogeneous batch issues'
);

-- ─── Truth-table row 5: a rejected second-level tracer escalates ────────────
-- Rejection 1 of 3: the original on joint 641.
select public.record_nde_result(
  (select id from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000641' and cycle_kind = 'original'),
  'rejected', date '2026-08-07', 'RPT-COR-1',
  '59000000-0000-0000-0000-000000000641', '57000000-0000-0000-0000-000000000641');

-- The two mandatory first-level tracers landed on other joints of this
-- project. None of project B's joints may be among them.
select is(
  (select count(*)::int
   from public.nde_obligations o
   join public.weld_joint_revisions wjr on wjr.id = o.weld_joint_revision_id
   join public.spool_revisions sr on sr.id = wjr.spool_revision_id
   where o.cycle_kind = 'tracer'
     and sr.id <> '43000000-0000-0000-0000-000000000641'),
  0,
  'tracer candidates never cross a project boundary'
);

-- Rejection 2 of 3: one of the first-level tracers.
set local role postgres;
update public.nde_obligations set disposition = 'issued'
where cycle_kind = 'tracer' and cycle_ordinal = 1;
set local role authenticated;

select public.record_nde_result(
  (select id from public.nde_obligations
   where cycle_kind = 'tracer' and cycle_ordinal = 1
   order by weld_joint_revision_id limit 1),
  'rejected', date '2026-08-08', 'RPT-COR-2',
  '59000000-0000-0000-0000-000000000641', '57000000-0000-0000-0000-000000000641');

select is(
  (select count(*)::int from public.nde_penalty_populations
   where project_id = '30000000-0000-0000-0000-000000000641'),
  0,
  'a rejected first-level tracer alone does not escalate'
);

-- Assign the second-level tracer against the rejected T1, then reject it.
-- That is rejection 3 of 3, so the fourth-rejection rule cannot fire and the
-- escalation can only come from the T2 outcome.
do $$
declare
  rejected_t1 uuid;
  candidate uuid;
begin
  select id into rejected_t1 from public.nde_obligations
  where cycle_kind = 'tracer' and cycle_ordinal = 1 and disposition = 'rejected';

  select c.weld_joint_revision_id into candidate
  from public.eligible_tracer_candidates(rejected_t1) c limit 1;

  perform public.assign_tracer_obligation(rejected_t1, candidate);
end;
$$;

set local role postgres;
update public.nde_obligations set disposition = 'issued'
where cycle_kind = 'tracer' and cycle_ordinal = 2;
set local role authenticated;

select public.record_nde_result(
  (select id from public.nde_obligations where cycle_kind = 'tracer' and cycle_ordinal = 2),
  'rejected', date '2026-08-09', 'RPT-COR-3',
  '59000000-0000-0000-0000-000000000641', '57000000-0000-0000-0000-000000000641');

select is(
  (select count(*)::int from public.nde_results r
   where r.project_id = '30000000-0000-0000-0000-000000000641' and r.outcome = 'rejected'),
  3,
  'row 5 fixture holds exactly three rejections, below the fourth-rejection rule'
);

select is(
  (select escalation_reason from public.nde_penalty_populations
   where project_id = '30000000-0000-0000-0000-000000000641'
     and welder_qualification_id = '57000000-0000-0000-0000-000000000641'),
  'second_level_tracer',
  'Row 5: a rejected second-level tracer creates the NDE100 escalation'
);

-- ─── The manual's joint status, derived and identical on both sides ─────────
-- The same table is asserted in modules/quality/domain/joint-status-label.test.ts.
select is(
  (select array_agg(label order by ord) from (values
    (1, public.nde_joint_status_label('pending',   'original', 0::smallint, 'spot')),
    (2, public.nde_joint_status_label('issued',    'original', 0::smallint, 'spot')),
    (3, public.nde_joint_status_label('satisfied', 'original', 0::smallint, 'spot')),
    (4, public.nde_joint_status_label('pending',   'original', 0::smallint, 'mandatory_100')),
    (5, public.nde_joint_status_label('issued',    'original', 0::smallint, 'mandatory_100')),
    (6, public.nde_joint_status_label('pending',   'tracer',   1::smallint, 'spot')),
    (7, public.nde_joint_status_label('issued',    'tracer',   1::smallint, 'spot')),
    (8, public.nde_joint_status_label('issued',    'tracer',   2::smallint, 'spot')),
    (9, public.nde_joint_status_label('issued',    'repair',   1::smallint, 'mandatory_100')),
    (10, public.nde_joint_status_label('pending',  'repair',   2::smallint, 'mandatory_100'))
  ) as t(ord, label)),
  array['S', 'SS', 'NR', 'H', 'HS', 'T1', 'T1S', 'T2S', 'R1', 'R2'],
  'nde_joint_status_label spells the manual 19.6 statuses'
);

select * from finish();
rollback;
