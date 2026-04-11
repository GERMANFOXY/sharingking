create extension if not exists pgcrypto;

create schema if not exists app;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'upload_kind') then
    create type public.upload_kind as enum ('image', 'file');
  end if;

  if not exists (select 1 from pg_type where typname = 'upload_status') then
    create type public.upload_status as enum ('active', 'deleted', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'usage_subject_type') then
    create type public.usage_subject_type as enum ('user', 'ip');
  end if;

  if not exists (select 1 from pg_type where typname = 'usage_window_type') then
    create type public.usage_window_type as enum ('hour', 'day');
  end if;
end
$$;

create or replace function app.generate_public_id(length integer default 12)
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  output text := '';
  i integer := 0;
begin
  if length < 8 then
    raise exception 'public id length must be at least 8';
  end if;

  while i < length loop
    output := output || substr(alphabet, 1 + floor(random() * char_length(alphabet))::integer, 1);
    i := i + 1;
  end loop;

  return output;
end;
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.upload_limits (
  key text primary key,
  label text not null,
  max_file_size_bytes bigint,
  daily_quota_bytes bigint,
  hourly_upload_limit integer,
  allows_dashboard boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint upload_limits_non_negative check (
    coalesce(max_file_size_bytes, 0) >= 0
    and coalesce(daily_quota_bytes, 0) >= 0
    and coalesce(hourly_upload_limit, 0) >= 0
  )
);

insert into public.upload_limits (
  key,
  label,
  max_file_size_bytes,
  daily_quota_bytes,
  hourly_upload_limit,
  allows_dashboard
)
values
  ('anonymous', 'Anonymous', 52428800, null, 3, false),
  ('registered', 'Registered', null, 2147483648, null, true)
on conflict (key) do update
set
  label = excluded.label,
  max_file_size_bytes = excluded.max_file_size_bytes,
  daily_quota_bytes = excluded.daily_quota_bytes,
  hourly_upload_limit = excluded.hourly_upload_limit,
  allows_dashboard = excluded.allows_dashboard,
  updated_at = timezone('utc', now());

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  plan_key text not null default 'registered' references public.upload_limits(key),
  uploads_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default app.generate_public_id(12),
  kind public.upload_kind not null,
  status public.upload_status not null default 'active',
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_ip_hash text,
  bucket_id text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text,
  extension text,
  size_bytes bigint not null,
  is_public boolean not null default true,
  title text,
  alt_text text,
  download_count integer not null default 0,
  last_accessed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  deleted_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uploads_valid_owner check (owner_user_id is not null or owner_ip_hash is not null),
  constraint uploads_valid_size check (size_bytes > 0),
  constraint uploads_valid_bucket check (bucket_id in ('images', 'files')),
  constraint uploads_kind_bucket_match check (
    (kind = 'image' and bucket_id = 'images')
    or (kind = 'file' and bucket_id = 'files')
  ),
  constraint uploads_deleted_requires_timestamp check (
    (status = 'deleted' and deleted_at is not null)
    or (status <> 'deleted')
  )
);

create table if not exists public.upload_usage_windows (
  id bigint generated always as identity primary key,
  subject_type public.usage_subject_type not null,
  subject_key text not null,
  window_type public.usage_window_type not null,
  window_start timestamptz not null,
  upload_count integer not null default 0,
  bytes_uploaded bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint upload_usage_windows_unique unique (subject_type, subject_key, window_type, window_start),
  constraint upload_usage_windows_non_negative check (upload_count >= 0 and bytes_uploaded >= 0)
);

create index if not exists uploads_owner_user_created_at_idx
  on public.uploads (owner_user_id, created_at desc)
  where owner_user_id is not null;

create index if not exists uploads_owner_ip_created_at_idx
  on public.uploads (owner_ip_hash, created_at desc)
  where owner_ip_hash is not null;

create index if not exists uploads_public_gallery_idx
  on public.uploads (created_at desc)
  where kind = 'image' and is_public = true and status = 'active';

create index if not exists uploads_expiration_idx
  on public.uploads (expires_at asc)
  where status = 'active';

create index if not exists upload_usage_windows_lookup_idx
  on public.upload_usage_windows (subject_type, subject_key, window_type, window_start desc);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function app.touch_updated_at();

drop trigger if exists upload_limits_touch_updated_at on public.upload_limits;
create trigger upload_limits_touch_updated_at
before update on public.upload_limits
for each row
execute function app.touch_updated_at();

drop trigger if exists uploads_touch_updated_at on public.uploads;
create trigger uploads_touch_updated_at
before update on public.uploads
for each row
execute function app.touch_updated_at();

drop trigger if exists upload_usage_windows_touch_updated_at on public.upload_usage_windows;
create trigger upload_usage_windows_touch_updated_at
before update on public.upload_usage_windows
for each row
execute function app.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.record_upload_usage(
  p_owner_user_id uuid,
  p_owner_ip_hash text,
  p_size_bytes bigint,
  p_created_at timestamptz default timezone('utc', now())
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_day_window timestamptz := date_trunc('day', p_created_at at time zone 'utc') at time zone 'utc';
  ip_hour_window timestamptz := date_trunc('hour', p_created_at at time zone 'utc') at time zone 'utc';
begin
  if p_owner_user_id is not null then
    insert into public.upload_usage_windows (
      subject_type,
      subject_key,
      window_type,
      window_start,
      upload_count,
      bytes_uploaded
    )
    values ('user', p_owner_user_id::text, 'day', user_day_window, 1, p_size_bytes)
    on conflict (subject_type, subject_key, window_type, window_start)
    do update
      set
        upload_count = public.upload_usage_windows.upload_count + 1,
        bytes_uploaded = public.upload_usage_windows.bytes_uploaded + excluded.bytes_uploaded,
        updated_at = timezone('utc', now());
  end if;

  if p_owner_ip_hash is not null then
    insert into public.upload_usage_windows (
      subject_type,
      subject_key,
      window_type,
      window_start,
      upload_count,
      bytes_uploaded
    )
    values ('ip', p_owner_ip_hash, 'hour', ip_hour_window, 1, p_size_bytes)
    on conflict (subject_type, subject_key, window_type, window_start)
    do update
      set
        upload_count = public.upload_usage_windows.upload_count + 1,
        bytes_uploaded = public.upload_usage_windows.bytes_uploaded + excluded.bytes_uploaded,
        updated_at = timezone('utc', now());
  end if;
end;
$$;

create or replace function public.get_anonymous_upload_status(p_owner_ip_hash text)
returns table (
  uploads_used integer,
  uploads_limit integer,
  max_file_size_bytes bigint,
  window_started_at timestamptz
)
language sql
stable
set search_path = public
as $$
  with anon_limits as (
    select hourly_upload_limit, max_file_size_bytes
    from public.upload_limits
    where key = 'anonymous'
  ),
  usage_window as (
    select *
    from public.upload_usage_windows
    where subject_type = 'ip'
      and subject_key = p_owner_ip_hash
      and window_type = 'hour'
      and window_start = date_trunc('hour', timezone('utc', now()))
  )
  select
    coalesce((select upload_count from usage_window), 0) as uploads_used,
    (select hourly_upload_limit from anon_limits) as uploads_limit,
    (select max_file_size_bytes from anon_limits) as max_file_size_bytes,
    date_trunc('hour', timezone('utc', now())) as window_started_at;
$$;

create or replace function public.get_registered_upload_status(p_owner_user_id uuid)
returns table (
  bytes_used bigint,
  bytes_limit bigint,
  uploads_used integer,
  window_started_at timestamptz
)
language sql
stable
set search_path = public
as $$
  with registered_limits as (
    select daily_quota_bytes
    from public.upload_limits
    where key = 'registered'
  ),
  usage_window as (
    select *
    from public.upload_usage_windows
    where subject_type = 'user'
      and subject_key = p_owner_user_id::text
      and window_type = 'day'
      and window_start = date_trunc('day', timezone('utc', now()))
  )
  select
    coalesce((select bytes_uploaded from usage_window), 0) as bytes_used,
    (select daily_quota_bytes from registered_limits) as bytes_limit,
    coalesce((select upload_count from usage_window), 0) as uploads_used,
    date_trunc('day', timezone('utc', now())) as window_started_at;
$$;

create or replace view public.latest_public_images as
select
  public_id,
  original_name,
  title,
  alt_text,
  mime_type,
  size_bytes,
  created_at
from public.uploads
where kind = 'image'
  and is_public = true
  and status = 'active'
  and expires_at > timezone('utc', now())
order by created_at desc;

alter table public.upload_limits enable row level security;
alter table public.profiles enable row level security;
alter table public.uploads enable row level security;
alter table public.upload_usage_windows enable row level security;

drop policy if exists "limits are readable by everyone" on public.upload_limits;
create policy "limits are readable by everyone"
on public.upload_limits
for select
using (true);

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "public can read active public uploads" on public.uploads;
create policy "public can read active public uploads"
on public.uploads
for select
using (
  is_public = true
  and status = 'active'
  and expires_at > timezone('utc', now())
);

drop policy if exists "users can read own uploads" on public.uploads;
create policy "users can read own uploads"
on public.uploads
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "users can create own uploads" on public.uploads;
create policy "users can create own uploads"
on public.uploads
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "users can update own uploads" on public.uploads;
create policy "users can update own uploads"
on public.uploads
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "users can delete own uploads" on public.uploads;
create policy "users can delete own uploads"
on public.uploads
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "users can read own usage windows" on public.upload_usage_windows;
create policy "users can read own usage windows"
on public.upload_usage_windows
for select
to authenticated
using (
  subject_type = 'user'
  and subject_key = auth.uid()::text
);

insert into storage.buckets (id, name, public)
values
  ('files', 'files', false),
  ('images', 'images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "users can view own file objects" on storage.objects;
create policy "users can view own file objects"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('files', 'images')
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "users can insert own file objects" on storage.objects;
create policy "users can insert own file objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('files', 'images')
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "users can update own file objects" on storage.objects;
create policy "users can update own file objects"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('files', 'images')
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id in ('files', 'images')
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "users can delete own file objects" on storage.objects;
create policy "users can delete own file objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('files', 'images')
  and (storage.foldername(name))[1] = 'user'
  and (storage.foldername(name))[2] = auth.uid()::text
);