-- N3: apply reads the staged BOM lines once as well (see 20261018110000).
-- After the diff was read once, spooling_staging was the next cost: 517 calls on a 200-ISO import,
-- 1.2 s of 2.8 s, growing with the size of the job. Same rows written.

CREATE OR REPLACE FUNCTION public.apply_spooling_import_job_core(target_job_id uuid)
 RETURNS import_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  job public.import_jobs;
  blockers integer;
  warnings integer;
  unresolved integer;
  iso_rec record;
  spool_rec record;
  child_rec record;
  isometric_row public.isometrics;
  previous_revision_id uuid;
  new_revision_id uuid;
  next_ordinal integer;
  staged_revision_number text;
  spool_row public.spools;
  new_spool_revision_id uuid;
  previous_spool_revision_id uuid;
  spool_decision public.revision_decision;
  weld_decision public.revision_decision;
  weld_joint_row public.weld_joints;
  new_weld_revision_id uuid;
  support_row public.supports;
  flange_row public.flange_joints;
  change_item_id uuid;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
  progress_kind text;
begin
  -- The row lock plus the applied_at guard is what makes double-apply impossible.
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.import_type <> 'spooling_definition' then
    raise exception 'This job is not a SpoolGen import' using errcode = 'PQC24';
  end if;
  if job.applied_at is not null or job.status = 'applied' then
    raise exception 'This import has already been applied' using errcode = 'PQC10';
  end if;
  if job.status <> 'validated' then
    raise exception 'The import must be validated before it can be applied' using errcode = 'PQC24';
  end if;
  if not exists (
    select 1 from public.import_files where job_id = target_job_id and file_role = 'weld'
  ) then
    raise exception 'weld.txt is required before apply' using errcode = 'PQC25';
  end if;

  select r.blocker_count, r.warning_count, r.unresolved_count
  into blockers, warnings, unresolved
  from public.revalidate_spooling_import_job(target_job_id) r;

  if blockers > 0 then
    raise exception 'The import still has blocking issues' using errcode = 'PQC26';
  end if;
  if unresolved > 0 then
    raise exception 'Every revised spool and reworked weld needs a decision' using errcode = 'PQC22';
  end if;

  -- The diff against the accepted revisions, read once. The loops below used to ask for it again for
  -- every spool and every kind of child (328 times for 94 spools, 4.3 s of the 4.7 s of apply); an
  -- ISO is accepted only at the end of its own pass and the diff of one ISO does not depend on
  -- another, so the answer at the start is the answer at every later point.
  drop table if exists pipeqc_apply_preview;
  create temp table pipeqc_apply_preview on commit drop as
    select * from public.preview_spooling_import(target_job_id);
  create index on pipeqc_apply_preview (entity_type, iso_number);
  analyze pipeqc_apply_preview;

  -- The staged BOM lines, read once for the same reason: the spool loop asked spooling_staging for
  -- all of them again for every spool (2.4 ms a call on 5,900 rows, growing with the job).
  drop table if exists pipeqc_apply_materials;
  create temp table pipeqc_apply_materials on commit drop as
    select s.entity_kind, s.entity_values
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'material';
  create index on pipeqc_apply_materials ((entity_values ->> 'iso_number'), (entity_values ->> 'spool_number'));
  analyze pipeqc_apply_materials;

  for iso_rec in
    select
      s.entity_values ->> 'iso_number' as iso_number,
      s.entity_values ->> 'revision_number' as revision_number,
      s.entity_values ->> 'pds_area' as pds_area,
      s.entity_values ->> 'service_class' as service_class,
      s.entity_values ->> 'line_number' as line_number,
      s.entity_values ->> 'sheet_number' as sheet_number
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'isometric'
    order by 1
  loop
    insert into public.isometrics (project_id, iso_number)
    values (job.project_id, iso_rec.iso_number)
    on conflict (project_id, iso_number) do update
      set updated_at = timezone('utc', now())
    returning * into isometric_row;

    select id into previous_revision_id
    from public.isometric_revisions
    where isometric_id = isometric_row.id and status = 'accepted';

    staged_revision_number := coalesce(nullif(trim(iso_rec.revision_number), ''), 'R0');

    if exists (
      select 1 from public.isometric_revisions
      where isometric_id = isometric_row.id and revision_number = staged_revision_number
    ) then
      raise exception 'Isometric % already has revision %',
        iso_rec.iso_number, staged_revision_number using errcode = 'PQC23';
    end if;

    select coalesce(max(revision_ordinal), 0) + 1 into next_ordinal
    from public.isometric_revisions where isometric_id = isometric_row.id;

    insert into public.isometric_revisions (
      isometric_id, revision_number, revision_ordinal, status,
      pds_area_id, service_class_id, line_number, sheet_number,
      source_import_job_id, created_by
    )
    values (
      isometric_row.id, staged_revision_number, next_ordinal, 'draft',
      (select id from public.project_pds_areas
        where project_id = job.project_id and code = iso_rec.pds_area),
      (select id from public.project_service_classes
        where project_id = job.project_id and code = iso_rec.service_class),
      iso_rec.line_number, iso_rec.sheet_number,
      target_job_id, auth.uid()
    )
    returning id into new_revision_id;

    affected := affected || new_revision_id;
    written := written + 1;

    -- Every spool the new revision must contain: staged spools plus, for a revised
    -- ISO, the spools of the accepted revision that the file set dropped.
    for spool_rec in
      select p.entity_key as spool_number, p.change_type, p.decision,
             p.previous_payload, p.next_payload
      from pipeqc_apply_preview p
      where p.entity_type = 'spool' and p.iso_number = iso_rec.iso_number
      order by p.entity_key
    loop
      spool_decision := spool_rec.decision;

      insert into public.spools (project_id, spool_number)
      values (job.project_id, spool_rec.spool_number)
      on conflict (project_id, spool_number) do update set spool_number = excluded.spool_number
      returning * into spool_row;

      select sr.id into previous_spool_revision_id
      from public.spool_revisions sr
      where sr.spool_id = spool_row.id
        and sr.isometric_revision_id = previous_revision_id;

      -- Dossier 15.2: a cancelled or dropped spool is carried as removed, so the new
      -- revision alone answers "what is in scope" without joining to history.
      insert into public.spool_revisions (
        spool_id, isometric_revision_id, sequence_number, weight_kg, material_class, is_removed
      )
      values (
        spool_row.id,
        new_revision_id,
        coalesce((spool_rec.next_payload ->> 'sequence_number')::integer, 1),
        public.engineering_numeric(spool_rec.next_payload ->> 'weight_kg'),
        nullif(spool_rec.next_payload ->> 'material_class', ''),
        coalesce(spool_rec.change_type = 'removed' or spool_decision = 'cancelled', false)
      )
      returning id into new_spool_revision_id;

      written := written + 1;

      insert into public.revision_change_items (
        project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
        entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
        source_import_job_id
      )
      values (
        job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
        'spool', spool_row.id, spool_rec.spool_number, spool_rec.change_type,
        spool_rec.previous_payload, spool_rec.next_payload, target_job_id
      )
      returning id into change_item_id;

      if spool_decision is not null then
        insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
        select change_item_id, spool_decision, d.comment, d.decided_by
        from public.import_revision_decisions d
        where d.job_id = target_job_id and d.entity_type = 'spool'
          and d.entity_key = spool_rec.spool_number;
      end if;

      -- Plan section 3.8: authorize progress carry-over, do not fabricate progress rows.
      if previous_spool_revision_id is not null
         and spool_decision in ('done_without_modification', 'rework') then
        foreach progress_kind in array array['fabrication_start', 'sent_to_paint', 'paint']
        loop
          insert into public.revision_progress_copies (
            change_item_id, source_spool_revision_id, target_spool_revision_id,
            progress_kind, copied_by
          )
          values (
            change_item_id, previous_spool_revision_id, new_spool_revision_id,
            progress_kind, auth.uid()
          );
        end loop;
      end if;

      if coalesce(spool_rec.change_type = 'removed' or spool_decision = 'cancelled', false) then
        continue;
      end if;

      -- Weld joints
      for child_rec in
        select p.entity_key as weld_number, p.change_type, p.decision,
               p.previous_payload, p.next_payload
        from pipeqc_apply_preview p
        where p.entity_type = 'weld_joint'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        weld_decision := child_rec.decision;

        insert into public.weld_joints (project_id, weld_number)
        values (job.project_id, child_rec.weld_number)
        on conflict (project_id, weld_number) do update set weld_number = excluded.weld_number
        returning * into weld_joint_row;

        insert into public.weld_joint_revisions (
          weld_joint_id, spool_revision_id, weld_type_id, weld_location,
          diameter_inch, thickness_mm, is_removed
        )
        values (
          weld_joint_row.id,
          new_spool_revision_id,
          (select id from public.project_weld_types
            where project_id = job.project_id
              and code = child_rec.next_payload ->> 'weld_type'),
          coalesce(nullif(child_rec.next_payload ->> 'weld_location', ''), 'shop'),
          public.engineering_numeric(child_rec.next_payload ->> 'diameter_inch'),
          public.engineering_numeric(child_rec.next_payload ->> 'thickness_mm'),
          coalesce(child_rec.change_type = 'removed' or weld_decision = 'cancelled', false)
        )
        returning id into new_weld_revision_id;

        written := written + 1;

        -- Dossier 7.3: Root and Cap always exist; Heat and Fill are optional and are
        -- attached by fabrication, not by the definition.
        if child_rec.change_type <> 'removed' and coalesce(weld_decision, 'not_done') <> 'cancelled' then
          insert into public.weld_points (weld_joint_revision_id, point_type, sequence_number)
          values (new_weld_revision_id, 'root', 1), (new_weld_revision_id, 'cap', 2);
        end if;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'weld_joint', weld_joint_row.id, child_rec.weld_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        )
        returning id into change_item_id;

        if weld_decision is not null then
          insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
          select change_item_id, weld_decision, d.comment, d.decided_by
          from public.import_revision_decisions d
          where d.job_id = target_job_id and d.entity_type = 'weld_joint'
            and d.entity_key = child_rec.weld_number;
        end if;
      end loop;

      -- Supports
      for child_rec in
        select p.entity_key as support_number, p.change_type,
               p.previous_payload, p.next_payload
        from pipeqc_apply_preview p
        where p.entity_type = 'support'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        insert into public.supports (project_id, support_number)
        values (job.project_id, child_rec.support_number)
        on conflict (project_id, support_number) do update set support_number = excluded.support_number
        returning * into support_row;

        insert into public.support_revisions (
          support_id, spool_revision_id, support_type, quantity, is_removed
        )
        values (
          support_row.id, new_spool_revision_id,
          nullif(child_rec.next_payload ->> 'support_type', ''),
          coalesce((child_rec.next_payload ->> 'quantity')::integer, 1),
          child_rec.change_type = 'removed'
        );

        written := written + 1;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'support', support_row.id, child_rec.support_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        );
      end loop;

      -- Flange joints
      for child_rec in
        select p.entity_key as flange_number, p.change_type,
               p.previous_payload, p.next_payload
        from pipeqc_apply_preview p
        where p.entity_type = 'flange_joint'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        insert into public.flange_joints (project_id, flange_number)
        values (job.project_id, child_rec.flange_number)
        on conflict (project_id, flange_number) do update set flange_number = excluded.flange_number
        returning * into flange_row;

        insert into public.flange_joint_revisions (
          flange_joint_id, spool_revision_id, flange_rating, diameter_inch,
          bolt_size, bolt_quantity, joint_type, is_removed
        )
        values (
          flange_row.id, new_spool_revision_id,
          nullif(child_rec.next_payload ->> 'flange_rating', ''),
          public.engineering_numeric(child_rec.next_payload ->> 'diameter_inch'),
          nullif(child_rec.next_payload ->> 'bolt_size', ''),
          nullif(child_rec.next_payload ->> 'bolt_quantity', '')::integer,
          nullif(child_rec.next_payload ->> 'joint_type', ''),
          child_rec.change_type = 'removed'
        );

        written := written + 1;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'flange_joint', flange_row.id, child_rec.flange_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        );
      end loop;

      -- Materials from trace.txt
      insert into public.spool_revision_materials (
        spool_revision_id, ident_code, description, quantity, unit, trace_number
      )
      select
        new_spool_revision_id,
        s.entity_values ->> 'ident_code',
        nullif(s.entity_values ->> 'description', ''),
        public.engineering_numeric(s.entity_values ->> 'quantity'),
        nullif(s.entity_values ->> 'unit', ''),
        nullif(s.entity_values ->> 'trace_number', '')
      from pipeqc_apply_materials s
      where s.entity_kind = 'material'
        and s.entity_values ->> 'iso_number' = iso_rec.iso_number
        and s.entity_values ->> 'spool_number' = spool_rec.spool_number
      on conflict do nothing;
    end loop;

    -- Supersede first, accept second: the partial unique index allows only one
    -- accepted revision, and the read-only trigger reads OLD.status, still 'accepted'.
    if previous_revision_id is not null then
      update public.isometric_revisions
      set status = 'superseded', superseded_at = timezone('utc', now())
      where id = previous_revision_id;
    end if;

    update public.isometric_revisions
    set status = 'accepted', accepted_at = timezone('utc', now())
    where id = new_revision_id;
  end loop;

  update public.import_jobs
  set status = 'applied',
      applied_at = timezone('utc', now()),
      completed_at = timezone('utc', now()),
      applied_row_count = written,
      affected_entity_ids = affected
  where id = target_job_id
  returning * into job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    job.project_id, auth.uid(), 'import_jobs', job.id,
    'apply_spooling_import_job', null, to_jsonb(job)
  );

  return job;
end;
$function$;
