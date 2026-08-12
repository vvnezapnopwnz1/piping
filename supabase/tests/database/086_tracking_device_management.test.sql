begin;
select plan(5);

select has_view('public', 'tracking_device_management', 'device-management projection exists');
select results_eq(
  $$select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.tracking_device_management'::regclass$$,
  $$values (true)$$,
  'device-management view uses caller RLS'
);
select has_column('public', 'tracking_device_management', 'assigned_membership_id', 'assignment state is projected');
select has_column('public', 'tracking_device_management', 'scan_count', 'real scan count is projected');
select has_column('public', 'tracking_device_management', 'last_used_at', 'last-use time is projected');

select * from finish();
rollback;
