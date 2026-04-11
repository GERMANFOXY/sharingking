create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists vault with schema vault;

create or replace function app.get_vault_secret(secret_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = secret_name
  limit 1;
$$;

create or replace function app.invoke_cleanup_expired_uploads()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cleanup_url text := app.get_vault_secret('cleanup_expired_uploads_url');
  cleanup_token text := app.get_vault_secret('cleanup_expired_uploads_token');
  request_id bigint;
begin
  if cleanup_url is null then
    raise exception 'Vault secret cleanup_expired_uploads_url is missing';
  end if;

  if cleanup_token is null then
    raise exception 'Vault secret cleanup_expired_uploads_token is missing';
  end if;

  select net.http_post(
    url := cleanup_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cleanup_token
    ),
    body := jsonb_build_object(
      'source', 'pg_cron'
    )
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