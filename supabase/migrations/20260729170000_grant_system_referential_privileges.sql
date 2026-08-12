grant select on public.system_reference_entries to authenticated;

grant insert (kind, code, description)
  on public.system_reference_entries to authenticated;

grant update (code, description, status)
  on public.system_reference_entries to authenticated;

grant delete on public.system_reference_entries to authenticated;
