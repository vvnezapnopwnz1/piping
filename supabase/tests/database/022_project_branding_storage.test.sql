begin;
select plan(4);

-- Test 1: Bucket project-branding exists
select has_table('storage', 'buckets', 'storage.buckets table exists');
select is(
  (select count(*)::int from storage.buckets where id = 'project-branding'),
  1,
  'project-branding bucket exists'
);

-- Test 2: Bucket is private
select is(
  (select public from storage.buckets where id = 'project-branding'),
  false,
  'project-branding bucket is private'
);

-- Test 3: File size limit is 2MB
select is(
  (select file_size_limit from storage.buckets where id = 'project-branding'),
  2097152::bigint,
  'file_size_limit is 2097152 bytes'
);

select * from finish();
rollback;
