-- A cast inside a policy USING clause can raise on objects that belong to another
-- bucket, because AND is not guaranteed to short-circuit. This helper returns null
-- instead of raising, so one bucket's path convention can never break another's policy.
create or replace function public.storage_path_project_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(object_name))[1];
  if first_segment is null then
    return null;
  end if;
  return first_segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.storage_path_project_id(text) from public;
grant execute on function public.storage_path_project_id(text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-imports',
  'project-imports',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Replace the Track 02 branding policies: add `to authenticated` and drop the raw cast.
drop policy if exists "Allow project members to read project branding objects" on storage.objects;
drop policy if exists "Allow project admins to upload project branding objects" on storage.objects;
drop policy if exists "Allow project admins to update project branding objects" on storage.objects;
drop policy if exists "Allow project admins to delete project branding objects" on storage.objects;

create policy "Read project branding objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.view')
  );

create policy "Insert project branding objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  );

create policy "Update project branding objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  )
  with check (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  );

create policy "Delete project branding objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  );

-- project-imports policies
create policy "Read project import objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.view')
  );

create policy "Insert project import objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  );

create policy "Update project import objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  )
  with check (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  );

create policy "Delete project import objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  );
