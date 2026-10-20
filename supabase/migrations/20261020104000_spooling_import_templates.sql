-- Import templates: how a project reads one kind of source file (which PCF SKEY is a shop weld, which
-- Excel column is the weld number). Data, not code, so a project keeps its own copy next to the built-in
-- presets the app ships. The settings are written by the browser and checked there; the table holds them
-- as an object and nothing more. Access lives only in these policies: whoever may view spooling reads the
-- templates, whoever may manage spooling writes them. The source 'spoolgen' (the four fixed files) has no
-- project template, so it is not in the list.

create table public.spooling_import_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source text not null check (source in ('aveva', 'hexagon', 'plant3d', 'table')),
  name text not null check (length(trim(name)) between 1 and 120),
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, name)
);

create trigger spooling_import_templates_set_updated_at
  before update on public.spooling_import_templates
  for each row execute procedure public.set_updated_at();

alter table public.spooling_import_templates enable row level security;

-- The read uses the project set built once per query (20261018122000_rls_capability_as_project_set.sql).
create policy "spooling viewers read import templates" on public.spooling_import_templates
  for select to authenticated
  using (project_id in (select private.user_project_ids('spooling.view')));

create policy "spooling managers insert import templates" on public.spooling_import_templates
  for insert to authenticated
  with check (public.current_user_has_capability(project_id, 'spooling.manage'));

create policy "spooling managers update import templates" on public.spooling_import_templates
  for update to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.manage'))
  with check (public.current_user_has_capability(project_id, 'spooling.manage'));

create policy "spooling managers delete import templates" on public.spooling_import_templates
  for delete to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.manage'));

-- The table is closed until it is granted by name (20261015090000_least_privilege_grants.sql).
grant select, insert, update, delete on public.spooling_import_templates to authenticated;
