-- Track 05: dossier 30 prohibition 4 - WPS and welder cannot change after NDE.
-- The lock is a column the trigger reads, so Track 06 can set it on batch selection
-- without touching any of this logic.

create or replace function public.assert_weld_progress_unlocked()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owning_record public.weld_progress_records;
begin
  if tg_table_name = 'weld_progress_records' then
    if old.is_locked
       and (new.welding_procedure_id is distinct from old.welding_procedure_id
            or new.subcontractor_id is distinct from old.subcontractor_id
            or new.weld_on is distinct from old.weld_on)
       -- correct_weld_progress announces itself by bumping the version and nothing else
       -- can, because authenticated has no direct update privilege on this table.
       and current_setting('pipeqc.weld_correction', true) is distinct from 'on' then
      raise exception 'WPS, subcontractor and weld date are locked after an accepted NDE result'
        using errcode = 'PQC36';
    end if;
    return new;
  end if;

  select * into owning_record from public.weld_progress_records
  where id = coalesce(new.weld_progress_record_id, old.weld_progress_record_id);

  if owning_record.is_locked
     and current_setting('pipeqc.weld_correction', true) is distinct from 'on' then
    raise exception 'Weld point assignments are locked after an accepted NDE result'
      using errcode = 'PQC36';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger weld_progress_records_locked
  before update on public.weld_progress_records
  for each row execute function public.assert_weld_progress_unlocked();

create trigger weld_point_assignments_locked
  before insert or update or delete on public.weld_point_assignments
  for each row execute function public.assert_weld_progress_unlocked();

-- Roadmap 17: "a correction is performed by a separate command". Higher capability,
-- mandatory reason, full before/after in the audit trail, optimistic concurrency.
create or replace function public.correct_weld_progress(
  target_weld_joint_revision_id uuid,
  expected_version integer,
  corrections jsonb,
  reason text,
  idempotency_key text default null
)
returns public.weld_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
  claim jsonb;
  existing public.weld_progress_records;
  updated public.weld_progress_records;
begin
  ctx := public.weld_joint_context(target_weld_joint_revision_id);
  perform public.assert_construction_target(ctx.spool_revision_id, 'fabrication.qc.release');

  if coalesce(trim(reason), '') = '' then
    raise exception 'A correction requires a reason' using errcode = '23514';
  end if;

  claim := public.claim_command_receipt(ctx.project_id, 'correct_weld_progress', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into updated from public.weld_progress_records
    where id = (claim -> 'result' ->> 'record_id')::uuid;
    return updated;
  end if;

  select * into existing from public.weld_progress_records
  where weld_joint_revision_id = target_weld_joint_revision_id;

  if existing.id is null then
    raise exception 'This joint has no weld progress to correct' using errcode = 'PQC30';
  end if;
  if existing.version <> expected_version then
    raise exception 'This record changed since you loaded it. Reload and try again'
      using errcode = '23514';
  end if;

  perform set_config('pipeqc.weld_correction', 'on', true);

  update public.weld_progress_records
  set welding_procedure_id = coalesce(
        nullif(corrections ->> 'welding_procedure_id', '')::uuid, welding_procedure_id),
      subcontractor_id = coalesce(
        nullif(corrections ->> 'subcontractor_id', '')::uuid, subcontractor_id),
      weld_on = coalesce(nullif(corrections ->> 'weld_on', '')::date, weld_on),
      dwir_number = coalesce(nullif(corrections ->> 'dwir_number', ''), dwir_number),
      qc_form_number = coalesce(nullif(corrections ->> 'qc_form_number', ''), qc_form_number),
      rework_code_id = coalesce(
        nullif(corrections ->> 'rework_code_id', '')::uuid, rework_code_id),
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = existing.id
  returning * into updated;

  perform set_config('pipeqc.weld_correction', 'off', true);

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'weld_progress_records', updated.id,
    'correct_weld_progress',
    to_jsonb(existing),
    jsonb_build_object('record', to_jsonb(updated), 'reason', reason)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'correct_weld_progress', idempotency_key, jsonb_build_object('record_id', updated.id));

  return updated;
end;
$$;

-- INTERIM COMMAND - plan section 3.8.
-- Track 06 replaces this with record_nde_results, which will close obligations through
-- batches and results. It exists here so "QC release is blocked until NDE is accepted"
-- is a provable statement in Track 05 rather than an assertion deferred to Track 06.
-- Do not build UI beyond the single QC action screen on top of it.
create or replace function public.record_nde_obligation_outcome(
  target_obligation_id uuid,
  chosen_disposition text,
  idempotency_key text default null
)
returns public.nde_obligations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
  claim jsonb;
  obligation public.nde_obligations;
  updated public.nde_obligations;
begin
  select * into obligation from public.nde_obligations where id = target_obligation_id;
  if obligation.id is null then
    raise exception 'The NDE obligation was not found' using errcode = 'PQC30';
  end if;

  ctx := public.weld_joint_context(obligation.weld_joint_revision_id);

  if not public.current_user_has_capability(ctx.project_id, 'nde.result.record') then
    raise exception 'You do not have permission to record NDE outcomes' using errcode = '42501';
  end if;
  if not public.current_user_in_pds_scope(ctx.project_id, ctx.pds_area_id) then
    raise exception 'This joint is outside your PDS area scope' using errcode = '42501';
  end if;
  if chosen_disposition not in ('satisfied', 'waived') then
    raise exception 'An obligation outcome must be satisfied or waived' using errcode = '23514';
  end if;

  claim := public.claim_command_receipt(
    ctx.project_id, 'record_nde_obligation_outcome', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into updated from public.nde_obligations
    where id = (claim -> 'result' ->> 'obligation_id')::uuid;
    return updated;
  end if;

  update public.nde_obligations
  set disposition = chosen_disposition,
      satisfied_at = timezone('utc', now()),
      satisfied_by = auth.uid()
  where id = target_obligation_id
  returning * into updated;

  -- Dossier 7.3: the joint is frozen once an examination has happened.
  if chosen_disposition = 'satisfied' then
    perform set_config('pipeqc.weld_correction', 'on', true);
    update public.weld_progress_records
    set is_locked = true, locked_at = coalesce(locked_at, timezone('utc', now()))
    where weld_joint_revision_id = obligation.weld_joint_revision_id and not is_locked;
    perform set_config('pipeqc.weld_correction', 'off', true);
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'nde_obligations', updated.id,
    'record_nde_obligation_outcome', to_jsonb(obligation), to_jsonb(updated)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_nde_obligation_outcome', idempotency_key, jsonb_build_object('obligation_id', updated.id));

  return updated;
end;
$$;

revoke all on function
  public.correct_weld_progress(uuid, integer, jsonb, text, text),
  public.record_nde_obligation_outcome(uuid, text, text)
from public, anon;

grant execute on function
  public.correct_weld_progress(uuid, integer, jsonb, text, text),
  public.record_nde_obligation_outcome(uuid, text, text)
to authenticated;
