-- Haven Phase 3 Steps 5-6: AI audit fields and private-file retention metadata.
-- Run after 005_backend_commands.sql.

alter table public.complaints add column if not exists ai_category_code text;
alter table public.complaints add column if not exists ai_provider text;
alter table public.complaints add column if not exists ai_error_code text;
alter table public.complaints add column if not exists ai_processed_at timestamptz;

alter table public.attachments add column if not exists original_name text;
alter table public.attachments add column if not exists confirmed_at timestamptz;
alter table public.attachments add column if not exists retention_until timestamptz not null default (now() + interval '365 days');
alter table public.attachments add column if not exists transcription text;
alter table public.attachments add column if not exists transcribed_at timestamptz;

alter table public.documents add column if not exists title text;
alter table public.documents add column if not exists mime_type text not null default 'application/pdf';
alter table public.documents add column if not exists size_bytes bigint check (size_bytes is null or size_bytes between 1 and 10485760);
alter table public.documents add column if not exists retention_until timestamptz not null default (now() + interval '365 days');

create or replace function public.backend_finalize_analysis(
  p_actor_id uuid,
  p_complaint_id uuid,
  p_summary text,
  p_translated_text text,
  p_ai_urgency public.urgency_level,
  p_final_urgency public.urgency_level,
  p_ai_reason text,
  p_ai_failed boolean,
  p_ai_category_code text,
  p_ai_provider text,
  p_ai_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case public.complaints%rowtype;
  v_rule_rank integer;
  v_final_rank integer;
begin
  select * into v_case from public.complaints where id = p_complaint_id and user_id = p_actor_id for update;
  if not found then raise exception 'Complaint not found or not owned by this user'; end if;
  if v_case.status = 'draft' then raise exception 'AI analysis is only finalized for submitted complaints'; end if;
  if char_length(btrim(coalesce(p_summary, ''))) not between 10 and 600 then raise exception 'Invalid analysis summary'; end if;

  v_rule_rank := case v_case.rules_urgency when 'low' then 0 when 'medium' then 1 when 'high' then 2 else 3 end;
  v_final_rank := case p_final_urgency when 'low' then 0 when 'medium' then 1 when 'high' then 2 else 3 end;
  if v_final_rank < v_rule_rank then raise exception 'AI cannot lower deterministic urgency'; end if;
  if p_ai_failed and v_final_rank < 2 then raise exception 'AI failure must be marked at least high'; end if;
  if not exists (select 1 from public.categories where code = p_ai_category_code and is_active) then raise exception 'Invalid AI category suggestion'; end if;

  update public.complaints set
    summary = btrim(p_summary),
    translated_text = nullif(btrim(p_translated_text), ''),
    ai_urgency = p_ai_urgency,
    final_urgency = p_final_urgency,
    urgency_reason = concat_ws(' ', urgency_reason, nullif(btrim(p_ai_reason), '')),
    ai_failed = p_ai_failed,
    ai_category_code = p_ai_category_code,
    ai_provider = p_ai_provider,
    ai_error_code = p_ai_error_code,
    ai_processed_at = now(),
    needs_human_review = true
  where id = p_complaint_id;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (p_actor_id, 'complaint_analysis_finalized', 'complaints', p_complaint_id::text,
    jsonb_build_object('rules_urgency', v_case.rules_urgency, 'ai_urgency', p_ai_urgency, 'final_urgency', p_final_urgency, 'ai_failed', p_ai_failed, 'provider', p_ai_provider, 'error_code', p_ai_error_code));
end;
$$;

revoke all on function public.backend_finalize_analysis(uuid,uuid,text,text,public.urgency_level,public.urgency_level,text,boolean,text,text,text) from public;
grant execute on function public.backend_finalize_analysis(uuid,uuid,text,text,public.urgency_level,public.urgency_level,text,boolean,text,text,text) to service_role;

comment on column public.attachments.retention_until is 'Review or delete after this date according to the project retention policy.';
comment on column public.documents.retention_until is 'Review or delete after this date according to the project retention policy.';
comment on column public.complaints.ai_category_code is 'AI suggestion only. It never silently changes the citizen-selected category.';
