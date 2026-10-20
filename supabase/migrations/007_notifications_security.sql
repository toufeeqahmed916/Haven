-- Haven Phase 3 Steps 7-8: in-app notifications, realtime, and final security metadata.
-- Run after 006_ai_files_documents.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  complaint_id uuid references public.complaints(id) on delete cascade,
  kind text not null check (kind in ('case_status', 'team_assignment', 'appeal_update', 'system')),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_mark_read_own on public.notifications;
create policy notifications_mark_read_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke insert, delete on public.notifications from authenticated;
revoke update on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify_citizen_on_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_case_number bigint;
begin
  if not new.is_visible_to_citizen then return new; end if;
  select user_id, case_number into v_user_id, v_case_number from public.complaints where id = new.complaint_id;
  if v_user_id is null or new.created_by = v_user_id then return new; end if;
  insert into public.notifications (user_id, complaint_id, kind, title, message)
  values (v_user_id, new.complaint_id, 'case_status', 'Case HAV-' || lpad(v_case_number::text, 6, '0') || ' updated', coalesce(nullif(btrim(new.note), ''), 'Your case status changed to ' || replace(new.status::text, '_', ' ') || '.'));
  return new;
end;
$$;

drop trigger if exists status_update_notify_citizen on public.status_updates;
create trigger status_update_notify_citizen after insert on public.status_updates for each row execute function public.notify_citizen_on_status();

create or replace function public.notify_team_on_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_case_number bigint;
begin
  select case_number into v_case_number from public.complaints where id = new.complaint_id;
  insert into public.notifications (user_id, complaint_id, kind, title, message)
  select tm.user_id, new.complaint_id, 'team_assignment', 'New team assignment', 'Your team was assigned case HAV-' || lpad(v_case_number::text, 6, '0') || '. Open the case for reviewed details.'
  from public.team_members tm where tm.team_id = new.team_id;
  return new;
end;
$$;

drop trigger if exists assignment_notify_team on public.assignments;
create trigger assignment_notify_team after insert on public.assignments for each row execute function public.notify_team_on_assignment();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then alter publication supabase_realtime add table public.notifications; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'assignments') then alter publication supabase_realtime add table public.assignments; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appeals') then alter publication supabase_realtime add table public.appeals; end if;
end
$$;

alter table public.notifications replica identity full;
alter table public.assignments replica identity full;
alter table public.appeals replica identity full;

comment on table public.notifications is 'Private in-app notifications. Email and SMS are intentionally optional and not required for the free university demo.';
