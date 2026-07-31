-- Additive migration: Fix system_reference_entries grant privileges for authenticated role.
-- Grant insert on status column so insert payloads with explicit status ('active') succeed.

grant insert (status) on public.system_reference_entries to authenticated;

-- Grant table privileges on junction table welder_wps_qualifications
grant select, insert, update, delete on public.welder_wps_qualifications to authenticated;

grant select, insert, update, delete on public.system_reference_entries, public.project_subcontractors, public.project_service_classes, public.project_weld_types to service_role;
grant select, insert, update on public.project_service_classes, public.project_weld_types to authenticated;

