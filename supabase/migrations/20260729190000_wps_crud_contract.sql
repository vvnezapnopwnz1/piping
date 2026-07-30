do $$
begin
  if exists (
    select 1
    from public.project_welding_procedures
    where subcontractor_id is null
  ) then
    raise exception
      'Cannot require WPS subcontractor: existing project_welding_procedures rows have NULL subcontractor_id'
      using errcode = '23502';
  end if;
end;
$$;

alter table public.project_welding_procedures
  alter column subcontractor_id set not null;

grant select on public.project_welding_procedures to authenticated;
grant select on public.project_subcontractors to authenticated;

grant insert (
  project_id, subcontractor_id, material_type_id, code, description, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision,
  approved_on, status
) on public.project_welding_procedures to authenticated;

grant update (
  subcontractor_id, material_type_id, code, description, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision,
  approved_on, status
) on public.project_welding_procedures to authenticated;
