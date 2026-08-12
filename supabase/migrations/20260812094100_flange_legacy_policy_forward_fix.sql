-- Forward repair for local stacks where 20260812090600 was added after later
-- migrations had already been applied.
drop policy if exists "platform admins insert material types only" on public.system_reference_entries;
create policy "platform admins insert material types only" on public.system_reference_entries
  as restrictive for insert to authenticated
  with check (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind));
drop policy if exists "platform admins update material types only" on public.system_reference_entries;
create policy "platform admins update material types only" on public.system_reference_entries
  as restrictive for update to authenticated
  using (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind))
  with check (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind));
drop policy if exists "platform admins delete material types only" on public.system_reference_entries;
create policy "platform admins delete material types only" on public.system_reference_entries
  as restrictive for delete to authenticated
  using (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind));
