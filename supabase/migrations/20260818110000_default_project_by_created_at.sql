-- Default-project selection was sorting by activity_code alphabetically, so
-- SHOWCASE-1 (S < T) beat TRACK01-A/TRACK01-B for platform admins with no
-- stored preference yet. Surface project.created_at so the client can order
-- by creation order instead, matching the project's actual onboarding order.
drop function public.list_current_user_projects();

create function public.list_current_user_projects()
returns table (
  membership_id uuid,
  project_id uuid,
  activity_code text,
  title text,
  project_status public.project_reference_status,
  project_created_at timestamptz,
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
      project.created_at as project_created_at,
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
      project.created_at,
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
    available.project_created_at,
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
  order by available.project_created_at, available.activity_code, available.title, available.project_id;
$$;

revoke all on function public.list_current_user_projects() from public;
grant execute on function public.list_current_user_projects() to authenticated;
