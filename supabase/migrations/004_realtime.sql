-- Haven Phase 1 - realtime tables
-- RLS still controls which rows authenticated clients can receive.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'complaints'
  ) then
    alter publication supabase_realtime add table public.complaints;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'status_updates'
  ) then
    alter publication supabase_realtime add table public.status_updates;
  end if;
end
$$;

alter table public.complaints replica identity full;
alter table public.status_updates replica identity full;
