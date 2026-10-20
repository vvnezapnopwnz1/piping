-- A spooling manager writes the four columns a template is made of, not the bookkeeping around them.
--
-- 20261020104000 granted insert and update on the whole table. RLS decides which rows a manager may
-- touch, not which columns: with the table-level grant a manager could name another profile as the
-- creator, back-date created_at, choose the id, or update project_id and move a template into any other
-- project they also manage. Insert and update are granted column by column instead, the way
-- 20261015090000_least_privilege_grants.sql does it for two other referentials. The defaults (id,
-- created_by = auth.uid(), created_at) and the updated_at trigger still run; they need no column grant.
-- select and delete stay as granted.

revoke insert, update on public.spooling_import_templates from authenticated;

grant insert (project_id, source, name, settings) on public.spooling_import_templates to authenticated;
grant update (source, name, settings) on public.spooling_import_templates to authenticated;
