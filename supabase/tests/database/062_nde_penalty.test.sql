-- 062: NDE Penalty Escalation
begin;
select plan(9);

-- ─── Fixture setup ───────────────────────────────────────────────────────────
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000621', 'authenticated', 'authenticated', 'pen.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000622', 'authenticated', 'authenticated', 'pen.user@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000621';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000621', 'PEN-A', 'Penalty A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000621');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621',
        '10000000-0000-0000-0000-000000000622', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621', 'SUB-P', 'Fab Sub P');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000621', 'material_type', 'CS-062', 'Carbon steel')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621',
        '53000000-0000-0000-0000-000000000621', 'SC-P', 'Service class P');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621', 'CS-062', 'Carbon steel');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621', 'A1',
        '54000000-0000-0000-0000-000000000621');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621',
        '50000000-0000-0000-0000-000000000621', '53000000-0000-0000-0000-000000000621',
        'WPS-P', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621',
   '50000000-0000-0000-0000-000000000621', 'W-P1', 'Welder P1', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('57000000-0000-0000-0000-000000000621', '56000000-0000-0000-0000-000000000621');

insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621',
        '51000000-0000-0000-0000-000000000621', '52000000-0000-0000-0000-000000000621', 'shop',
        100, 10, false);

insert into public.project_rework_codes (id, project_id, code, description)
values ('59000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621', 'RW-P', 'Porosity');

-- 5 joints in the same population so we can hit 4 rejections
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621', 'ISO-P621');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000621', '30000000-0000-0000-0000-000000000621', 'SP-P621');

insert into public.weld_joints (id, project_id, weld_number)
select
  ('46000000-0000-0000-0000-00000000062' || n)::uuid,
  '30000000-0000-0000-0000-000000000621',
  'W-P621-0' || n
from generate_series(1, 5) as n;

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000621', '40000000-0000-0000-0000-000000000621', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000621', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000621', '41000000-0000-0000-0000-000000000621',
        '42000000-0000-0000-0000-000000000621', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
select
  ('47000000-0000-0000-0000-00000000062' || n)::uuid,
  ('46000000-0000-0000-0000-00000000062' || n)::uuid,
  '43000000-0000-0000-0000-000000000621',
  '52000000-0000-0000-0000-000000000621',
  'shop', 6, 8
from generate_series(1, 5) as n;

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
select
  ('48000000-0000-0000-0000-00000000062' || n)::uuid,
  ('47000000-0000-0000-0000-00000000062' || n)::uuid,
  'root', 1
from generate_series(1, 5) as n;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000622', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000622","role":"authenticated"}', true);

-- Record weld progress on all 5 joints
do $$
declare
  wjr_id uuid;
  n int;
begin
  for n in 1..5 loop
    wjr_id := ('47000000-0000-0000-0000-00000000062' || n)::uuid;
    perform public.record_weld_progress(
      wjr_id,
      '50000000-0000-0000-0000-000000000621',
      '56000000-0000-0000-0000-000000000621',
      ('[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000621","completion_percent":100,"welded_on":"2026-08-0' || n::text || '"}]')::jsonb,
      ('{"weld_on":"2026-08-0' || n::text || '"}')::jsonb
    );
  end loop;
end;
$$;

-- Create batch and issue all 5 joints
select public.create_nde_batch(
  '30000000-0000-0000-0000-000000000621', 'rt'::public.ndt_method,
  'mandatory_100', '57000000-0000-0000-0000-000000000621',
  null, 'BATCH-PEN-1'
);
select public.allocate_nde_batch_candidates(id)
from public.nde_batches where batch_number = 'BATCH-PEN-1';
select public.issue_nde_batch(id)
from public.nde_batches where batch_number = 'BATCH-PEN-1';

-- Row 7: Three rejections → NDE100 NOT created
do $$
declare
  ob_id uuid;
  n int;
begin
  for n in 1..3 loop
    select id into ob_id from public.nde_obligations
    where coverage_regime = 'mandatory_100'
      and weld_joint_revision_id = ('47000000-0000-0000-0000-00000000062' || n)::uuid
      and cycle_kind = 'original';
    perform public.record_nde_result(
      ob_id, 'rejected', ('2026-08-0' || n::text)::date,
      'RPT-PEN-' || n, '59000000-0000-0000-0000-000000000621',
      '57000000-0000-0000-0000-000000000621'
    );
  end loop;
end;
$$;

select is(
  (select count(*)::int from public.nde_penalty_populations
   where project_id = '30000000-0000-0000-0000-000000000621'),
  0,
  'Row 7: Three rejections in that population → NDE100 NOT created'
);

-- Before the escalation the welder still owes five spot ut obligations, so the
-- "flipped to mandatory_100" assertion further down cannot pass vacuously.
select is(
  (select count(*)::int from public.nde_obligations o
   where o.project_id = '30000000-0000-0000-0000-000000000621'
     and o.coverage_regime = 'spot'
     and not exists (select 1 from public.nde_results r where r.obligation_id = o.id)),
  5,
  'before the escalation five spot obligations are outstanding'
);

-- Row 6: Fourth rejection in same population → NDE100 created
do $$
declare
  ob_id uuid;
begin
  select id into ob_id from public.nde_obligations
  where coverage_regime = 'mandatory_100'
    and weld_joint_revision_id = '47000000-0000-0000-0000-000000000624'
    and cycle_kind = 'original';
  perform public.record_nde_result(
    ob_id, 'rejected', date '2026-08-04',
    'RPT-PEN-4', '59000000-0000-0000-0000-000000000621',
    '57000000-0000-0000-0000-000000000621'
  );
end;
$$;

select is(
  (select count(*)::int from public.nde_penalty_populations
   where project_id = '30000000-0000-0000-0000-000000000621'),
  1,
  'Row 6: Four rejections in one (welder, category) population → NDE100 created'
);

-- NDE100 population snapshot is non-empty
select ok(
  (select count(*)::int from public.nde_penalty_population_members m
   join public.nde_penalty_populations p on p.id = m.penalty_population_id
   where p.project_id = '30000000-0000-0000-0000-000000000621') > 0,
  'NDE100 population snapshot contains members'
);

-- The escalation has to *do* something. Manual 19.10: every remaining weld of
-- that welder is selected at 100 %. The fixture's matrix rule is rt 100 / ut 10,
-- so before the escalation this welder owed five spot ut obligations.
select is(
  (select count(*)::int from public.nde_obligations o
   where o.project_id = '30000000-0000-0000-0000-000000000621'
     and o.coverage_regime = 'spot'
     and not exists (select 1 from public.nde_results r where r.obligation_id = o.id)),
  0,
  'the escalation flips every outstanding spot obligation of that welder to mandatory_100'
);

select is(
  (select escalation_reason from public.nde_batches where batch_number = 'BATCH-PEN-1'),
  'four_rejections',
  'the batch records why it escalated'
);

-- A second call to evaluate_nde_penalty does not create a duplicate
select lives_ok(
  $$select public.evaluate_nde_penalty(
      '30000000-0000-0000-0000-000000000621',
      '57000000-0000-0000-0000-000000000621',
      (select id from public.nde_batches where batch_number = 'BATCH-PEN-1')
    )$$,
  'evaluate_nde_penalty is idempotent (no duplicate population created)'
);

select is(
  (select count(*)::int from public.nde_penalty_populations
   where project_id = '30000000-0000-0000-0000-000000000621'),
  1,
  'Only one NDE100 population exists after repeated evaluation'
);

-- Row 5: Second-level tracer rejected → NDE100 escalation created
-- This is exercised by evaluate_nde_penalty being called from record_nde_result
-- We verify the T2 path via a separate project
select ok(
  (select count(*)::int from public.nde_penalty_populations
   where project_id = '30000000-0000-0000-0000-000000000621'
     and welder_qualification_id = '57000000-0000-0000-0000-000000000621') = 1,
  'Row 5/6: NDE100 population is tied to the correct welder'
);

select * from finish();
rollback;
