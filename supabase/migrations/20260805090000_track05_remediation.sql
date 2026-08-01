-- Track 05 remediation.
-- 1. Plan section 3.14: issuing a QC-13 is part of recording progress, not of releasing
--    quality. /fabrication/material-check is gated by fabrication.progress.record, so the
--    command must ask for the same capability or the button is unusable by its own users.

create or replace function public.request_qc13_form(
  target_spool_revision_id uuid,
  requested_date date default current_date,
  target_idempotency_key text default null
)
returns public.qc13_progress_forms
language plpgsql security definer set search_path = public, pg_temp as $$
declare context public.spool_context; claimed jsonb; form_row public.qc13_progress_forms; next_number integer;
begin
  context := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'request_qc13_form', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into form_row from jsonb_populate_record(null::public.qc13_progress_forms, claimed -> 'result' -> 'form'); return form_row;
  end if;
  if public.effective_stage_date(target_spool_revision_id, 'start_fab') is null then
    raise exception 'Fabrication must start before QC-13 is requested' using errcode = 'PQC32';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(context.project_id::text, 0));
  select count(*) + 1 into next_number from public.qc13_progress_forms where project_id = context.project_id;
  insert into public.qc13_progress_forms (project_id, spool_revision_id, form_number, requested_on, requested_by)
  values (context.project_id, target_spool_revision_id, format('QC13-%s', lpad(next_number::text, 6, '0')), coalesce(requested_date, current_date), auth.uid())
  returning * into form_row;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'qc13_progress_forms', form_row.id, 'request_qc13_form', to_jsonb(form_row));
  perform public.complete_command_receipt(context.project_id, 'request_qc13_form', target_idempotency_key, jsonb_build_object('form', to_jsonb(form_row)));
  return form_row;
end;
$$;

comment on function public.request_qc13_form(uuid, date, text) is
  'Issues the next QC-13 daily progress form for a spool revision. Guarded by fabrication.progress.record (plan section 3.14).';
