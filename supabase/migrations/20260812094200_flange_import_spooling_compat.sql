-- Keep the existing Track 04 SpoolGen import type when widening Track 03 imports.
alter table public.import_jobs drop constraint if exists import_jobs_import_type_check;
alter table public.import_jobs add constraint import_jobs_import_type_check
check (import_type in ('piping_material_list','welding_procedure','welder_qualification','thickness_flange','nde_matrix','spooling_definition','flange_progress'));
