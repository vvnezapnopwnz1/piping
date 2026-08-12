-- Track 07: construction stages are policy data shared by fabrication and erection.

create table public.construction_phase_stages (
  phase public.construction_phase not null,
  stage public.construction_stage not null,
  ordinal smallint not null check (ordinal > 0),
  is_recordable boolean not null,
  primary key (phase, stage),
  unique (phase, ordinal)
);

insert into public.construction_phase_stages (phase, stage, ordinal, is_recordable)
values
  ('fabrication', 'start_fab', 1, true),
  ('fabrication', 'material_check', 2, false),
  ('fabrication', 'fabricated', 3, false),
  ('fabrication', 'qc_release', 4, false),
  ('fabrication', 'sent_to_paint', 5, true),
  ('fabrication', 'painted', 6, false),
  ('fabrication', 'final_qc', 7, false),
  ('fabrication', 'laydown', 8, false),
  ('erection', 'to_site', 1, true),
  ('erection', 'erected', 2, true),
  ('erection', 'welded_bolted', 3, true),
  ('erection', 'supported', 4, true),
  ('erection', 'rft', 5, false);

alter table public.construction_phase_stages enable row level security;
create policy "read construction phase policy" on public.construction_phase_stages
  for select to authenticated using (true);
grant select on public.construction_phase_stages to authenticated;

create or replace function public.construction_stage_ordinal(target_stage public.construction_stage)
returns integer
language sql immutable set search_path = public, pg_temp
as $$
  select case target_stage
    when 'start_fab' then 10 when 'material_check' then 20 when 'fabricated' then 30
    when 'qc_release' then 40 when 'sent_to_paint' then 50 when 'painted' then 60
    when 'final_qc' then 70 when 'laydown' then 80
    when 'to_site' then 90 when 'erected' then 100 when 'welded_bolted' then 110
    when 'supported' then 120 when 'rft' then 130
  end;
$$;

create or replace function public.record_construction_progress(
  target_spool_revision_id uuid,
  target_phase public.construction_phase,
  target_stage public.construction_stage,
  target_occurred_on date,
  target_payload jsonb default '{}'::jsonb,
  target_idempotency_key text default null
)
returns public.construction_progress_events
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  context public.spool_context;
  claimed jsonb;
  event_row public.construction_progress_events;
  policy_row public.construction_phase_stages;
  required_capability text;
begin
  if target_phase = 'assembly' then
    raise exception 'Assembly is not enabled on this project' using errcode = 'PQC50';
  end if;

  required_capability := case target_phase
    when 'fabrication' then 'fabrication.progress.record'
    when 'erection' then 'erection.progress.record'
  end;
  context := public.assert_construction_target(target_spool_revision_id, required_capability);
  claimed := public.claim_command_receipt(context.project_id, 'record_construction_progress', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into event_row
    from jsonb_populate_record(null::public.construction_progress_events, claimed -> 'result' -> 'event');
    return event_row;
  end if;

  select * into policy_row
  from public.construction_phase_stages
  where phase = target_phase and stage = target_stage;

  if policy_row.phase is null then
    raise exception 'This stage does not belong to the construction phase' using errcode = 'PQC52';
  end if;
  if not policy_row.is_recordable then
    if target_phase = 'fabrication' then
      raise exception 'This stage is derived and cannot be recorded manually' using errcode = 'PQC32';
    end if;
    raise exception 'This stage is derived or does not belong to this phase, and cannot be recorded manually'
      using errcode = 'PQC52';
  end if;
  if target_occurred_on is null or jsonb_typeof(coalesce(target_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'A date and object payload are required' using errcode = '23514';
  end if;
  if target_phase = 'fabrication'
     and target_stage = 'sent_to_paint'
     and public.effective_stage_date(target_spool_revision_id, 'fabrication', 'start_fab') is null then
    raise exception 'Fabrication must start before painting is sent' using errcode = 'PQC32';
  end if;

  insert into public.construction_progress_events (
    project_id, spool_revision_id, phase, stage, occurred_on, payload, actor_id
  )
  values (
    context.project_id, target_spool_revision_id, target_phase, target_stage,
    target_occurred_on, coalesce(target_payload, '{}'::jsonb), auth.uid()
  )
  returning * into event_row;

  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'construction_progress_events', event_row.id,
          'record_construction_progress', to_jsonb(event_row));
  perform public.complete_command_receipt(
    context.project_id, 'record_construction_progress', target_idempotency_key,
    jsonb_build_object('event', to_jsonb(event_row))
  );
  return event_row;
end;
$$;
