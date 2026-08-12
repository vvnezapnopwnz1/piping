-- The pressure-test progress screen printed raw UUIDs (`ISO <uuid>`, `punch <uuid>`, `Test Pack
-- <uuid>`) because the worklist views carry only the foreign keys, never the business code the
-- operator actually reads off a drawing. Each code already exists on the referenced table.
begin;
select plan(9);

select has_column('public', 'line_check_worklist', 'iso_number',
  'line_check_worklist must expose the isometric business code, not only its id');
select has_column('public', 'item_clearance_worklist', 'item_number',
  'item_clearance_worklist must expose the punch item business code, not only its id');
select has_column('public', 'testing_precomm_worklist', 'test_pack_number',
  'testing_precomm_worklist must expose the test pack business code, not only its id');
select has_column('public', 'reinstatement_worklist', 'flange_number',
  'reinstatement_worklist must expose the flange business code, not only its id');

-- The added columns must not cost the views the ids the screens still key rows by, nor the
-- capability-scoped select grant the screens read through.
select has_column('public', 'line_check_worklist', 'isometric_id',
  'line_check_worklist keeps the isometric id its React keys depend on');
select has_column('public', 'item_clearance_worklist', 'punch_item_id',
  'item_clearance_worklist keeps the punch item id its React keys depend on');
select has_column('public', 'reinstatement_worklist', 'flange_joint_revision_id',
  'reinstatement_worklist keeps the flange joint revision id its React keys depend on');

select ok(
  has_table_privilege('authenticated', 'public.line_check_worklist', 'select'),
  'authenticated keeps select on line_check_worklist after the view is replaced');
select ok(
  has_table_privilege('authenticated', 'public.reinstatement_worklist', 'select'),
  'authenticated keeps select on reinstatement_worklist after the view is replaced');

select * from finish();
rollback;
