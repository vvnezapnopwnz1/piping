begin;
select plan(2);
select results_eq(
  $$select pg_get_viewdef('public.tracking_location_occupancy'::regclass) like '%active_spool.is_active%'$$,
  $$values (true)$$,
  'occupancy counts active worklist spools only'
);
select results_eq(
  $$select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.tracking_location_occupancy'::regclass$$,
  $$values (true)$$,
  'replacement occupancy view retains caller RLS'
);
select * from finish();
rollback;
