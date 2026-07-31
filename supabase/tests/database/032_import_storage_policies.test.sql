begin;
select plan(8);

select is(
  (select public from storage.buckets where id = 'project-imports'),
  false,
  'project-imports bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'project-imports'),
  10485760::bigint,
  'project-imports bucket has a 10 MB limit'
);

-- Every branding and imports policy must be scoped to authenticated, not PUBLIC.
select is(
  (select count(*)::int
   from pg_policy p
   join pg_class c on c.oid = p.polrelid
   where c.relname = 'objects'
     and p.polname like '%project branding%'
     and p.polroles = '{0}'),
  0,
  'no project-branding policy is left applying to PUBLIC'
);

select is(
  (select count(*)::int
   from pg_policy p
   join pg_class c on c.oid = p.polrelid
   where c.relname = 'objects'
     and p.polname like '%project import%'
     and p.polroles = '{0}'),
  0,
  'no project-imports policy applies to PUBLIC'
);

-- The path helper must never raise on a non-uuid first segment.
select lives_ok(
  $$select public.storage_path_project_id('not-a-uuid/whatever.xlsx')$$,
  'the path helper tolerates a non-uuid first segment'
);

select is(
  public.storage_path_project_id('not-a-uuid/whatever.xlsx'),
  null,
  'a non-uuid first segment resolves to null'
);

select is(
  public.storage_path_project_id('31000000-0000-0000-0000-000000000201/job/file.xlsx'),
  '31000000-0000-0000-0000-000000000201'::uuid,
  'a uuid first segment resolves to that project'
);

select is(
  (select count(*)::int
   from pg_policy p
   join pg_class c on c.oid = p.polrelid
   where c.relname = 'objects' and p.polname like '%project import%'),
  4,
  'project-imports has select, insert, update and delete policies'
);

select * from finish();
rollback;
