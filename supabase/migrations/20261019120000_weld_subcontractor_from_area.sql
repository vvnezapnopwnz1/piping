-- The weld's subcontractor is the one its PDS area names.
--
-- Manual 7.3 and 12.3 show "Subcontractor" on the weld progress screens as read-only, and manual 3.4 sets
-- it by PDS area: a shop subcontractor for shop joints, a field subcontractor for field joints. The command
-- checked that the WPS and the welders belong to the subcontractor it was given, but not that the
-- subcontractor itself is the area's, so a field joint could be recorded under the shop subcontractor.
--
-- Where the area names a subcontractor for the weld's location, the command now refuses any other one
-- (PQC61). Where the area names none, the choice stays open as before.
--
-- Test: 132_weld_subcontractor_from_area.test.sql.

do $migration$
declare
  function_definition text;
  anchor text := $anchor$
  if not public.current_user_in_subcontractor_scope(ctx.project_id, subcontractor_id) then$anchor$;
  guard text := $guard$
  -- The area names the subcontractor for the weld's location (manual 3.4); the screens show it read-only.
  select case ctx.weld_location when 'shop' then area.shop_subcontractor_id else area.field_subcontractor_id end
  into area_subcontractor_id
  from public.project_pds_areas area
  where area.id = ctx.pds_area_id;
  if area_subcontractor_id is not null and area_subcontractor_id <> subcontractor_id then
    raise exception 'The PDS area assigns a different subcontractor to % joints', ctx.weld_location
      using errcode = 'PQC61';
  end if;
$guard$;
begin
  select pg_get_functiondef(
    'public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)'::regprocedure
  ) into function_definition;
  if position(anchor in function_definition) = 0 then
    raise exception 'The weld command no longer has the subcontractor scope check this migration extends';
  end if;
  function_definition := replace(function_definition, anchor, guard || anchor);
  function_definition := replace(
    function_definition,
    E'declare\n',
    E'declare\n  area_subcontractor_id uuid;\n'
  );
  execute function_definition;
end
$migration$;
