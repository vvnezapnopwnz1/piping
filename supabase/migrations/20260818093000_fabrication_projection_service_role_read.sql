-- Parity and backfill are controlled maintenance operations. They need service-role reads but do
-- not broaden the browser surface, which remains RPC-only.
grant select on public.fabrication_spool_projections to service_role;
