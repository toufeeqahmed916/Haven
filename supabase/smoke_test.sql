-- Run after migrations. This test rolls back all temporary data.

begin;

do $$
declare
  v_missing text[];
  v_category_count integer;
  v_rls_count integer;
begin
  select array_agg(required_name order by required_name)
  into v_missing
  from unnest(array[
    'profiles', 'categories', 'complaints', 'attachments', 'playbooks',
    'legal_entries', 'documents', 'teams', 'team_members', 'assignments',
    'status_updates', 'admin_actions', 'appeals', 'audit_logs', 'notifications'
  ]) as required_name
  where to_regclass('public.' || required_name) is null;

  if v_missing is not null then
    raise exception 'Missing tables: %', v_missing;
  end if;

  select count(*) into v_category_count from public.categories;
  if v_category_count < 16 then
    raise exception 'Expected at least 16 categories, found %', v_category_count;
  end if;

  select count(*) into v_rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'profiles', 'categories', 'complaints', 'attachments', 'playbooks',
      'legal_entries', 'documents', 'teams', 'team_members', 'assignments',
      'status_updates', 'admin_actions', 'appeals', 'audit_logs', 'notifications'
    ])
    and c.relrowsecurity = true;

  if v_rls_count <> 15 then
    raise exception 'RLS expected on 15 tables, found %', v_rls_count;
  end if;

  if not exists (select 1 from storage.buckets where id = 'complaint-media' and public = false) then
    raise exception 'Private complaint-media bucket is missing';
  end if;

  if not exists (select 1 from storage.buckets where id = 'generated-documents' and public = false) then
    raise exception 'Private generated-documents bucket is missing';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'complaints' and column_name = 'ai_processed_at') then
    raise exception 'Step 5 AI metadata columns are missing';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'attachments' and column_name = 'retention_until') then
    raise exception 'Step 6 retention metadata is missing';
  end if;

  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'backend_finalize_analysis') then
    raise exception 'Step 5 analysis finalization command is missing';
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    raise exception 'Notifications are not enabled for Supabase Realtime';
  end if;
end
$$;

select 'Haven Phase 1-3 database checks passed' as result;

rollback;
