-- N4: test_pack_document_rows joins test_pack_readiness on project_id too, so reading the document rows of one
-- project computes the readiness of that project's packs only (6.5 s with 480 extra ISOs of another project).
-- Same columns, types and rows.

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
     LEFT JOIN test_pack_readiness readiness ON (((readiness.test_pack_id = pack.id) AND (readiness.project_id = pack.project_id))))
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
