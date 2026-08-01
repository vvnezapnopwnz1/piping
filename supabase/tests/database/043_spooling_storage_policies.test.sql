begin;
select plan(7);

select is(
  (select public from storage.buckets where id = 'project-spooling'),
  false,
  'the spooling bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'project-spooling'),
  4194304::bigint,
  'the spooling bucket enforces the 4 MB dossier limit'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like '%project spooling objects%'),
  4,
  'the spooling bucket has exactly four policies'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like '%project spooling objects%'
     and roles::text not like '%authenticated%'),
  0,
  'every spooling storage policy is scoped to authenticated'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and roles::text like '%{public}%'),
  0,
  'no storage policy applies to PUBLIC'
);

-- The helper must tolerate a non-uuid first segment from any other bucket.
select is(
  public.storage_path_project_id('not-a-uuid/some/file.txt'),
  null,
  'a non-uuid path segment resolves to null rather than raising'
);

select is(
  public.storage_path_project_id('30000000-0000-0000-0000-000000000401/job/weld.txt'),
  '30000000-0000-0000-0000-000000000401'::uuid,
  'a uuid path segment resolves to the project id'
);

select * from finish();
rollback;
