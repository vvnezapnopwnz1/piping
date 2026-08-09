-- SQLSTATE codes are five characters; keep result replay errors valid on the local stack.
create or replace function public.record_line_check_result(
  target_request_id uuid,
  target_isometric_id uuid,
  target_completed_on date,
  target_punches jsonb default '[]'::jsonb,
  target_idempotency_key text default null
)
returns public.line_check_results
language plpgsql security definer set search_path = public, pg_temp
as $$
declare request_row public.pressure_test_requests; result_row public.line_check_results; punch_entry jsonb; punch_code uuid; spool_id uuid; next_item integer; claimed jsonb;
begin
  select * into request_row from public.pressure_test_requests where id = target_request_id and request_type = 'line_check' for update;
  if not found then raise exception 'Line Check request is missing' using errcode = 'PQT01'; end if;
  if request_row.cancelled_at is not null then raise exception 'Cancelled request is read-only' using errcode = 'PQC89'; end if;
  if not public.current_user_has_capability(request_row.project_id, 'testpack.manage') then raise exception 'Test Pack management is not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.line_check_request_items where request_id = request_row.id and isometric_id = target_isometric_id) then raise exception 'ISO is not assigned to the Line Check request' using errcode = 'PQT02'; end if;
  claimed := public.claim_command_receipt(request_row.project_id, 'record_line_check_result', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then select * into result_row from public.line_check_results where id = (claimed -> 'result' ->> 'id')::uuid; return result_row; end if;
  if exists (select 1 from public.line_check_results where request_id = request_row.id and isometric_id = target_isometric_id) then raise exception 'Line Check result already recorded' using errcode = 'PQT03'; end if;
  insert into public.line_check_results(project_id, request_id, test_pack_id, isometric_id, completed_on, recorded_by)
  values (request_row.project_id, request_row.id, request_row.test_pack_id, target_isometric_id, target_completed_on, auth.uid()) returning * into result_row;
  select count(*) + 1 into next_item from public.punch_items where test_pack_id = request_row.test_pack_id;
  for punch_entry in select * from jsonb_array_elements(coalesce(target_punches, '[]'::jsonb)) loop
    punch_code := (punch_entry ->> 'punch_code_id')::uuid;
    if not exists (select 1 from public.project_punch_codes where id = punch_code and project_id = request_row.project_id and status = 'active') then raise exception 'Punch code is missing or inactive' using errcode = 'PQC95'; end if;
    spool_id := nullif(punch_entry ->> 'spool_id', '')::uuid;
    if spool_id is not null and not exists (select 1 from public.spools where id = spool_id and project_id = request_row.project_id) then raise exception 'Spool is outside the project' using errcode = 'PQC93'; end if;
    insert into public.punch_items(project_id, test_pack_id, isometric_id, spool_id, punch_code_id, item_number, description, checking_date, completion_date, created_by)
    values (request_row.project_id, request_row.test_pack_id, target_isometric_id, spool_id, punch_code, format('X-%s', lpad(next_item::text, 6, '0')), trim(punch_entry ->> 'description'), (punch_entry ->> 'checking_date')::date, nullif(punch_entry ->> 'completion_date', '')::date, auth.uid());
    next_item := next_item + 1;
  end loop;
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state) values (request_row.project_id, auth.uid(), 'line_check_results', result_row.id, 'record_line_check_result', to_jsonb(result_row));
  perform public.complete_command_receipt(request_row.project_id, 'record_line_check_result', target_idempotency_key, jsonb_build_object('id', result_row.id));
  return result_row;
end;
$$;
