-- Déclencheurs automatiques lancés par Supabase lui-même (pg_cron + pg_net),
-- à la place de GitHub Actions dont les crons gratuits partent avec plusieurs
-- heures de retard (points des matchs annoncés trop tard).
--
-- À exécuter dans l'éditeur SQL de Supabase, en remplaçant __CRON_SECRET__
-- par la valeur de CRON_SECRET (la même que sur Vercel). Le script peut être
-- relancé sans risque : il met à jour le secret et les tâches existantes.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Le secret partagé avec Vercel, gardé chiffré dans le coffre de Supabase.
do $$
declare
  existing uuid;
begin
  select id into existing from vault.secrets where name = 'cron_secret';
  if existing is null then
    perform vault.create_secret('__CRON_SECRET__', 'cron_secret');
  else
    perform vault.update_secret(existing, '__CRON_SECRET__');
  end if;
end $$;

-- Schéma non exposé par l'API : personne ne peut appeler cette fonction
-- depuis l'appli, seules les tâches pg_cron ci-dessous l'utilisent.
create schema if not exists private;

create or replace function private.call_cron_route(path text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_get(
    url := 'https://nhl-prono-drjd.vercel.app' || path,
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_secret'
      )
    ),
    timeout_milliseconds := 120000
  );
$$;

revoke all on function private.call_cron_route(text) from public;

-- Notation des matchs terminés : toutes les 5 minutes.
select cron.schedule(
  'noter-les-matchs',
  '*/5 * * * *',
  $$ select private.call_cron_route('/api/grade-games') $$
);

-- Rappel "ton match commence dans 1h" (fenêtre H-70/H-50, dédupliqué).
select cron.schedule(
  'rappel-1h-avant',
  '*/10 * * * *',
  $$ select private.call_cron_route('/api/notify-game-reminders') $$
);

-- Rappel "matchs ce soir" à 13h heure de Paris. pg_cron est en UTC : 11h UTC
-- en heure d'été, 12h UTC en heure d'hiver. La route ignore celui des deux
-- appels qui ne tombe pas à 13h à Paris.
select cron.schedule(
  'rappel-13h',
  '0 11,12 * * *',
  $$ select private.call_cron_route('/api/notify-match-day') $$
);
