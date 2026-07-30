create type public.role_kind as enum ('access', 'functional');

create table public.roles (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (length(trim(label)) > 0),
  kind public.role_kind not null,
  bypasses_functional_gate boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.capabilities (
  code text primary key check (code ~ '^[a-z][a-z0-9_.]*$'),
  description text not null check (length(trim(description)) > 0),
  is_mutating boolean not null,
  requires_functional_role boolean not null
);

create table public.role_capabilities (
  role_code text not null references public.roles(code) on delete restrict,
  capability_code text not null references public.capabilities(code) on delete restrict,
  primary key (role_code, capability_code)
);

alter table public.project_memberships
  add column access_role_code text references public.roles(code) on delete restrict;

create table public.project_membership_functional_roles (
  membership_id uuid not null
    references public.project_memberships(id) on delete cascade,
  role_code text not null references public.roles(code) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (membership_id, role_code)
);

insert into public.roles (code, label, kind, bypasses_functional_gate)
values
  ('project_admin', 'Project Admin', 'access', true),
  ('site_admin', 'Site Admin', 'access', true),
  ('project_editor', 'Project Editor', 'access', false),
  ('subcontractor', 'Subcontractor', 'access', false),
  ('project_reader', 'Project Reader', 'access', true),
  ('project_manager', 'Project Manager', 'functional', false),
  ('qc_engineer', 'QC Engineer', 'functional', false),
  ('nde_inspector', 'NDE Inspector', 'functional', false),
  ('spooling_team', 'Spooling Team', 'functional', false),
  ('fabrication_contributor', 'Fabrication Contributor', 'functional', false),
  ('erection_contributor', 'Erection Contributor', 'functional', false),
  ('tracking_operator', 'Tracking Operator', 'functional', false);

insert into public.capabilities (
  code,
  description,
  is_mutating,
  requires_functional_role
)
values
  ('project.view', 'View an authorized project', false, false),
  ('project.definition.manage', 'Manage Project Definition', true, false),
  ('system_referential.view', 'View global system referentials', false, false),
  ('system_referential.manage', 'Manage global system referentials', true, false),
  ('project_referential.view', 'View project referentials', false, false),
  ('project_referential.manage', 'Manage project referentials', true, false),
  ('access_rights.manage', 'Manage project membership, roles and scope', true, false),
  ('spooling.view', 'View spooling workflow', false, true),
  ('spooling.manage', 'Mutate spooling workflow', true, true),
  ('fabrication.view', 'View fabrication workflow', false, true),
  ('fabrication.progress.record', 'Record fabrication progress', true, true),
  ('fabrication.qc.release', 'Sign fabrication QC release', true, true),
  ('nde.view', 'View NDE workflow', false, true),
  ('nde.batch.manage', 'Create and manage NDE batches', true, true),
  ('nde.result.record', 'Record NDE results', true, true),
  ('erection.view', 'View erection workflow', false, true),
  ('erection.progress.record', 'Record erection progress', true, true),
  ('tracking.view', 'View spool tracking', false, true),
  ('tracking.event.record', 'Record spool tracking events', true, true),
  ('testpack.view', 'View test packs', false, true),
  ('testpack.manage', 'Manage test-pack workflow', true, true),
  ('flange.view', 'View flange workflow', false, true),
  ('flange.manage', 'Manage flange workflow', true, true),
  ('reports.view', 'View project reports', false, false),
  ('reports.export', 'Export project reports', false, false),
  ('settings.view', 'View personal settings and documentation', false, false);

insert into public.role_capabilities (role_code, capability_code)
select role_code, capability_code
from (
  select r.code as role_code, c.code as capability_code
  from public.roles r
  cross join public.capabilities c
  where r.code in ('project_admin', 'site_admin')
    and c.code <> 'system_referential.manage'

  union all

  select r.code, c.code
  from public.roles r
  cross join public.capabilities c
  where r.code in ('project_editor', 'subcontractor')
    and c.code not in (
      'project.definition.manage',
      'system_referential.manage',
      'project_referential.manage',
      'access_rights.manage'
    )

  union all

  select 'project_reader', c.code
  from public.capabilities c
  where c.is_mutating = false
) grants;

insert into public.role_capabilities (role_code, capability_code)
values
  ('project_manager', 'spooling.view'),
  ('project_manager', 'fabrication.view'),
  ('project_manager', 'nde.view'),
  ('project_manager', 'erection.view'),
  ('project_manager', 'tracking.view'),
  ('project_manager', 'testpack.view'),
  ('project_manager', 'flange.view'),
  ('qc_engineer', 'fabrication.view'),
  ('qc_engineer', 'fabrication.progress.record'),
  ('qc_engineer', 'fabrication.qc.release'),
  ('qc_engineer', 'nde.view'),
  ('qc_engineer', 'nde.batch.manage'),
  ('qc_engineer', 'erection.view'),
  ('qc_engineer', 'erection.progress.record'),
  ('qc_engineer', 'testpack.view'),
  ('qc_engineer', 'testpack.manage'),
  ('qc_engineer', 'flange.view'),
  ('qc_engineer', 'flange.manage'),
  ('nde_inspector', 'nde.view'),
  ('nde_inspector', 'nde.batch.manage'),
  ('nde_inspector', 'nde.result.record'),
  ('nde_inspector', 'testpack.view'),
  ('spooling_team', 'spooling.view'),
  ('spooling_team', 'spooling.manage'),
  ('fabrication_contributor', 'fabrication.view'),
  ('fabrication_contributor', 'fabrication.progress.record'),
  ('erection_contributor', 'erection.view'),
  ('erection_contributor', 'erection.progress.record'),
  ('tracking_operator', 'tracking.view'),
  ('tracking_operator', 'tracking.event.record');

create function public.legacy_access_role(legacy_role public.app_role)
returns text
language sql
immutable
set search_path = public
as $$
  select case legacy_role
    when 'system_admin' then 'project_admin'
    when 'project_manager' then 'project_reader'
    when 'qc_engineer' then 'project_editor'
    when 'nde_inspector' then 'project_editor'
    when 'spooling_team' then 'project_editor'
    when 'subcontractor' then 'subcontractor'
  end;
$$;

create function public.legacy_functional_role(legacy_role public.app_role)
returns text
language sql
immutable
set search_path = public
as $$
  select case legacy_role
    when 'project_manager' then 'project_manager'
    when 'qc_engineer' then 'qc_engineer'
    when 'nde_inspector' then 'nde_inspector'
    when 'spooling_team' then 'spooling_team'
    else null
  end;
$$;

create function public.assert_membership_access_role_kind()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actual_kind public.role_kind;
begin
  if new.access_role_code is null then
    return new;
  end if;

  select kind into actual_kind
  from public.roles
  where code = new.access_role_code;

  if actual_kind is distinct from 'access'::public.role_kind then
    raise exception 'Membership access role must be an access role'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.assert_membership_functional_role_kind()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actual_kind public.role_kind;
begin
  select kind into actual_kind
  from public.roles
  where code = new.role_code;

  if actual_kind is distinct from 'functional'::public.role_kind then
    raise exception 'Membership functional role must be a functional role'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger project_memberships_access_role_kind
  before insert or update of access_role_code on public.project_memberships
  for each row execute procedure public.assert_membership_access_role_kind();

create trigger project_membership_functional_roles_kind
  before insert or update of role_code on public.project_membership_functional_roles
  for each row execute procedure public.assert_membership_functional_role_kind();

update public.project_memberships
set access_role_code = public.legacy_access_role(role);

insert into public.project_membership_functional_roles (membership_id, role_code)
select id, public.legacy_functional_role(role)
from public.project_memberships
where public.legacy_functional_role(role) is not null;

alter table public.project_memberships
  alter column access_role_code set not null;

create or replace function public.add_creator_as_project_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_memberships (
    project_id,
    user_id,
    role,
    access_role_code
  )
  values (new.id, new.created_by, 'system_admin', 'project_admin');
  return new;
end;
$$;

create index project_memberships_access_role_idx
  on public.project_memberships (access_role_code)
  where is_active;

create index project_membership_functional_roles_role_idx
  on public.project_membership_functional_roles (role_code, membership_id);

revoke all on public.roles from anon, authenticated;
revoke all on public.capabilities from anon, authenticated;
revoke all on public.role_capabilities from anon, authenticated;
revoke all on public.project_membership_functional_roles from anon, authenticated;

grant select on public.roles, public.capabilities, public.role_capabilities
  to authenticated;
