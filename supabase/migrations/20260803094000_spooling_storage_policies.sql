-- Track 04: private bucket for SpoolGen .txt files.
-- Path contract: <project_id>/<import_job_id>/<file_role>.txt
-- Segment 1 is resolved by storage_path_project_id(), which returns null instead of
-- raising when another bucket's path is not a uuid.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-spooling',
  'project-spooling',
  false,
  4194304,
  array['text/plain', 'text/csv', 'text/tab-separated-values', 'application/octet-stream']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Read project spooling objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.view')
  );

create policy "Insert project spooling objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  );

create policy "Update project spooling objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  )
  with check (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  );

create policy "Delete project spooling objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  );
