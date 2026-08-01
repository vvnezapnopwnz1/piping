-- Track 05: the release half of fabrication.
-- Dossier 16.6, 16.7 and 16.8. The derived states live in one view so the RPC guard and the
-- UI disabled state read the same expression - roadmap 17 requires them to agree.

create table public.support_progress_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  support_revision_id uuid not null references public.support_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null default 'fabrication',
  installed_on date not null,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (support_revision_id)
);

create table public.pwht_results (
  id uuid primary key default gen_random_uuid(),
  pwht_requirement_id uuid not null
    references public.pwht_requirements(id) on delete restrict,
  chart_number text not null check (length(trim(chart_number)) > 0),
  performed_on date not null,
  outcome text not null check (outcome in ('accepted', 'rejected')),
  comment text,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- A rejected run may be followed by a good one; exactly one acceptance survives.
create unique index pwht_results_one_accepted
  on public.pwht_results (pwht_requirement_id)
  where outcome = 'accepted';

create table public.quality_release_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null default 'fabrication',
  released_on date not null,
  released_by uuid references public.profiles(id) on delete set null,
  qc13_form_id uuid references public.qc13_progress_forms(id) on delete restrict,
  weld_count integer not null check (weld_count >= 0),
  obligation_count integer not null check (obligation_count >= 0),
  comment text,
  version integer not null default 1 check (version > 0),
  receipt_id uuid references public.command_receipts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id)
);

-- Plan section 3.11: the record carries the line service and a snapshot of the DFT
-- requirement, so a later referential change cannot rewrite what was inspected.
create table public.paint_progress_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  line_service_id uuid not null references public.project_line_services(id) on delete restrict,
  paint_matrix_rule_id uuid not null
    references public.project_paint_matrix_rules(id) on delete restrict,
  ral_code_id uuid not null references public.project_ral_codes(id) on delete restrict,
  required_final_dft_microns numeric(10, 3) not null check (required_final_dft_microns > 0),
  measured_dft_microns numeric(10, 3) check (measured_dft_microns is null or measured_dft_microns >= 0),
  blasting_on date,
  primer_on date,
  intermediate_coats smallint check (intermediate_coats is null or intermediate_coats >= 0),
  final_coats smallint check (final_coats is null or final_coats >= 0),
  w10p_form_number text,
  painted_on date,
  final_qc_on date,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id)
);

create table public.laydown_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  location_id uuid not null references public.project_locations(id) on delete restrict,
  stored_on date not null,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id)
);

-- The single source of derived fabrication truth ------------------------------
-- security_invoker keeps the caller's RLS in force; without it this view would be a
-- capability bypass for every construction table it touches.
create view public.spool_fabrication_readiness with (security_invoker = true) as
select
  sr.id as spool_revision_id,
  iso.project_id,
  rev.status as revision_status,
  bill.line_total,
  bill.line_checked,
  (bill.line_total > 0 and bill.line_total = bill.line_checked) as is_material_checked,
  bill.material_checked_on,
  welds.weld_total,
  welds.weld_complete,
  welds.last_weld_on,
  sup.support_total,
  sup.support_recorded,
  sup.last_support_on,
  quality.nde_pending,
  quality.pwht_pending,
  (
    bill.line_total > 0 and bill.line_total = bill.line_checked
    and welds.weld_total = welds.weld_complete
    and sup.support_total = sup.support_recorded
  ) as is_fabricated,
  case
    when bill.line_total > 0 and bill.line_total = bill.line_checked
      and welds.weld_total = welds.weld_complete
      and sup.support_total = sup.support_recorded
    then greatest(bill.material_checked_on, welds.last_weld_on, sup.last_support_on)
  end as fabricated_on,
  (
    bill.line_total > 0 and bill.line_total = bill.line_checked
    and welds.weld_total = welds.weld_complete
    and sup.support_total = sup.support_recorded
    and quality.nde_pending = 0
    and quality.pwht_pending = 0
  ) as is_releasable
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
cross join lateral (
  select
    count(line.id)::int as line_total,
    count(distinct item.spool_revision_material_id)::int as line_checked,
    max(mcr.checked_on) as material_checked_on
  from public.spool_revision_materials line
  left join public.material_check_items item
    on item.spool_revision_material_id = line.id
  left join public.material_check_records mcr
    on mcr.id = item.material_check_record_id
  where line.spool_revision_id = sr.id
) bill
cross join lateral (
  select
    count(wjr.id)::int as weld_total,
    count(progress.id) filter (where progress.weld_on is not null)::int as weld_complete,
    max(progress.weld_on) as last_weld_on
  from public.weld_joint_revisions wjr
  left join public.weld_progress_records progress
    on progress.weld_joint_revision_id = wjr.id
  where wjr.spool_revision_id = sr.id and not wjr.is_removed
) welds
cross join lateral (
  select
    count(supr.id)::int as support_total,
    count(progress.id)::int as support_recorded,
    max(progress.installed_on) as last_support_on
  from public.support_revisions supr
  left join public.support_progress_records progress
    on progress.support_revision_id = supr.id
  where supr.spool_revision_id = sr.id and not supr.is_removed
) sup
cross join lateral (
  select
    (select count(*)::int from public.nde_obligations obligation
     where obligation.spool_revision_id = sr.id and obligation.disposition = 'pending')
      as nde_pending,
    (select count(*)::int from public.pwht_requirements requirement
     where requirement.spool_revision_id = sr.id
       and not exists (
         select 1 from public.pwht_results result
         where result.pwht_requirement_id = requirement.id and result.outcome = 'accepted'
       ))
      as pwht_pending
) quality;

create or replace function public.record_support_progress(
  target_support_revision_id uuid,
  installed_on date,
  idempotency_key text default null
)
returns public.support_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owning_spool_revision_id uuid;
  ctx public.spool_context;
  claim jsonb;
  created public.support_progress_records;
begin
  select supr.spool_revision_id into owning_spool_revision_id
  from public.support_revisions supr where supr.id = target_support_revision_id;

  if owning_spool_revision_id is null then
    raise exception 'The support revision was not found' using errcode = 'PQC30';
  end if;

  ctx := public.assert_construction_target(
    owning_spool_revision_id, 'fabrication.progress.record');

  claim := public.claim_command_receipt(ctx.project_id, 'record_support_progress', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into created from public.support_progress_records
    where id = (claim -> 'result' ->> 'record_id')::uuid;
    return created;
  end if;

  if installed_on is null then
    raise exception 'An installation date is required' using errcode = '23514';
  end if;

  insert into public.support_progress_records (
    project_id, support_revision_id, spool_revision_id, installed_on, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_support_revision_id, owning_spool_revision_id, installed_on,
    nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  )
  on conflict (support_revision_id) do update set installed_on = excluded.installed_on
  returning * into created;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'support_progress_records', created.id,
    'record_support_progress', null, to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_support_progress', idempotency_key, jsonb_build_object('record_id', created.id));

  return created;
end;
$$;

create or replace function public.record_pwht_result(
  target_requirement_id uuid,
  chart_number text,
  performed_on date,
  outcome text,
  idempotency_key text default null
)
returns public.pwht_results
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requirement public.pwht_requirements;
  ctx public.spool_context;
  claim jsonb;
  created public.pwht_results;
begin
  select * into requirement from public.pwht_requirements where id = target_requirement_id;
  if requirement.id is null then
    raise exception 'The PWHT requirement was not found' using errcode = 'PQC30';
  end if;

  ctx := public.assert_construction_target(
    requirement.spool_revision_id, 'fabrication.qc.release');

  claim := public.claim_command_receipt(ctx.project_id, 'record_pwht_result', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into created from public.pwht_results
    where id = (claim -> 'result' ->> 'result_id')::uuid;
    return created;
  end if;

  if coalesce(trim(chart_number), '') = '' then
    raise exception 'A PWHT chart number is required' using errcode = '23514';
  end if;
  if outcome not in ('accepted', 'rejected') then
    raise exception 'A PWHT outcome must be accepted or rejected' using errcode = '23514';
  end if;

  insert into public.pwht_results (
    pwht_requirement_id, chart_number, performed_on, outcome, receipt_id, recorded_by
  )
  values (
    target_requirement_id, trim(chart_number), performed_on, outcome,
    nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  )
  returning * into created;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'pwht_results', created.id,
    'record_pwht_result', null, to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_pwht_result', idempotency_key, jsonb_build_object('result_id', created.id));

  return created;
end;
$$;

-- Dossier 16.7 and 30 prohibition 8. Four gates, each with its own message.
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
  if readiness.pwht_pending > 0 then
    raise exception '% joints still need an accepted PWHT result', readiness.pwht_pending
      using errcode = 'PQC37';
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

-- Dossier 16.8. DFT is captured through the W10P, so the form number is mandatory once a
-- measurement exists, and the measurement must clear the snapshot requirement.
create or replace function public.record_paint_progress(
  target_spool_revision_id uuid,
  line_service_id uuid,
  details jsonb default '{}'::jsonb,
  idempotency_key text default null
)
returns public.paint_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim jsonb;
  rule public.project_paint_matrix_rules;
  created public.paint_progress_records;
  sent_on date;
  painted_on date;
  final_qc_on date;
  measured numeric;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  claim := public.claim_command_receipt(ctx.project_id, 'record_paint_progress', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into created from public.paint_progress_records
    where id = (claim -> 'result' ->> 'record_id')::uuid;
    return created;
  end if;

  sent_on := public.effective_stage_date(target_spool_revision_id, 'sent_to_paint');
  if sent_on is null then
    raise exception 'Record Sent to Paint before recording painting activities'
      using errcode = 'PQC32';
  end if;

  select * into rule from public.project_paint_matrix_rules
  where project_id = ctx.project_id and project_paint_matrix_rules.line_service_id = record_paint_progress.line_service_id
    and status = 'active';

  if rule.id is null then
    raise exception 'No active paint matrix rule exists for that line service'
      using errcode = 'PQC39';
  end if;

  painted_on := nullif(details ->> 'painted_on', '')::date;
  final_qc_on := nullif(details ->> 'final_qc_on', '')::date;
  measured := nullif(details ->> 'measured_dft_microns', '')::numeric;

  if painted_on is not null and painted_on < sent_on then
    raise exception 'The painted date cannot precede the Sent to Paint date' using errcode = 'PQC32';
  end if;
  if final_qc_on is not null and painted_on is null then
    raise exception 'Record the painted date before the final QC date' using errcode = 'PQC32';
  end if;
  if measured is not null then
    if coalesce(trim(details ->> 'w10p_form_number'), '') = '' then
      raise exception 'A DFT measurement requires the W10P form number' using errcode = '23514';
    end if;
    if measured < rule.required_final_dft_microns then
      raise exception 'The measured DFT of % microns is below the required % microns',
        measured, rule.required_final_dft_microns
        using errcode = '23514';
    end if;
  end if;

  insert into public.paint_progress_records (
    project_id, spool_revision_id, line_service_id, paint_matrix_rule_id, ral_code_id,
    required_final_dft_microns, measured_dft_microns, blasting_on, primer_on,
    intermediate_coats, final_coats, w10p_form_number, painted_on, final_qc_on,
    receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_spool_revision_id, record_paint_progress.line_service_id, rule.id, rule.ral_code_id,
    rule.required_final_dft_microns, measured,
    nullif(details ->> 'blasting_on', '')::date,
    nullif(details ->> 'primer_on', '')::date,
    nullif(details ->> 'intermediate_coats', '')::smallint,
    nullif(details ->> 'final_coats', '')::smallint,
    nullif(details ->> 'w10p_form_number', ''),
    painted_on, final_qc_on, nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  )
  on conflict (spool_revision_id) do update
    set line_service_id = excluded.line_service_id,
        paint_matrix_rule_id = excluded.paint_matrix_rule_id,
        ral_code_id = excluded.ral_code_id,
        required_final_dft_microns = excluded.required_final_dft_microns,
        measured_dft_microns = excluded.measured_dft_microns,
        blasting_on = excluded.blasting_on,
        primer_on = excluded.primer_on,
        intermediate_coats = excluded.intermediate_coats,
        final_coats = excluded.final_coats,
        w10p_form_number = excluded.w10p_form_number,
        painted_on = excluded.painted_on,
        final_qc_on = excluded.final_qc_on,
        updated_at = timezone('utc', now())
  returning * into created;

  if painted_on is not null
     and public.effective_stage_date(
           target_spool_revision_id, 'painted') is null then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on, actor_id
    )
    values (ctx.project_id, target_spool_revision_id, 'fabrication', 'painted', painted_on, auth.uid());
  end if;

  if final_qc_on is not null
     and public.effective_stage_date(
           target_spool_revision_id, 'final_qc') is null then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on, actor_id
    )
    values (ctx.project_id, target_spool_revision_id, 'fabrication', 'final_qc', final_qc_on, auth.uid());
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'paint_progress_records', created.id,
    'record_paint_progress', null, to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_paint_progress', idempotency_key, jsonb_build_object('record_id', created.id));

  return created;
end;
$$;

create or replace function public.record_laydown(
  target_spool_revision_id uuid,
  location_id uuid,
  stored_on date,
  idempotency_key text default null
)
returns public.laydown_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim jsonb;
  created public.laydown_records;
  final_qc_on date;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  claim := public.claim_command_receipt(ctx.project_id, 'record_laydown', idempotency_key);

  if claim ->> 'status' = 'completed' then
    select * into created from public.laydown_records
    where id = (claim -> 'result' ->> 'record_id')::uuid;
    return created;
  end if;

  final_qc_on := public.effective_stage_date(target_spool_revision_id, 'final_qc');
  if final_qc_on is null then
    raise exception 'Record the final QC before moving the spool to laydown'
      using errcode = 'PQC32';
  end if;
  if stored_on < final_qc_on then
    raise exception 'The laydown date cannot precede the final QC date' using errcode = 'PQC32';
  end if;
  if not exists (
    select 1 from public.project_locations location
    where location.id = location_id and location.project_id = ctx.project_id
      and location.status = 'active'
  ) then
    raise exception 'That laydown location does not belong to this project' using errcode = 'PQC30';
  end if;

  insert into public.laydown_records (
    project_id, spool_revision_id, location_id, stored_on, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_spool_revision_id, location_id, stored_on, nullif(claim ->> 'receipt_id', '')::uuid, auth.uid()
  )
  on conflict (spool_revision_id) do update
    set location_id = excluded.location_id, stored_on = excluded.stored_on
  returning * into created;

  if public.effective_stage_date(target_spool_revision_id, 'laydown') is null then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on, actor_id
    )
    values (ctx.project_id, target_spool_revision_id, 'fabrication', 'laydown', stored_on, auth.uid());
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'laydown_records', created.id,
    'record_laydown', null, to_jsonb(created)
  );

  perform public.complete_command_receipt(
    ctx.project_id, 'record_laydown', idempotency_key, jsonb_build_object('record_id', created.id));

  return created;
end;
$$;

-- RLS and grants ---------------------------------------------------------------

alter table public.support_progress_records enable row level security;
alter table public.pwht_results enable row level security;
alter table public.quality_release_records enable row level security;
alter table public.paint_progress_records enable row level security;
alter table public.laydown_records enable row level security;

create policy "read support progress" on public.support_progress_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read pwht results" on public.pwht_results
  for select to authenticated
  using (
    exists (
      select 1 from public.pwht_requirements requirement
      where requirement.id = pwht_results.pwht_requirement_id
        and (public.current_user_has_capability(requirement.project_id, 'fabrication.view')
             or public.current_user_has_capability(requirement.project_id, 'nde.view'))
    )
  );

create policy "read quality release records" on public.quality_release_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read paint progress" on public.paint_progress_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read laydown records" on public.laydown_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

grant select on
  public.support_progress_records,
  public.pwht_results,
  public.quality_release_records,
  public.paint_progress_records,
  public.laydown_records,
  public.spool_fabrication_readiness
to authenticated;

revoke insert, update, delete, truncate on
  public.support_progress_records,
  public.pwht_results,
  public.quality_release_records,
  public.paint_progress_records,
  public.laydown_records
from authenticated, anon;

revoke all on function
  public.record_support_progress(uuid, date, text),
  public.record_pwht_result(uuid, text, date, text, text),
  public.release_quality_record(uuid, date, uuid, text, text),
  public.record_paint_progress(uuid, uuid, jsonb, text),
  public.record_laydown(uuid, uuid, date, text)
from public, anon;

grant execute on function
  public.record_support_progress(uuid, date, text),
  public.record_pwht_result(uuid, text, date, text, text),
  public.release_quality_record(uuid, date, uuid, text, text),
  public.record_paint_progress(uuid, uuid, jsonb, text),
  public.record_laydown(uuid, uuid, date, text),
  public.effective_stage_date(uuid, public.construction_stage)
to authenticated;
