-- Track 06: PWHT Quality Gate (PQC47)
-- Replace the Track 05 release_quality_record to raise PQC47 instead of PQC37 for PWHT.
-- The insert body is preserved exactly from 20260804093000_fabrication_release.sql.

create or replace function public.release_quality_record(
  target_spool_revision_id uuid,
  released_on date,
  qc13_form_id uuid default null,
  comment text default null,
  idempotency_key text default null
)
returns public.quality_release_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim jsonb;
  readiness public.spool_fabrication_readiness;
  created public.quality_release_records;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.qc.release');

  claim := public.claim_command_receipt(ctx.project_id, 'release_quality_record', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into created from public.quality_release_records
    where id = (claim -> 'result' ->> 'record_id')::uuid;
    return created;
  end if;

  select * into readiness from public.spool_fabrication_readiness
  where spool_revision_id = target_spool_revision_id;

  if not readiness.is_material_checked then
    raise exception 'Material check is incomplete: % of % bill lines traced',
      readiness.line_checked, readiness.line_total
      using errcode = 'PQC32';
  end if;
  if readiness.weld_complete < readiness.weld_total then
    raise exception 'Welding is incomplete: % of % joints welded',
      readiness.weld_complete, readiness.weld_total
      using errcode = 'PQC32';
  end if;
  if readiness.support_recorded < readiness.support_total then
    raise exception 'Supports are incomplete: % of % installed',
      readiness.support_recorded, readiness.support_total
      using errcode = 'PQC32';
  end if;
  if readiness.nde_pending > 0 then
    raise exception '% NDE obligations on this spool are still outstanding',
      readiness.nde_pending
      using errcode = 'PQC37';
  end if;
  -- PQC47 replaces PQC37 for PWHT so the user gets a code that maps to a
  -- distinct sentence in the quality error map.
  if readiness.pwht_pending > 0 then
    raise exception 'This spool has an outstanding PWHT requirement and cannot be quality released'
      using errcode = 'PQC47';
  end if;

  if released_on is null then
    raise exception 'A release date is required' using errcode = '23514';
  end if;
  if released_on < readiness.fabricated_on then
    raise exception 'The release date cannot precede the fabrication completion date'
      using errcode = 'PQC32';
  end if;

  insert into public.quality_release_records (
    project_id, spool_revision_id, released_on, released_by, qc13_form_id,
    weld_count, obligation_count, comment, receipt_id
  )
  values (
    ctx.project_id, target_spool_revision_id, released_on, auth.uid(), qc13_form_id,
    readiness.weld_total,
    (select count(*)::int from public.nde_obligations
     where spool_revision_id = target_spool_revision_id),
    comment, nullif(claim ->> 'receipt_id', '')::uuid
  )
  returning * into created;

  insert into public.construction_progress_events (
    project_id, spool_revision_id, phase, stage, occurred_on, actor_id
  )
  values (
    ctx.project_id, target_spool_revision_id, 'fabrication', 'qc_release', released_on, auth.uid()
  );

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'quality_release_records', created.id,
    'release_quality_record', to_jsonb(readiness), to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'release_quality_record', idempotency_key, jsonb_build_object('record_id', created.id));

  return created;
end;
$$;
