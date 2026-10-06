begin;
select plan(1);

-- AGENTS.md rule 2: reads are plain selects through RLS. A SECURITY DEFINER function that returns
-- data bypasses every policy. The list below is what existed on 2026-10-06; do not extend it —
-- expose new reads as `security_invoker` views over tables with RLS policies instead.
-- `construction_spool_project_id` is the one policy helper that returns a value (a project id,
-- only for a spool the caller may read); it is listed for that reason.
select is_empty($$
  select p.oid::regprocedure::text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and p.provolatile in ('s', 'i')
    and p.prorettype not in ('boolean'::regtype, 'trigger'::regtype)
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  except
  select unnest(array[
    'construction_spool_project_id(uuid)',
    'effective_stage_date(uuid,construction_stage)',
    'eligible_tracer_candidates(uuid)',
    'get_project_access_matrix(uuid)',
    'get_project_setup_readiness(uuid)',
    'get_tracking_data_dump(uuid)',
    'list_current_user_projects()',
    'list_tracking_device_user_candidates(uuid)',
    'nde_batch_candidates(uuid)',
    'preview_spooling_import(uuid)',
    'weld_joint_context(uuid)'
  ])
$$, 'no new SECURITY DEFINER read function is exposed to authenticated users');

select * from finish();
rollback;
