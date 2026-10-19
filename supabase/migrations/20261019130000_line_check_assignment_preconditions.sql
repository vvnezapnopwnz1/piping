-- Line Check Preparation assigns only ISOs that are ready, and only ISOs of the pack.
--
-- Manual 16.1 lists, for assignment, the ISOs or test packs "ready for the line checking": the spools are
-- supported and the weld joints are welded. assign_line_check checked the permissions, the team and that the
-- ISO is not already assigned, but not that the work was done, and not that the ISO belongs to the pack it is
-- assigned through. A line check could be booked for an ISO whose joints were still open.
--
-- Joints of every location count (shop and field), against the ISO's accepted revision; so do the supports.
-- Reasons: PQC62 the ISO is not in the pack, PQC63 a joint is not welded or a support is not recorded.
--
-- Test: 133_line_check_assignment_preconditions.test.sql.

do $migration$
declare
  function_definition text;
  declaration_anchor text := 'declare pack public.test_packs;';
  loop_anchor text := E'    if exists (\n      select 1 from public.line_check_request_items item';
  readiness_guard text := $guard$
    if not exists (
      select 1 from public.test_pack_isometrics member
      where member.test_pack_id = pack.id and member.isometric_id = iso_id and member.removed_at is null
    ) then raise exception 'The ISO is not part of this test pack' using errcode = 'PQC62'; end if;
    select count(*) filter (where progress.id is null) into open_welds
      from public.weld_joint_revisions joint
      join public.spool_revisions spool_revision on spool_revision.id = joint.spool_revision_id and not spool_revision.is_removed
      left join public.weld_progress_records progress on progress.weld_joint_revision_id = joint.id and progress.weld_on is not null
      where spool_revision.isometric_revision_id = accepted.revision_id and not joint.is_removed;
    select count(*) filter (where progress.id is null) into open_supports
      from public.support_revisions support
      join public.spool_revisions spool_revision on spool_revision.id = support.spool_revision_id and not spool_revision.is_removed
      left join public.support_progress_records progress on progress.support_revision_id = support.id
      where spool_revision.isometric_revision_id = accepted.revision_id and not support.is_removed;
    if open_welds > 0 or open_supports > 0 then
      raise exception 'The ISO is not ready for a line check: % joint(s) not welded, % support(s) not recorded', open_welds, open_supports
        using errcode = 'PQC63';
    end if;
$guard$;
begin
  select pg_get_functiondef(
    'public.assign_line_check(uuid, uuid[], uuid, date, text)'::regprocedure
  ) into function_definition;
  if position(declaration_anchor in function_definition) = 0 or position(loop_anchor in function_definition) = 0 then
    raise exception 'assign_line_check no longer has the shape this migration extends';
  end if;
  function_definition := replace(function_definition, declaration_anchor, 'declare open_welds integer; open_supports integer; pack public.test_packs;');
  function_definition := replace(function_definition, loop_anchor, readiness_guard || loop_anchor);
  execute function_definition;
end
$migration$;
