-- Haven Phase 1 - Row Level Security and safe citizen RPC

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active = true
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  )
$$;

create or replace function public.can_access_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.complaints c
    where c.id = p_complaint_id
      and (
        c.user_id = auth.uid()
        or public.current_user_role() = 'super_admin'
        or (public.current_user_role() = 'control_room_admin' and c.track = 'safety')
        or (public.current_user_role() = 'department_officer' and c.track = 'civic')
        or (
          public.current_user_role() = 'response_team'
          and exists (
            select 1 from public.assignments a
            join public.team_members tm on tm.team_id = a.team_id
            where a.complaint_id = c.id
              and tm.user_id = auth.uid()
              and a.status not in ('cancelled')
          )
        )
      )
  )
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.can_access_complaint(uuid) from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.can_access_complaint(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.complaints enable row level security;
alter table public.attachments enable row level security;
alter table public.playbooks enable row level security;
alter table public.legal_entries enable row level security;
alter table public.documents enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.assignments enable row level security;
alter table public.status_updates enable row level security;
alter table public.admin_actions enable row level security;
alter table public.appeals enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_own on public.profiles
for select to authenticated using (id = auth.uid() or public.current_user_role() = 'super_admin');

create policy profiles_update_own on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy categories_read_active on public.categories
for select to authenticated using (is_active or public.current_user_role() = 'super_admin');

create policy complaints_read_allowed on public.complaints
for select to authenticated using (public.can_access_complaint(id));

create policy attachments_read_allowed on public.attachments
for select to authenticated using (public.can_access_complaint(complaint_id));

create policy attachments_insert_own on public.attachments
for insert to authenticated with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.complaints c
    where c.id = complaint_id and c.user_id = auth.uid()
  )
  and (string_to_array(storage_path, '/'))[1] = auth.uid()::text
  and (string_to_array(storage_path, '/'))[2] = complaint_id::text
);

create policy playbooks_read_approved on public.playbooks
for select to authenticated using (is_approved or public.current_user_role() = 'super_admin');

create policy legal_entries_read_verified on public.legal_entries
for select to authenticated using (is_verified or public.current_user_role() = 'super_admin');

create policy documents_read_allowed on public.documents
for select to authenticated using (public.can_access_complaint(complaint_id));

create policy teams_read_staff on public.teams
for select to authenticated using (public.current_user_role() in ('control_room_admin', 'department_officer', 'response_team', 'super_admin'));

create policy team_members_read_staff on public.team_members
for select to authenticated using (user_id = auth.uid() or public.current_user_role() in ('control_room_admin', 'super_admin'));

create policy assignments_read_allowed on public.assignments
for select to authenticated using (
  public.can_access_complaint(complaint_id)
  or public.is_team_member(team_id)
);

create policy status_updates_read_allowed on public.status_updates
for select to authenticated using (
  public.can_access_complaint(complaint_id)
  and (
    is_visible_to_citizen
    or public.current_user_role() <> 'citizen'
  )
);

create policy admin_actions_read_admin on public.admin_actions
for select to authenticated using (
  public.current_user_role() in ('control_room_admin', 'super_admin')
  and public.can_access_complaint(complaint_id)
);

create policy appeals_read_allowed on public.appeals
for select to authenticated using (
  user_id = auth.uid()
  or public.current_user_role() in ('control_room_admin', 'super_admin')
);

create policy appeals_insert_own on public.appeals
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.complaints c
    where c.id = complaint_id and c.user_id = auth.uid() and c.status = 'rejected'
  )
);

create policy audit_logs_read_super_admin on public.audit_logs
for select to authenticated using (public.current_user_role() = 'super_admin');

-- Prevent browser clients from changing protected profile fields. The Phase 3 API
-- uses the service role for validated admin commands.
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, language) on public.profiles to authenticated;

revoke insert, update, delete on public.complaints from authenticated;
revoke insert, update, delete on public.attachments from authenticated;
revoke insert, update, delete on public.playbooks from authenticated;
revoke insert, update, delete on public.legal_entries from authenticated;
revoke insert, update, delete on public.documents from authenticated;
revoke insert, update, delete on public.teams from authenticated;
revoke insert, update, delete on public.team_members from authenticated;
revoke insert, update, delete on public.assignments from authenticated;
revoke insert, update, delete on public.status_updates from authenticated;
revoke insert, update, delete on public.admin_actions from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;

create or replace function public.submit_complaint(
  p_category_code text,
  p_original_text text,
  p_original_language public.app_language default 'en',
  p_is_anonymous boolean default false,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_address_text text default null,
  p_incident_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category public.categories%rowtype;
  v_complaint_id uuid;
  v_text text := lower(coalesce(p_original_text, ''));
  v_flags text[] := '{}';
  v_rules_urgency public.urgency_level := 'low';
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active) then
    raise exception 'Active profile required';
  end if;

  if char_length(btrim(coalesce(p_original_text, ''))) not between 10 and 10000 then
    raise exception 'Complaint text must be between 10 and 10000 characters';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be provided together';
  end if;

  select * into v_category
  from public.categories
  where code = p_category_code and is_active = true;

  if not found then
    raise exception 'Unknown or inactive category';
  end if;

  -- Simple, transparent demo rules. The backend will expand and test them in Phase 3.
  if v_text ~ '(weapon|gun|knife|pistol|چھری|بندوق|هٿيار)' then
    v_flags := array_append(v_flags, 'weapon');
  end if;
  if v_text ~ '(following me|stalking|پیچھا|تعاقب|پيڇو)' then
    v_flags := array_append(v_flags, 'following_or_stalking');
  end if;
  if v_text ~ '(threat|kill|attack|دھمکی|قتل|حملہ|ڌمڪي|حملو)' then
    v_flags := array_append(v_flags, 'threat_or_attack');
  end if;
  if v_text ~ '(danger|help me|خطرہ|مدد|خطرو|مدد ڪريو)' then
    v_flags := array_append(v_flags, 'help_or_danger');
  end if;

  if cardinality(v_flags) > 0 then
    v_rules_urgency := 'high';
  elsif v_category.track = 'safety' then
    v_rules_urgency := 'medium';
  end if;

  insert into public.complaints (
    user_id, category_id, track, original_language, original_text,
    rules_urgency, final_urgency, urgency_reason, danger_flags,
    latitude, longitude, address_text, incident_at, is_anonymous,
    status, needs_human_review
  ) values (
    auth.uid(), v_category.id, v_category.track, p_original_language, btrim(p_original_text),
    v_rules_urgency, v_rules_urgency,
    case when cardinality(v_flags) > 0 then 'Raised by transparent danger keyword rules' else 'Initial rules result; human review required' end,
    v_flags, p_latitude, p_longitude, nullif(btrim(p_address_text), ''), p_incident_at,
    p_is_anonymous, 'submitted', true
  ) returning id into v_complaint_id;

  insert into public.status_updates (complaint_id, status, note, is_visible_to_citizen, created_by)
  values (v_complaint_id, 'submitted', 'Your report was submitted for human review.', true, auth.uid());

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (auth.uid(), 'complaint_submitted', 'complaints', v_complaint_id::text, jsonb_build_object('track', v_category.track));

  return v_complaint_id;
end;
$$;

revoke all on function public.submit_complaint(text, text, public.app_language, boolean, double precision, double precision, text, timestamptz) from public;
grant execute on function public.submit_complaint(text, text, public.app_language, boolean, double precision, double precision, text, timestamptz) to authenticated;

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert (complaint_id, uploaded_by, kind, storage_path, mime_type, size_bytes) on public.attachments to authenticated;
grant insert, select on public.appeals to authenticated;
grant usage, select on all sequences in schema public to authenticated;
