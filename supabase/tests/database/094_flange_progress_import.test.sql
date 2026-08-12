begin;
select plan(8);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000941', 'authenticated', 'authenticated', 'flange.import@example.test', 'not-used', now(), now(), now()) on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000941', 'FLANGE-094', 'Flange import', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000941') on conflict (id) do nothing;
insert into public.project_memberships (project_id, user_id, role, access_role_code, is_active)
values ('30000000-0000-0000-0000-000000000941', '10000000-0000-0000-0000-000000000941', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code;
insert into public.project_pds_areas (id, project_id, code, description) values ('50000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'PDS-094', 'Area');
insert into public.isometrics (id, project_id, iso_number) values ('51000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'ISO-094');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id) values ('52000000-0000-0000-0000-000000000941', '51000000-0000-0000-0000-000000000941', 'R0', 1, 'accepted', '50000000-0000-0000-0000-000000000941');
insert into public.spools (id, project_id, spool_number) values ('53000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'SP-094');
insert into public.spool_revisions (id, spool_id, isometric_revision_id) values ('54000000-0000-0000-0000-000000000941', '53000000-0000-0000-0000-000000000941', '52000000-0000-0000-0000-000000000941');
insert into public.flange_joints (id, project_id, flange_number) values ('55000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'BT-094');
insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id, diameter_inch) values ('56000000-0000-0000-0000-000000000941', '55000000-0000-0000-0000-000000000941', '54000000-0000-0000-0000-000000000941', 6);
insert into public.system_reference_entries (id, kind, code, description) values ('57000000-0000-0000-0000-000000000941', 'torquing_requirement', 'TORQUE-094', 'Torque');
insert into public.project_joint_categories (id, project_id, joint_definition, timing, category_code, reason, coefficient) values ('59000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'Flange', 'before_pressure_test', 'X', 'Normal', 0.5);
insert into public.project_unit_time_references (id, project_id, activity, project_ut, standard_reference) values ('5a000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'FLANGE_JOINTING', 10, 'STD-094');
insert into public.project_teams (id, project_id, team_type, code, description) values ('5b000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'jointer', 'J-094', 'Jointer');

insert into public.import_jobs(id, project_id, kind, import_type, status, requested_by, source_file_name, source_media_type, source_size_bytes, source_checksum)
values ('5c000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'flange_progress', 'flange_progress', 'validated', '10000000-0000-0000-0000-000000000941', 'flange.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 100, 'sum-094');
insert into public.import_job_rows(job_id, row_number, raw_values, normalized_values, action)
values ('5c000000-0000-0000-0000-000000000941', 1, '{}'::jsonb, '{"iso_number":"ISO-094","revision":"R0","bt_number":"BT-094","jointing_method":"TORQUE-094","jointing_value":120,"joint_category":"X","reason":"Normal","joint_date":"2026-08-04","report_number":"R-094","jointer_codes":["J-094"],"tag_number":"TAG-094"}'::jsonb, 'create');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000941', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000941","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.apply_flange_progress_import_job('5c000000-0000-0000-0000-000000000941', false)$$, 'validated flange import applies atomically');
select is((select applied_row_count from public.import_jobs where id = '5c000000-0000-0000-0000-000000000941'), 1, 'applied row count is durable');
select is((select source_kind::text from public.flange_progress_records limit 1), 'import', 'import source metadata is retained');
select is((select source_import_job_id from public.flange_progress_records limit 1), '5c000000-0000-0000-0000-000000000941'::uuid, 'source import job is retained');
select lives_ok($$select public.apply_flange_progress_import_job('5c000000-0000-0000-0000-000000000941', false)$$, 'replaying an applied job is idempotent');
select is((select count(*)::int from public.flange_progress_records), 1, 'replay does not duplicate progress');

reset role;
select is((select count(*)::int from public.audit_events where action = 'apply_flange_progress_import_job'), 1, 'import audit event is durable');
select has_function('public', 'apply_flange_progress_import_job', array['uuid','boolean'], 'dedicated flange import RPC is published');
select * from finish();
rollback;
