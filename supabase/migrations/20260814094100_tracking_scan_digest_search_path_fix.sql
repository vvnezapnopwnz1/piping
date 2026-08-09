-- pgcrypto is installed in the extensions schema in local and hosted Supabase.
alter function public.apply_tracking_scan_import_job(uuid, boolean)
  set search_path = public, extensions, pg_temp;
