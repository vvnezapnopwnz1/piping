begin;

select plan(11);

select ok(has_table_privilege('service_role', 'public.profiles', 'UPDATE'), 'service role can promote local fixture profiles');
select ok(has_table_privilege('service_role', 'public.projects', 'INSERT'), 'service role can create local fixture projects');
select ok(has_table_privilege('service_role', 'public.project_memberships', 'INSERT'), 'service role can create fixture memberships');
select ok(has_table_privilege('service_role', 'public.project_membership_functional_roles', 'INSERT'), 'service role can assign fixture functional roles');
select ok(has_table_privilege('service_role', 'public.project_subcontractors', 'INSERT'), 'service role can create fixture subcontractors');
select ok(has_table_privilege('service_role', 'public.project_pds_areas', 'INSERT'), 'service role can create fixture PDS areas');
select ok(has_table_privilege('service_role', 'public.membership_subcontractor_scopes', 'INSERT'), 'service role can assign subcontractor scope');
select ok(has_table_privilege('service_role', 'public.membership_pds_area_scopes', 'INSERT'), 'service role can assign PDS scope');
select ok(has_table_privilege('service_role', 'public.roles', 'SELECT'), 'service role can read roles for membership validation triggers');
select ok(has_table_privilege('service_role', 'public.project_thickness_flange_rules', 'INSERT'), 'service role can create Track 04 thickness fixtures');
select ok(has_table_privilege('service_role', 'public.nde_matrix_rules', 'INSERT'), 'service role can create Track 04 NDE fixtures');

select * from finish();

rollback;
