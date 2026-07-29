-- RLS policies control which rows authenticated users may read. PostgreSQL
-- privileges must be granted separately before those policies can apply.
grant select on public.projects to authenticated;
grant select on public.project_memberships to authenticated;
