-- Erection uses the existing per-spool projection refresh boundary. Keeping the additional facts
-- on that row avoids aggregating security-invoker readiness views across an entire large project.
alter table public.fabrication_spool_projections
  add column to_site_on date,
  add column erected_on date,
  add column welded_bolted_on date,
  add column supported_on date,
  add column current_erection_stage public.construction_stage,
  add column is_rft boolean not null default false,
  add column rft_on date,
  add column field_weld_total integer not null default 0 check (field_weld_total >= 0),
  add column field_weld_complete integer not null default 0 check (field_weld_complete >= 0),
  add column field_support_total integer not null default 0 check (field_support_total >= 0),
  add column field_support_recorded integer not null default 0 check (field_support_recorded >= 0),
  add column field_nde_pending integer not null default 0 check (field_nde_pending >= 0),
  add column field_pwht_pending integer not null default 0 check (field_pwht_pending >= 0);

create index fabrication_spool_projections_project_erection_stage_idx
  on public.fabrication_spool_projections (project_id, current_erection_stage, spool_revision_id);

create function public.recompute_erection_spool_projection(target_spool_revision_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(target_spool_revision_id::text, 1));
  update public.fabrication_spool_projections projection
  set to_site_on = facts.to_site_on, erected_on = facts.erected_on,
      welded_bolted_on = facts.welded_bolted_on, supported_on = facts.supported_on,
      current_erection_stage = facts.current_erection_stage, is_rft = facts.is_rft, rft_on = facts.rft_on,
      field_weld_total = facts.field_weld_total, field_weld_complete = facts.field_weld_complete,
      field_support_total = facts.field_support_total, field_support_recorded = facts.field_support_recorded,
      field_nde_pending = facts.nde_pending, field_pwht_pending = facts.pwht_pending,
      updated_at = timezone('utc', now())
  from (
    select sr.id,
      dates.to_site_on, dates.erected_on, dates.welded_bolted_on, dates.supported_on,
      welds.field_weld_total, welds.field_weld_complete, supports.field_support_total, supports.field_support_recorded,
      quality.nde_pending, quality.pwht_pending,
      case when dates.welded_bolted_on is not null and dates.supported_on is not null and quality.nde_pending = 0 and quality.pwht_pending = 0 then true else false end as is_rft,
      case when dates.welded_bolted_on is not null and dates.supported_on is not null and quality.nde_pending = 0 and quality.pwht_pending = 0 then greatest(dates.welded_bolted_on, dates.supported_on, welds.last_weld_on, supports.last_support_on) end as rft_on,
      case when dates.welded_bolted_on is not null and dates.supported_on is not null and quality.nde_pending = 0 and quality.pwht_pending = 0 then 'rft'::public.construction_stage
           when dates.supported_on is not null then 'supported'::public.construction_stage
           when dates.welded_bolted_on is not null then 'welded_bolted'::public.construction_stage
           when dates.erected_on is not null then 'erected'::public.construction_stage
           when dates.to_site_on is not null then 'to_site'::public.construction_stage end as current_erection_stage
    from public.spool_revisions sr
    cross join lateral (select max(occurred_on) filter (where stage = 'to_site') as to_site_on, max(occurred_on) filter (where stage = 'erected') as erected_on, max(occurred_on) filter (where stage = 'welded_bolted') as welded_bolted_on, max(occurred_on) filter (where stage = 'supported') as supported_on from public.spool_stage_events where spool_revision_id = sr.id and phase = 'erection') dates
    cross join lateral (select count(j.id)::int as field_weld_total, count(p.id) filter (where p.phase = 'erection' and p.weld_on is not null)::int as field_weld_complete, max(p.weld_on) filter (where p.phase = 'erection') as last_weld_on from public.weld_joint_revisions j left join public.weld_progress_records p on p.weld_joint_revision_id = j.id where j.spool_revision_id = sr.id and j.weld_location = 'field' and not j.is_removed) welds
    cross join lateral (select count(s.id)::int as field_support_total, count(p.id) filter (where p.phase = 'erection')::int as field_support_recorded, max(p.installed_on) filter (where p.phase = 'erection') as last_support_on from public.support_revisions s left join public.support_progress_records p on p.support_revision_id = s.id where s.spool_revision_id = sr.id and not s.is_removed) supports
    cross join lateral (select count(o.id) filter (where o.disposition not in ('satisfied','waived','superseded'))::int as nde_pending, count(q.id) filter (where not exists (select 1 from public.pwht_results result where result.pwht_requirement_id = q.id and result.outcome = 'accepted'))::int as pwht_pending from public.weld_joint_revisions j left join public.nde_obligations o on o.weld_joint_revision_id = j.id left join public.pwht_requirements q on q.weld_joint_revision_id = j.id where j.spool_revision_id = sr.id and j.weld_location = 'field' and not j.is_removed) quality
    where sr.id = target_spool_revision_id
  ) facts where projection.spool_revision_id = facts.id;
end; $$;

create function public.refresh_erection_projection_after_fabrication_refresh()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.recompute_erection_spool_projection(new.spool_revision_id); return new; end; $$;

create trigger erection_projection_after_fabrication_refresh
after insert or update of project_id, pds_area_id, revision_status, is_removed, start_fab_on, material_check_on, fabricated_on, qc_release_on, sent_to_paint_on, painted_on, final_qc_on, laydown_on, current_stage, is_fabricated, is_releasable, line_total, line_checked, weld_total, weld_complete, support_total, support_recorded, nde_pending, pwht_pending
on public.fabrication_spool_projections for each row execute function public.refresh_erection_projection_after_fabrication_refresh();

create function public.erection_progress_s_curve(target_project_id uuid)
returns table (week_start date, to_site_count bigint, erected_count bigint, welded_bolted_count bigint, supported_count bigint, rft_count bigint)
language plpgsql security definer set search_path = public, pg_temp as $$ begin
  if not public.current_user_has_capability(target_project_id, 'erection.view') then raise exception 'Erection view permission is required' using errcode = '42501'; end if;
  return query with scoped as (select * from public.fabrication_spool_projections p where p.project_id = target_project_id and p.revision_status = 'accepted' and not p.is_removed and public.current_user_in_pds_scope(p.project_id,p.pds_area_id)), bounds as (select min(date_trunc('week', d)::date) first_week,max(date_trunc('week', d)::date) last_week from scoped cross join lateral (values(to_site_on),(erected_on),(welded_bolted_on),(supported_on),(rft_on)) v(d) where d is not null), weeks as (select generate_series(first_week,last_week,interval '1 week')::date week_start from bounds where first_week is not null) select w.week_start,count(*) filter(where p.to_site_on <= w.week_start+6),count(*) filter(where p.erected_on <= w.week_start+6),count(*) filter(where p.welded_bolted_on <= w.week_start+6),count(*) filter(where p.supported_on <= w.week_start+6),count(*) filter(where p.rft_on <= w.week_start+6) from weeks w cross join scoped p group by w.week_start order by w.week_start;
end; $$;

create function public.erection_stage_distribution(target_project_id uuid)
returns table (stage text, stage_order integer, spool_count bigint)
language plpgsql security definer set search_path = public, pg_temp as $$ begin
  if not public.current_user_has_capability(target_project_id, 'erection.view') then raise exception 'Erection view permission is required' using errcode = '42501'; end if;
  return query with stages(stage,stage_order) as (values ('not_started'::text,0),('to_site',1),('erected',2),('welded_bolted',3),('supported',4),('rft',5)), counts as (select coalesce(current_erection_stage::text,'not_started') stage,count(*) spool_count from public.fabrication_spool_projections p where p.project_id=target_project_id and p.revision_status='accepted' and not p.is_removed and public.current_user_in_pds_scope(p.project_id,p.pds_area_id) group by 1) select s.stage,s.stage_order,coalesce(c.spool_count,0) from stages s left join counts c using(stage) order by s.stage_order;
end; $$;

create function public.erection_rft_blocker_distribution(target_project_id uuid)
returns table (blocker text, blocker_order integer, spool_count bigint)
language plpgsql security definer set search_path = public, pg_temp as $$ begin
  if not public.current_user_has_capability(target_project_id, 'erection.view') then raise exception 'Erection view permission is required' using errcode = '42501'; end if;
  return query with scoped as (select * from public.fabrication_spool_projections p where p.project_id=target_project_id and p.revision_status='accepted' and not p.is_removed and not p.is_rft and public.current_user_in_pds_scope(p.project_id,p.pds_area_id)), blockers(blocker,blocker_order) as (values ('welded_bolted'::text,0),('supported',1),('nde',2),('pwht',3)) select b.blocker,b.blocker_order,count(*) filter(where (b.blocker='welded_bolted' and p.welded_bolted_on is null) or (b.blocker='supported' and p.supported_on is null) or (b.blocker='nde' and p.field_nde_pending>0) or (b.blocker='pwht' and p.field_pwht_pending>0)) from blockers b cross join scoped p group by b.blocker,b.blocker_order order by b.blocker_order;
end; $$;

revoke all on function public.recompute_erection_spool_projection(uuid) from public, anon, authenticated;
revoke all on function public.refresh_erection_projection_after_fabrication_refresh() from public, anon, authenticated;
revoke all on function public.erection_progress_s_curve(uuid), public.erection_stage_distribution(uuid), public.erection_rft_blocker_distribution(uuid) from public, anon;
grant execute on function public.recompute_erection_spool_projection(uuid) to service_role;
grant execute on function public.erection_progress_s_curve(uuid), public.erection_stage_distribution(uuid), public.erection_rft_blocker_distribution(uuid) to authenticated;
