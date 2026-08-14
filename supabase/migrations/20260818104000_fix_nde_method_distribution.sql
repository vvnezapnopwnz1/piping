-- Correct the PL/pgSQL output-column name collision in the first NDE chart migration.
create or replace function public.nde_method_distribution(target_project_id uuid)
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
