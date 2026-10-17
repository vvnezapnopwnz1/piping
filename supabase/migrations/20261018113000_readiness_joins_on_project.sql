-- N4: the same push-down for the pieces the readiness views join: flange_joint_readiness gets project_id
-- (last column, nothing else changes) so isometric_readiness can join on it, and test_pack_readiness joins
-- isometric_readiness on project_id as well, so reading one project's packs no longer computes the
-- readiness of every project's isometrics.

create or replace view public.flange_joint_readiness with (security_invoker = true) as
SELECT worklist.flange_joint_id,
    worklist.flange_number,
    worklist.flange_joint_revision_id,
    worklist.flange_rating,
    worklist.diameter_inch,
    worklist.bolt_size,
    worklist.bolt_quantity,
    worklist.joint_type,
    worklist.is_removed,
    worklist.spool_revision_id,
    worklist.spool_number,
    worklist.isometric_id,
    worklist.iso_number,
    worklist.revision_number,
    worklist.revision_status,
    worklist.pds_area_id,
    worklist.pds_code,
    worklist.line_number,
    worklist.service_class_code,
    worklist.effective_progress_id,
    worklist.joint_category_id,
    worklist.torquing_requirement_id,
    worklist.jointing_method_snapshot,
    worklist.jointing_value,
    worklist.joint_date,
    worklist.report_number,
    worklist.tag_number,
    worklist.calculated_ut,
    worklist.ut_formula_version,
    worklist.progress_state,
    category.category_code,
    category.timing,
    category.reason,
    category.coefficient AS category_coefficient,
    (category.category_code = ANY (ARRAY['Y'::text, 'Z'::text])) AS requires_reinstatement,
    worklist.project_id
   FROM (flange_joint_worklist worklist
     LEFT JOIN project_joint_categories category ON ((category.id = worklist.joint_category_id)));

create or replace view public.isometric_readiness with (security_invoker = true) as
WITH current_revision AS NOT MATERIALIZED (
         SELECT iso.id AS isometric_id,
            iso.project_id,
            revision.id AS isometric_revision_id,
            revision.pds_area_id
           FROM (isometrics iso
             JOIN isometric_revisions revision ON (((revision.isometric_id = iso.id) AND (revision.status = 'accepted'::revision_status))))
        ), spool_facts AS (
         SELECT current_revision_1.isometric_id,
            current_revision_1.project_id,
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
          GROUP BY current_revision_1.isometric_id, current_revision_1.project_id
        ), flange_facts AS (
         SELECT current_revision_1.isometric_id,
            current_revision_1.project_id,
            (count(flange.flange_joint_revision_id))::integer AS flange_total,
            (count(flange.flange_joint_revision_id) FILTER (WHERE (flange.effective_progress_id IS NOT NULL)))::integer AS flange_complete,
            COALESCE(sum(flange.calculated_ut) FILTER (WHERE (flange.effective_progress_id IS NOT NULL)), (0)::numeric) AS unit_time
           FROM (current_revision current_revision_1
             LEFT JOIN flange_joint_readiness flange ON (((flange.isometric_id = current_revision_1.isometric_id) AND (flange.project_id = current_revision_1.project_id) AND (flange.revision_status = 'accepted'::revision_status) AND (NOT flange.is_removed))))
          GROUP BY current_revision_1.isometric_id, current_revision_1.project_id
        ), line_facts AS (
         SELECT member.isometric_id,
            member.project_id,
            (count(*))::integer AS line_check_assigned,
            (count(*) FILTER (WHERE (result.id IS NOT NULL)))::integer AS line_check_completed,
            max(result.completed_on) AS last_line_check_on
           FROM ((line_check_request_items member
             JOIN pressure_test_requests request ON (((request.id = member.request_id) AND (request.cancelled_at IS NULL))))
             LEFT JOIN line_check_results result ON (((result.request_id = member.request_id) AND (result.isometric_id = member.isometric_id))))
          GROUP BY member.isometric_id, member.project_id
        ), punch_facts AS (
         SELECT punch.isometric_id,
            punch.project_id,
            (count(*) FILTER (WHERE (clearance.id IS NULL)))::integer AS open_x_count,
            max(clearance.cleared_on) AS last_x_cleared_on
           FROM (punch_items punch
             LEFT JOIN punch_item_clearances clearance ON ((clearance.punch_item_id = punch.id)))
          GROUP BY punch.isometric_id, punch.project_id
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
     LEFT JOIN spool_facts ON (((spool_facts.isometric_id = current_revision.isometric_id) AND (spool_facts.project_id = current_revision.project_id))))
     LEFT JOIN flange_facts ON (((flange_facts.isometric_id = current_revision.isometric_id) AND (flange_facts.project_id = current_revision.project_id))))
     LEFT JOIN line_facts ON (((line_facts.isometric_id = current_revision.isometric_id) AND (line_facts.project_id = current_revision.project_id))))
     LEFT JOIN punch_facts ON (((punch_facts.isometric_id = current_revision.isometric_id) AND (punch_facts.project_id = current_revision.project_id))));

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
     LEFT JOIN isometric_readiness readiness ON (((readiness.isometric_id = member.isometric_id) AND (readiness.project_id = pack.project_id))))
  GROUP BY pack.id;
