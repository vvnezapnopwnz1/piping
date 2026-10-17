-- flange_by_isometric stays MATERIALIZED (20261018104000 had a reason); the project_id key and joins of 114000/115000 stay.

create or replace view public.test_pack_workflow with (security_invoker = true) as
WITH pack_facts AS NOT MATERIALIZED (
         SELECT pack.id AS test_pack_id,
            pack.project_id,
            pack.test_pack_number,
            pack.revision_no,
            pack.lifecycle,
            readiness.is_rft,
            jsonb_build_object('NO_SPOOLS', COALESCE(readiness.no_spools_count, 0), 'WELD_OR_SUPPORT_PENDING', COALESCE(readiness.weld_or_support_pending_count, 0), 'FLANGE_PENDING', COALESCE(readiness.flange_pending_count, 0), 'NDE_PENDING', COALESCE(readiness.nde_pending_count, 0), 'PWHT_PENDING', COALESCE(readiness.pwht_pending_count, 0), 'LINE_CHECK_PENDING', COALESCE(readiness.line_check_pending_count, 0), 'X_OPEN', COALESCE(readiness.x_open_count, 0)) AS rft_blocker_counts,
            readiness.rft_on
           FROM (test_packs pack
             LEFT JOIN test_pack_readiness readiness ON (((readiness.test_pack_id = pack.id) AND (readiness.project_id = pack.project_id))))
        ), blinding_facts AS (
         SELECT pack.test_pack_id,
            pack.project_id,
            (EXISTS ( SELECT 1
                   FROM pressure_test_requests req
                  WHERE ((req.test_pack_id = pack.test_pack_id) AND (req.request_type = 'blinding'::text) AND (req.cancelled_at IS NULL)))) AS blinding_assigned,
            (EXISTS ( SELECT 1
                   FROM blinding_records rec
                  WHERE (rec.test_pack_id = pack.test_pack_id))) AS blinding_completed,
            ( SELECT max(rec.completed_on) AS max
                   FROM blinding_records rec
                  WHERE (rec.test_pack_id = pack.test_pack_id)) AS blinding_completed_on
           FROM (SELECT tp.id AS test_pack_id, tp.project_id FROM test_packs tp) pack
        ), stage_event_facts AS (
         SELECT pack.test_pack_id,
            pack.project_id,
            max(ev.occurred_on) FILTER (WHERE (ev.stage = 'testing_started'::text)) AS testing_started_on,
            max(ev.occurred_on) FILTER (WHERE (ev.stage = 'testing_completed'::text)) AS testing_completed_on,
            max(ev.occurred_on) FILTER (WHERE (ev.stage = 'precommissioning_completed'::text)) AS precommissioning_completed_on
           FROM ((SELECT tp.id AS test_pack_id, tp.project_id FROM test_packs tp) pack
             LEFT JOIN pressure_test_stage_events ev ON ((ev.test_pack_id = pack.test_pack_id)))
          GROUP BY pack.test_pack_id, pack.project_id
        ), flange_by_isometric AS MATERIALIZED (
         SELECT flange.isometric_id,
            flange.project_id,
            (count(flange.flange_joint_revision_id) FILTER (WHERE (flange.category_code = 'Y'::text)))::integer AS y_target_count,
            (count(flange.flange_joint_revision_id) FILTER (WHERE ((flange.category_code = 'Y'::text) AND (EXISTS ( SELECT 1
                   FROM flange_reinstatement_records rec
                  WHERE ((rec.flange_joint_revision_id = flange.flange_joint_revision_id) AND (rec.superseded_at IS NULL)))))))::integer AS y_completed_count,
            (count(flange.flange_joint_revision_id) FILTER (WHERE (flange.category_code = 'Z'::text)))::integer AS z_target_count,
            (count(flange.flange_joint_revision_id) FILTER (WHERE ((flange.category_code = 'Z'::text) AND (EXISTS ( SELECT 1
                   FROM flange_reinstatement_records rec
                  WHERE ((rec.flange_joint_revision_id = flange.flange_joint_revision_id) AND (rec.superseded_at IS NULL)))))))::integer AS z_completed_count
           FROM flange_joint_readiness flange
          WHERE ((flange.revision_status = 'accepted'::revision_status) AND (NOT flange.is_removed) AND flange.requires_reinstatement AND (flange.isometric_id IN ( SELECT member.isometric_id
                   FROM test_pack_isometrics member
                  WHERE (member.removed_at IS NULL))))
          GROUP BY flange.isometric_id, flange.project_id
        ), flange_facts AS (
         SELECT pack.test_pack_id,
            pack.project_id,
            (COALESCE(sum(by_isometric.y_target_count), (0)::bigint))::integer AS y_target_count,
            (COALESCE(sum(by_isometric.y_completed_count), (0)::bigint))::integer AS y_completed_count,
            (COALESCE(sum(by_isometric.z_target_count), (0)::bigint))::integer AS z_target_count,
            (COALESCE(sum(by_isometric.z_completed_count), (0)::bigint))::integer AS z_completed_count
           FROM (((SELECT tp.id AS test_pack_id, tp.project_id FROM test_packs tp) pack
             LEFT JOIN test_pack_isometrics member ON (((member.test_pack_id = pack.test_pack_id) AND (member.removed_at IS NULL))))
             LEFT JOIN flange_by_isometric by_isometric ON (((by_isometric.isometric_id = member.isometric_id) AND (by_isometric.project_id = pack.project_id))))
          GROUP BY pack.test_pack_id, pack.project_id
        ), prep_worklist_facts AS (
         SELECT pack.test_pack_id,
            pack.project_id,
            (count(lc.isometric_id))::integer AS line_check_total,
            (count(lc.isometric_id) FILTER (WHERE (lc.result_id IS NOT NULL)))::integer AS line_check_completed,
            (count(ic.punch_item_id))::integer AS item_clearance_total,
            (count(ic.punch_item_id) FILTER (WHERE (ic.clearance_id IS NOT NULL)))::integer AS item_clearance_cleared
           FROM (((SELECT tp.id AS test_pack_id, tp.project_id FROM test_packs tp) pack
             LEFT JOIN line_check_worklist lc ON ((((lc.test_pack_id = pack.test_pack_id) AND (lc.project_id = pack.project_id)) AND (lc.cancelled_at IS NULL))))
             LEFT JOIN item_clearance_worklist ic ON ((((ic.test_pack_id = pack.test_pack_id) AND (ic.project_id = pack.project_id)) AND (ic.cancelled_at IS NULL))))
          GROUP BY pack.test_pack_id, pack.project_id
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
             LEFT JOIN blinding_facts bf ON (((bf.test_pack_id = pf.test_pack_id) AND (bf.project_id = pf.project_id))))
             LEFT JOIN stage_event_facts ef ON (((ef.test_pack_id = pf.test_pack_id) AND (ef.project_id = pf.project_id))))
             LEFT JOIN flange_facts ff ON (((ff.test_pack_id = pf.test_pack_id) AND (ff.project_id = pf.project_id))))
             LEFT JOIN prep_worklist_facts pw ON (((pw.test_pack_id = pf.test_pack_id) AND (pw.project_id = pf.project_id))))
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
