create function public.current_user_has_capability(
  target_project_id uuid,
  requested_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    join public.capabilities capability
      on capability.code = requested_capability
    where p.id = target_project_id
      and (not capability.is_mutating or p.status = 'active')
      and (
        public.is_platform_admin()
        or exists (
          select 1
          from public.project_memberships membership
          join public.roles access_role
            on access_role.code = membership.access_role_code
           and access_role.kind = 'access'
           and access_role.is_active
          join public.role_capabilities access_grant
            on access_grant.role_code = access_role.code
           and access_grant.capability_code = capability.code
          where membership.project_id = target_project_id
            and membership.user_id = auth.uid()
            and membership.is_active
            and (
              not capability.requires_functional_role
              or access_role.bypasses_functional_gate
              or exists (
                select 1
                from public.project_membership_functional_roles assigned
                join public.roles functional_role
                  on functional_role.code = assigned.role_code
                 and functional_role.kind = 'functional'
                 and functional_role.is_active
                join public.role_capabilities functional_grant
                  on functional_grant.role_code = assigned.role_code
                 and functional_grant.capability_code = capability.code
                where assigned.membership_id = membership.id
              )
            )
        )
      )
  );
$$;

create or replace function public.can_administer_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_has_capability(
    target_project_id,
    'project_referential.manage'
  );
$$;

create function public.current_user_in_subcontractor_scope(
  target_project_id uuid,
  target_subcontractor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.project_memberships membership
      where membership.project_id = target_project_id
        and membership.user_id = auth.uid()
        and membership.is_active
        and (
          membership.access_role_code <> 'subcontractor'
          or (
            target_subcontractor_id is not null
            and exists (
              select 1
              from public.membership_subcontractor_scopes scope
              where scope.membership_id = membership.id
                and scope.subcontractor_id = target_subcontractor_id
            )
          )
        )
    );
$$;

create function public.current_user_in_pds_scope(
  target_project_id uuid,
  target_pds_area_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.project_memberships membership
      where membership.project_id = target_project_id
        and membership.user_id = auth.uid()
        and membership.is_active
        and (
          membership.access_role_code <> 'subcontractor'
          or (
            target_pds_area_id is not null
            and exists (
              select 1
              from public.membership_pds_area_scopes scope
              where scope.membership_id = membership.id
                and scope.pds_area_id = target_pds_area_id
            )
          )
        )
    );
$$;

create function public.list_current_user_projects()
returns table (
  membership_id uuid,
  project_id uuid,
  activity_code text,
  title text,
  project_status public.project_reference_status,
  access_role_code text,
  functional_role_codes text[],
  capability_codes text[],
  subcontractor_ids uuid[],
  pds_area_ids uuid[],
  is_platform_admin boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with caller as (
    select public.is_platform_admin() as platform_admin
  ),
  available as (
    select
      null::uuid as membership_id,
      project.id as project_id,
      project.activity_code,
      project.title,
      project.status as project_status,
      null::text as access_role_code,
      caller.platform_admin
    from public.projects project
    cross join caller
    where caller.platform_admin
      and project.status = 'active'

    union all

    select
      membership.id,
      project.id,
      project.activity_code,
      project.title,
      project.status,
      membership.access_role_code,
      caller.platform_admin
    from public.project_memberships membership
    join public.projects project on project.id = membership.project_id
    cross join caller
    where not caller.platform_admin
      and membership.user_id = auth.uid()
      and membership.is_active
      and project.status = 'active'
  )
  select
    available.membership_id,
    available.project_id,
    available.activity_code,
    available.title,
    available.project_status,
    available.access_role_code,
    case
      when available.membership_id is null then array[]::text[]
      else coalesce(
        (
          select array_agg(assigned.role_code order by assigned.role_code)
          from public.project_membership_functional_roles assigned
          where assigned.membership_id = available.membership_id
        ),
        array[]::text[]
      )
    end as functional_role_codes,
    coalesce(
      (
        select array_agg(capability.code order by capability.code)
        from public.capabilities capability
        where public.current_user_has_capability(
          available.project_id,
          capability.code
        )
      ),
      array[]::text[]
    ) as capability_codes,
    case
      when available.membership_id is null then array[]::uuid[]
      else coalesce(
        (
          select array_agg(scope.subcontractor_id order by scope.subcontractor_id)
          from public.membership_subcontractor_scopes scope
          where scope.membership_id = available.membership_id
        ),
        array[]::uuid[]
      )
    end as subcontractor_ids,
    case
      when available.membership_id is null then array[]::uuid[]
      else coalesce(
        (
          select array_agg(scope.pds_area_id order by scope.pds_area_id)
          from public.membership_pds_area_scopes scope
          where scope.membership_id = available.membership_id
        ),
        array[]::uuid[]
      )
    end as pds_area_ids,
    available.platform_admin as is_platform_admin
  from available
  order by available.activity_code, available.title, available.project_id;
$$;

revoke all on function public.current_user_has_capability(uuid, text) from public;
revoke all on function public.current_user_in_subcontractor_scope(uuid, uuid) from public;
revoke all on function public.current_user_in_pds_scope(uuid, uuid) from public;
revoke all on function public.list_current_user_projects() from public;

grant execute on function public.current_user_has_capability(uuid, text) to authenticated;
grant execute on function public.current_user_in_subcontractor_scope(uuid, uuid) to authenticated;
grant execute on function public.current_user_in_pds_scope(uuid, uuid) to authenticated;
grant execute on function public.list_current_user_projects() to authenticated;

drop policy "project admins update projects" on public.projects;
create policy "project definition managers update projects" on public.projects
  for update to authenticated
  using (public.current_user_has_capability(id, 'project.definition.manage'))
  with check (public.current_user_has_capability(id, 'project.definition.manage'));

drop policy "project admins manage memberships" on public.project_memberships;
create policy "access managers manage memberships" on public.project_memberships
  for all to authenticated
  using (public.current_user_has_capability(project_id, 'access_rights.manage'))
  with check (public.current_user_has_capability(project_id, 'access_rights.manage'));

alter table public.project_membership_functional_roles enable row level security;

create policy "members read own functional roles" on public.project_membership_functional_roles
  for select to authenticated
  using (
    exists (
      select 1
      from public.project_memberships membership
      where membership.id = membership_id
        and membership.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_memberships membership
      where membership.id = membership_id
        and public.current_user_has_capability(
          membership.project_id,
          'access_rights.manage'
        )
    )
  );

drop policy "project admins read subcontractor scopes" on public.membership_subcontractor_scopes;
drop policy "project admins manage subcontractor scopes" on public.membership_subcontractor_scopes;
drop policy "project admins read PDS area scopes" on public.membership_pds_area_scopes;
drop policy "project admins manage PDS area scopes" on public.membership_pds_area_scopes;

create policy "members read own subcontractor scopes" on public.membership_subcontractor_scopes
  for select to authenticated
  using (
    exists (
      select 1
      from public.project_memberships membership
      where membership.id = membership_id
        and (
          membership.user_id = auth.uid()
          or public.current_user_has_capability(
            membership.project_id,
            'access_rights.manage'
          )
        )
    )
  );

create policy "members read own PDS area scopes" on public.membership_pds_area_scopes
  for select to authenticated
  using (
    exists (
      select 1
      from public.project_memberships membership
      where membership.id = membership_id
        and (
          membership.user_id = auth.uid()
          or public.current_user_has_capability(
            membership.project_id,
            'access_rights.manage'
          )
        )
    )
  );

drop policy "project_subcontractors_members_read" on public.project_subcontractors;
create policy "project subcontractors respect scope" on public.project_subcontractors
  for select to authenticated
  using (public.current_user_in_subcontractor_scope(project_id, id));

drop policy "project_pds_areas_members_read" on public.project_pds_areas;
create policy "project PDS areas respect scope" on public.project_pds_areas
  for select to authenticated
  using (public.current_user_in_pds_scope(project_id, id));

drop policy "project_welding_procedures_members_read" on public.project_welding_procedures;
create policy "project WPS respect subcontractor scope" on public.project_welding_procedures
  for select to authenticated
  using (public.current_user_in_subcontractor_scope(project_id, subcontractor_id));

drop policy "welder_qualifications_members_read" on public.welder_qualifications;
create policy "welder qualifications respect subcontractor scope" on public.welder_qualifications
  for select to authenticated
  using (public.current_user_in_subcontractor_scope(project_id, subcontractor_id));

grant select on public.project_membership_functional_roles,
  public.membership_subcontractor_scopes,
  public.membership_pds_area_scopes,
  public.project_pds_areas to authenticated;
