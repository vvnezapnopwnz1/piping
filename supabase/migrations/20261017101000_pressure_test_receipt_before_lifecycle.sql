-- A completed command is historical evidence: return it before mutable pack
-- lifecycle gates. The target still has to exist and the caller still needs
-- the command capability, so an archived receipt never bypasses authorization.

create or replace function public.record_pressure_test_stage(
  target_test_pack_id uuid,
  target_stage text,
  target_occurred_on date,
  target_idempotency_key text default null::text
)
returns public.pressure_test_stage_events
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  pack public.test_packs;
  event_row public.pressure_test_stage_events;
  claimed jsonb;
  prior_date date;
  normalized_payload jsonb;
begin
  select * into pack from public.test_packs where id = target_test_pack_id for update;
  if pack.id is null then
    raise exception 'Test Pack is missing' using errcode = 'PQC88';
  end if;
  if not public.current_user_has_capability(pack.project_id, 'testpack.manage') then
    raise exception 'Test Pack management is not authorized' using errcode = '42501';
  end if;

  normalized_payload := jsonb_build_object(
    'test_pack_id', target_test_pack_id,
    'stage', target_stage,
    'occurred_on', target_occurred_on
  );

  claimed := public.claim_command_receipt(pack.project_id, 'record_pressure_test_stage', target_idempotency_key, normalized_payload);
  if claimed ->> 'status' = 'completed' then
    select * into event_row from public.pressure_test_stage_events where id = (claimed -> 'result' ->> 'id')::uuid;
    return event_row;
  end if;

  -- Reuse the existing, single source of truth for the active-pack command gate.
  -- A failed guard rolls back the just-created receipt with the whole command.
  pack := public.pressure_test_assert_pack(target_test_pack_id);

  if target_stage not in ('testing_started', 'testing_completed', 'precommissioning_completed') then
    raise exception 'Unsupported pressure-test stage' using errcode = 'PQT08';
  end if;

  if not exists (select 1 from public.blinding_records where test_pack_id = pack.id) then
    raise exception 'Blinding must be completed first' using errcode = 'PQT09';
  end if;

  if target_stage = 'testing_completed' and not exists (
    select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_started'
  ) then
    raise exception 'Testing must be started first' using errcode = 'PQT10';
  end if;

  if target_stage = 'precommissioning_completed' and not exists (
    select 1 from public.pressure_test_stage_events where test_pack_id = pack.id and stage = 'testing_completed'
  ) then
    raise exception 'Testing must be completed first' using errcode = 'PQT11';
  end if;

  if target_stage = 'precommissioning_completed' and exists (
    select 1
    from public.flange_joint_readiness flange
    join public.test_pack_isometrics member on member.isometric_id = flange.isometric_id
    where member.test_pack_id = pack.id
      and member.removed_at is null
      and flange.revision_status = 'accepted'
      and not flange.is_removed
      and flange.requires_reinstatement
      and flange.category_code = 'Y'
      and not exists (
        select 1
        from public.flange_reinstatement_records reinstatement
        where reinstatement.flange_joint_revision_id = flange.flange_joint_revision_id
          and reinstatement.superseded_at is null
      )
  ) then
    raise exception 'Every Y flange must be reinstated before pre-commissioning' using errcode = 'PQT16';
  end if;

  select max(occurred_on) into prior_date from public.pressure_test_stage_events where test_pack_id = pack.id;
  if prior_date is not null and target_occurred_on < prior_date then
    raise exception 'Pressure-test dates must be monotonic' using errcode = 'PQT12';
  end if;

  insert into public.pressure_test_stage_events (
    project_id, test_pack_id, stage, occurred_on, recorded_by
  ) values (
    pack.project_id, pack.id, target_stage, target_occurred_on, auth.uid()
  ) returning * into event_row;

  perform public.complete_command_receipt(
    pack.project_id, 'record_pressure_test_stage', target_idempotency_key,
    jsonb_build_object('id', event_row.id)
  );

  return event_row;
end;
$$;
