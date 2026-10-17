-- Undo of 20261018117000: joining weld_log_rows on project_id made the planner choose a plan that was
-- slower, not faster (a statement timeout against 2 s). The definition from 20261018091000 stands.

create or replace view public.nde_register_rows with (security_invoker = true) as
SELECT obligation.id AS obligation_id,
    obligation.project_id,
    log.isometric_id,
    log.iso_number,
    log.spool_number,
    log.weld_number,
    log.weld_location,
    log.welder_codes,
    (obligation.method)::text AS method,
    obligation.selection_mode,
    obligation.required_coverage,
    obligation.disposition,
    batch.batch_number,
    batch.status AS batch_status,
    laboratory.description AS ndt_subcontractor_name,
    result.examined_on,
    result.outcome,
    COALESCE(result.report_number, batch.report_number) AS report_number,
    defect.code AS defect_code,
    log.test_pack_id,
    log.test_pack_number
   FROM ((((((nde_obligations obligation
     JOIN weld_log_rows log ON ((log.weld_joint_revision_id = obligation.weld_joint_revision_id)))
     LEFT JOIN nde_batch_items item ON ((item.obligation_id = obligation.id)))
     LEFT JOIN nde_batches batch ON ((batch.id = item.batch_id)))
     LEFT JOIN project_subcontractors laboratory ON ((laboratory.id = batch.ndt_subcontractor_id)))
     LEFT JOIN nde_results result ON ((result.obligation_id = obligation.id)))
     LEFT JOIN project_rework_codes defect ON ((defect.id = result.defect_rework_code_id)));
