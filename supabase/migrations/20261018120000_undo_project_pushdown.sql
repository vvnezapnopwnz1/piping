-- Undo of the project push-down (20261018112000, 113000, 114000, 115000, 116000, 119000).
--
-- Joining the readiness views on project_id let the project filter reach the aggregates, and with another
-- project's 7,000 joints in the database that cut isometric_readiness from 1.8 s to 0.55 s. But the same
-- join made the planner run isometric_readiness once per member ISO of a pack (a parameterised inner side:
-- 40 loops in the UPG-1 plan), so with no other project present test_pack_readiness went from 0.24 s to
-- 0.8 s, test_pack_workflow timed out, and the cost grows with the square of the project. Plain views cannot
-- take the project as a parameter. The definitions from before are restored; flange_joint_readiness keeps the
-- extra project_id column, which does no harm. The way forward is a stored per-isometric readiness
-- (a projection like fabrication_spool_projections), see docs/acceptance/2026-10-17-import-timings.md.

create or replace view public.isometric_readiness with (security_invoker = true) as
WITH current_revision AS (
         SELECT iso.id AS isometric_id,
            iso.project_id,
            revision.id AS isometric_revision_id,
            revision.pds_area_id
           FROM (isometrics iso
             JOIN isometric_revisions revision ON (((revision.isometric_id = iso.id) AND (revision.status = 'accepted'::revision_status))))
        ), spool_facts AS (
         SELECT current_revision_1.isometric_id,
            (count(spool_revision.id))::integer AS spool_total,
            (count(spool_revision.id) FILTER (WHERE COALESCE(erection.is_rft, false)))::integer AS spool_complete,
            (COALESCE(sum(fabrication.weld_total), (0)::bigint))::integer AS weld_total,
            (COALESCE(sum(fabrication.weld_complete), (0)::bigint))::integer AS weld_complete,
            (COALESCE(sum(fabrication.support_total), (0)::bigint))::integer AS support_total,
            (COALESCE(sum(fabrication.support_recorded), (0)::bigint))::integer AS support_complete,
            (COALESCE(sum(erection.nde_pending), (0)::bigint))::integer AS nde_pending,
            (COALESCE(sum(erection.pwht_pending), (0)::bigint))::integer AS pwht_pending,
            bool_and(COALESCE(fabrication.is_releasable, false)) AS qc_released,
            max(erection.rft_on) AS rft_on
           FROM (((current_revision current_revision_1
             LEFT JOIN spool_revisions spool_revision ON (((spool_revision.isometric_revision_id = current_revision_1.isometric_revision_id) AND (NOT spool_revision.is_removed))))
             LEFT JOIN spool_erection_readiness erection ON ((erection.spool_revision_id = spool_revision.id)))
             LEFT JOIN fabrication_spool_projections fabrication ON ((fabrication.spool_revision_id = spool_revision.id)))
          GROUP BY current_revision_1.isometric_id
        ), flange_facts AS (
         SELECT current_revision_1.isometric_id,
            (count(flange.flange_joint_revision_id))::integer AS flange_total,
            (count(flange.flange_joint_revision_id) FILTER (WHERE (flange.effective_progress_id IS NOT NULL)))::integer AS flange_complete,
            COALESCE(sum(flange.calculated_ut) FILTER (WHERE (flange.effective_progress_id IS NOT NULL)), (0)::numeric) AS unit_time
           FROM (current_revision current_revision_1
             LEFT JOIN flange_joint_readiness flange ON (((flange.isometric_id = current_revision_1.isometric_id) AND (flange.revision_status = 'accepted'::revision_status) AND (NOT flange.is_removed))))
          GROUP BY current_revision_1.isometric_id
        ), line_facts AS (
         SELECT member.isometric_id,
            (count(*))::integer AS line_check_assigned,
            (count(*) FILTER (WHERE (result.id IS NOT NULL)))::integer AS line_check_completed,
            max(result.completed_on) AS last_line_check_on
           FROM ((line_check_request_items member
             JOIN pressure_test_requests request ON (((request.id = member.request_id) AND (request.cancelled_at IS NULL))))
             LEFT JOIN line_check_results result ON (((result.request_id = member.request_id) AND (result.isometric_id = member.isometric_id))))
          GROUP BY member.isometric_id
        ), punch_facts AS (
         SELECT punch.isometric_id,
            (count(*) FILTER (WHERE (clearance.id IS NULL)))::integer AS open_x_count,
            max(clearance.cleared_on) AS last_x_cleared_on
           FROM (punch_items punch
             LEFT JOIN punch_item_clearances clearance ON ((clearance.punch_item_id = punch.id)))
          GROUP BY punch.isometric_id
        )
 SELECT current_revision.isometric_id,
    current_revision.project_id,
    current_revision.isometric_revision_id,
    current_revision.pds_area_id,
    COALESCE(spool_facts.spool_total, 0) AS spool_total,
    COALESCE(spool_facts.spool_complete, 0) AS spool_complete,
    COALESCE(spool_facts.weld_total, 0) AS weld_total,
    COALESCE(spool_facts.weld_complete, 0) AS weld_complete,
    COALESCE(spool_facts.support_total, 0) AS support_total,
    COALESCE(spool_facts.support_complete, 0) AS support_complete,
    COALESCE(flange_facts.flange_total, 0) AS flange_total,
    COALESCE(flange_facts.flange_complete, 0) AS flange_complete,
    COALESCE(spool_facts.nde_pending, 0) AS nde_pending,
    COALESCE(spool_facts.pwht_pending, 0) AS pwht_pending,
    COALESCE(line_facts.line_check_assigned, 0) AS line_check_assigned,
    COALESCE(line_facts.line_check_completed, 0) AS line_check_completed,
    COALESCE(punch_facts.open_x_count, 0) AS open_x_count,
    COALESCE(flange_facts.unit_time, (0)::numeric) AS unit_time,
    COALESCE(spool_facts.qc_released, false) AS is_qc_released,
    jsonb_build_object('NO_CURRENT_REVISION', 0, 'NO_SPOOLS',
        CASE
            WHEN (COALESCE(spool_facts.spool_total, 0) = 0) THEN 1
            ELSE 0
        END, 'WELD_OR_SUPPORT_PENDING', (GREATEST((COALESCE(spool_facts.weld_total, 0) - COALESCE(spool_facts.weld_complete, 0)), 0) + GREATEST((COALESCE(spool_facts.support_total, 0) - COALESCE(spool_facts.support_complete, 0)), 0)), 'FLANGE_PENDING', GREATEST((COALESCE(flange_facts.flange_total, 0) - COALESCE(flange_facts.flange_complete, 0)), 0), 'NDE_PENDING', COALESCE(spool_facts.nde_pending, 0), 'PWHT_PENDING', COALESCE(spool_facts.pwht_pending, 0), 'LINE_CHECK_PENDING',
        CASE
            WHEN ((COALESCE(line_facts.line_check_assigned, 0) > 0) AND (line_facts.line_check_assigned = line_facts.line_check_completed)) THEN 0
            ELSE 1
        END, 'X_OPEN', COALESCE(punch_facts.open_x_count, 0)) AS blocker_counts,
    ((COALESCE(spool_facts.spool_total, 0) > 0) AND (COALESCE(spool_facts.weld_total, 0) = COALESCE(spool_facts.weld_complete, 0)) AND (COALESCE(spool_facts.support_total, 0) = COALESCE(spool_facts.support_complete, 0)) AND (COALESCE(flange_facts.flange_total, 0) = COALESCE(flange_facts.flange_complete, 0)) AND (COALESCE(spool_facts.nde_pending, 0) = 0) AND (COALESCE(spool_facts.pwht_pending, 0) = 0) AND (COALESCE(line_facts.line_check_assigned, 0) > 0) AND (line_facts.line_check_assigned = line_facts.line_check_completed) AND (COALESCE(punch_facts.open_x_count, 0) = 0)) AS is_complete,
    ((COALESCE(spool_facts.spool_total, 0) > 0) AND (COALESCE(spool_facts.spool_total, 0) = COALESCE(spool_facts.spool_complete, 0)) AND (COALESCE(spool_facts.weld_total, 0) = COALESCE(spool_facts.weld_complete, 0)) AND (COALESCE(spool_facts.support_total, 0) = COALESCE(spool_facts.support_complete, 0)) AND (COALESCE(flange_facts.flange_total, 0) = COALESCE(flange_facts.flange_complete, 0)) AND (COALESCE(spool_facts.nde_pending, 0) = 0) AND (COALESCE(spool_facts.pwht_pending, 0) = 0) AND (COALESCE(line_facts.line_check_assigned, 0) > 0) AND (line_facts.line_check_assigned = line_facts.line_check_completed) AND (COALESCE(punch_facts.open_x_count, 0) = 0) AND COALESCE(spool_facts.qc_released, false)) AS is_rft,
        CASE
            WHEN (COALESCE(spool_facts.rft_on, NULL::date) IS NOT NULL)
              THEN GREATEST(spool_facts.rft_on, line_facts.last_line_check_on, punch_facts.last_x_cleared_on)
            ELSE NULL::date
        END AS rft_on
   FROM ((((current_revision
     LEFT JOIN spool_facts ON ((spool_facts.isometric_id = current_revision.isometric_id)))
     LEFT JOIN flange_facts ON ((flange_facts.isometric_id = current_revision.isometric_id)))
     LEFT JOIN line_facts ON ((line_facts.isometric_id = current_revision.isometric_id)))
     LEFT JOIN punch_facts ON ((punch_facts.isometric_id = current_revision.isometric_id)));

create or replace view public.test_pack_readiness with (security_invoker = true) as
SELECT pack.id AS test_pack_id,
    pack.project_id,
    pack.test_pack_number,
    pack.revision_no,
    pack.lifecycle,
    (count(member.id) FILTER (WHERE (member.removed_at IS NULL)))::integer AS member_count,
    (count(readiness.isometric_id))::integer AS current_member_count,
    (COALESCE(sum(readiness.spool_total), (0)::bigint))::integer AS spool_total,
    (COALESCE(sum(readiness.weld_total), (0)::bigint))::integer AS weld_total,
    (COALESCE(sum(readiness.flange_total), (0)::bigint))::integer AS flange_total,
    (COALESCE(sum(((readiness.blocker_counts ->> 'NO_SPOOLS'::text))::integer), (0)::bigint))::integer AS no_spools_count,
    (COALESCE(sum(((readiness.blocker_counts ->> 'WELD_OR_SUPPORT_PENDING'::text))::integer), (0)::bigint))::integer AS weld_or_support_pending_count,
    (COALESCE(sum(((readiness.blocker_counts ->> 'FLANGE_PENDING'::text))::integer), (0)::bigint))::integer AS flange_pending_count,
    (COALESCE(sum(((readiness.blocker_counts ->> 'NDE_PENDING'::text))::integer), (0)::bigint))::integer AS nde_pending_count,
    (COALESCE(sum(((readiness.blocker_counts ->> 'PWHT_PENDING'::text))::integer), (0)::bigint))::integer AS pwht_pending_count,
    (COALESCE(sum(((readiness.blocker_counts ->> 'LINE_CHECK_PENDING'::text))::integer), (0)::bigint))::integer AS line_check_pending_count,
    (COALESCE(sum(((readiness.blocker_counts ->> 'X_OPEN'::text))::integer), (0)::bigint))::integer AS x_open_count,
    COALESCE(sum(readiness.unit_time), (0)::numeric) AS unit_time,
    (COALESCE(bool_and(readiness.is_rft) FILTER (WHERE (readiness.isometric_id IS NOT NULL)), false) AND (pack.lifecycle = 'active'::text) AND (count(member.id) FILTER (WHERE (member.removed_at IS NULL)) > 0) AND (count(member.id) FILTER (WHERE (member.removed_at IS NULL)) = count(readiness.isometric_id))) AS is_rft,
        CASE
            WHEN (COALESCE(bool_and(readiness.is_rft) FILTER (WHERE (readiness.isometric_id IS NOT NULL)), false) AND (pack.lifecycle = 'active'::text) AND (count(member.id) FILTER (WHERE (member.removed_at IS NULL)) > 0) AND (count(member.id) FILTER (WHERE (member.removed_at IS NULL)) = count(readiness.isometric_id))) THEN max(readiness.rft_on)
            ELSE NULL::date
        END AS rft_on
   FROM ((test_packs pack
     LEFT JOIN test_pack_isometrics member ON (((member.test_pack_id = pack.id) AND (member.removed_at IS NULL))))
     LEFT JOIN isometric_readiness readiness ON ((readiness.isometric_id = member.isometric_id)))
  GROUP BY pack.id;

create or replace view public.test_pack_workflow with (security_invoker = true) as
WITH pack_facts AS (
         SELECT pack.id AS test_pack_id,
            pack.project_id,
            pack.test_pack_number,
            pack.revision_no,
            pack.lifecycle,
            readiness.is_rft,
            jsonb_build_object('NO_SPOOLS', COALESCE(readiness.no_spools_count, 0), 'WELD_OR_SUPPORT_PENDING', COALESCE(readiness.weld_or_support_pending_count, 0), 'FLANGE_PENDING', COALESCE(readiness.flange_pending_count, 0), 'NDE_PENDING', COALESCE(readiness.nde_pending_count, 0), 'PWHT_PENDING', COALESCE(readiness.pwht_pending_count, 0), 'LINE_CHECK_PENDING', COALESCE(readiness.line_check_pending_count, 0), 'X_OPEN', COALESCE(readiness.x_open_count, 0)) AS rft_blocker_counts,
            readiness.rft_on
           FROM (test_packs pack
             LEFT JOIN test_pack_readiness readiness ON ((readiness.test_pack_id = pack.id)))
        ), blinding_facts AS (
         SELECT pack.test_pack_id,
            (EXISTS ( SELECT 1
                   FROM pressure_test_requests req
                  WHERE ((req.test_pack_id = pack.test_pack_id) AND (req.request_type = 'blinding'::text) AND (req.cancelled_at IS NULL)))) AS blinding_assigned,
            (EXISTS ( SELECT 1
                   FROM blinding_records rec
                  WHERE (rec.test_pack_id = pack.test_pack_id))) AS blinding_completed,
            ( SELECT max(rec.completed_on) AS max
                   FROM blinding_records rec
                  WHERE (rec.test_pack_id = pack.test_pack_id)) AS blinding_completed_on
           FROM pack_facts pack
        ), stage_event_facts AS (
         SELECT pack.test_pack_id,
            max(ev.occurred_on) FILTER (WHERE (ev.stage = 'testing_started'::text)) AS testing_started_on,
            max(ev.occurred_on) FILTER (WHERE (ev.stage = 'testing_completed'::text)) AS testing_completed_on,
            max(ev.occurred_on) FILTER (WHERE (ev.stage = 'precommissioning_completed'::text)) AS precommissioning_completed_on
           FROM (pack_facts pack
             LEFT JOIN pressure_test_stage_events ev ON ((ev.test_pack_id = pack.test_pack_id)))
          GROUP BY pack.test_pack_id
        ), flange_by_isometric AS MATERIALIZED (
         SELECT flange.isometric_id,
            (count(flange.flange_joint_revision_id) FILTER (WHERE (flange.category_code = 'Y'::text)))::integer AS y_target_count,
            (count(flange.flange_joint_revision_id) FILTER (WHERE ((flange.category_code = 'Y'::text) AND (EXISTS ( SELECT 1
                   FROM flange_reinstatement_records rec
                  WHERE ((rec.flange_joint_revision_id = flange.flange_joint_revision_id) AND (rec.superseded_at IS NULL)))))))::integer AS y_completed_count,
            (count(flange.flange_joint_revision_id) FILTER (WHERE (flange.category_code = 'Z'::text)))::integer AS z_target_count,
            (count(flange.flange_joint_revision_id) FILTER (WHERE ((flange.category_code = 'Z'::text) AND (EXISTS ( SELECT 1
                   FROM flange_reinstatement_records rec
                  WHERE ((rec.flange_joint_revision_id = flange.flange_joint_revision_id) AND (rec.superseded_at IS NULL)))))))::integer AS z_completed_count
           FROM flange_joint_readiness flange
          WHERE ((flange.revision_status = 'accepted'::revision_status) AND (NOT flange.is_removed) AND flange.requires_reinstatement
            AND (flange.isometric_id IN ( SELECT member.isometric_id
                   FROM test_pack_isometrics member
                  WHERE (member.removed_at IS NULL))))
          GROUP BY flange.isometric_id
        ), flange_facts AS (
         SELECT pack.test_pack_id,
            (COALESCE(sum(by_isometric.y_target_count), (0)::bigint))::integer AS y_target_count,
            (COALESCE(sum(by_isometric.y_completed_count), (0)::bigint))::integer AS y_completed_count,
            (COALESCE(sum(by_isometric.z_target_count), (0)::bigint))::integer AS z_target_count,
            (COALESCE(sum(by_isometric.z_completed_count), (0)::bigint))::integer AS z_completed_count
           FROM ((pack_facts pack
             LEFT JOIN test_pack_isometrics member ON (((member.test_pack_id = pack.test_pack_id) AND (member.removed_at IS NULL))))
             LEFT JOIN flange_by_isometric by_isometric ON ((by_isometric.isometric_id = member.isometric_id)))
          GROUP BY pack.test_pack_id
        ), prep_worklist_facts AS (
         SELECT pack.test_pack_id,
            (count(lc.isometric_id))::integer AS line_check_total,
            (count(lc.isometric_id) FILTER (WHERE (lc.result_id IS NOT NULL)))::integer AS line_check_completed,
            (count(ic.punch_item_id))::integer AS item_clearance_total,
            (count(ic.punch_item_id) FILTER (WHERE (ic.clearance_id IS NOT NULL)))::integer AS item_clearance_cleared
           FROM ((pack_facts pack
             LEFT JOIN line_check_worklist lc ON (((lc.test_pack_id = pack.test_pack_id) AND (lc.cancelled_at IS NULL))))
             LEFT JOIN item_clearance_worklist ic ON (((ic.test_pack_id = pack.test_pack_id) AND (ic.cancelled_at IS NULL))))
          GROUP BY pack.test_pack_id
        ), derived AS (
         SELECT pf.test_pack_id,
            pf.project_id,
            pf.test_pack_number,
            pf.revision_no,
            pf.lifecycle,
            pf.is_rft,
            pf.rft_on,
            pf.rft_blocker_counts,
            bf.blinding_assigned,
            bf.blinding_completed,
            bf.blinding_completed_on,
            (ef.testing_started_on IS NOT NULL) AS testing_started,
            ef.testing_started_on,
            (ef.testing_completed_on IS NOT NULL) AS testing_completed,
            ef.testing_completed_on,
            (ef.precommissioning_completed_on IS NOT NULL) AS precommissioned,
            ef.precommissioning_completed_on,
            COALESCE(ff.y_target_count, 0) AS y_target_count,
            COALESCE(ff.y_completed_count, 0) AS y_completed_count,
            COALESCE(ff.z_target_count, 0) AS z_target_count,
            COALESCE(ff.z_completed_count, 0) AS z_completed_count,
            COALESCE(pw.line_check_total, 0) AS line_check_total,
            COALESCE(pw.line_check_completed, 0) AS line_check_completed,
            COALESCE(pw.item_clearance_total, 0) AS item_clearance_total,
            COALESCE(pw.item_clearance_cleared, 0) AS item_clearance_cleared,
            (COALESCE(ff.y_target_count, 0) > 0) AS y_eligible,
            ((COALESCE(ff.y_target_count, 0) > 0) AND (COALESCE(ff.y_completed_count, 0) >= COALESCE(ff.y_target_count, 0))) AS y_reinstated,
            (COALESCE(ff.z_target_count, 0) > 0) AS z_eligible,
            ((COALESCE(ff.z_target_count, 0) > 0) AND (COALESCE(ff.z_completed_count, 0) >= COALESCE(ff.z_target_count, 0))) AS z_reinstated
           FROM ((((pack_facts pf
             LEFT JOIN blinding_facts bf ON ((bf.test_pack_id = pf.test_pack_id)))
             LEFT JOIN stage_event_facts ef ON ((ef.test_pack_id = pf.test_pack_id)))
             LEFT JOIN flange_facts ff ON ((ff.test_pack_id = pf.test_pack_id)))
             LEFT JOIN prep_worklist_facts pw ON ((pw.test_pack_id = pf.test_pack_id)))
        )
 SELECT test_pack_id,
    project_id,
    test_pack_number,
    revision_no,
    lifecycle,
    is_rft,
    rft_on,
    blinding_assigned,
    blinding_completed,
    blinding_completed_on,
    testing_started,
    testing_started_on,
    testing_completed,
    testing_completed_on,
    precommissioned,
    precommissioning_completed_on,
    y_target_count,
    y_completed_count,
    z_target_count,
    z_completed_count,
    line_check_total,
    line_check_completed,
    item_clearance_total,
    item_clearance_cleared,
        CASE
            WHEN is_rft THEN 'completed'::text
            ELSE 'blocked'::text
        END AS rft_state,
        CASE
            WHEN blinding_completed THEN 'completed'::text
            WHEN (NOT is_rft) THEN 'blocked'::text
            WHEN blinding_assigned THEN 'ongoing'::text
            ELSE 'ready'::text
        END AS blinding_state,
        CASE
            WHEN testing_completed THEN 'completed'::text
            WHEN (NOT blinding_completed) THEN 'blocked'::text
            WHEN testing_started THEN 'ongoing'::text
            ELSE 'ready'::text
        END AS testing_state,
        CASE
            WHEN (NOT y_eligible) THEN 'not_applicable'::text
            WHEN y_reinstated THEN 'completed'::text
            WHEN (NOT testing_completed) THEN 'blocked'::text
            WHEN (y_completed_count > 0) THEN 'ongoing'::text
            ELSE 'ready'::text
        END AS y_state,
        CASE
            WHEN precommissioned THEN 'completed'::text
            WHEN (NOT (testing_completed AND ((NOT y_eligible) OR y_reinstated))) THEN 'blocked'::text
            ELSE 'ready'::text
        END AS precomm_state,
        CASE
            WHEN (NOT z_eligible) THEN 'not_applicable'::text
            WHEN z_reinstated THEN 'completed'::text
            WHEN (NOT precommissioned) THEN 'blocked'::text
            WHEN (z_completed_count > 0) THEN 'ongoing'::text
            ELSE 'ready'::text
        END AS z_state,
        CASE
            WHEN (NOT is_rft) THEN 'awaiting_rft'::text
            WHEN (NOT (blinding_assigned AND blinding_completed)) THEN 'blinding_assigned'::text
            WHEN (NOT testing_started) THEN 'blinded'::text
            WHEN (NOT testing_completed) THEN 'testing'::text
            WHEN (y_eligible AND (NOT y_reinstated)) THEN 'awaiting_y_reinstatement'::text
            WHEN (NOT precommissioned) THEN 'ready_for_precommissioning'::text
            WHEN (z_eligible AND (NOT z_reinstated)) THEN 'awaiting_z_reinstatement'::text
            ELSE 'complete'::text
        END AS canonical_state,
    jsonb_build_object('rft',
        CASE
            WHEN (NOT is_rft) THEN COALESCE(rft_blocker_counts, '{}'::jsonb)
            ELSE '{}'::jsonb
        END, 'blinding',
        CASE
            WHEN (NOT is_rft) THEN jsonb_build_array('rft_pending')
            ELSE '[]'::jsonb
        END, 'testing',
        CASE
            WHEN (NOT blinding_completed) THEN jsonb_build_array('blinding_pending')
            ELSE '[]'::jsonb
        END, 'y_reinstatement',
        CASE
            WHEN (NOT testing_completed) THEN jsonb_build_array('testing_pending')
            ELSE '[]'::jsonb
        END, 'precommissioning',
        CASE
            WHEN (NOT testing_completed) THEN jsonb_build_array('testing_pending')
            WHEN (y_eligible AND (NOT y_reinstated)) THEN jsonb_build_array('y_reinstatement_pending')
            ELSE '[]'::jsonb
        END, 'z_reinstatement',
        CASE
            WHEN (NOT precommissioned) THEN jsonb_build_array('precommissioning_pending')
            ELSE '[]'::jsonb
        END) AS blockers,
    array_remove(ARRAY[
        CASE
            WHEN (is_rft AND (NOT blinding_completed)) THEN 'blinding'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (blinding_completed AND (NOT testing_started)) THEN 'testing'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (blinding_completed AND (NOT testing_started)) THEN 'testing_start'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (testing_started AND (NOT testing_completed)) THEN 'testing'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (testing_started AND (NOT testing_completed)) THEN 'testing_complete'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (testing_completed AND y_eligible AND (NOT y_reinstated)) THEN 'y_reinstatement'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (testing_completed AND ((NOT y_eligible) OR y_reinstated) AND (NOT precommissioned)) THEN 'precommissioning'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (precommissioned AND z_eligible AND (NOT z_reinstated)) THEN 'z_reinstatement'::text
            ELSE NULL::text
        END], NULL::text) AS available_operations
   FROM derived d;

create or replace view public.test_pack_document_rows with (security_invoker = true) as
SELECT pack.id AS test_pack_id,
    pack.project_id,
    pack.test_pack_number,
    pack.revision_no,
    pack.lifecycle,
    system_ref.code AS system_code,
    system_ref.description AS system_description,
    subsystem.code AS subsystem_code,
    subsystem.description AS subsystem_description,
    service_class.code AS service_class_code,
    line_service.code AS line_service_code,
    pack.test_medium,
    pack.test_pressure,
    pack.pressure_unit,
    pack.location,
    pack.planned_start_on,
    pack.planned_end_on,
    COALESCE(readiness.is_rft, false) AS is_rft,
    readiness.rft_on,
    ( SELECT event.occurred_on
           FROM pressure_test_stage_events event
          WHERE ((event.test_pack_id = pack.id) AND (event.stage = 'testing_started'::text))) AS testing_started_on,
    ( SELECT event.occurred_on
           FROM pressure_test_stage_events event
          WHERE ((event.test_pack_id = pack.id) AND (event.stage = 'testing_completed'::text))) AS testing_completed_on,
    ( SELECT event.occurred_on
           FROM pressure_test_stage_events event
          WHERE ((event.test_pack_id = pack.id) AND (event.stage = 'precommissioning_completed'::text))) AS precommissioning_completed_on,
    ( SELECT (count(*))::integer AS count
           FROM test_pack_isometrics member
          WHERE ((member.test_pack_id = pack.id) AND (member.removed_at IS NULL))) AS iso_count,
    ( SELECT array_agg(DISTINCT rev.line_number ORDER BY rev.line_number) AS array_agg
           FROM (test_pack_isometrics member
             JOIN isometric_revisions rev ON ((rev.id = member.assigned_isometric_revision_id)))
          WHERE ((member.test_pack_id = pack.id) AND (member.removed_at IS NULL) AND (rev.line_number IS NOT NULL))) AS line_numbers,
    COALESCE(welds.weld_total, 0) AS weld_total,
    COALESCE(welds.weld_done, 0) AS weld_done,
    COALESCE(readiness.x_open_count, 0) AS open_x_count
   FROM ((((((test_packs pack
     LEFT JOIN project_systems system_ref ON ((system_ref.id = pack.system_id)))
     LEFT JOIN project_subsystems subsystem ON ((subsystem.id = pack.subsystem_id)))
     LEFT JOIN project_service_classes service_class ON ((service_class.id = pack.service_class_id)))
     LEFT JOIN project_line_services line_service ON ((line_service.id = pack.line_service_id)))
     LEFT JOIN test_pack_readiness readiness ON ((readiness.test_pack_id = pack.id)))
     LEFT JOIN ( SELECT member.project_id,
            member.test_pack_id,
            (count(wjr.id))::integer AS weld_total,
            (count(progress.weld_on))::integer AS weld_done
           FROM ((((test_pack_isometrics member
             JOIN isometric_revisions rev ON (((rev.isometric_id = member.isometric_id) AND (rev.status = 'accepted'::revision_status))))
             JOIN spool_revisions sr ON (((sr.isometric_revision_id = rev.id) AND (NOT sr.is_removed))))
             JOIN weld_joint_revisions wjr ON (((wjr.spool_revision_id = sr.id) AND (NOT wjr.is_removed))))
             LEFT JOIN weld_progress_records progress ON ((progress.weld_joint_revision_id = wjr.id)))
          WHERE (member.removed_at IS NULL)
          GROUP BY member.project_id, member.test_pack_id) welds ON (((welds.project_id = pack.project_id) AND (welds.test_pack_id = pack.id))));
