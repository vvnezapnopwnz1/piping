begin;

select plan(18);

select has_table('public', 'flange_progress_records', 'flange progress records table exists');
select has_table('public', 'flange_jointer_assignments', 'flange jointer assignments table exists');
select has_type('public', 'flange_progress_source', 'flange progress source enum exists');
select has_column('public', 'flange_progress_records', 'project_id', 'progress stores project identity');
select has_column('public', 'flange_progress_records', 'calculated_ut', 'progress stores calculated UT snapshot');
select has_column('public', 'flange_progress_records', 'source_revision_progress_copy_id', 'progress stores revision-copy provenance');
select has_index('public', 'flange_progress_records', 'flange_progress_records_one_effective_idx', 'one effective progress index exists');
select has_index('public', 'flange_jointer_assignments', 'flange_jointer_assignments_unique_jointer_idx', 'jointer assignment uniqueness exists');

select ok(has_table_privilege('authenticated', 'public.flange_progress_records', 'SELECT'), 'authenticated can read progress rows through RLS');
select ok(not has_table_privilege('authenticated', 'public.flange_progress_records', 'INSERT'), 'authenticated cannot insert progress rows directly');
select ok(not has_table_privilege('authenticated', 'public.flange_progress_records', 'UPDATE'), 'authenticated cannot update progress rows directly');
select ok(not has_table_privilege('authenticated', 'public.flange_progress_records', 'DELETE'), 'authenticated cannot delete progress rows directly');
select ok(has_table_privilege('authenticated', 'public.flange_jointer_assignments', 'SELECT'), 'authenticated can read jointer history through RLS');
select ok(not has_table_privilege('authenticated', 'public.flange_jointer_assignments', 'INSERT'), 'authenticated cannot insert jointers directly');

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.flange_progress_records'::regclass
      and tgname = 'flange_progress_records_append_only'
  ),
  'progress business payload has an append-only trigger'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'flange_progress_records'
      and (qual::text like '%flange_revision_in_pds_scope%' or with_check::text like '%flange_revision_in_pds_scope%')
  ),
  'progress read policy enforces PDS scope'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'flange_jointer_assignments'
      and qual::text like '%flange_progress_records%'
  ),
  'jointer read policy follows scoped progress rows'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'flange_joint_revisions'
      and qual::text like '%flange.view%'
  ),
  'engineering flange revision reads accept flange.view'
);

select * from finish();
rollback;
