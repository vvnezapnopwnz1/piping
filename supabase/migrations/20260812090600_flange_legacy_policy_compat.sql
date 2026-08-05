-- Forward-only compatibility for stacks that applied the first Track 09 migration
-- before the legacy policy assertions were reintroduced.
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
