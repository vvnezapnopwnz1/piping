-- The existing permissive policy establishes the platform-administrator role.
-- These restrictive policies additionally preserve the current product boundary:
-- only Material Type is mutable until the other referentials have contracts.

create policy "platform admins insert material types only"
  on public.system_reference_entries
  as restrictive
  for insert to authenticated
  with check (kind = 'material_type'::public.system_reference_kind);

create policy "platform admins update material types only"
  on public.system_reference_entries
  as restrictive
  for update to authenticated
  using (kind = 'material_type'::public.system_reference_kind)
  with check (kind = 'material_type'::public.system_reference_kind);

create policy "platform admins delete material types only"
  on public.system_reference_entries
  as restrictive
  for delete to authenticated
  using (kind = 'material_type'::public.system_reference_kind);
