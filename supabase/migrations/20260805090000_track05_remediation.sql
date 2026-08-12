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

-- 2. Plan section 3.2: the phase column exists so Track 07 parameterises these tables
--    rather than cloning them. The lookup must therefore be phase-scoped. The
--    two-argument form stays as a fabrication-only delegate so the seven Track 05
--    commands that call it need no rewrite; Track 07 calls the three-argument form.

create or replace function public.effective_stage_date(
  target_spool_revision_id uuid,
  target_phase public.construction_phase,
  target_stage public.construction_stage
)
returns date language sql stable security definer set search_path = public, pg_temp as $$
  select e.occurred_on
  from public.construction_progress_events e
  where e.spool_revision_id = target_spool_revision_id
    and e.phase = target_phase
    and e.stage = target_stage
    and e.source <> 'compensation'
    and not exists (select 1 from public.construction_progress_events c where c.compensates_event_id = e.id)
  order by e.created_at desc limit 1;
$$;

create or replace function public.effective_stage_date(
  target_spool_revision_id uuid,
  target_stage public.construction_stage
)
returns date language sql stable security definer set search_path = public, pg_temp as $$
  select public.effective_stage_date(
    target_spool_revision_id, 'fabrication'::public.construction_phase, target_stage);
$$;

comment on function public.effective_stage_date(uuid, public.construction_stage) is
  'Deprecated fabrication-only shorthand. New callers must use the three-argument, phase-scoped form.';

revoke all on function
  public.effective_stage_date(uuid, public.construction_phase, public.construction_stage)
  from public, anon;
