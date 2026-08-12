-- The original spool-revision policy resolves the project through the parent
-- isometric revision. Keep that shape: calling spool_revision_project_id from
-- the spool-revision policy recursively evaluates the same policy.

drop policy if exists "read spool revisions" on public.spool_revisions;
create policy "read spool revisions" on public.spool_revisions for select to authenticated
using (
  public.current_user_has_capability(
    public.isometric_revision_project_id(spool_revisions.isometric_revision_id),
    'spooling.view'
  )
  or (
    public.current_user_has_capability(
      public.isometric_revision_project_id(spool_revisions.isometric_revision_id),
      'flange.view'
    )
    and exists (
      select 1
      from public.isometric_revisions ir
      where ir.id = spool_revisions.isometric_revision_id
        and public.current_user_in_pds_scope(
          public.isometric_revision_project_id(ir.id), ir.pds_area_id
        )
    )
  )
);
