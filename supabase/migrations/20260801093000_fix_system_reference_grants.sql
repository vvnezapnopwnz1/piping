-- Additive migration: Fix system_reference_entries grant privileges for authenticated role.
-- Grant insert on status column so insert payloads with explicit status ('active') succeed.

grant insert (status) on public.system_reference_entries to authenticated;

-- Grant table privileges on junction table welder_wps_qualifications
grant select, insert, update, delete on public.welder_wps_qualifications to authenticated;

