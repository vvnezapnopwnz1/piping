-- Track 06: NDE Repair and Tracer Derivation

-- Helper function to return eligible tracer candidate joints
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
  left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
  where rev.isometric_id in (select isometric_id from public.isometrics where project_id = parent_ob.project_id)
    and not wjr.is_removed
    and rev.status = 'accepted'
    and wjr.id <> parent_ob.weld_joint_revision_id
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

-- Derivation of repair and tracer obligations upon rejection
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
  next_ordinal smallint;
begin
  select * into ob from public.nde_obligations where id = rejected_obligation_id;
  if ob.id is null or ob.disposition <> 'rejected' then
    return false;
  end if;

  if ob.cycle_kind = 'original' then
    -- Rejected original creates mandatory R1
    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, category_code,
      responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
    ) values (
      ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
      ob.required_coverage, ob.selection_mode, ob.category_code,
      ob.responsible_welder_qualification_id, 'repair', 1, ob.id
    ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
    return true;

  elsif ob.cycle_kind = 'repair' then
    if ob.cycle_ordinal = 1 then
      -- Rejected R1 creates R2
      insert into public.nde_obligations (
        project_id, weld_joint_revision_id, spool_revision_id, method,
        required_coverage, selection_mode, category_code,
        responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
      ) values (
        ob.project_id, ob.weld_joint_revision_id, ob.spool_revision_id, ob.method,
        ob.required_coverage, ob.selection_mode, ob.category_code,
        ob.responsible_welder_qualification_id, 'repair', 2, ob.id
      ) on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;
      return true;
    elsif ob.cycle_ordinal >= 2 then
      raise exception 'This repair cycle is not allowed. R2 follows a rejected R1; there is no R3'
        using errcode = 'PQC44';
    end if;

  elsif ob.cycle_kind = 'tracer' then
    -- Rejected tracer triggers evaluation
    return true;
  end if;

  return false;
end;
$$;

-- Assign a candidate joint as a tracer obligation
create or replace function public.assign_tracer_obligation(
  target_parent_obligation_id uuid,
  tracer_weld_joint_revision_id uuid,
  idempotency_key text default null
)
returns public.nde_obligations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_ob public.nde_obligations;
  tracer_spool_revision_id uuid;
  tracer_ob public.nde_obligations;
  claim jsonb;
  target_ordinal smallint;
begin
  select * into parent_ob from public.nde_obligations where id = target_parent_obligation_id;
  if parent_ob.id is null then
    raise exception 'Parent obligation not found' using errcode = 'PQC43';
  end if;

  if not public.current_user_has_capability(parent_ob.project_id, 'nde.batch.manage') then
    raise exception 'You do not have permission to manage tracer assignments' using errcode = '42501';
  end if;

  -- Validate candidate is in eligible_tracer_candidates
  if not exists (
    select 1 from public.eligible_tracer_candidates(target_parent_obligation_id)
    where weld_joint_revision_id = tracer_weld_joint_revision_id
  ) then
    raise exception 'That joint cannot serve as a tracer: it is already used, or outside the eligible population'
      using errcode = 'PQC43';
  end if;

  select spool_revision_id into tracer_spool_revision_id
  from public.weld_joint_revisions where id = tracer_weld_joint_revision_id;

  target_ordinal := case when parent_ob.cycle_kind = 'tracer' then parent_ob.cycle_ordinal + 1 else 1 end;
  if target_ordinal > 2 then
    raise exception 'Maximum tracer ordinal exceeded' using errcode = 'PQC43';
  end if;

  claim := public.claim_command_receipt(parent_ob.project_id, 'assign_tracer_obligation', idempotency_key);
  if claim ->> 'status' = 'completed' then
    select * into tracer_ob from public.nde_obligations
    where id = (claim -> 'result' ->> 'obligation_id')::uuid;
    return tracer_ob;
  end if;

  insert into public.nde_obligations (
    project_id, weld_joint_revision_id, spool_revision_id, method,
    required_coverage, selection_mode, category_code,
    responsible_welder_qualification_id, cycle_kind, cycle_ordinal, parent_obligation_id
  ) values (
    parent_ob.project_id, tracer_weld_joint_revision_id, tracer_spool_revision_id, parent_ob.method,
    parent_ob.required_coverage, parent_ob.selection_mode, parent_ob.category_code,
    parent_ob.responsible_welder_qualification_id, 'tracer', target_ordinal, parent_ob.id
  ) returning * into tracer_ob;

  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, after_state
  ) values (
    parent_ob.project_id, auth.uid(), 'nde_obligations', tracer_ob.id,
    'assign_tracer_obligation', to_jsonb(tracer_ob)
  );

  perform public.complete_command_receipt(
    parent_ob.project_id, 'assign_tracer_obligation', idempotency_key,
    jsonb_build_object('obligation_id', tracer_ob.id)
  );

  return tracer_ob;
end;
$$;

revoke all on function
  public.eligible_tracer_candidates(uuid),
  public.derive_repair_and_tracers(uuid),
  public.assign_tracer_obligation(uuid, uuid, text)
from public, anon;

grant execute on function
  public.eligible_tracer_candidates(uuid),
  public.derive_repair_and_tracers(uuid),
  public.assign_tracer_obligation(uuid, uuid, text)
to authenticated;
