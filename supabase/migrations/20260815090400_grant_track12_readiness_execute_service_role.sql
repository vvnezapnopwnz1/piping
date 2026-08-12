-- Track 12's demo:prepare preflight calls get_project_setup_readiness(uuid) as service_role to
-- prove the golden project's readiness gates are green after preparation. Only `authenticated`
-- was ever granted EXECUTE on this function (20260801091000_referential_invariants.sql), so
-- demo:prepare fails with "permission denied for function get_project_setup_readiness" on a
-- clean reset.

grant execute on function public.get_project_setup_readiness(uuid) to service_role;
