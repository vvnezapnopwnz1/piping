-- Track 09: make the small set of flange referentials configurable.
-- Existing UT rows remain wildcard rules (NULL flange_rating).

alter table public.system_ut_calculation_rules
  add column if not exists flange_rating text;

alter table public.system_ut_calculation_rules
  drop constraint if exists system_ut_calculation_rules_diameter_from_inch_diameter_to_inch_key;

alter table public.system_ut_calculation_rules
  drop constraint if exists system_ut_calculation_rules_flange_rating_nonblank_check;

alter table public.system_ut_calculation_rules
  add constraint system_ut_calculation_rules_flange_rating_nonblank_check
  check (flange_rating is null or length(trim(flange_rating)) > 0);

create unique index if not exists system_ut_calculation_rules_flange_lookup_idx
  on public.system_ut_calculation_rules(
    diameter_from_inch,
    diameter_to_inch,
    coalesce(upper(btrim(flange_rating)), '*')
  );

-- Preserve the original restrictive policy names and browser-role contract while
-- adding the one newly-configurable global kind.
drop policy if exists "platform admins insert material types only" on public.system_reference_entries;
create policy "platform admins insert material types only" on public.system_reference_entries
  as restrictive for insert to authenticated
  with check (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind));
drop policy if exists "platform admins update material types only" on public.system_reference_entries;
create policy "platform admins update material types only" on public.system_reference_entries
  as restrictive for update to authenticated
  using (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind))
  with check (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind));
drop policy if exists "platform admins delete material types only" on public.system_reference_entries;
create policy "platform admins delete material types only" on public.system_reference_entries
  as restrictive for delete to authenticated
  using (kind in ('material_type'::public.system_reference_kind, 'torquing_requirement'::public.system_reference_kind));

drop policy if exists "system_ut_calculation_rules capability insert" on public.system_ut_calculation_rules;
create policy "system_ut_calculation_rules capability insert"
on public.system_ut_calculation_rules for insert to authenticated
with check (public.current_user_has_global_capability('system_referential.manage'));

grant insert (
  diameter_from_inch,
  diameter_to_inch,
  flange_rating,
  coefficient_diameter,
  coefficient_rating
)
on public.system_ut_calculation_rules to authenticated;
