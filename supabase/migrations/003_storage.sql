-- Haven Phase 1 - private Supabase Storage buckets and citizen media rules

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complaint-media',
  'complaint-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-documents',
  'generated-documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy complaint_media_insert_own_folder on storage.objects
for insert to authenticated
with check (
  bucket_id = 'complaint-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.complaints c
    where c.id::text = (storage.foldername(name))[2]
      and c.user_id = auth.uid()
  )
);

create policy complaint_media_read_allowed on storage.objects
for select to authenticated
using (
  bucket_id = 'complaint-media'
  and (
    owner_id = auth.uid()::text
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
      and public.can_access_complaint(((storage.foldername(name))[2])::uuid)
    )
  )
);

create policy complaint_media_delete_own_folder on storage.objects
for delete to authenticated
using (
  bucket_id = 'complaint-media'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy generated_documents_read_allowed on storage.objects
for select to authenticated
using (
  bucket_id = 'generated-documents'
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and public.can_access_complaint(((storage.foldername(name))[2])::uuid)
);
