-- N3: apply must not recompute the revision diff or re-read the staged BOM per spool. The rows it writes
-- are covered by the import tests; this pins the shape that made a 14,000-joint import fit in 8 s.
begin;
select plan(5);

select ok(
  pg_get_functiondef('public.apply_spooling_import_job_core(uuid)'::regprocedure) not like '%preview_spooling_import(target_job_id) p%',
  'the apply loops read the diff from the table made once, not from the function'
);
select ok(
  pg_get_functiondef('public.apply_spooling_import_job_core(uuid)'::regprocedure) like '%create temp table pipeqc_apply_preview%',
  'the diff is read once at the start of apply'
);
select ok(
  pg_get_functiondef('public.apply_spooling_import_job_core(uuid)'::regprocedure) like '%create temp table pipeqc_apply_materials%',
  'the staged BOM lines are read once at the start of apply'
);
select ok(
  has_function_privilege('authenticated', 'public.apply_spooling_import_job(uuid)', 'execute'),
  'the command keeps its name and is callable by a signed-in user'
);
select ok(
  not has_function_privilege('authenticated', 'public.apply_spooling_import_job_core(uuid)', 'execute'),
  'the core it wraps is not'
);

select * from finish();
rollback;
