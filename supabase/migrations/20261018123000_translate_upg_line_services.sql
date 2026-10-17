-- Translate default line services to Russian for UPG-1 and any project using standard demo codes alongside Russian systems.
update public.project_line_services
set description = case code
  when 'PROCESS' then 'Технологическая среда'
  when 'AIR' then 'Сжатый воздух'
  when 'WATER' then 'Техническая вода'
  else description
end,
updated_at = timezone('utc', now())
where code in ('PROCESS', 'AIR', 'WATER')
  and description in ('Process fluid service', 'Plant air service', 'Utility water service')
  and (
    project_id in (select id from public.projects where activity_code in ('UPG-1', 'SHOWCASE-1'))
    or project_id in (select project_id from public.project_systems where description ~ '[а-яА-Я]')
  );
