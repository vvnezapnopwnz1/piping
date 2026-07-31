-- Additive migration: Fix Track 02 blockers (B1, B2, B3 schema, and Platform Admin access)

-- ========================================================
-- B1. FIX CROSS-PROJECT GUARD TRIGGERS
-- ========================================================

-- 1. project_pds_areas: shop, assembly, field subcontractors
drop trigger if exists assert_pds_subcontractor_same_project_trigger on public.project_pds_areas;
drop trigger if exists assert_pds_shop_subcontractor_same_project_trigger on public.project_pds_areas;
drop trigger if exists assert_pds_assembly_subcontractor_same_project_trigger on public.project_pds_areas;
drop trigger if exists assert_pds_field_subcontractor_same_project_trigger on public.project_pds_areas;

create trigger assert_pds_shop_subcontractor_same_project_trigger
  before insert or update on public.project_pds_areas
  for each row execute function public.assert_same_project_reference('shop_subcontractor_id', 'project_subcontractors');

create trigger assert_pds_assembly_subcontractor_same_project_trigger
  before insert or update on public.project_pds_areas
  for each row execute function public.assert_same_project_reference('assembly_subcontractor_id', 'project_subcontractors');

create trigger assert_pds_field_subcontractor_same_project_trigger
  before insert or update on public.project_pds_areas
  for each row execute function public.assert_same_project_reference('field_subcontractor_id', 'project_subcontractors');

-- 2. project_ral_codes: line_service_id -> project_line_services
drop trigger if exists assert_ral_line_service_same_project_trigger on public.project_ral_codes;
create trigger assert_ral_line_service_same_project_trigger
  before insert or update on public.project_ral_codes
  for each row execute function public.assert_same_project_reference('line_service_id', 'project_line_services');

-- 3. project_paint_matrix_rules: line_service_id & ral_code_id
drop trigger if exists assert_paint_matrix_same_project_trigger on public.project_paint_matrix_rules;
drop trigger if exists assert_paint_matrix_line_service_same_project_trigger on public.project_paint_matrix_rules;
drop trigger if exists assert_paint_matrix_ral_code_same_project_trigger on public.project_paint_matrix_rules;

create trigger assert_paint_matrix_line_service_same_project_trigger
  before insert or update on public.project_paint_matrix_rules
  for each row execute function public.assert_same_project_reference('line_service_id', 'project_line_services');

create trigger assert_paint_matrix_ral_code_same_project_trigger
  before insert or update on public.project_paint_matrix_rules
  for each row execute function public.assert_same_project_reference('ral_code_id', 'project_ral_codes');

-- 4. project_spooling_material_classes: material_type_id -> project_spooling_material_types
drop trigger if exists assert_spool_class_material_type_same_project_trigger on public.project_spooling_material_classes;
create trigger assert_spool_class_material_type_same_project_trigger
  before insert or update on public.project_spooling_material_classes
  for each row execute function public.assert_same_project_reference('material_type_id', 'project_spooling_material_types');


-- ========================================================
-- B2. FIX PROGRESS WEIGHTS UNIQUE CONSTRAINT FOR MULTIPLE SAVES
-- ========================================================

-- Replace strict table-level UNIQUE (project_id, phase, activity) with a partial index matching active status
alter table public.project_progress_weights
  drop constraint if exists project_progress_weights_project_id_phase_activity_key;

drop index if exists public.project_progress_weights_active_idx;
create unique index project_progress_weights_active_idx
  on public.project_progress_weights (project_id, phase, activity)
  where status = 'active';


-- ========================================================
-- PLATFORM ADMIN ACCESS TO ARCHIVED/NON-ACTIVE PROJECTS
-- ========================================================

create or replace function public.current_user_has_capability(
  target_project_id uuid,
  requested_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    join public.capabilities capability
      on capability.code = requested_capability
    where p.id = target_project_id
      and (
        public.is_platform_admin()
        or (
          (not capability.is_mutating or p.status = 'active')
          and exists (
            select 1
            from public.project_memberships membership
            join public.roles access_role
              on access_role.code = membership.access_role_code
             and access_role.kind = 'access'
             and access_role.is_active
            join public.role_capabilities access_grant
              on access_grant.role_code = access_role.code
             and access_grant.capability_code = capability.code
            where membership.project_id = target_project_id
              and membership.user_id = auth.uid()
              and membership.is_active
              and (
                not capability.requires_functional_role
                or access_role.bypasses_functional_gate
                or exists (
                  select 1
                  from public.project_membership_functional_roles assigned
                  join public.roles functional_role
                    on functional_role.code = assigned.role_code
                   and functional_role.kind = 'functional'
                   and functional_role.is_active
                  join public.role_capabilities functional_grant
                    on functional_grant.role_code = assigned.role_code
                   and functional_grant.capability_code = capability.code
                  where assigned.membership_id = membership.id
                )
              )
          )
        )
      )
  );
$$;
