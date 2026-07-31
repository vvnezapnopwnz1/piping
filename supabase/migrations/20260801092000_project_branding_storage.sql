-- Create project-branding storage bucket
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-branding',
  'project-branding',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage object path format: <project_id>/owner/logo.<ext> or <project_id>/contractor/logo.<ext>

-- Read policy: Project view capability required for project path
create policy "Allow project members to read project branding objects"
  on storage.objects for select
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'project.view'
    )
  );

-- Insert policy: Project definition manage capability required
create policy "Allow project admins to upload project branding objects"
  on storage.objects for insert
  with check (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'project.definition.manage'
    )
  );

-- Update policy
create policy "Allow project admins to update project branding objects"
  on storage.objects for update
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'project.definition.manage'
    )
  );

-- Delete policy
create policy "Allow project admins to delete project branding objects"
  on storage.objects for delete
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      ((storage.foldername(name))[1])::uuid,
      'project.definition.manage'
    )
  );
