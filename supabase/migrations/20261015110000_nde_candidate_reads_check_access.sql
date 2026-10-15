-- The two NDE candidate reads answer only a member who works with NDE in that project.
--
-- nde_batch_candidates and eligible_tracer_candidates are SECURITY DEFINER reads from before
-- rule 2 (109_no_definer_reads keeps them on its list). Neither checked access: anyone signed in
-- who knew the UUID of a batch or obligation got weld numbers and dates of another project
-- (F01 in docs/audits/2026-10-14-project-design-and-roadmap.md). Each now refuses a caller
-- without an NDE capability in the row's project. Commands that call them internally run for a
-- user who already holds one; a call with no user (service role) is unchanged.
--
-- Both functions are the live definitions (20260809090000) with only the marked check added.

create or replace function public.nde_batch_candidates(
  target_batch_id uuid
)
returns table (
  candidate_obligation_id uuid,
  candidate_weld_number text,
  candidate_welded_on date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  batch_row public.nde_batches;
begin
  select * into batch_row from public.nde_batches where id = target_batch_id;
  if batch_row.id is null then
    raise exception 'The NDE batch was not found' using errcode = 'PQC41';
  end if;
  -- Added: only an NDE member of the batch's project reads its candidates.
  if auth.uid() is not null and not (
    public.current_user_has_capability(batch_row.project_id, 'nde.view')
    or public.current_user_has_capability(batch_row.project_id, 'nde.batch.manage')
    or public.current_user_has_capability(batch_row.project_id, 'nde.result.record')
  ) then
    raise exception 'NDE is outside your project access' using errcode = '42501';
  end if;

  return query
  select
    o.id,
    wj.weld_number,
    progress.weld_on
  from public.nde_obligations o
  join public.weld_joint_revisions wjr on wjr.id = o.weld_joint_revision_id
  join public.weld_joints wj on wj.id = wjr.weld_joint_id
  join public.spool_revisions sr on sr.id = o.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
  where o.project_id = batch_row.project_id
    and o.method = batch_row.method
    and o.coverage_regime = batch_row.coverage_regime
    and o.disposition = 'pending'
    and not wjr.is_removed
    and rev.status = 'accepted'
    and not exists (select 1 from public.nde_batch_items bi where bi.obligation_id = o.id)
    and (
      batch_row.responsible_welder_qualification_id is null
      or public.is_welder_on_joint(wjr.id, batch_row.responsible_welder_qualification_id)
    )
  order by progress.weld_on asc nulls last, wj.weld_number asc;
end;
$$;

create or replace function public.eligible_tracer_candidates(
  target_obligation_id uuid
)
returns table (
  weld_joint_revision_id uuid,
  weld_number text,
  spool_number text,
  weld_on date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  parent_ob public.nde_obligations;
begin
  select * into parent_ob from public.nde_obligations where id = target_obligation_id;
  if parent_ob.id is null then
    raise exception 'The NDE obligation was not found' using errcode = 'PQC43';
  end if;
  -- Added: only an NDE member of the obligation's project reads its tracer candidates.
  if auth.uid() is not null and not (
    public.current_user_has_capability(parent_ob.project_id, 'nde.view')
    or public.current_user_has_capability(parent_ob.project_id, 'nde.batch.manage')
    or public.current_user_has_capability(parent_ob.project_id, 'nde.result.record')
  ) then
    raise exception 'NDE is outside your project access' using errcode = '42501';
  end if;

  return query
  select
    wjr.id as weld_joint_revision_id,
    wj.weld_number,
    s.spool_number,
    progress.weld_on
  from public.weld_joint_revisions wjr
  join public.weld_joints wj on wj.id = wjr.weld_joint_id
  join public.spool_revisions sr on sr.id = wjr.spool_revision_id
  join public.spools s on s.id = sr.spool_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
  where iso.project_id = parent_ob.project_id
    and not wjr.is_removed
    and rev.status = 'accepted'
    and wjr.id <> parent_ob.weld_joint_revision_id
    and exists (
      select 1 from public.nde_obligations population
      where population.weld_joint_revision_id = wjr.id
        and population.method = parent_ob.method
        and population.coverage_regime = parent_ob.coverage_regime
    )
    and not exists (
      select 1 from public.nde_obligations o
      where o.weld_joint_revision_id = wjr.id and o.disposition = 'rejected'
    )
    and not exists (
      select 1 from public.nde_obligations o
      where o.weld_joint_revision_id = wjr.id and o.cycle_kind = 'tracer'
    )
    and (
      parent_ob.responsible_welder_qualification_id is null
      or public.is_welder_on_joint(wjr.id, parent_ob.responsible_welder_qualification_id)
    )
  order by progress.weld_on asc nulls last, wj.weld_number asc;
end;
$$;
