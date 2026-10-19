-- A spool is "unchanged" in the revision preview only when nothing inside it changed either.
--
-- The preview judged a spool on its own fields (weight, material class). A spool that gained, lost or
-- received a weld, a support or a flange read "Unchanged" next to a decision list that offers "Done without
-- modification", and the reviewer had no sign that the spool had a new joint. Now a spool whose own fields
-- match but which has a changed part, before or after, is revised. Nothing else in the preview changes:
-- decisions are still required for every spool of a revised ISO, and the package position of a spool is
-- still not a rule (20261009190000).
--
-- Body of 20261009190000 plus the marked CTEs. Test: 130_spool_revised_by_its_children.test.sql.

CREATE OR REPLACE FUNCTION public.preview_spooling_import(target_job_id uuid)
 RETURNS TABLE(iso_number text, entity_type engineering_entity_type, entity_key text, change_type revision_change_type, requires_decision boolean, decision revision_decision, previous_payload jsonb, next_payload jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.view') then
    raise exception 'Spooling view capability is required' using errcode = '42501';
  end if;

  return query
  with staged as (
    select s.entity_kind, s.entity_values from public.spooling_staging(target_job_id) s
  ),
  -- The accepted revision of every ISO named by the file set, if there is one.
  previous_revision as (
    select distinct on (iso.iso_number)
      iso.iso_number,
      rev.id as revision_id
    from staged st
    join public.isometrics iso
      on iso.project_id = job.project_id
     and iso.iso_number = st.entity_values ->> 'iso_number'
    join public.isometric_revisions rev
      on rev.isometric_id = iso.id and rev.status = 'accepted'
  ),
  staged_spool as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'spool_number' as entity_key,
      jsonb_build_object(
        'sequence_number', coalesce(st.entity_values ->> 'sequence_number', '1'),
        'weight_kg', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'weight_kg')),
        'material_class', coalesce(st.entity_values ->> 'material_class', '')
      ) as payload
    from staged st where st.entity_kind = 'spool'
  ),
  previous_spool as (
    select
      pr.iso_number,
      sp.spool_number as entity_key,
      jsonb_build_object(
        'sequence_number', sr.sequence_number::text,
        'weight_kg', public.engineering_numeric_key(sr.weight_kg),
        'material_class', coalesce(sr.material_class, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    where sr.is_removed = false
  ),
  staged_weld as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'weld_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'weld_type', coalesce(st.entity_values ->> 'weld_type', ''),
        'weld_location', coalesce(st.entity_values ->> 'weld_location', 'shop'),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'thickness_mm', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'thickness_mm'))
      ) as payload
    from staged st where st.entity_kind = 'weld_joint'
  ),
  previous_weld as (
    select
      pr.iso_number,
      wj.weld_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'weld_type', coalesce(wt.code, ''),
        'weld_location', wjr.weld_location,
        'diameter_inch', public.engineering_numeric_key(wjr.diameter_inch),
        'thickness_mm', public.engineering_numeric_key(wjr.thickness_mm)
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.weld_joint_revisions wjr on wjr.spool_revision_id = sr.id
    join public.weld_joints wj on wj.id = wjr.weld_joint_id
    left join public.project_weld_types wt on wt.id = wjr.weld_type_id
    where wjr.is_removed = false
  ),
  staged_support as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'support_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'support_type', coalesce(st.entity_values ->> 'support_type', ''),
        'quantity', coalesce(st.entity_values ->> 'quantity', '1')
      ) as payload
    from staged st where st.entity_kind = 'support'
  ),
  previous_support as (
    select
      pr.iso_number,
      su.support_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'support_type', coalesce(supr.support_type, ''),
        'quantity', supr.quantity::text
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.support_revisions supr on supr.spool_revision_id = sr.id
    join public.supports su on su.id = supr.support_id
    where supr.is_removed = false
  ),
  staged_flange as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'flange_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'flange_rating', coalesce(st.entity_values ->> 'flange_rating', ''),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'bolt_size', coalesce(st.entity_values ->> 'bolt_size', ''),
        'bolt_quantity', coalesce(st.entity_values ->> 'bolt_quantity', ''),
        'joint_type', coalesce(st.entity_values ->> 'joint_type', '')
      ) as payload
    from staged st where st.entity_kind = 'flange_joint'
  ),
  previous_flange as (
    select
      pr.iso_number,
      fj.flange_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'flange_rating', coalesce(fjr.flange_rating, ''),
        'diameter_inch', public.engineering_numeric_key(fjr.diameter_inch),
        'bolt_size', coalesce(fjr.bolt_size, ''),
        'bolt_quantity', coalesce(fjr.bolt_quantity::text, ''),
        'joint_type', coalesce(fjr.joint_type, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.flange_joint_revisions fjr on fjr.spool_revision_id = sr.id
    join public.flange_joints fj on fj.id = fjr.flange_joint_id
    where fjr.is_removed = false
  ),
  combined as (
    select 'spool'::public.engineering_entity_type as et,
           coalesce(s.iso_number, p.iso_number) as iso_number,
           coalesce(s.entity_key, p.entity_key) as entity_key,
           p.payload as previous_payload, s.payload as next_payload
    from staged_spool s full outer join previous_spool p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'weld_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_weld s full outer join previous_weld p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'support', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_support s full outer join previous_support p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'flange_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_flange s full outer join previous_flange p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
  ),
  typed_own as (
    select
      c.iso_number,
      c.et,
      c.entity_key,
      case
        when c.previous_payload is null then 'new'
        when c.next_payload is null then 'removed'
        when c.previous_payload - 'sequence_number' = c.next_payload - 'sequence_number' then 'unchanged'
        else 'revised'
      end::public.revision_change_type as change_type,
      c.previous_payload,
      c.next_payload,
      exists (select 1 from previous_revision pr where pr.iso_number = c.iso_number) as iso_is_revised
    from combined c
  ),
  -- The spools a changed weld, support or flange belongs to, before and after: a part moved from one
  -- spool to another changes both.
  touched_spool as (
    select distinct t.iso_number, s.spool_number
    from typed_own t
    cross join lateral unnest(array[
      t.previous_payload ->> 'spool_number', t.next_payload ->> 'spool_number'
    ]) as s(spool_number)
    where t.et <> 'spool'
      and t.change_type <> 'unchanged'
      and coalesce(s.spool_number, '') <> ''
  ),
  typed as (
    select
      o.iso_number,
      o.et,
      o.entity_key,
      -- A spool is unchanged only when nothing inside it changed either; judged on its own fields it
      -- read "Unchanged" next to a new weld and invited "Done without modification".
      case
        when o.et = 'spool' and o.change_type = 'unchanged' and exists (
          select 1 from touched_spool ts
          where ts.iso_number = o.iso_number and ts.spool_number = o.entity_key
        ) then 'revised'::public.revision_change_type
        else o.change_type
      end as change_type,
      o.previous_payload,
      o.next_payload,
      o.iso_is_revised
    from typed_own o
  ),
  spool_decision as (
    select d.entity_key, d.decision
    from public.import_revision_decisions d
    where d.job_id = target_job_id and d.entity_type = 'spool'
  )
  select
    t.iso_number,
    t.et,
    t.entity_key,
    t.change_type,
    case
      -- Dossier 15.2: every spool of a revised ISO needs a decision.
      when t.et = 'spool' then t.iso_is_revised
      -- Dossier 15.3: a weld needs its own decision only inside a rework spool.
      when t.et = 'weld_joint' then t.iso_is_revised and exists (
        select 1 from spool_decision sd
        where sd.decision = 'rework'
          and sd.entity_key = coalesce(
            t.next_payload ->> 'spool_number', t.previous_payload ->> 'spool_number')
      )
      else false
    end as requires_decision,
    (select d.decision from public.import_revision_decisions d
     where d.job_id = target_job_id and d.entity_type = t.et and d.entity_key = t.entity_key),
    t.previous_payload,
    t.next_payload
  from typed t
  order by t.iso_number, t.et, t.entity_key;
end;
$function$;
