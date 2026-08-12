-- Track 04: revision change history, decisions, progress-copy provenance,
-- read-only enforcement for superseded revisions, RLS and grants.

create type public.revision_change_type as enum ('new', 'revised', 'unchanged', 'removed');

create type public.revision_decision as enum (
  'not_done', 'cancelled', 'done_without_modification', 'rework'
);

create table public.revision_change_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  isometric_id uuid not null references public.isometrics(id) on delete restrict,
  isometric_revision_id uuid not null
    references public.isometric_revisions(id) on delete cascade,
  previous_isometric_revision_id uuid references public.isometric_revisions(id) on delete set null,
  entity_type public.engineering_entity_type not null,
  entity_id uuid not null,
  entity_key text not null,
  change_type public.revision_change_type not null,
  previous_payload jsonb,
  next_payload jsonb,
  source_import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (isometric_revision_id, entity_type, entity_id)
);

create index revision_change_items_project_idx
  on public.revision_change_items (project_id, created_at desc);

create table public.revision_decisions (
  id uuid primary key default gen_random_uuid(),
  change_item_id uuid not null
    references public.revision_change_items(id) on delete cascade,
  decision public.revision_decision not null,
  comment text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default timezone('utc', now()),
  unique (change_item_id)
);

-- Plan section 3.8: this is a provenance ledger, not a copy of progress rows.
-- Track 05 reads it to decide which progress it may materialize on the new revision.
create table public.revision_progress_copies (
  id uuid primary key default gen_random_uuid(),
  change_item_id uuid not null
    references public.revision_change_items(id) on delete cascade,
  source_spool_revision_id uuid not null
    references public.spool_revisions(id) on delete restrict,
  target_spool_revision_id uuid not null
    references public.spool_revisions(id) on delete cascade,
  progress_kind text not null
    check (progress_kind in ('fabrication_start', 'sent_to_paint', 'paint')),
  copied_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(copied_payload) = 'object'),
  copied_by uuid references public.profiles(id) on delete set null,
  copied_at timestamptz not null default timezone('utc', now()),
  unique (change_item_id, progress_kind)
);

-- Read-only enforcement -------------------------------------------------------

create or replace function public.assert_revision_mutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owning_status public.revision_status;
begin
  if tg_table_name = 'isometric_revisions' then
    owning_status := old.status;
  elsif tg_table_name = 'spool_revisions' then
    select rev.status into owning_status
    from public.isometric_revisions rev
    where rev.id = old.isometric_revision_id;
  elsif tg_table_name = 'spool_revision_materials' then
    select rev.status into owning_status
    from public.spool_revisions sr
    join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where sr.id = old.spool_revision_id;
  elsif tg_table_name in ('weld_joint_revisions', 'support_revisions', 'flange_joint_revisions') then
    select rev.status into owning_status
    from public.spool_revisions sr
    join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where sr.id = old.spool_revision_id;
  elsif tg_table_name = 'weld_points' then
    select rev.status into owning_status
    from public.weld_joint_revisions wjr
    join public.spool_revisions sr on sr.id = wjr.spool_revision_id
    join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where wjr.id = old.weld_joint_revision_id;
  end if;

  if owning_status = 'superseded' then
    raise exception 'A superseded revision is read-only' using errcode = 'PQC21';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- isometric_revisions is exempt from the UPDATE guard on the transition into
-- 'superseded' itself: the trigger reads OLD.status, which is still 'accepted' then.
create trigger isometric_revisions_read_only
  before update or delete on public.isometric_revisions
  for each row execute function public.assert_revision_mutable();

create trigger spool_revisions_read_only
  before update or delete on public.spool_revisions
  for each row execute function public.assert_revision_mutable();

create trigger weld_joint_revisions_read_only
  before update or delete on public.weld_joint_revisions
  for each row execute function public.assert_revision_mutable();

create trigger weld_points_read_only
  before update or delete on public.weld_points
  for each row execute function public.assert_revision_mutable();

create trigger support_revisions_read_only
  before update or delete on public.support_revisions
  for each row execute function public.assert_revision_mutable();

create trigger flange_joint_revisions_read_only
  before update or delete on public.flange_joint_revisions
  for each row execute function public.assert_revision_mutable();

create trigger spool_revision_materials_read_only
  before update or delete on public.spool_revision_materials
  for each row execute function public.assert_revision_mutable();

-- Project resolution helper for RLS on revision-side tables --------------------

create or replace function public.isometric_revision_project_id(revision_id uuid)
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select iso.project_id
  from public.isometric_revisions rev
  join public.isometrics iso on iso.id = rev.isometric_id
  where rev.id = revision_id;
$$;

create or replace function public.spool_revision_project_id(spool_revision_id uuid)
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select iso.project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = spool_revision_id;
$$;

revoke all on function
  public.isometric_revision_project_id(uuid),
  public.spool_revision_project_id(uuid)
from public, anon;

grant execute on function
  public.isometric_revision_project_id(uuid),
  public.spool_revision_project_id(uuid)
to authenticated;

-- RLS -------------------------------------------------------------------------

alter table public.isometrics enable row level security;
alter table public.spools enable row level security;
alter table public.weld_joints enable row level security;
alter table public.supports enable row level security;
alter table public.flange_joints enable row level security;
alter table public.isometric_revisions enable row level security;
alter table public.spool_revisions enable row level security;
alter table public.weld_joint_revisions enable row level security;
alter table public.weld_points enable row level security;
alter table public.support_revisions enable row level security;
alter table public.flange_joint_revisions enable row level security;
alter table public.spool_revision_materials enable row level security;
alter table public.revision_change_items enable row level security;
alter table public.revision_decisions enable row level security;
alter table public.revision_progress_copies enable row level security;

create policy "read isometrics" on public.isometrics
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read spools" on public.spools
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read weld joints" on public.weld_joints
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read supports" on public.supports
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read flange joints" on public.flange_joints
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read isometric revisions" on public.isometric_revisions
  for select to authenticated
  using (
    exists (
      select 1 from public.isometrics iso
      where iso.id = isometric_revisions.isometric_id
        and public.current_user_has_capability(iso.project_id, 'spooling.view')
    )
  );

create policy "read spool revisions" on public.spool_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.isometric_revision_project_id(spool_revisions.isometric_revision_id),
      'spooling.view')
  );

create policy "read weld joint revisions" on public.weld_joint_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(weld_joint_revisions.spool_revision_id),
      'spooling.view')
  );

create policy "read weld points" on public.weld_points
  for select to authenticated
  using (
    exists (
      select 1 from public.weld_joint_revisions wjr
      where wjr.id = weld_points.weld_joint_revision_id
        and public.current_user_has_capability(
          public.spool_revision_project_id(wjr.spool_revision_id), 'spooling.view')
    )
  );

create policy "read support revisions" on public.support_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(support_revisions.spool_revision_id),
      'spooling.view')
  );

create policy "read flange joint revisions" on public.flange_joint_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(flange_joint_revisions.spool_revision_id),
      'spooling.view')
  );

create policy "read spool revision materials" on public.spool_revision_materials
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(spool_revision_materials.spool_revision_id),
      'spooling.view')
  );

create policy "read revision change items" on public.revision_change_items
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read revision decisions" on public.revision_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.revision_change_items item
      where item.id = revision_decisions.change_item_id
        and public.current_user_has_capability(item.project_id, 'spooling.view')
    )
  );

create policy "read revision progress copies" on public.revision_progress_copies
  for select to authenticated
  using (
    exists (
      select 1 from public.revision_change_items item
      where item.id = revision_progress_copies.change_item_id
        and public.current_user_has_capability(item.project_id, 'spooling.view')
    )
  );

-- Grants: authenticated reads, never writes. Every mutation is a SECURITY DEFINER RPC.

grant select on
  public.isometrics,
  public.spools,
  public.weld_joints,
  public.supports,
  public.flange_joints,
  public.isometric_revisions,
  public.spool_revisions,
  public.weld_joint_revisions,
  public.weld_points,
  public.support_revisions,
  public.flange_joint_revisions,
  public.spool_revision_materials,
  public.revision_change_items,
  public.revision_decisions,
  public.revision_progress_copies
to authenticated;

revoke insert, update, delete, truncate on
  public.isometrics,
  public.spools,
  public.weld_joints,
  public.supports,
  public.flange_joints,
  public.isometric_revisions,
  public.spool_revisions,
  public.weld_joint_revisions,
  public.weld_points,
  public.support_revisions,
  public.flange_joint_revisions,
  public.spool_revision_materials,
  public.revision_change_items,
  public.revision_decisions,
  public.revision_progress_copies
from authenticated, anon;
