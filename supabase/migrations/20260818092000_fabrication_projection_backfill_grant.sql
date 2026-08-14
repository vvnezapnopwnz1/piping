-- The local maintenance script authenticates as service_role. Browser roles remain unable to
-- invoke the internal recompute helper.
grant execute on function public.recompute_fabrication_spool_projection(uuid) to service_role;
