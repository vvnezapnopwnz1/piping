begin;

select plan(6);

-- The privileges a fresh Supabase project would hand out by default must not reach anon or
-- authenticated: an object in public is closed until a migration grants it by name.
select is(
  (
    select count(*)::integer
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    where n.nspname = 'public'
      and pg_get_userbyid(d.defaclrole) = 'postgres'
      and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
      and (d.defaclobjtype in ('r', 'f') or a.privilege_type in ('USAGE', 'SELECT'))
  ),
  0,
  'new tables, functions and sequences grant nothing to anon or authenticated by default'
);

select is(
  (
    select count(*)::integer
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    where n.nspname = 'public'
      and pg_get_userbyid(d.defaclrole) = 'postgres'
      and d.defaclobjtype = 'f'
      and a.grantee = 0
  ),
  0,
  'new functions are not executable by PUBLIC by default'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(privilege)
    where n.nspname = 'public'
      and c.relkind in ('r', 'v', 'm', 'p')
      and has_table_privilege('anon', c.oid, p.privilege)
  ),
  0,
  'anon reads and writes no table or view in public'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and has_table_privilege('authenticated', c.oid, 'TRUNCATE')
  ),
  0,
  'authenticated truncates no table in public'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
      )
  ),
  0,
  'anon calls no SECURITY DEFINER function in public'
);

select is(
  has_function_privilege('authenticated', 'public.pressure_test_assert_pack(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot invoke the internal test pack assertion helper'
);

select * from finish();
rollback;
