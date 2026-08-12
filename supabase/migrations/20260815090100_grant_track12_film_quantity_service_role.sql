-- Track 09 (20260812095000_grant_track09_fixture_referentials.sql) granted service_role
-- select/insert/update/delete on system_ut_calculation_rules, but its sibling table
-- system_film_quantity_rules -- created in the same original migration and written the same
-- way by fixture/demo preparation scripts -- never received the equivalent grant. Track 12's
-- demo:prepare fails with "permission denied for table system_film_quantity_rules" on a clean
-- reset because of this gap.

grant select, insert, update, delete on table
  public.system_film_quantity_rules
to service_role;
