-- NDE dashboard aggregates stay in PostgreSQL so the browser never has to load every result or
-- obligation in a large project. Each function repeats both capability and PDS-scope checks,
-- because SECURITY DEFINER bypasses the source tables' RLS policies.

create index if not exists nde_results_project_examined_on_outcome_idx
  on public.nde_results (project_id, examined_on, outcome);

create index if not exists nde_obligations_project_method_disposition_idx
  on public.nde_obligations (project_id, method, disposition);

create function public.nde_outcome_trend(target_project_id uuid)
returns table (week_start date, accepted_count bigint, rejected_count bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(target_project_id, 'nde.view') then
    raise exception 'NDE view permission is required' using errcode = '42501';
  end if;

  return query
  with scoped_results as (
    select result.examined_on, result.outcome
    from public.nde_results result
    join public.nde_obligations obligation on obligation.id = result.obligation_id
    join public.spool_revisions spool_revision on spool_revision.id = obligation.spool_revision_id
    join public.isometric_revisions revision on revision.id = spool_revision.isometric_revision_id
    where result.project_id = target_project_id
      and obligation.project_id = target_project_id
      and public.current_user_in_pds_scope(target_project_id, revision.pds_area_id)
  ), bounds as (
    select
      min(date_trunc('week', examined_on)::date) as first_week,
      max(date_trunc('week', examined_on)::date) as last_week
    from scoped_results
  ), weeks as (
    select generate_series(first_week, last_week, interval '1 week')::date as week_start
    from bounds
    where first_week is not null
  )
  select
    weeks.week_start,
    count(result.examined_on) filter (where result.outcome = 'accepted'),
    count(result.examined_on) filter (where result.outcome = 'rejected')
  from weeks
  left join scoped_results result
    on date_trunc('week', result.examined_on)::date = weeks.week_start
  group by weeks.week_start
  order by weeks.week_start;
end;
$$;

create function public.nde_inspection_workflow_distribution(target_project_id uuid)
returns table (status text, status_order integer, obligation_count bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(target_project_id, 'nde.view') then
    raise exception 'NDE view permission is required' using errcode = '42501';
  end if;

  return query
  with statuses(status, status_order) as (
    values
      ('pending'::text, 0),
      ('allocated', 1),
      ('issued', 2),
      ('result_recorded', 3)
  ), visible_obligations as (
    select
      obligation.disposition,
      batch.id as batch_id,
      batch.status as batch_status,
      result.id as result_id
    from public.nde_obligations obligation
    join public.spool_revisions spool_revision on spool_revision.id = obligation.spool_revision_id
    join public.isometric_revisions revision on revision.id = spool_revision.isometric_revision_id
    left join public.nde_batch_items item on item.obligation_id = obligation.id
    left join public.nde_batches batch on batch.id = item.batch_id
    left join public.nde_results result on result.obligation_id = obligation.id
    where obligation.project_id = target_project_id
      and public.current_user_in_pds_scope(target_project_id, revision.pds_area_id)
  ), classified as (
    select case
      when result_id is not null then 'result_recorded'
      when disposition = 'issued' then 'issued'
      when batch_id is not null then 'allocated'
      when disposition = 'pending' then 'pending'
      else null
    end as status
    from visible_obligations
  ), counts as (
    select classified.status, count(*) as obligation_count
    from classified
    where classified.status is not null
    group by classified.status
  )
  select statuses.status, statuses.status_order, coalesce(counts.obligation_count, 0)
  from statuses
  left join counts using (status)
  order by statuses.status_order;
end;
$$;

create function public.nde_method_distribution(target_project_id uuid)
returns table (
  method text,
  pending_count bigint,
  allocated_count bigint,
  issued_count bigint,
  accepted_count bigint,
  rejected_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(target_project_id, 'nde.view') then
    raise exception 'NDE view permission is required' using errcode = '42501';
  end if;

  return query
  with visible_obligations as (
    select
      obligation.method::text as method,
      obligation.disposition,
      batch.id as batch_id,
      result.outcome
    from public.nde_obligations obligation
    join public.spool_revisions spool_revision on spool_revision.id = obligation.spool_revision_id
    join public.isometric_revisions revision on revision.id = spool_revision.isometric_revision_id
    left join public.nde_batch_items item on item.obligation_id = obligation.id
    left join public.nde_batches batch on batch.id = item.batch_id
    left join public.nde_results result on result.obligation_id = obligation.id
    where obligation.project_id = target_project_id
      and public.current_user_in_pds_scope(target_project_id, revision.pds_area_id)
  )
  select
    visible_obligations.method,
    count(*) filter (where visible_obligations.outcome is null and visible_obligations.disposition = 'pending' and visible_obligations.batch_id is null),
    count(*) filter (where visible_obligations.outcome is null and visible_obligations.batch_id is not null and visible_obligations.disposition <> 'issued'),
    count(*) filter (where visible_obligations.outcome is null and visible_obligations.disposition = 'issued'),
    count(*) filter (where visible_obligations.outcome = 'accepted'),
    count(*) filter (where visible_obligations.outcome = 'rejected')
  from visible_obligations
  group by visible_obligations.method
  order by visible_obligations.method;
end;
$$;

revoke all on function public.nde_outcome_trend(uuid) from public, anon;
revoke all on function public.nde_inspection_workflow_distribution(uuid) from public, anon;
revoke all on function public.nde_method_distribution(uuid) from public, anon;
grant execute on function public.nde_outcome_trend(uuid) to authenticated;
grant execute on function public.nde_inspection_workflow_distribution(uuid) to authenticated;
grant execute on function public.nde_method_distribution(uuid) to authenticated;
