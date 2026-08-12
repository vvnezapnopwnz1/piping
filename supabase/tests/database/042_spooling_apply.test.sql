begin;
select plan(40);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000421', 'authenticated', 'authenticated', 'spl.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000422', 'authenticated', 'authenticated', 'spl.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000423', 'authenticated', 'authenticated', 'spl.reader@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000421';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000421', 'SPL-A', 'Spooling A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000421');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', '10000000-0000-0000-0000-000000000422', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000422', '30000000-0000-0000-0000-000000000421', '10000000-0000-0000-0000-000000000423', 'qc_engineer', 'project_reader', true);

-- Referentials the validation resolves against
insert into public.project_pds_areas (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'PDS-A', 'Area A');

insert into public.system_reference_entries (id, kind, code, description)
values ('50100000-0000-0000-0000-000000000421', 'material_type', 'CS', 'Carbon Steel')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', '50100000-0000-0000-0000-000000000421', 'SC-A', 'Class A');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'BW', 'Butt weld');

insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000000421', '51000000-0000-0000-0000-000000000421', 6, 8.2, '150');

insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000000421', '51000000-0000-0000-0000-000000000421', '52000000-0000-0000-0000-000000000421', 'shop', 10);

-- Act as the Project Admin for the rest of the file
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000422', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000422","role":"authenticated"}', true);

-- R0 import ------------------------------------------------------------------

select lives_ok(
  $$select public.create_spooling_import_job('30000000-0000-0000-0000-000000000421', 'R0 load')$$,
  'a project admin can open a SpoolGen import job'
);

create temporary table spl_job as
select id from public.import_jobs
where project_id = '30000000-0000-0000-0000-000000000421'
order by created_at desc limit 1;

select throws_ok(
  format($$select public.record_spooling_validation(%L, '[]'::jsonb, '[]'::jsonb)$$,
         (select id from spl_job)),
  'PQC25',
  null,
  'validation is refused while weld.txt is missing'
);

select lives_ok(
  format($$select public.register_spooling_import_file(
      %L, 'weld', 'weld.txt', 'text/plain', 2048, 'sum-weld',
      '30000000-0000-0000-0000-000000000421/job/weld.txt')$$,
    (select id from spl_job)),
  'weld.txt can be registered'
);

select throws_ok(
  format($$select public.register_spooling_import_file(
      %L, 'trace', 'trace.txt', 'text/plain', 5000000, 'sum-trace', 'p/j/trace.txt')$$,
    (select id from spl_job)),
  '23514',
  null,
  'a file larger than 4 MB is refused'
);

select lives_ok(
  format($$select public.record_spooling_validation(%L, %L::jsonb, '[]'::jsonb)$$,
    (select id from spl_job),
    $json$[
      {"row_number":1,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R0",
         "pds_area":"PDS-A","service_class":"SC-A","line_number":"L-1","sheet_number":"1"}},
      {"row_number":2,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-A1",
         "sequence_number":"1","weight_kg":"100.5","material_class":"CS"}},
      {"row_number":3,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-A1",
         "weld_number":"W-A1","weld_type":"BW","weld_location":"shop",
         "service_class":"SC-A","diameter_inch":"6","thickness_mm":"8.2"}}
    ]$json$),
  'a clean R0 file set validates'
);

-- Dossier 14.2: a missing WPS is a warning, never a blocker.
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_job) and code = 'SRV_WPS_MISSING' and severity = 'warning'),
  1,
  'a missing covering WPS is recorded as a warning'
);
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_job) and severity = 'blocker'),
  0,
  'a clean file set produces no blockers even with no WPS'
);

-- A new ISO needs no decisions.
select is(
  (select unresolved_count from public.revalidate_spooling_import_job((select id from spl_job))),
  0,
  'a brand-new isometric requires no revision decisions'
);
select is(
  (select count(*)::int from public.preview_spooling_import((select id from spl_job))
   where change_type = 'new'),
   2,
  'the preview reports two new entities'
);

-- Preview writes nothing.
select is(
  (select count(*)::int from public.isometrics where project_id = '30000000-0000-0000-0000-000000000421'),
  0,
  'preview did not create any isometric'
);

select lives_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job)),
  'the R0 import applies'
);

select is(
  (select count(*)::int from public.isometric_revisions rev
   join public.isometrics iso on iso.id = rev.isometric_id
   where iso.iso_number = 'ISO-A' and rev.status = 'accepted'),
  1,
  'R0 is the accepted revision'
);
select is(
  (select count(*)::int from public.weld_points wp
   join public.weld_joint_revisions wjr on wjr.id = wp.weld_joint_revision_id),
  2,
  'the weld joint was seeded with a root and a cap point'
);

select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job)),
  'PQC10',
  null,
  'the same job cannot be applied twice'
);

-- R1 import ------------------------------------------------------------------

select lives_ok(
  $$select public.create_spooling_import_job('30000000-0000-0000-0000-000000000421', 'R1 load')$$,
  'a second SpoolGen job can be opened'
);

create temporary table spl_job2 as
select id from public.import_jobs
where project_id = '30000000-0000-0000-0000-000000000421'
  and status = 'draft'
order by created_at desc limit 1;

select lives_ok(
  format($$select public.register_spooling_import_file(
      %L, 'weld', 'weld.txt', 'text/plain', 2048, 'sum-weld-2', 'p/j2/weld.txt')$$,
    (select id from spl_job2)),
  'weld.txt can be registered on the second job'
);

select lives_ok(
  format($$select public.record_spooling_validation(%L, %L::jsonb, '[]'::jsonb)$$,
    (select id from spl_job2),
    $json$[
      {"row_number":1,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R1",
         "pds_area":"PDS-A","service_class":"SC-A","line_number":"L-1","sheet_number":"1"}},
      {"row_number":2,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-A1",
         "sequence_number":"1","weight_kg":"140.0","material_class":"CS"}},
      {"row_number":3,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-A1",
         "weld_number":"W-A1","weld_type":"BW","weld_location":"shop",
         "service_class":"SC-A","diameter_inch":"6","thickness_mm":"8.2"}}
    ]$json$),
  'the R1 file set validates'
);

select is(
  (select change_type::text from public.preview_spooling_import((select id from spl_job2))
   where entity_type = 'spool' and entity_key = 'SP-A1'),
  'revised',
  'the changed spool weight is reported as revised'
);

select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job2)),
  'PQC22',
  null,
  'a revised isometric cannot be applied while a spool decision is missing'
);

select lives_ok(
  format($$select public.record_revision_decision(
      %L, 'ISO-A', 'spool', 'SP-A1', 'rework', 'weld reworked')$$,
    (select id from spl_job2)),
  'a spool decision can be recorded'
);

select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job2)),
  'PQC22',
  null,
  'a rework spool still needs a weld decision'
);

select lives_ok(
  format($$select public.record_revision_decision(
      %L, 'ISO-A', 'weld_joint', 'W-A1', 'done_without_modification', null)$$,
    (select id from spl_job2)),
  'a weld decision can be recorded'
);

select lives_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job2)),
  'the R1 import applies once every decision exists'
);

select is(
  (select rev.revision_number from public.isometric_revisions rev
   join public.isometrics iso on iso.id = rev.isometric_id
   where iso.iso_number = 'ISO-A' and rev.status = 'accepted'),
  'R1',
  'R1 replaced R0 as the accepted revision'
);

-- A registered file is not itself an engineering definition. The server must
-- refuse an empty staging submission even when the caller has spooling.manage.
select lives_ok(
  $$select public.create_spooling_import_job('30000000-0000-0000-0000-000000000421', 'empty load')$$,
  'an empty SpoolGen job can be opened for validation feedback'
);

create temporary table spl_empty_job as
select id from public.import_jobs
where project_id = '30000000-0000-0000-0000-000000000421'
  and status = 'draft'
order by created_at desc limit 1;

select lives_ok(
  format($$select public.register_spooling_import_file(
      %L, 'weld', 'weld.txt', 'text/plain', 1, 'sum-empty', 'p/empty/weld.txt')$$,
    (select id from spl_empty_job)),
  'a file can be registered for the empty submission'
);

select lives_ok(
  format($$select public.record_spooling_validation(%L, '[]'::jsonb, '[]'::jsonb)$$,
    (select id from spl_empty_job)),
  'the empty submission is recorded so its server blocker is visible'
);

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_empty_job)
     and code = 'SRV_SPOOLING_SPINE_MISSING' and severity = 'blocker'),
  1,
  'an empty submission receives a server-derived engineering-spine blocker'
);

select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_empty_job)),
  'PQC26',
  null,
  'an empty submission cannot become an applied import'
);

-- Add support and flange history to the accepted R1 so removing its spool must
-- retain every child change item in the next revision.
reset role;

insert into public.supports (id, project_id, support_number)
values ('53000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'SU-A1');

insert into public.flange_joints (id, project_id, flange_number)
values ('54000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'FL-A1');

insert into public.support_revisions (support_id, spool_revision_id, support_type, quantity)
select '53000000-0000-0000-0000-000000000421', sr.id, 'shoe', 1
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.spools sp on sp.id = sr.spool_id
where rev.status = 'accepted' and sp.spool_number = 'SP-A1';

insert into public.flange_joint_revisions (
  flange_joint_id, spool_revision_id, flange_rating, diameter_inch, bolt_size, bolt_quantity, joint_type
)
select '54000000-0000-0000-0000-000000000421', sr.id, '150', 6, 'M16', 4, 'butt'
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.spools sp on sp.id = sr.spool_id
where rev.status = 'accepted' and sp.spool_number = 'SP-A1';

set local role authenticated;

select lives_ok(
  $$select public.create_spooling_import_job('30000000-0000-0000-0000-000000000421', 'R2 removal')$$,
  'a revision job can replace a removed spool with a new spool'
);

create temporary table spl_job3 as
select id from public.import_jobs
where project_id = '30000000-0000-0000-0000-000000000421'
  and status = 'draft'
order by created_at desc limit 1;

select lives_ok(
  format($$select public.register_spooling_import_file(
      %L, 'weld', 'weld.txt', 'text/plain', 2048, 'sum-weld-3', 'p/j3/weld.txt')$$,
    (select id from spl_job3)),
  'weld.txt can be registered for the removal revision'
);

select lives_ok(
  format($$select public.record_spooling_validation(%L, %L::jsonb, '[]'::jsonb)$$,
    (select id from spl_job3),
    $json$[
      {"row_number":1,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R2",
         "pds_area":"PDS-A","service_class":"SC-A","line_number":"L-1","sheet_number":"1"}},
      {"row_number":2,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-DUMMY",
         "sequence_number":"1","weight_kg":"80.0","material_class":"CS"}},
      {"row_number":3,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-DUMMY",
         "weld_number":"W-DUMMY","weld_type":"BW","weld_location":"shop",
         "service_class":"SC-A","diameter_inch":"6","thickness_mm":"8.2"}}
    ]$json$),
  'the removal revision validates'
);

select lives_ok(
  format($$select public.record_revision_decision(
      %L, 'ISO-A', 'spool', 'SP-A1', 'cancelled', 'removed from definition')$$,
    (select id from spl_job3)),
  'the removed spool can be cancelled'
);

select lives_ok(
  format($$select public.record_revision_decision(
      %L, 'ISO-A', 'spool', 'SP-DUMMY', 'not_done', 'new spool')$$,
    (select id from spl_job3)),
  'the new spool has its required revision decision'
);

select lives_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job3)),
  'the R2 removal import applies once every spool decision exists'
);

create temporary table spl_r2 as
select rev.id as revision_id, iso.id as isometric_id
from public.isometrics iso
join public.isometric_revisions rev on rev.isometric_id = iso.id
where iso.iso_number = 'ISO-A' and rev.status = 'accepted';

select is(
  (select count(*)::int from public.revision_change_items
   where isometric_revision_id = (select revision_id from spl_r2)
     and entity_type in ('support', 'flange_joint') and change_type = 'removed'),
  2,
  'removing a spool retains removed support and flange change items'
);

-- Manual revisions obey the same decision gate as imported revisions. The DO
-- block rolls back an unexpected success so later assertions remain isolated.
select throws_ok(
  format($$do $manual$
  begin
    perform public.create_manual_revision(%L, 'R3', null, '[]'::jsonb);
    raise exception 'manual revision unexpectedly succeeded' using errcode = 'PQC99';
  exception when sqlstate 'PQC22' then
    raise exception 'manual decisions are required' using errcode = 'PQC22';
  end
  $manual$;$$, (select isometric_id from spl_r2)),
  'PQC22',
  null,
  'a manual revision requires every spool decision'
);

select throws_ok(
  format($$do $manual$
  begin
    perform public.create_manual_revision(%L, 'R3', null,
      '[{"entity_type":"spool","entity_key":"SP-DUMMY","decision":"rework"}]'::jsonb);
    raise exception 'manual rework unexpectedly succeeded' using errcode = 'PQC99';
  exception when sqlstate 'PQC22' then
    raise exception 'manual weld decisions are required' using errcode = 'PQC22';
  end
  $manual$;$$, (select isometric_id from spl_r2)),
  'PQC22',
  null,
  'a reworked manual spool requires every weld decision'
);

select lives_ok(
  format($$select public.create_manual_revision(%L, 'R3', null,
    '[
      {"entity_type":"spool","entity_key":"SP-DUMMY","decision":"rework"},
      {"entity_type":"weld_joint","entity_key":"W-DUMMY","decision":"done_without_modification"}
    ]'::jsonb)$$, (select isometric_id from spl_r2)),
  'a manual revision applies after every required decision is present'
);

select is(
  (select revision_number from public.isometric_revisions
   where isometric_id = (select isometric_id from spl_r2) and status = 'accepted'),
  'R3',
  'the manual revision becomes the accepted revision'
);

select * from finish();
rollback;
