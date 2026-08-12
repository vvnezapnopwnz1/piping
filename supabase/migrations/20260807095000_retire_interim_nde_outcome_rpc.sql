-- Track 06 Task 8: Retire interim RPC record_nde_obligation_outcome
-- Replaced by NDE batch and result recording RPCs in 20260807091000_nde_batches_results.sql.

drop function if exists public.record_nde_obligation_outcome(uuid, text, text);
