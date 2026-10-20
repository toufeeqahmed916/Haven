-- Haven Phase 3 Steps 3-4: atomic service-role-only complaint commands.
-- Run after 004_realtime.sql. Browser roles receive no execute permission.

create or replace function public.backend_save_complaint(
  p_actor_id uuid,
  p_complaint_id uuid,
  p_category_code text,
  p_original_text text,
  p_original_language public.app_language,
  p_is_anonymous boolean,
  p_latitude double precision,
  p_longitude double precision,
  p_address_text text,
  p_incident_at timestamptz,
  p_submit boolean,
  p_rules_urgency public.urgency_level,
  p_danger_flags text[],
  p_urgency_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category public.categories%rowtype;
  v_id uuid;
  v_status public.complaint_status := case when p_submit then 'submitted' else 'draft' end;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'citizen' and is_active) then raise exception 'Active citizen profile required'; end if;
  if char_length(btrim(coalesce(p_original_text, ''))) not between 10 and 10000 then raise exception 'Complaint text must be between 10 and 10000 characters'; end if;
  if (p_latitude is null) <> (p_longitude is null) then raise exception 'Latitude and longitude must be provided together'; end if;
  select * into v_category from public.categories where code = p_category_code and is_active;
  if not found then raise exception 'Unknown or inactive category'; end if;

  if p_complaint_id is null then
    insert into public.complaints (user_id, category_id, track, original_language, original_text, rules_urgency, final_urgency, urgency_reason, danger_flags, latitude, longitude, address_text, incident_at, is_anonymous, status, needs_human_review, submitted_at)
    values (p_actor_id, v_category.id, v_category.track, p_original_language, btrim(p_original_text), p_rules_urgency, p_rules_urgency, p_urgency_reason, coalesce(p_danger_flags, '{}'), p_latitude, p_longitude, nullif(btrim(p_address_text), ''), p_incident_at, p_is_anonymous, v_status, true, now())
    returning id into v_id;
  else
    select id into v_id from public.complaints where id = p_complaint_id and user_id = p_actor_id and status = 'draft' for update;
    if not found then raise exception 'Only the owner can change a draft complaint'; end if;
    update public.complaints set category_id = v_category.id, track = v_category.track, original_language = p_original_language, original_text = btrim(p_original_text), rules_urgency = p_rules_urgency, final_urgency = p_rules_urgency, urgency_reason = p_urgency_reason, danger_flags = coalesce(p_danger_flags, '{}'), latitude = p_latitude, longitude = p_longitude, address_text = nullif(btrim(p_address_text), ''), incident_at = p_incident_at, is_anonymous = p_is_anonymous, status = v_status, needs_human_review = true, submitted_at = case when p_submit then now() else submitted_at end where id = v_id;
  end if;

  if p_submit then
    insert into public.status_updates (complaint_id, status, note, is_visible_to_citizen, created_by) values (v_id, 'submitted', 'Your report was submitted for human review.', true, p_actor_id);
  end if;
  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata) values (p_actor_id, case when p_submit then 'complaint_submitted' else 'complaint_draft_saved' end, 'complaints', v_id::text, jsonb_build_object('track', v_category.track, 'rules_urgency', p_rules_urgency, 'danger_flags', coalesce(p_danger_flags, '{}')));
  return v_id;
end;
$$;

drop function if exists public.backend_reopen_complaint(uuid, uuid);

create or replace function public.backend_reopen_complaint(p_actor_id uuid, p_complaint_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_status public.complaint_status;
  v_last_decision timestamptz;
begin
  select status, coalesce(closed_at, updated_at) into v_status, v_last_decision from public.complaints where id = p_complaint_id and user_id = p_actor_id for update;
  if not found then raise exception 'Complaint not found or not owned by this user'; end if;
  if v_status not in ('closed', 'rejected') then raise exception 'Only closed or rejected complaints can be reopened'; end if;
  if v_last_decision < now() - interval '7 days' then raise exception 'The 7-day reopening period has ended; submit an appeal instead'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 10 and 2000 then raise exception 'A reopening reason is required'; end if;
  update public.complaints set status = 'reopened', rejection_reason = null, closed_at = null, needs_human_review = true where id = p_complaint_id;
  insert into public.status_updates (complaint_id, status, note, is_visible_to_citizen, created_by) values (p_complaint_id, 'reopened', btrim(p_reason), true, p_actor_id);
  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata) values (p_actor_id, 'complaint_reopened', 'complaints', p_complaint_id::text, jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

create or replace function public.backend_admin_action(
  p_actor_id uuid,
  p_complaint_id uuid,
  p_action text,
  p_reason text,
  p_team_id uuid,
  p_eta_minutes integer,
  p_target_status public.complaint_status,
  p_visible_to_citizen boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role;
  v_case public.complaints%rowtype;
  v_new_status public.complaint_status;
  v_note text;
  v_old jsonb;
begin
  select role into v_role from public.profiles where id = p_actor_id and is_active;
  if v_role is null or v_role = 'citizen' then raise exception 'Active staff profile required'; end if;
  select * into v_case from public.complaints where id = p_complaint_id for update;
  if not found then raise exception 'Complaint not found'; end if;

  if not (v_role = 'super_admin' or (v_role = 'control_room_admin' and v_case.track = 'safety') or (v_role = 'department_officer' and v_case.track = 'civic') or (v_role = 'response_team' and p_action = 'status_transition' and exists (select 1 from public.assignments a join public.team_members tm on tm.team_id = a.team_id where a.complaint_id = v_case.id and tm.user_id = p_actor_id and a.status not in ('completed','cancelled')))) then raise exception 'Staff role is not allowed for this complaint'; end if;

  v_old := jsonb_build_object('status', v_case.status, 'final_urgency', v_case.final_urgency);
  if p_action = 'accept' then
    if v_case.status not in ('submitted','under_review','reopened') then raise exception 'Invalid accept transition'; end if;
    v_new_status := 'accepted'; v_note := coalesce(nullif(btrim(p_reason), ''), 'The report was accepted after human review.');
  elsif p_action = 'reject' then
    if v_case.status not in ('submitted','under_review','reopened') or char_length(btrim(coalesce(p_reason,''))) < 10 then raise exception 'A clear rejection reason is required'; end if;
    v_new_status := 'rejected'; v_note := btrim(p_reason);
  elsif p_action = 'request_info' then
    if v_case.status not in ('submitted','under_review','reopened') or char_length(btrim(coalesce(p_reason,''))) < 5 then raise exception 'A request-information note is required'; end if;
    v_new_status := 'under_review'; v_note := btrim(p_reason);
  elsif p_action = 'assign' then
    if v_case.status not in ('submitted','under_review','accepted','reopened') then raise exception 'This case cannot be assigned from its current status'; end if;
    if p_team_id is null or p_eta_minutes is null or p_eta_minutes not between 1 and 1440 then raise exception 'Valid team and ETA are required'; end if;
    if not exists (
      select 1
      from public.teams
      where id = p_team_id
        and availability <> 'offline'
        and (
          (v_case.track = 'civic' and kind = 'civic_department')
          or
          (v_case.track = 'safety' and kind in ('response', 'police_referral', 'medical_referral'))
        )
    ) then raise exception 'Choose an available team for this complaint track'; end if;
    insert into public.assignments (complaint_id, team_id, assigned_by, eta_minutes, notes) values (v_case.id, p_team_id, p_actor_id, p_eta_minutes, nullif(btrim(p_reason), ''));
    v_new_status := 'team_assigned'; v_note := coalesce(nullif(btrim(p_reason), ''), 'A response team or department was assigned.');
  elsif p_action = 'status_transition' then
    if p_target_status = 'under_review' and v_case.status in ('submitted','reopened') then v_new_status := 'under_review';
    elsif p_target_status = 'on_the_way' and v_case.status = 'team_assigned' then v_new_status := 'on_the_way'; update public.assignments set status = 'on_the_way' where complaint_id = v_case.id and status not in ('completed','cancelled');
    elsif p_target_status = 'arrived' and v_case.status in ('team_assigned','on_the_way') then v_new_status := 'arrived'; update public.assignments set status = 'arrived', arrived_at = now() where complaint_id = v_case.id and status not in ('completed','cancelled');
    elsif p_target_status = 'closed' and v_case.status in ('accepted','team_assigned','on_the_way','arrived') then v_new_status := 'closed'; update public.assignments set status = 'completed', completed_at = now() where complaint_id = v_case.id and status not in ('completed','cancelled');
    else raise exception 'Invalid status transition'; end if;
    v_note := btrim(p_reason);
  else raise exception 'Unknown admin action'; end if;

  update public.complaints set status = v_new_status, rejection_reason = case when v_new_status = 'rejected' then v_note else null end, needs_human_review = v_new_status in ('submitted','under_review','reopened'), closed_at = case when v_new_status = 'closed' then now() else null end where id = v_case.id;
  insert into public.status_updates (complaint_id, status, note, is_visible_to_citizen, created_by) values (v_case.id, v_new_status, v_note, coalesce(p_visible_to_citizen, true), p_actor_id);
  insert into public.admin_actions (complaint_id, admin_id, action, reason, old_values, new_values) values (v_case.id, p_actor_id, p_action, nullif(btrim(p_reason), ''), v_old, jsonb_build_object('status', v_new_status, 'team_id', p_team_id, 'eta_minutes', p_eta_minutes));
  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata) values (p_actor_id, 'admin_' || p_action, 'complaints', v_case.id::text, jsonb_build_object('old_status', v_case.status, 'new_status', v_new_status));
  return jsonb_build_object('complaintId', v_case.id, 'status', v_new_status);
end;
$$;

revoke all on function public.backend_save_complaint(uuid,uuid,text,text,public.app_language,boolean,double precision,double precision,text,timestamptz,boolean,public.urgency_level,text[],text) from public;
revoke all on function public.backend_reopen_complaint(uuid,uuid,text) from public;
revoke all on function public.backend_admin_action(uuid,uuid,text,text,uuid,integer,public.complaint_status,boolean) from public;
grant execute on function public.backend_save_complaint(uuid,uuid,text,text,public.app_language,boolean,double precision,double precision,text,timestamptz,boolean,public.urgency_level,text[],text) to service_role;
grant execute on function public.backend_reopen_complaint(uuid,uuid,text) to service_role;
grant execute on function public.backend_admin_action(uuid,uuid,text,text,uuid,integer,public.complaint_status,boolean) to service_role;
