-- Track 13 item 7: the pressure-test progress worklists carried only foreign keys, so the screen
-- rendered `ISO <uuid>`, `punch <uuid>`, `Test Pack <uuid>` and a bare flange revision uuid. Each
-- business code already exists on the referenced table; expose it beside the id the screens key on.
--
-- `create or replace view` rather than drop/recreate: it keeps the existing select grants and any
-- dependent objects, and PostgreSQL permits appending columns to the end of a view's select list.
-- Every added join is a LEFT JOIN so a view can never return fewer rows than it does today.

create or replace view public.line_check_worklist with (security_invoker = true) as
select request.id as request_id, request.project_id, request.test_pack_id, request.request_number, request.team_id, request.assigned_on, request.cancelled_at,
  item.isometric_id, result.id as result_id,
  iso.iso_number
from public.pressure_test_requests request
join public.line_check_request_items item on item.request_id = request.id
left join public.line_check_results result on result.request_id = request.id and result.isometric_id = item.isometric_id
left join public.isometrics iso on iso.id = item.isometric_id;

create or replace view public.item_clearance_worklist with (security_invoker = true) as
select request.id as request_id, request.project_id, request.test_pack_id, request.request_number, request.team_id, request.assigned_on, request.cancelled_at,
  item.punch_item_id, clearance.id as clearance_id,
  punch.item_number
from public.pressure_test_requests request
join public.item_clearance_request_items item on item.request_id = request.id
left join public.punch_item_clearances clearance on clearance.request_id = request.id and clearance.punch_item_id = item.punch_item_id
left join public.punch_items punch on punch.id = item.punch_item_id;

-- pack.id is the primary key of test_packs, so test_pack_number is functionally dependent on the
-- existing group by and needs no new grouping column — the same reason project_id already works here.
create or replace view public.testing_precomm_worklist with (security_invoker = true) as
select pack.id as test_pack_id, pack.project_id, max(event.occurred_on) filter (where event.stage = 'testing_started') as testing_started_on, max(event.occurred_on) filter (where event.stage = 'testing_completed') as testing_completed_on, max(event.occurred_on) filter (where event.stage = 'precommissioning_completed') as precommissioning_completed_on,
  pack.test_pack_number
from public.test_packs pack left join public.pressure_test_stage_events event on event.test_pack_id = pack.id group by pack.id;

create or replace view public.reinstatement_worklist with (security_invoker = true) as
select request.id as request_id, request.project_id, request.test_pack_id, request.request_number, item.flange_joint_revision_id, item.category_snapshot, record.id as record_id,
  flange.flange_number
from public.pressure_test_requests request
join public.reinstatement_request_items item on item.request_id = request.id
left join public.flange_reinstatement_records record on record.request_id = request.id and record.flange_joint_revision_id = item.flange_joint_revision_id
left join public.flange_joint_revisions revision on revision.id = item.flange_joint_revision_id
left join public.flange_joints flange on flange.id = revision.flange_joint_id
where request.request_type = 'reinstatement';
