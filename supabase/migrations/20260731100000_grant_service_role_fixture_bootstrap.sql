-- Server-only local fixture bootstrap uses the API Secret/service_role.
-- Browser roles remain restricted by explicit grants and RLS policies.
grant select, insert, update, delete on table
  public.profiles,
  public.projects,
  public.project_memberships,
  public.project_membership_functional_roles,
  public.project_subcontractors,
  public.project_pds_areas,
  public.membership_subcontractor_scopes,
  public.membership_pds_area_scopes
to service_role;

grant select on table public.roles to service_role;
