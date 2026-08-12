-- Gate D5, 2026-08-04: a rejected obligation blocked its spool forever.
--
-- The browser walk recorded a rejection on W-T4-001, let the cascade create R1,
-- and accepted R1. The joint was then sound, yet QC release still refused with
-- "1 NDE obligations are still outstanding" - the rejected original itself.
-- Nothing ever left the `rejected` disposition, and spool_fabrication_readiness
-- counts everything that is not satisfied, waived or superseded. So any spool
-- that ever saw one rejection could never be released again.
--
-- The plan's section 3.2 put `superseded` in the vocabulary for exactly this and
-- nothing wrote it. An accepted repair now supersedes the cycle it repaired, and
-- the whole ancestor chain with it: accepting R2 closes out R1 and the original.
--
-- The same walk exposed the other half: derive_repair_and_tracers created a
-- repair only for a rejected `original`, so a rejected tracer had no way to be
-- made good and blocked its own spool permanently. Manual 19.8 is not restricted
-- to originals - "для rejected examined joint ... автоматически создаётся
-- repaired joint с suffix R1" - so a rejected tracer now earns its repair too.
-- It does not spawn further tracers: a rejected second-level tracer escalates
-- through evaluate_nde_penalty instead.

create or replace function public.supersede_repaired_ancestors(
  satisfied_obligation_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cursor_id uuid;
  parent_id uuid;
  superseded_count integer := 0;
begin
  select parent_obligation_id into cursor_id
  from public.nde_obligations
  where id = satisfied_obligation_id and cycle_kind = 'repair';

  -- Walk up the lineage. The cycle_ordinal check constraint caps a chain at
  -- original -> R1 -> R2, so this terminates; the guard is belt and braces.
  while cursor_id is not null and superseded_count < 8 loop
    update public.nde_obligations
    set disposition = 'superseded'
    where id = cursor_id and disposition = 'rejected'
    returning parent_obligation_id into parent_id;

    if not found then
      exit;
    end if;

    superseded_count := superseded_count + 1;
    cursor_id := parent_id;
  end loop;

  return superseded_count;
end;
$$;

comment on function public.supersede_repaired_ancestors(uuid) is
  'An accepted repair closes out the rejected cycle it repaired, and that cycle''s '
  'own ancestors. Without it a single rejection made a spool permanently '
  'unreleasable (Gate D5, 2026-08-04).';

create or replace function public.derive_repair_and_tracers(
  rejected_obligation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ob public.nde_obligations;
  candidate record;
  tracer_spool_revision_id uuid;
begin
  select * into ob from public.nde_obligations where id = rejected_obligation_id;
  if ob.id is null or ob.disposition <> 'rejected' then
    return false;
  end if;

  if ob.cycle_kind = 'original' then
    -- Manual 19.8: every repaired joint is mandatory 100 % for its method.
    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, coverage_regime,
      responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
    ) values (
      ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
      100, 'full', 'mandatory_100',
      ob.responsible_welder_qualification_id, 'repair', 1, ob.id
    ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;

    for candidate in
      select c.weld_joint_revision_id
      from public.eligible_tracer_candidates(ob.id) c
      limit 2
    loop
      select wjr.spool_revision_id into tracer_spool_revision_id
      from public.weld_joint_revisions wjr
      where wjr.id = candidate.weld_joint_revision_id;

      insert into public.nde_obligations (
        project_id, weld_joint_revision_id, spool_revision_id, method,
        required_coverage, selection_mode, coverage_regime,
        responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
      ) values (
        ob.project_id, candidate.weld_joint_revision_id, tracer_spool_revision_id, ob.method,
        ob.required_coverage, ob.selection_mode, ob.coverage_regime,
        ob.responsible_welder_qualification_id, 'tracer', 1, ob.id
      ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
    end loop;

    return true;

  elsif ob.cycle_kind = 'repair' then
    if ob.cycle_ordinal = 1 then
      insert into public.nde_obligations (
        project_id, weld_joint_revision_id, spool_revision_id, method,
        required_coverage, selection_mode, coverage_regime,
        responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
      ) values (
        ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
        100, 'full', 'mandatory_100',
        ob.responsible_welder_qualification_id, 'repair', 2, ob.id
      ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
      return true;
    elsif ob.cycle_ordinal >= 2 then
      raise exception 'This repair cycle is not allowed. R2 follows a rejected R1; there is no R3'
        using errcode = 'PQC44';
    end if;

  elsif ob.cycle_kind = 'tracer' then
    -- A rejected tracer is a rejected weld like any other and earns its repair,
    -- otherwise it blocks its own spool forever. It spawns no further tracers;
    -- a rejected second-level tracer escalates through evaluate_nde_penalty.
    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, coverage_regime,
      responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
    ) values (
      ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
      100, 'full', 'mandatory_100',
      ob.responsible_welder_qualification_id, 'repair', 1, ob.id
    ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.record_nde_result(
  target_obligation_id uuid,
  outcome text,
  examined_on date,
  report_number text default null,
  defect_rework_code_id uuid default null,
  responsible_welder_qualification_id uuid default null,
  comment text default null,
  idempotency_key text default null
)
returns public.nde_results
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  obligation_row public.nde_obligations;
  ctx public.weld_context;
  batch_item_row public.nde_batch_items;
  claim jsonb;
  created public.nde_results;
  joint_project_id uuid;
  joint_revision_status public.revision_status;
  joint_removed boolean;
  named_welder_id uuid := responsible_welder_qualification_id;
begin
  select * into obligation_row from public.nde_obligations where id = target_obligation_id;
  if obligation_row.id is null then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
      using errcode = 'PQC42';
  end if;

  ctx := public.weld_joint_context(obligation_row.weld_joint_revision_id);

  if not public.current_user_has_capability(ctx.project_id, 'nde.result.record') then
    raise exception 'You do not have permission to record NDE results' using errcode = '42501';
  end if;

  if not public.current_user_in_pds_scope(ctx.project_id, ctx.pds_area_id) then
    raise exception 'This joint is outside your PDS area scope' using errcode = '42501';
  end if;

  select iso.project_id, rev.status, wjr.is_removed
    into joint_project_id, joint_revision_status, joint_removed
  from public.weld_joint_revisions wjr
  join public.spool_revisions sr on sr.id = wjr.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where wjr.id = obligation_row.weld_joint_revision_id;

  if joint_project_id is distinct from obligation_row.project_id
     or joint_revision_status <> 'accepted'
     or coalesce(joint_removed, true) then
    raise exception 'That obligation belongs to another project or to a superseded revision'
      using errcode = 'PQC45';
  end if;

  if obligation_row.disposition <> 'issued' then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
      using errcode = 'PQC42';
  end if;

  if exists (select 1 from public.nde_results where obligation_id = target_obligation_id) then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
      using errcode = 'PQC42';
  end if;

  if outcome not in ('accepted', 'rejected') then
    raise exception 'Outcome must be accepted or rejected' using errcode = 'PQC42';
  end if;

  if outcome = 'rejected' and defect_rework_code_id is null then
    raise exception 'A rejected result must carry a defect rework code' using errcode = 'PQC42';
  end if;

  if named_welder_id is not null then
    if not public.is_welder_on_joint(obligation_row.weld_joint_revision_id, named_welder_id) then
      raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint'
        using errcode = 'PQC42';
    end if;
  end if;

  select * into batch_item_row from public.nde_batch_items where obligation_id = target_obligation_id;

  claim := public.claim_command_receipt(ctx.project_id, 'record_nde_result', idempotency_key);
  if claim ->> 'status' = 'completed' then
    select * into created from public.nde_results
    where id = (claim -> 'result' ->> 'result_id')::uuid;
    return created;
  end if;

  insert into public.nde_results (
    project_id, obligation_id, batch_item_id, outcome,
    examined_on, report_number, defect_rework_code_id,
    responsible_welder_qualification_id, comment, receipt_id, recorded_by
  ) values (
    ctx.project_id, target_obligation_id, batch_item_row.id, outcome,
    examined_on, report_number, defect_rework_code_id,
    named_welder_id, comment,
    nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  ) returning * into created;

  if outcome = 'accepted' then
    update public.nde_obligations
    set disposition = 'satisfied',
        satisfied_at = timezone('utc', now()),
        satisfied_by = auth.uid(),
        responsible_welder_qualification_id = coalesce(
          named_welder_id, obligation_row.responsible_welder_qualification_id)
    where id = target_obligation_id;

    -- An accepted repair closes out what it repaired.
    perform public.supersede_repaired_ancestors(target_obligation_id);
  else
    update public.nde_obligations
    set disposition = 'rejected',
        responsible_welder_qualification_id = coalesce(
          named_welder_id, obligation_row.responsible_welder_qualification_id)
    where id = target_obligation_id;
  end if;

  if outcome = 'accepted' then
    perform set_config('pipeqc.weld_correction', 'on', true);
    update public.weld_progress_records
    set is_locked = true, locked_at = coalesce(locked_at, timezone('utc', now()))
    where weld_joint_revision_id = obligation_row.weld_joint_revision_id and not is_locked;
    perform set_config('pipeqc.weld_correction', 'off', true);
  end if;

  if outcome = 'rejected' then
    perform public.derive_repair_and_tracers(target_obligation_id);
    perform public.evaluate_nde_penalty(
      ctx.project_id, named_welder_id,
      (select bi.batch_id from public.nde_batch_items bi where bi.id = batch_item_row.id));
  end if;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    ctx.project_id, auth.uid(), 'nde_results', created.id,
    'record_nde_result', to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_nde_result', idempotency_key,
    jsonb_build_object('result_id', created.id)
  );

  return created;
end;
$$;

revoke all on function public.supersede_repaired_ancestors(uuid) from public, anon;
grant execute on function public.supersede_repaired_ancestors(uuid) to authenticated;
