-- Track 05: the shop weld progress command.
-- Every referential rule in dossier 16.5 is re-derived here. The browser's copy of these
-- rules exists to disable buttons; this copy is the one that decides.

-- Dossier 11.9: one obligation per method with coverage > 0. 100 percent is an NDE100
-- obligation from the start; a spot percentage is what Track 06 allocates into batches.
create or replace function public.generate_weld_obligations(ctx public.weld_context)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rule public.nde_matrix_rules;
  method_name text;
  coverage numeric;
  created_count integer := 0;
begin
  select * into rule
  from public.nde_matrix_rules matrix
  where matrix.project_id = ctx.project_id
    and matrix.service_class_id = ctx.service_class_id
    and matrix.weld_type_id = ctx.weld_type_id
    and matrix.weld_location = ctx.weld_location
    and matrix.status = 'active';

  if rule.id is null then
    raise exception
      'No active NDE matrix rule covers this service class, weld type and location'
      using errcode = 'PQC39';
  end if;

  foreach method_name in array array['rt', 'ut', 'mt', 'pt', 'pmi', 'ht']
  loop
    coverage := case method_name
      when 'rt' then rule.rt_coverage
      when 'ut' then rule.ut_coverage
      when 'mt' then rule.mt_coverage
      when 'pt' then rule.pt_coverage
      when 'pmi' then rule.pmi_coverage
      when 'ht' then rule.ht_coverage
    end;

    if coalesce(coverage, 0) <= 0 then
      continue;
    end if;

    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      method_name::public.ndt_method, coverage,
      case when coverage >= 100 then 'full' else 'spot' end, rule.id
    )
    on conflict (weld_joint_revision_id, method) do nothing;

    if found then
      created_count := created_count + 1;
    end if;
  end loop;

  if rule.pwht_required
     and (rule.pwht_thickness_threshold is null
          or coalesce(ctx.thickness_mm, 0) >= rule.pwht_thickness_threshold) then
    insert into public.pwht_requirements (
      project_id, weld_joint_revision_id, spool_revision_id,
      thickness_threshold_mm, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      rule.pwht_thickness_threshold, rule.id
    )
    on conflict (weld_joint_revision_id) do nothing;
  end if;

  return created_count;
end;
$$;

create or replace function public.record_weld_progress(
  target_weld_joint_revision_id uuid,
  subcontractor_id uuid,
  welding_procedure_id uuid,
  points jsonb,
  dates jsonb default '{}'::jsonb,
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
  wps public.project_welding_procedures;
  welder public.welder_qualifications;
  record_row public.weld_progress_records;
  existing public.weld_progress_records;
  point jsonb;
  v_point_type text;
  point_row public.weld_points;
  v_welded_on date;
  weld_date date;
  material_type_id uuid;
  root_cap_total numeric := 0;
  hot_fill_total numeric := 0;
begin
  ctx := public.weld_joint_context(target_weld_joint_revision_id);

  -- Capability, PDS scope and revision currency come from the spool-side guard so that a
  -- weld and a spool command can never disagree about who may write.
  perform public.assert_construction_target(ctx.spool_revision_id, 'fabrication.progress.record');

  if ctx.is_removed then
    raise exception 'This weld joint was removed in the current revision' using errcode = 'PQC31';
  end if;

  -- Dossier 16.5: Shop Weld Progress covers shop joints only.
  if ctx.weld_location <> 'shop' then
    raise exception
      'Joint % is a % weld and belongs to the assembly or erection module, not Shop Weld Progress',
      ctx.weld_number, ctx.weld_location
      using errcode = 'PQC30';
  end if;

  claim := public.claim_command_receipt(ctx.project_id, 'record_weld_progress', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into record_row from jsonb_populate_record(null::public.weld_progress_records, claim -> 'result' -> 'record');
    return record_row;
  end if;

  select * into existing from public.weld_progress_records
  where weld_joint_revision_id = target_weld_joint_revision_id;

  if existing.is_locked then
    raise exception
      'This joint has an accepted NDE result. Use the correction command to change it'
      using errcode = 'PQC36';
  end if;

  if not public.current_user_in_subcontractor_scope(ctx.project_id, subcontractor_id) then
    raise exception 'That subcontractor is outside your scope' using errcode = '42501';
  end if;

  weld_date := nullif(dates ->> 'weld_on', '')::date;

  -- WPS validation, dossier 11.6 -------------------------------------------------
  select * into wps from public.project_welding_procedures
  where id = welding_procedure_id and project_id = ctx.project_id;

  if wps.id is null then
    raise exception 'That WPS does not belong to this project' using errcode = 'PQC34';
  end if;
  if wps.status <> 'active' then
    raise exception 'WPS % is not active', wps.code using errcode = 'PQC34';
  end if;
  if wps.subcontractor_id is not null and wps.subcontractor_id <> subcontractor_id then
    raise exception 'WPS % is qualified for a different subcontractor', wps.code
      using errcode = 'PQC34';
  end if;
  if ctx.diameter_inch is null
     or ctx.diameter_inch < wps.diameter_from or ctx.diameter_inch > wps.diameter_to then
    raise exception 'WPS % does not cover a diameter of %"', wps.code, ctx.diameter_inch
      using errcode = 'PQC34';
  end if;
  if ctx.thickness_mm is null
     or ctx.thickness_mm < wps.thickness_from or ctx.thickness_mm > wps.thickness_to then
    raise exception 'WPS % does not cover a thickness of % mm', wps.code, ctx.thickness_mm
      using errcode = 'PQC34';
  end if;
  if weld_date is not null and wps.approved_on > weld_date then
    raise exception 'WPS % was approved on %, after the weld date', wps.code, wps.approved_on
      using errcode = 'PQC34';
  end if;

  -- The spool material class maps to a material type through the Track 02 referential.
  select mapped.material_type_id into material_type_id
  from public.project_spooling_material_classes mapped
  join public.project_spooling_material_types mtype on mtype.id = mapped.material_type_id
  where mapped.project_id = ctx.project_id
    and mapped.external_class_code = ctx.material_class
    and mapped.status = 'active';

  if ctx.material_class is not null and material_type_id is null then
    raise exception 'Material class % is not mapped to a material type', ctx.material_class
      using errcode = 'PQC39';
  end if;

  if material_type_id is not null and not exists (
    select 1 from public.project_spooling_material_types mtype
    join public.system_reference_entries entry on entry.code = mtype.code
    where mtype.id = material_type_id and entry.id = wps.material_type_id
  ) then
    raise exception 'WPS % is not qualified for the material of this spool', wps.code
      using errcode = 'PQC34';
  end if;

  -- The record ------------------------------------------------------------------
  insert into public.weld_progress_records (
    project_id, weld_joint_revision_id, spool_revision_id, subcontractor_id,
    welding_procedure_id, cutting_on, beveling_on, fitup_on, preheat_on, weld_on,
    dwir_number, qc_form_number, qc13_form_id, rework_code_id, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_weld_joint_revision_id, ctx.spool_revision_id, subcontractor_id,
    welding_procedure_id,
    nullif(dates ->> 'cutting_on', '')::date,
    nullif(dates ->> 'beveling_on', '')::date,
    nullif(dates ->> 'fitup_on', '')::date,
    nullif(dates ->> 'preheat_on', '')::date,
    weld_date,
    nullif(dates ->> 'dwir_number', ''),
    nullif(dates ->> 'qc_form_number', ''),
    nullif(dates ->> 'qc13_form_id', '')::uuid,
    nullif(dates ->> 'rework_code_id', '')::uuid,
    nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  )
  on conflict (weld_joint_revision_id) do update
    set subcontractor_id = excluded.subcontractor_id,
        welding_procedure_id = excluded.welding_procedure_id,
        cutting_on = excluded.cutting_on,
        beveling_on = excluded.beveling_on,
        fitup_on = excluded.fitup_on,
        preheat_on = excluded.preheat_on,
        weld_on = excluded.weld_on,
        dwir_number = excluded.dwir_number,
        qc_form_number = excluded.qc_form_number,
        qc13_form_id = excluded.qc13_form_id,
        rework_code_id = excluded.rework_code_id,
        version = public.weld_progress_records.version + 1,
        updated_at = timezone('utc', now())
  returning * into record_row;

  delete from public.weld_point_assignments where weld_progress_record_id = record_row.id;

  -- Points, dossier 7.3 and 16.5 -------------------------------------------------
  for point in select value from jsonb_array_elements(coalesce(points, '[]'::jsonb))
  loop
    v_point_type := point ->> 'point_type';
    v_welded_on := nullif(point ->> 'welded_on', '')::date;

    if v_welded_on is null then
      raise exception 'Every weld point needs a welded-on date' using errcode = '23514';
    end if;

    select * into point_row from public.weld_points
    where weld_joint_revision_id = target_weld_joint_revision_id
      and weld_points.point_type = v_point_type;

    if point_row.id is null then
      raise exception 'This joint has no % weld point in its definition', v_point_type
        using errcode = 'PQC35';
    end if;

    select * into welder from public.welder_qualifications
    where id = (point ->> 'welder_qualification_id')::uuid and project_id = ctx.project_id;

    if welder.id is null then
      raise exception 'That welder is not registered on this project' using errcode = 'PQC34';
    end if;
    if welder.status <> 'active' then
      raise exception 'Welder % is not active', welder.welder_code using errcode = 'PQC34';
    end if;
    if welder.subcontractor_id <> subcontractor_id then
      raise exception 'Welder % belongs to a different subcontractor', welder.welder_code
        using errcode = 'PQC34';
    end if;
    -- Per point, against that point's own date: a qualification that expired between the
    -- root and the cap invalidates the cap only.
    if welder.expires_on < v_welded_on then
      raise exception 'Welder % qualification expired on %', welder.welder_code, welder.expires_on
        using errcode = 'PQC34';
    end if;
    if not exists (
      select 1 from public.welder_wps_qualifications link
      where link.welder_qualification_id = welder.id and link.wps_id = welding_procedure_id
    ) then
      raise exception 'Welder % is not qualified for WPS %', welder.welder_code, wps.code
        using errcode = 'PQC34';
    end if;

    insert into public.weld_point_assignments (
      weld_progress_record_id, weld_point_id, point_type,
      welder_qualification_id, completion_percent, welded_on
    )
    values (
      record_row.id, point_row.id, v_point_type, welder.id,
      coalesce(nullif(point ->> 'completion_percent', '')::numeric, 0), v_welded_on
    );

    if v_point_type in ('root', 'cap') then
      root_cap_total := root_cap_total
        + coalesce(nullif(point ->> 'completion_percent', '')::numeric, 0);
    else
      hot_fill_total := hot_fill_total
        + coalesce(nullif(point ->> 'completion_percent', '')::numeric, 0);
    end if;
  end loop;

  -- Allocation totals only bind once the joint claims to be welded. A fit-up-only record
  -- carries no points and must stay recordable.
  if weld_date is not null then
    if root_cap_total <> 100 then
      raise exception 'Root and Cap must total 100 percent, not %', root_cap_total
        using errcode = 'PQC35';
    end if;
    if hot_fill_total not in (0, 100) then
      raise exception 'Heat and Fill must total either 0 or 100 percent, not %', hot_fill_total
        using errcode = 'PQC35';
    end if;

    perform public.generate_weld_obligations(ctx);
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'weld_progress_records', record_row.id,
    'record_weld_progress', to_jsonb(existing), to_jsonb(record_row)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_weld_progress', idempotency_key, jsonb_build_object('record', to_jsonb(record_row)));

  return record_row;
end;
$$;

revoke all on function
  public.generate_weld_obligations(public.weld_context),
  public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)
from public, anon;

-- generate_weld_obligations is internal: obligations follow welding, they are not requested.
revoke all on function public.generate_weld_obligations(public.weld_context) from authenticated;

grant execute on function public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)
  to authenticated;
