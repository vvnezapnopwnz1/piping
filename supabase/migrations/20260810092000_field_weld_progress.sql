-- Track 07: the existing weld command is phase-aware; field welds do not get a parallel path.

do $migration$
declare
  function_definition text;
  old_guard text := $old$
  -- Dossier 16.5: Shop Weld Progress covers shop joints only.
  if ctx.weld_location <> 'shop' then
    raise exception
      'Joint % is a % weld and belongs to the assembly or erection module, not Shop Weld Progress',
      ctx.weld_number, ctx.weld_location
      using errcode = 'PQC30';
  end if;
$old$;
  new_guard text := $new$
  -- Track 07: the phase-aware wrapper sets this local context before invoking the
  -- original validation/allocation implementation.
  if ctx.weld_location = 'assembly' then
    raise exception 'Assembly is not enabled on this project' using errcode = 'PQC50';
  end if;
  if ctx.weld_location = 'shop'
     and coalesce(nullif(current_setting('pipeqc.weld_phase', true), ''), 'fabrication') <> 'fabrication' then
    raise exception 'This joint belongs to a different construction phase. Record it on that phase''s screen.'
      using errcode = 'PQC51';
  end if;
  if ctx.weld_location = 'field'
     and nullif(current_setting('pipeqc.weld_phase', true), '') is null then
    raise exception
      'Joint % is a % weld and belongs to the assembly or erection module, not Shop Weld Progress',
      ctx.weld_number, ctx.weld_location
      using errcode = 'PQC30';
  end if;
  if ctx.weld_location = 'field'
     and nullif(current_setting('pipeqc.weld_phase', true), '') is not null
     and current_setting('pipeqc.weld_phase', true) <> 'erection' then
    raise exception 'This joint belongs to a different construction phase. Record it on that phase''s screen.'
      using errcode = 'PQC51';
  end if;
  if ctx.weld_location not in ('shop', 'field') then
    raise exception 'This joint belongs to a different construction phase. Record it on that phase''s screen.'
      using errcode = 'PQC51';
  end if;
$new$;
begin
  select pg_get_functiondef(
    'public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)'::regprocedure
  ) into function_definition;
  function_definition := replace(
    function_definition,
    'perform public.assert_construction_target(ctx.spool_revision_id, ''fabrication.progress.record'');',
    $replacement$perform public.assert_construction_target(
    ctx.spool_revision_id,
    case when coalesce(nullif(current_setting('pipeqc.weld_phase', true), ''), 'fabrication') = 'erection'
      then 'erection.progress.record' else 'fabrication.progress.record' end
  );$replacement$
  );
  function_definition := replace(function_definition, old_guard, new_guard);
  if position('PQC51' in function_definition) = 0 then
    raise exception 'Track 07 could not widen the existing weld command';
  end if;
  execute function_definition;
end
$migration$;

create or replace function public.record_weld_progress(
  target_phase public.construction_phase,
  target_weld_joint_revision_id uuid,
  subcontractor_id uuid,
  welding_procedure_id uuid,
  points jsonb,
  dates jsonb default '{}'::jsonb,
  idempotency_key text default null
)
returns public.weld_progress_records
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
  result_row public.weld_progress_records;
begin
  ctx := public.weld_joint_context(target_weld_joint_revision_id);
  if target_phase = 'assembly' then
    raise exception 'Assembly is not enabled on this project' using errcode = 'PQC50';
  end if;
  if target_phase not in ('fabrication', 'erection') then
    raise exception 'This phase is not enabled for weld progress' using errcode = 'PQC52';
  end if;
  if (target_phase = 'fabrication' and ctx.weld_location <> 'shop')
     or (target_phase = 'erection' and ctx.weld_location <> 'field') then
    raise exception 'This joint belongs to a different construction phase. Record it on that phase''s screen.'
      using errcode = 'PQC51';
  end if;
  if target_phase = 'erection'
     and public.effective_stage_date(ctx.spool_revision_id, 'erection', 'to_site') is null then
    raise exception 'The spool must be recorded To Site before field welding' using errcode = 'PQC54';
  end if;

  perform set_config('pipeqc.weld_phase', target_phase::text, true);
  result_row := public.record_weld_progress(
    target_weld_joint_revision_id, subcontractor_id, welding_procedure_id,
    points, dates, idempotency_key
  );
  perform set_config('pipeqc.weld_phase', '', true);

  if target_phase = 'erection' then
    update public.weld_progress_records
    set phase = 'erection'
    where id = result_row.id;
    select * into result_row from public.weld_progress_records where id = result_row.id;
    insert into public.audit_events (
      project_id, actor_id, entity_type, entity_id, action, before_state, after_state
    ) values (
      ctx.project_id, auth.uid(), 'weld_progress_records', result_row.id,
      'tag_erection_weld_progress', null, to_jsonb(result_row)
    );
  end if;
  return result_row;
end;
$$;

revoke all on function
  public.record_weld_progress(public.construction_phase, uuid, uuid, uuid, jsonb, jsonb, text)
from public, anon;
grant execute on function
  public.record_weld_progress(public.construction_phase, uuid, uuid, uuid, jsonb, jsonb, text)
to authenticated;
