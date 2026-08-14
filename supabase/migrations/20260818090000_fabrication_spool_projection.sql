-- A bounded read model for Fabrication. The immutable ledgers and detail records remain the
-- source of truth; this table prevents a project list from recalculating every spool's readiness
-- through nested security-invoker views on every screen load.
create table public.fabrication_spool_projections (
  spool_revision_id uuid primary key references public.spool_revisions(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  pds_area_id uuid references public.project_pds_areas(id) on delete restrict,
  iso_number text not null,
  spool_number text not null,
  revision_number text not null,
  revision_status text not null,
  is_removed boolean not null default false,
  start_fab_on date,
  material_check_on date,
  fabricated_on date,
  qc_release_on date,
  sent_to_paint_on date,
  painted_on date,
  final_qc_on date,
  laydown_on date,
  current_stage public.construction_stage,
  is_fabricated boolean not null default false,
  is_releasable boolean not null default false,
  line_total integer not null default 0 check (line_total >= 0),
  line_checked integer not null default 0 check (line_checked >= 0),
  weld_total integer not null default 0 check (weld_total >= 0),
  weld_complete integer not null default 0 check (weld_complete >= 0),
  support_total integer not null default 0 check (support_total >= 0),
  support_recorded integer not null default 0 check (support_recorded >= 0),
  nde_pending integer not null default 0 check (nde_pending >= 0),
  pwht_pending integer not null default 0 check (pwht_pending >= 0),
  projection_version bigint not null default 1 check (projection_version > 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create index fabrication_spool_projections_project_order_idx
  on public.fabrication_spool_projections (project_id, iso_number, spool_number, spool_revision_id);
create index fabrication_spool_projections_project_stage_order_idx
  on public.fabrication_spool_projections (project_id, current_stage, spool_number, spool_revision_id);
create index fabrication_spool_projections_project_pds_order_idx
  on public.fabrication_spool_projections (project_id, pds_area_id, iso_number, spool_number, spool_revision_id);

-- This is deliberately an internal SECURITY DEFINER helper. It queries one spool revision only,
-- so its cost is bounded by that spool's BOM, joints, supports and obligations rather than by all
-- visible spools in the project. Every browser-facing read remains capability/PDS checked below.
create function public.recompute_fabrication_spool_projection(target_spool_revision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(target_spool_revision_id::text, 0));

  insert into public.fabrication_spool_projections (
    spool_revision_id, project_id, pds_area_id, iso_number, spool_number, revision_number,
    revision_status, is_removed,
    start_fab_on, material_check_on, fabricated_on, qc_release_on, sent_to_paint_on,
    painted_on, final_qc_on, laydown_on, current_stage,
    is_fabricated, is_releasable,
    line_total, line_checked, weld_total, weld_complete, support_total, support_recorded,
    nde_pending, pwht_pending
  )
  select
    sr.id,
    iso.project_id,
    rev.pds_area_id,
    iso.iso_number,
    spool.spool_number,
    rev.revision_number::text,
    rev.status::text,
    sr.is_removed,
    stages.start_fab_on,
    stages.material_check_on,
    readiness.fabricated_on,
    stages.qc_release_on,
    stages.sent_to_paint_on,
    stages.painted_on,
    stages.final_qc_on,
    stages.laydown_on,
    case
      when stages.laydown_on is not null then 'laydown'
      when stages.final_qc_on is not null then 'final_qc'
      when stages.painted_on is not null then 'painted'
      when stages.sent_to_paint_on is not null then 'sent_to_paint'
      when stages.qc_release_on is not null then 'qc_release'
      when readiness.is_fabricated then 'fabricated'
      when stages.material_check_on is not null then 'material_check'
      when stages.start_fab_on is not null then 'start_fab'
    end::public.construction_stage,
    readiness.is_fabricated,
    readiness.is_releasable,
    readiness.line_total,
    readiness.line_checked,
    readiness.weld_total,
    readiness.weld_complete,
    readiness.support_total,
    readiness.support_recorded,
    readiness.nde_pending,
    readiness.pwht_pending
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  join public.spools spool on spool.id = sr.spool_id
  cross join lateral (
    select
      max(event.occurred_on) filter (where event.stage = 'start_fab') as start_fab_on,
      max(event.occurred_on) filter (where event.stage = 'material_check') as material_check_on,
      max(event.occurred_on) filter (where event.stage = 'qc_release') as qc_release_on,
      max(event.occurred_on) filter (where event.stage = 'sent_to_paint') as sent_to_paint_on,
      max(event.occurred_on) filter (where event.stage = 'painted') as painted_on,
      max(event.occurred_on) filter (where event.stage = 'final_qc') as final_qc_on,
      max(event.occurred_on) filter (where event.stage = 'laydown') as laydown_on
    from public.construction_progress_events event
    where event.spool_revision_id = sr.id
      and event.phase = 'fabrication'
      and event.source <> 'compensation'
      and not exists (
        select 1
        from public.construction_progress_events cancel
        where cancel.source = 'compensation'
          and cancel.compensates_event_id = event.id
      )
  ) stages
  cross join lateral (
    select
      bill.line_total,
      bill.line_checked,
      welds.weld_total,
      welds.weld_complete,
      supports.support_total,
      supports.support_recorded,
      obligations.nde_pending,
      obligations.pwht_pending,
      (
        bill.line_total > 0
        and bill.line_total = bill.line_checked
        and welds.weld_total = welds.weld_complete
        and supports.support_total = supports.support_recorded
      ) as is_fabricated,
      case
        when bill.line_total > 0
          and bill.line_total = bill.line_checked
          and welds.weld_total = welds.weld_complete
          and supports.support_total = supports.support_recorded
        then greatest(bill.material_checked_on, welds.last_weld_on, supports.last_support_on)
      end as fabricated_on,
      (
        bill.line_total > 0
        and bill.line_total = bill.line_checked
        and welds.weld_total = welds.weld_complete
        and supports.support_total = supports.support_recorded
        and obligations.nde_pending = 0
        and obligations.pwht_pending = 0
      ) as is_releasable
    from lateral (
      select
        count(line.id)::int as line_total,
        count(distinct item.spool_revision_material_id)::int as line_checked,
        max(record.checked_on) as material_checked_on
      from public.spool_revision_materials line
      left join public.material_check_items item on item.spool_revision_material_id = line.id
      left join public.material_check_records record on record.id = item.material_check_record_id
      where line.spool_revision_id = sr.id
    ) bill
    cross join lateral (
      select
        count(joint.id)::int as weld_total,
        count(progress.id) filter (where progress.weld_on is not null)::int as weld_complete,
        max(progress.weld_on) as last_weld_on
      from public.weld_joint_revisions joint
      left join public.weld_progress_records progress on progress.weld_joint_revision_id = joint.id
      where joint.spool_revision_id = sr.id
        and not joint.is_removed
        and joint.weld_location = 'shop'
    ) welds
    cross join lateral (
      select
        count(support.id)::int as support_total,
        count(progress.id)::int as support_recorded,
        max(progress.installed_on) as last_support_on
      from public.support_revisions support
      left join public.support_progress_records progress on progress.support_revision_id = support.id
      where support.spool_revision_id = sr.id and not support.is_removed
    ) supports
    cross join lateral (
      select
        (
          select count(*)::int
          from public.nde_obligations obligation
          where obligation.spool_revision_id = sr.id
            and obligation.disposition not in ('satisfied', 'waived', 'superseded')
        ) as nde_pending,
        (
          select count(*)::int
          from public.pwht_requirements requirement
          where requirement.spool_revision_id = sr.id
            and not exists (
              select 1
              from public.pwht_results result
              where result.pwht_requirement_id = requirement.id
                and result.outcome = 'accepted'
            )
        ) as pwht_pending
    ) obligations
  ) readiness
  where sr.id = target_spool_revision_id
  on conflict (spool_revision_id) do update
    set project_id = excluded.project_id,
        pds_area_id = excluded.pds_area_id,
        iso_number = excluded.iso_number,
        spool_number = excluded.spool_number,
        revision_number = excluded.revision_number,
        revision_status = excluded.revision_status,
        is_removed = excluded.is_removed,
        start_fab_on = excluded.start_fab_on,
        material_check_on = excluded.material_check_on,
        fabricated_on = excluded.fabricated_on,
        qc_release_on = excluded.qc_release_on,
        sent_to_paint_on = excluded.sent_to_paint_on,
        painted_on = excluded.painted_on,
        final_qc_on = excluded.final_qc_on,
        laydown_on = excluded.laydown_on,
        current_stage = excluded.current_stage,
        is_fabricated = excluded.is_fabricated,
        is_releasable = excluded.is_releasable,
        line_total = excluded.line_total,
        line_checked = excluded.line_checked,
        weld_total = excluded.weld_total,
        weld_complete = excluded.weld_complete,
        support_total = excluded.support_total,
        support_recorded = excluded.support_recorded,
        nde_pending = excluded.nde_pending,
        pwht_pending = excluded.pwht_pending,
        projection_version = public.fabrication_spool_projections.projection_version + 1,
        updated_at = timezone('utc', now());
end;
$$;

create function public.list_fabrication_spools(
  target_project_id uuid,
  target_stage text default null,
  after_iso_number text default null,
  after_spool_number text default null,
  after_spool_revision_id uuid default null,
  page_limit integer default 50
)
returns table (
  spool_revision_id uuid,
  project_id uuid,
  iso_number text,
  spool_number text,
  revision_number text,
  pds_area_id uuid,
  current_stage public.construction_stage,
  start_fab_on date,
  material_check_on date,
  fabricated_on date,
  qc_release_on date,
  sent_to_paint_on date,
  painted_on date,
  final_qc_on date,
  laydown_on date,
  is_fabricated boolean,
  is_releasable boolean,
  line_total integer,
  line_checked integer,
  weld_total integer,
  weld_complete integer,
  support_total integer,
  support_recorded integer,
  nde_pending integer,
  pwht_pending integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if page_limit < 1 or page_limit > 100 then
    raise exception 'The fabrication page limit must be between 1 and 100' using errcode = '23514';
  end if;
  if not public.current_user_has_capability(target_project_id, 'fabrication.view') then
    raise exception 'Fabrication view permission is required' using errcode = '42501';
  end if;
  if after_spool_revision_id is not null
     and (after_iso_number is null or after_spool_number is null) then
    raise exception 'A fabrication cursor must include ISO and spool numbers' using errcode = '23514';
  end if;

  return query
  select
    projection.spool_revision_id,
    projection.project_id,
    projection.iso_number,
    projection.spool_number,
    projection.revision_number,
    projection.pds_area_id,
    projection.current_stage,
    projection.start_fab_on,
    projection.material_check_on,
    projection.fabricated_on,
    projection.qc_release_on,
    projection.sent_to_paint_on,
    projection.painted_on,
    projection.final_qc_on,
    projection.laydown_on,
    projection.is_fabricated,
    projection.is_releasable,
    projection.line_total,
    projection.line_checked,
    projection.weld_total,
    projection.weld_complete,
    projection.support_total,
    projection.support_recorded,
    projection.nde_pending,
    projection.pwht_pending
  from public.fabrication_spool_projections projection
  where projection.project_id = target_project_id
    and projection.revision_status = 'accepted'
    and not projection.is_removed
    and public.current_user_in_pds_scope(projection.project_id, projection.pds_area_id)
    and (target_stage is null or projection.current_stage::text = target_stage)
    and (
      after_spool_revision_id is null
      or (projection.iso_number, projection.spool_number, projection.spool_revision_id)
           > (after_iso_number, after_spool_number, after_spool_revision_id)
    )
  order by projection.iso_number, projection.spool_number, projection.spool_revision_id
  limit page_limit;
end;
$$;

create function public.get_fabrication_spool(target_spool_revision_id uuid)
returns setof public.fabrication_spool_projections
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target public.fabrication_spool_projections;
begin
  select * into target
  from public.fabrication_spool_projections
  where spool_revision_id = target_spool_revision_id;
  if not found then
    raise exception 'Fabrication spool was not found' using errcode = 'PQC30';
  end if;
  if not public.current_user_has_capability(target.project_id, 'fabrication.view')
     or not public.current_user_in_pds_scope(target.project_id, target.pds_area_id) then
    raise exception 'Fabrication view permission is required' using errcode = '42501';
  end if;
  return next target;
end;
$$;

alter table public.fabrication_spool_projections enable row level security;
revoke all on public.fabrication_spool_projections from public, anon, authenticated;
revoke all on function public.recompute_fabrication_spool_projection(uuid) from public, anon, authenticated;
revoke all on function public.list_fabrication_spools(uuid, text, text, text, uuid, integer) from public, anon;
revoke all on function public.get_fabrication_spool(uuid) from public, anon;
grant execute on function public.list_fabrication_spools(uuid, text, text, text, uuid, integer) to authenticated;
grant execute on function public.get_fabrication_spool(uuid) to authenticated;
