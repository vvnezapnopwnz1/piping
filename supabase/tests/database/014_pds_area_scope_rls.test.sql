begin;
select plan(4);

-- A subcontractor member scoped to one PDS area must not read the other areas of
-- the project. The scope guard lives in the "capability read" policy, but any
-- second PERMISSIVE policy on the table is OR'ed with it and can widen the result.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000141', 'authenticated', 'authenticated', 'pds.owner@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000142', 'authenticated', 'authenticated', 'pds.scoped@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000141';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000141', 'PDS-A', 'PDS scope', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000141');

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000141', '30000000-0000-0000-0000-000000000141', 'SUB-PDS', 'Sub PDS');

-- Two areas: the member is scoped to A only.
insert into public.project_pds_areas (id, project_id, code, description)
values
  ('56000000-0000-0000-0000-000000000141', '30000000-0000-0000-0000-000000000141', 'AREA-A', 'Area A'),
  ('56000000-0000-0000-0000-000000000142', '30000000-0000-0000-0000-000000000141', 'AREA-B', 'Area B');

-- Subcontractor access role: the only role for which the PDS scope check bites.
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000141', '30000000-0000-0000-0000-000000000141',
        '10000000-0000-0000-0000-000000000142', 'system_admin', 'subcontractor', true);

insert into public.membership_subcontractor_scopes (membership_id, subcontractor_id)
values ('20000000-0000-0000-0000-000000000141', '50000000-0000-0000-0000-000000000141');

insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
values ('20000000-0000-0000-0000-000000000141', '56000000-0000-0000-0000-000000000141');

-- subcontractor does not bypass the functional gate, so tracking.view is granted
-- through an explicit functional role.
insert into public.project_membership_functional_roles (membership_id, role_code)
values ('20000000-0000-0000-0000-000000000141', 'tracking_operator');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000142', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select ok(
  public.current_user_has_capability('30000000-0000-0000-0000-000000000141', 'tracking.view'),
  'scoped subcontractor holds tracking.view through its functional role'
);

select ok(
  public.current_user_in_pds_scope('30000000-0000-0000-0000-000000000141', '56000000-0000-0000-0000-000000000141'),
  'scoped subcontractor is inside the scope of area A'
);

select ok(
  not public.current_user_in_pds_scope('30000000-0000-0000-0000-000000000141', '56000000-0000-0000-0000-000000000142'),
  'scoped subcontractor is outside the scope of area B'
);

-- The actual guarantee: RLS must not hand back the out-of-scope area.
select bag_eq(
  $$select code from public.project_pds_areas
    where project_id = '30000000-0000-0000-0000-000000000141'$$,
  $$values ('AREA-A')$$,
  'scoped subcontractor reads only the PDS area it is scoped to'
);

select * from finish();

rollback;
