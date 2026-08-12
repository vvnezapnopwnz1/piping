-- Forward fix for the pre-Track-09 diameter-only constraint. PostgreSQL
-- truncated its generated name, so both possible names are removed safely.

alter table public.system_ut_calculation_rules
  drop constraint if exists system_ut_calculation_rules_diameter_from_inch_diameter_to__key;

alter table public.system_ut_calculation_rules
  drop constraint if exists system_ut_calculation_rules_diameter_from_inch_diameter_to_inch;
