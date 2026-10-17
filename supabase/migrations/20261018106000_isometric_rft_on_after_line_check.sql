-- An isometric is RFT on the day its last precondition was met: the spools were ready, the line
-- check was completed and the Category X punches were cleared (dossier 29: ISO RFT = QC + Complete +
-- Line Check + X). rft_on was the spools' date only, so TP-100-01 showed RFT on 17.09 although its line
-- check was completed on 25.09 and its X cleared on 27.09. Same columns, types and order.

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
