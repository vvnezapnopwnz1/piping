-- Track 10: project-owned punch-code referential used by Line Check.
-- Operational punch rows are added later; direct deletes are intentionally not granted.

create table public.project_punch_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null check (length(trim(code)) > 0),
  description text not null check (length(trim(description)) > 0),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index project_punch_codes_project_code_uq
  on public.project_punch_codes (project_id, upper(btrim(code)));

create trigger project_punch_codes_set_updated_at
  before update on public.project_punch_codes
  for each row execute procedure public.set_updated_at();

create trigger project_punch_codes_audit
  after insert or update on public.project_punch_codes
  for each row execute procedure public.audit_project_reference_change('project_punch_codes');

alter table public.project_punch_codes enable row level security;

create policy "test pack users read punch codes"
  on public.project_punch_codes for select to authenticated
  using (public.current_user_has_capability(project_id, 'testpack.view'));

create policy "project admins insert punch codes"
  on public.project_punch_codes for insert to authenticated
  with check (public.current_user_has_capability(project_id, 'project_referential.manage'));

create policy "project admins update punch codes"
  on public.project_punch_codes for update to authenticated
  using (public.current_user_has_capability(project_id, 'project_referential.manage'))
  with check (public.current_user_has_capability(project_id, 'project_referential.manage'));

revoke all on public.project_punch_codes from anon, authenticated;
grant select on public.project_punch_codes to authenticated;
grant insert, update on public.project_punch_codes to authenticated;
grant select, insert, update on public.project_punch_codes to service_role;
