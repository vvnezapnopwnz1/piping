-- Track 06: NDE100 Penalty Escalation

create table public.nde_penalty_populations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  welder_qualification_id uuid not null references public.welder_qualifications(id) on delete restrict,
  category_code text not null check (category_code in ('S', 'SS', 'NR', 'H', 'HS', 'NDE100')),
  triggered_by_obligation_id uuid references public.nde_obligations(id) on delete restrict,
  snapshot_taken_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, welder_qualification_id, category_code)
);

create table public.nde_penalty_population_members (
  id uuid primary key default gen_random_uuid(),
  penalty_population_id uuid not null references public.nde_penalty_populations(id) on delete cascade,
  weld_joint_revision_id uuid not null references public.weld_joint_revisions(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (penalty_population_id, weld_joint_revision_id)
);

alter table public.nde_penalty_populations enable row level security;
alter table public.nde_penalty_population_members enable row level security;

create policy "nde_penalty_populations read" on public.nde_penalty_populations
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'nde.view'));

create policy "nde_penalty_population_members read" on public.nde_penalty_population_members
  for select to authenticated
  using (
    exists (
      select 1 from public.nde_penalty_populations p
      where p.id = penalty_population_id and public.current_user_has_capability(p.project_id, 'nde.view')
    )
  );

grant select on public.nde_penalty_populations, public.nde_penalty_population_members to authenticated;

create or replace function public.evaluate_nde_penalty(
  target_project_id uuid,
  welder_id uuid,
  category text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rejection_count int := 0;
  has_rejected_t2 boolean := false;
  pop_id uuid;
  member_record record;
  member_count int := 0;
begin
  if target_project_id is null or welder_id is null or category is null then
    return false;
  end if;

  -- Check if already escalated
  select id into pop_id from public.nde_penalty_populations
  where project_id = target_project_id
    and welder_qualification_id = welder_id
    and category_code = category;

  if pop_id is not null then
    return true;
  end if;

  -- Count rejections in this population
  select count(*)::int into rejection_count
  from public.nde_results r
  join public.nde_obligations o on o.id = r.obligation_id
  where r.project_id = target_project_id
    and r.responsible_welder_qualification_id = welder_id
    and o.category_code = category
    and r.outcome = 'rejected';

  -- Check for rejected 2nd-level tracer (cycle_kind = 'tracer' and cycle_ordinal = 2)
  select exists (
    select 1
    from public.nde_results r
    join public.nde_obligations o on o.id = r.obligation_id
    where r.project_id = target_project_id
      and r.responsible_welder_qualification_id = welder_id
      and o.category_code = category
      and o.cycle_kind = 'tracer'
      and o.cycle_ordinal = 2
      and r.outcome = 'rejected'
  ) into has_rejected_t2;

  if rejection_count >= 4 or has_rejected_t2 then
    -- Snapshot population
    insert into public.nde_penalty_populations (
      project_id, welder_qualification_id, category_code
    ) values (
      target_project_id, welder_id, category
    ) returning id into pop_id;

    for member_record in
      select distinct wjr.id as weld_joint_revision_id
      from public.weld_joint_revisions wjr
      join public.weld_joints wj on wj.id = wjr.weld_joint_id
      join public.spool_revisions sr on sr.id = wjr.spool_revision_id
      join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
      join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
      join public.weld_point_assignments wpa on wpa.weld_progress_record_id = progress.id
      where rev.isometric_id in (select id from public.isometrics where project_id = target_project_id)
        and not wjr.is_removed
        and rev.status = 'accepted'
        and wpa.welder_qualification_id = welder_id
    loop
      insert into public.nde_penalty_population_members (penalty_population_id, weld_joint_revision_id)
      values (pop_id, member_record.weld_joint_revision_id)
      on conflict (penalty_population_id, weld_joint_revision_id) do nothing;

      if found then
        member_count := member_count + 1;
      end if;
    end loop;

    if member_count = 0 then
      raise exception 'The NDE100 population snapshot is missing or empty' using errcode = 'PQC46';
    end if;

    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.evaluate_nde_penalty(uuid, uuid, text) from public, anon;
grant execute on function public.evaluate_nde_penalty(uuid, uuid, text) to authenticated;
