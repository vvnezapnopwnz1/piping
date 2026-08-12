-- Keep the browser's writable surface limited to the Project Definition form.
-- Row-level security still decides which project rows can be updated.
grant update (
  activity_code,
  title,
  owner_name,
  contractor_name,
  owner_logo_path,
  contractor_logo_path,
  maximum_transit_time_days
) on public.projects to authenticated;
