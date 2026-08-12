-- Track 06 makes a defect code mandatory on a rejected NDE result: record_nde_result
-- raises PQC42 without one. No earlier bootstrap seeded project_rework_codes, so the
-- browser stand could record an acceptance but never a rejection, and the repair and
-- tracer cascade could not be walked at all. The 2026-08-04 Gate D5 run found this with
-- an empty "Defect code" dropdown on /nde.
--
-- Browser roles remain governed by RLS; this follows the precedent of
-- 20260805091000_grant_track05_fixture_referentials.sql.
grant select, insert, update, delete on table
  public.project_rework_codes
to service_role;
