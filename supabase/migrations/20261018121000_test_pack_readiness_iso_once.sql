-- N4: test_pack_readiness computes isometric_readiness once per query, not once per pack.
-- The planner ran it as the parameterised inner side of a nested loop: 20 packs of a 480-ISO project cost
-- 20 evaluations of a 1 s view (20 s, a statement timeout); the Test Packs screens did not open at all.
-- Materialised, the view is evaluated once and hash-joined. Same columns, types and rows.

create or replace view public.test_pack_readiness with (security_invoker = true) as
WITH iso_ready AS MATERIALIZED (SELECT * FROM isometric_readiness)
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
     LEFT JOIN iso_ready readiness ON ((readiness.isometric_id = member.isometric_id)))
  GROUP BY pack.id;
