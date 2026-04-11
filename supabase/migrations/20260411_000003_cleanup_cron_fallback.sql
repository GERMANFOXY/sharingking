create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists app.private_runtime_secrets (
  secret_name text primary key,
  secret_value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists private_runtime_secrets_touch_updated_at on app.private_runtime_secrets;
create trigger private_runtime_secrets_touch_updated_at
before update on app.private_runtime_secrets
for each row
execute function app.touch_updated_at();

revoke all on table app.private_runtime_secrets from public;
revoke all on table app.private_runtime_secrets from anon;
revoke all on table app.private_runtime_secrets from authenticated;

create or replace function app.set_runtime_secret(p_secret_name text, p_secret_value text)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
begin
  insert into app.private_runtime_secrets (secret_name, secret_value)
  values (p_secret_name, p_secret_value)
  on conflict (secret_name)
  do update set
    secret_value = excluded.secret_value,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function app.get_runtime_secret(p_secret_name text)
returns text
language plpgsql
security definer
set search_path = public, app
as $$
declare
  secret_value text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into secret_value
      using p_secret_name;
  end if;

  if secret_value is null then
    select private_runtime_secrets.secret_value
      into secret_value
    from app.private_runtime_secrets
    where private_runtime_secrets.secret_name = p_secret_name
    limit 1;
  end if;

  return secret_value;
end;
$$;

create or replace function app.invoke_cleanup_expired_uploads()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, app
as $$
declare
  cleanup_url text := app.get_runtime_secret('cleanup_expired_uploads_url');
  cleanup_token text := app.get_runtime_secret('cleanup_expired_uploads_token');
  request_id bigint;
begin
  if cleanup_url is null then
    raise exception 'Runtime secret cleanup_expired_uploads_url is missing';
  end if;

  if cleanup_token is null then
    raise exception 'Runtime secret cleanup_expired_uploads_token is missing';
  end if;

  select net.http_post(
    url := cleanup_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cleanup_token
    ),
    body := jsonb_build_object('source', 'pg_cron')
  )
  into request_id;

  return request_id;
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'cleanup-expired-uploads';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-expired-uploads',
    '15 */6 * * *',
    'select app.invoke_cleanup_expired_uploads();'
  );
end
$$;