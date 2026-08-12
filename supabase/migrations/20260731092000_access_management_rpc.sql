create function public.compatibility_membership_role(
  requested_access_role text,
  requested_functional_roles text[]
)
returns public.app_role
language sql
immutable
set search_path = public, pg_temp
as $$
  select case requested_access_role
    when 'project_admin' then 'system_admin'::public.app_role
    when 'site_admin' then 'system_admin'::public.app_role
    when 'project_reader' then 'project_manager'::public.app_role
    when 'subcontractor' then 'subcontractor'::public.app_role
    when 'project_editor' then coalesce(
      (
        select role_code::public.app_role
        from unnest(coalesce(requested_functional_roles, array[]::text[])) role_code
        where role_code in ('qc_engineer', 'nde_inspector', 'spooling_team', 'project_manager')
        order by array_position(array['qc_engineer', 'nde_inspector', 'spooling_team', 'project_manager'], role_code)
        limit 1
      ),
      'qc_engineer'::public.app_role
    )
  end;
$$;

create function public.assert_access_request_is_valid(
  target_project_id uuid,
  requested_access_role text,
  requested_functional_roles text[],
  requested_subcontractor_ids uuid[],
  requested_pds_area_ids uuid[]
)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  functional_roles text[] := array(select distinct value from unnest(coalesce(requested_functional_roles, array[]::text[])) value order by value);
  subcontractor_ids uuid[] := array(select distinct value from unnest(coalesce(requested_subcontractor_ids, array[]::uuid[])) value order by value);
  pds_area_ids uuid[] := array(select distinct value from unnest(coalesce(requested_pds_area_ids, array[]::uuid[])) value order by value);
begin
  if not exists (
    select 1 from public.roles
    where code = requested_access_role and kind = 'access' and is_active
  ) then
    raise exception 'Requested access role is invalid' using errcode = 'PQC02';
  end if;

  if exists (
    select 1 from unnest(functional_roles) value
    where not exists (
      select 1 from public.roles
      where code = value and kind = 'functional' and is_active
    )
  ) then
    raise exception 'Requested functional role is invalid' using errcode = 'PQC02';
  end if;

  if exists (
    select 1 from unnest(subcontractor_ids) scope_id
    where not exists (
      select 1 from public.project_subcontractors subcontractor
      where subcontractor.project_id = target_project_id and subcontractor.id = scope_id
    )
  ) or exists (
    select 1 from unnest(pds_area_ids) scope_id
    where not exists (
      select 1 from public.project_pds_areas pds_area
      where pds_area.project_id = target_project_id and pds_area.id = scope_id
    )
  ) then
    raise exception 'Scope ID belongs to another project or does not exist' using errcode = 'PQC04';
  end if;

  if requested_access_role = 'subcontractor'
    and (cardinality(functional_roles) = 0 or cardinality(subcontractor_ids) = 0 or cardinality(pds_area_ids) = 0)
  then
    raise exception 'Subcontractor requires functional role and both scopes' using errcode = 'PQC03';
  end if;
end;
$$;

create function public.membership_access_state(target_membership_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'membership_id', membership.id,
    'user_id', membership.user_id,
    'is_active', membership.is_active,
    'access_role_code', membership.access_role_code,
    'functional_role_codes', coalesce((select jsonb_agg(role_code order by role_code) from public.project_membership_functional_roles where membership_id = membership.id), '[]'::jsonb),
    'subcontractor_ids', coalesce((select jsonb_agg(subcontractor_id order by subcontractor_id) from public.membership_subcontractor_scopes where membership_id = membership.id), '[]'::jsonb),
    'pds_area_ids', coalesce((select jsonb_agg(pds_area_id order by pds_area_id) from public.membership_pds_area_scopes where membership_id = membership.id), '[]'::jsonb)
  )
  from public.project_memberships membership
  where membership.id = target_membership_id;
$$;

create function public.get_project_access_matrix(target_project_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  email text,
  is_active boolean,
  access_role_code text,
  functional_role_codes text[],
  subcontractor_ids uuid[],
  pds_area_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(target_project_id, 'access_rights.manage') then
    raise exception 'Access rights management is required' using errcode = '42501';
  end if;
  return query
  select
    membership.id,
    membership.user_id,
    profile.full_name,
    profile.email,
    membership.is_active,
    membership.access_role_code,
    coalesce(
      (
        select array_agg(assigned.role_code order by assigned.role_code)
        from public.project_membership_functional_roles assigned
        where assigned.membership_id = membership.id
      ),
      array[]::text[]
    ),
    coalesce(
      (
        select array_agg(scope.subcontractor_id order by scope.subcontractor_id)
        from public.membership_subcontractor_scopes scope
        where scope.membership_id = membership.id
      ),
      array[]::uuid[]
    ),
    coalesce(
      (
        select array_agg(scope.pds_area_id order by scope.pds_area_id)
        from public.membership_pds_area_scopes scope
        where scope.membership_id = membership.id
      ),
      array[]::uuid[]
    )
  from public.project_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.project_id = target_project_id
  order by profile.email nulls last, membership.id;
end;
$$;

create function public.add_project_member_by_email(
  target_project_id uuid,
  target_email text,
  requested_access_role text,
  requested_functional_roles text[],
  requested_subcontractor_ids uuid[],
  requested_pds_area_ids uuid[]
)
returns setof public.project_memberships
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
  target_user_ids uuid[];
  created_membership public.project_memberships;
  functional_roles text[] := array(select distinct value from unnest(coalesce(requested_functional_roles, array[]::text[])) value order by value);
  subcontractor_ids uuid[] := array(select distinct value from unnest(coalesce(requested_subcontractor_ids, array[]::uuid[])) value order by value);
  pds_area_ids uuid[] := array(select distinct value from unnest(coalesce(requested_pds_area_ids, array[]::uuid[])) value order by value);
begin
  if not public.current_user_has_capability(target_project_id, 'access_rights.manage') then
    raise exception 'Access rights management is required' using errcode = '42501';
  end if;
  select array_agg(profile.id order by profile.id) into target_user_ids
  from public.profiles profile
  where lower(profile.email) = lower(trim(target_email));
  if coalesce(cardinality(target_user_ids), 0) <> 1 then
    raise exception 'Profile email was not found or is ambiguous' using errcode = 'PQC01';
  end if;
  target_user_id := target_user_ids[1];
  if exists (select 1 from public.project_memberships where project_id = target_project_id and user_id = target_user_id) then
    raise exception 'Profile is already a project member' using errcode = '23505';
  end if;
  perform public.assert_access_request_is_valid(target_project_id, requested_access_role, functional_roles, subcontractor_ids, pds_area_ids);
  insert into public.project_memberships (project_id, user_id, role, access_role_code)
  values (target_project_id, target_user_id, public.compatibility_membership_role(requested_access_role, functional_roles), requested_access_role)
  returning * into created_membership;
  insert into public.project_membership_functional_roles (membership_id, role_code)
  select created_membership.id, value from unnest(functional_roles) value;
  if requested_access_role = 'subcontractor' then
    insert into public.membership_subcontractor_scopes (membership_id, subcontractor_id)
    select created_membership.id, value from unnest(subcontractor_ids) value;
    insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
    select created_membership.id, value from unnest(pds_area_ids) value;
  end if;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (target_project_id, auth.uid(), 'project_membership', created_membership.id, 'membership.created', null, public.membership_access_state(created_membership.id));
  return next created_membership;
end;
$$;

create function public.update_project_member_access(
  target_membership_id uuid,
  requested_access_role text,
  requested_functional_roles text[],
  requested_subcontractor_ids uuid[],
  requested_pds_area_ids uuid[]
)
returns setof public.project_memberships
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_membership public.project_memberships;
  before_state jsonb;
  functional_roles text[] := array(select distinct value from unnest(coalesce(requested_functional_roles, array[]::text[])) value order by value);
  subcontractor_ids uuid[] := array(select distinct value from unnest(coalesce(requested_subcontractor_ids, array[]::uuid[])) value order by value);
  pds_area_ids uuid[] := array(select distinct value from unnest(coalesce(requested_pds_area_ids, array[]::uuid[])) value order by value);
begin
  select * into target_membership from public.project_memberships where id = target_membership_id for update;
  if target_membership.id is null or not public.current_user_has_capability(target_membership.project_id, 'access_rights.manage') then raise exception 'Access rights management is required' using errcode = '42501'; end if;
  if target_membership.user_id = auth.uid() and not public.is_platform_admin() then raise exception 'Non-platform users cannot modify their own membership' using errcode = '42501'; end if;
  perform public.assert_access_request_is_valid(target_membership.project_id, requested_access_role, functional_roles, subcontractor_ids, pds_area_ids);
  before_state := public.membership_access_state(target_membership.id);
  delete from public.project_membership_functional_roles where membership_id = target_membership.id;
  delete from public.membership_subcontractor_scopes where membership_id = target_membership.id;
  delete from public.membership_pds_area_scopes where membership_id = target_membership.id;
  update public.project_memberships set role = public.compatibility_membership_role(requested_access_role, functional_roles), access_role_code = requested_access_role where id = target_membership.id returning * into target_membership;
  insert into public.project_membership_functional_roles (membership_id, role_code) select target_membership.id, value from unnest(functional_roles) value;
  if requested_access_role = 'subcontractor' then
    insert into public.membership_subcontractor_scopes (membership_id, subcontractor_id) select target_membership.id, value from unnest(subcontractor_ids) value;
    insert into public.membership_pds_area_scopes (membership_id, pds_area_id) select target_membership.id, value from unnest(pds_area_ids) value;
  end if;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (target_membership.project_id, auth.uid(), 'project_membership', target_membership.id, 'membership.access_updated', before_state, public.membership_access_state(target_membership.id));
  return next target_membership;
end;
$$;

create function public.set_project_member_active(target_membership_id uuid, requested_active boolean)
returns setof public.project_memberships
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_membership public.project_memberships; before_state jsonb;
begin
  select * into target_membership from public.project_memberships where id = target_membership_id for update;
  if target_membership.id is null or not public.current_user_has_capability(target_membership.project_id, 'access_rights.manage') then raise exception 'Access rights management is required' using errcode = '42501'; end if;
  if target_membership.user_id = auth.uid() and not public.is_platform_admin() then raise exception 'Non-platform users cannot modify their own membership' using errcode = '42501'; end if;
  if target_membership.is_active and not requested_active and target_membership.access_role_code = 'project_admin' and not public.is_platform_admin() and (select count(*) from public.project_memberships where project_id = target_membership.project_id and is_active and access_role_code = 'project_admin') <= 1 then raise exception 'Cannot deactivate the last active Project Admin' using errcode = 'PQC05'; end if;
  before_state := public.membership_access_state(target_membership.id);
  update public.project_memberships set is_active = requested_active where id = target_membership.id returning * into target_membership;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (target_membership.project_id, auth.uid(), 'project_membership', target_membership.id, case when requested_active then 'membership.activated' else 'membership.deactivated' end, before_state, public.membership_access_state(target_membership.id));
  return next target_membership;
end;
$$;

revoke insert, update, delete on public.project_memberships, public.project_membership_functional_roles, public.membership_subcontractor_scopes, public.membership_pds_area_scopes from authenticated;
revoke all on function public.compatibility_membership_role(text, text[]), public.assert_access_request_is_valid(uuid, text, text[], uuid[], uuid[]), public.membership_access_state(uuid) from public, anon, authenticated;
revoke all on function public.get_project_access_matrix(uuid), public.add_project_member_by_email(uuid, text, text, text[], uuid[], uuid[]), public.update_project_member_access(uuid, text, text[], uuid[], uuid[]), public.set_project_member_active(uuid, boolean) from public, anon;
grant execute on function public.get_project_access_matrix(uuid), public.add_project_member_by_email(uuid, text, text, text[], uuid[], uuid[]), public.update_project_member_access(uuid, text, text[], uuid[], uuid[]), public.set_project_member_active(uuid, boolean) to authenticated;
