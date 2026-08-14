-- Actual count-based S-curve. A project may configure editable progress weights, but there is no
-- approved mapping from those activities to projection stages, so this intentionally reports
-- spools that have reached each real milestone rather than inventing a weighted percentage.
create function public.fabrication_progress_s_curve(target_project_id uuid)
returns table (
  week_start date,
  start_fab_count bigint,
  material_check_count bigint,
  fabricated_count bigint,
  qc_release_count bigint,
  sent_to_paint_count bigint,
  painted_count bigint,
  final_qc_count bigint,
  laydown_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(target_project_id, 'fabrication.view') then
    raise exception 'Fabrication view permission is required' using errcode = '42501';
  end if;

  -- date_trunc('week') starts an ISO week on Monday. Projection dates are UTC calendar dates;
  -- each bucket reports the cumulative position at the end of its Sunday.
  return query
  with scoped as (
    select projection.*
    from public.fabrication_spool_projections projection
    where projection.project_id = target_project_id
      and projection.revision_status = 'accepted'
      and not projection.is_removed
      and public.current_user_in_pds_scope(projection.project_id, projection.pds_area_id)
  ), activity_dates as (
    select date_trunc('week', activity.stage_date)::date as week_start
    from scoped projection
    cross join lateral (
      values
        (projection.start_fab_on),
        (projection.material_check_on),
        (projection.fabricated_on),
        (projection.qc_release_on),
        (projection.sent_to_paint_on),
        (projection.painted_on),
        (projection.final_qc_on),
        (projection.laydown_on)
    ) as activity(stage_date)
    where activity.stage_date is not null
  ), bounds as (
    select min(activity_dates.week_start) as first_week, max(activity_dates.week_start) as last_week
    from activity_dates
  ), weeks as (
    select generate_series(bounds.first_week, bounds.last_week, interval '1 week')::date as week_start
    from bounds
    where bounds.first_week is not null
  )
  select
    weeks.week_start,
    count(*) filter (where projection.start_fab_on <= weeks.week_start + 6),
    count(*) filter (where projection.material_check_on <= weeks.week_start + 6),
    count(*) filter (where projection.fabricated_on <= weeks.week_start + 6),
    count(*) filter (where projection.qc_release_on <= weeks.week_start + 6),
    count(*) filter (where projection.sent_to_paint_on <= weeks.week_start + 6),
    count(*) filter (where projection.painted_on <= weeks.week_start + 6),
    count(*) filter (where projection.final_qc_on <= weeks.week_start + 6),
    count(*) filter (where projection.laydown_on <= weeks.week_start + 6)
  from weeks
  cross join scoped projection
  group by weeks.week_start
  order by weeks.week_start;
end;
$$;

revoke all on function public.fabrication_progress_s_curve(uuid) from public, anon;
grant execute on function public.fabrication_progress_s_curve(uuid) to authenticated;
