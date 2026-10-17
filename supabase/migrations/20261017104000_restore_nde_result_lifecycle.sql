-- F6 changed the receipt order.  Keep the established NDE lifecycle after a
-- new receipt is claimed: accepted NDE locks its weld and rejected NDE starts
-- the repair/tracer flow.

create or replace function public.record_nde_result(
  target_obligation_id uuid, outcome text, examined_on date,
  report_number text default null, defect_rework_code_id uuid default null,
  responsible_welder_qualification_id uuid default null, comment text default null,
  idempotency_key text default null
)
returns public.nde_results
language plpgsql security definer set search_path = public, pg_temp
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
  normalized_payload jsonb;
begin
  select * into obligation_row from public.nde_obligations where id = target_obligation_id;
  if obligation_row.id is null then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint' using errcode = 'PQC42';
  end if;
  ctx := public.weld_joint_context(obligation_row.weld_joint_revision_id);
  if not public.current_user_has_capability(ctx.project_id, 'nde.result.record') then
    raise exception 'You do not have permission to record NDE results' using errcode = '42501';
  end if;
  if not public.current_user_in_pds_scope(ctx.project_id, ctx.pds_area_id) then
    raise exception 'This joint is outside your PDS area scope' using errcode = '42501';
  end if;

  normalized_payload := jsonb_build_object(
    'obligation_id', target_obligation_id, 'outcome', outcome, 'examined_on', examined_on,
    'report_number', report_number, 'defect_rework_code_id', defect_rework_code_id,
    'responsible_welder_qualification_id', responsible_welder_qualification_id, 'comment', comment
  );
  claim := public.claim_command_receipt(ctx.project_id, 'record_nde_result', idempotency_key, normalized_payload);
  if claim ->> 'status' = 'completed' then
    select * into created from public.nde_results where id = (claim -> 'result' ->> 'result_id')::uuid;
    return created;
  end if;

  select iso.project_id, revision.status, joint.is_removed
    into joint_project_id, joint_revision_status, joint_removed
  from public.weld_joint_revisions joint
  join public.spool_revisions spool_revision on spool_revision.id = joint.spool_revision_id
  join public.isometric_revisions revision on revision.id = spool_revision.isometric_revision_id
  join public.isometrics iso on iso.id = revision.isometric_id
  where joint.id = obligation_row.weld_joint_revision_id;
  if joint_project_id is distinct from obligation_row.project_id
     or joint_revision_status <> 'accepted' or coalesce(joint_removed, true) then
    raise exception 'That obligation belongs to another project or to a superseded revision' using errcode = 'PQC45';
  end if;
  if obligation_row.disposition <> 'issued'
     or exists (select 1 from public.nde_results where obligation_id = target_obligation_id) then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint' using errcode = 'PQC42';
  end if;
  if outcome not in ('accepted', 'rejected') then
    raise exception 'Outcome must be accepted or rejected' using errcode = 'PQC42';
  end if;
  if outcome = 'rejected' and defect_rework_code_id is null then
    raise exception 'A rejected result must carry a defect rework code' using errcode = 'PQC42';
  end if;
  if named_welder_id is not null and not public.is_welder_on_joint(obligation_row.weld_joint_revision_id, named_welder_id) then
    raise exception 'That obligation is not in this batch, already has a result, or names a welder who did not weld this joint' using errcode = 'PQC42';
  end if;
  select * into batch_item_row from public.nde_batch_items where obligation_id = target_obligation_id;

  insert into public.nde_results (
    project_id, obligation_id, batch_item_id, outcome, examined_on, report_number,
    defect_rework_code_id, responsible_welder_qualification_id, comment, receipt_id, recorded_by
  ) values (
    ctx.project_id, target_obligation_id, batch_item_row.id, outcome, examined_on, report_number,
    defect_rework_code_id, named_welder_id, comment, nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  ) returning * into created;

  if outcome = 'accepted' then
    update public.nde_obligations
    set disposition = 'satisfied', satisfied_at = timezone('utc', now()), satisfied_by = auth.uid(),
        responsible_welder_qualification_id = coalesce(named_welder_id, obligation_row.responsible_welder_qualification_id)
    where id = target_obligation_id;
    perform public.supersede_repaired_ancestors(target_obligation_id);
    perform set_config('pipeqc.weld_correction', 'on', true);
    update public.weld_progress_records
    set is_locked = true, locked_at = coalesce(locked_at, timezone('utc', now()))
    where weld_joint_revision_id = obligation_row.weld_joint_revision_id and not is_locked;
    perform set_config('pipeqc.weld_correction', 'off', true);
  else
    update public.nde_obligations
    set disposition = 'rejected',
        responsible_welder_qualification_id = coalesce(named_welder_id, obligation_row.responsible_welder_qualification_id)
    where id = target_obligation_id;
    perform public.derive_repair_and_tracers(target_obligation_id);
    perform public.evaluate_nde_penalty(ctx.project_id, named_welder_id,
      (select batch_item.batch_id from public.nde_batch_items batch_item where batch_item.id = batch_item_row.id));
  end if;

  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (ctx.project_id, auth.uid(), 'nde_results', created.id, 'record_nde_result', to_jsonb(created));
  perform public.complete_command_receipt(ctx.project_id, 'record_nde_result', idempotency_key, jsonb_build_object('result_id', created.id));
  return created;
end;
$$;
