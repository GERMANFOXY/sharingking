# SHARINGKING

Minimalistische File- und Image-Upload-Plattform auf Basis von Next.js 15, Tailwind CSS, shadcn/ui und Supabase.

## Installieren

```bash
npm install
```

## Entwicklungsserver

```bash
npm run dev
```

## Qualitaet pruefen

```bash
npm run lint
npm run typecheck
```

## Benoetigte Umgebungsvariablen

Kopiere `.env.example` nach `.env.local` und setze:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPLOAD_IP_HASH_SALT`
- `NEXT_REVALIDATE_SECRET`
- `NEXT_REVALIDATE_URL`
- `CLEANUP_FUNCTION_TOKEN`

## Projektstruktur

```text
app/
  (app)/dashboard/page.tsx
  (auth)/login/page.tsx
  f/[id]/page.tsx
  i/[id]/page.tsx
  layout.tsx
  page.tsx
components/
  dashboard/
  home/
  layout/
  providers/
  ui/
lib/
  constants.ts
  supabase/
  types/
supabase/
  migrations/
```

## Features

- Bilder und beliebige Dateien hochladen
- Anonym oder registriert mit E-Mail/Passwort und Magic Link
- Private Supabase Storage Buckets mit Share-Links unter `/i/[id]` und `/f/[id]`
- Automatische Loeschung nach sieben Tagen
- Galerie der neuesten oeffentlichen Bilder
- Dashboard mit Restlaufzeit, Link kopieren, manuellem Loeschen und Tagesverbrauch

## End-to-End Testmatrix

| Bereich | Testfall | Erwartetes Ergebnis |
| --- | --- | --- |
| Startseite | Landingpage auf Desktop und Mobile oeffnen | Hero, Galerie, Info-Bereich und Footer werden sauber gerendert |
| Anonymer Upload | Kleine Datei unter 50 MB hochladen | Upload erfolgreich, Share-Link sichtbar, Eintrag in Galerie falls Bild |
| Anonymer Upload | Datei ueber 50 MB hochladen | Klare Fehlermeldung zur Dateigroesse |
| Anonymer Upload | Mehr als 3 Uploads innerhalb einer Stunde ausloesen | Klare Fehlermeldung zum Stundenlimit |
| Registrierung | Neues Konto mit E-Mail + Passwort anlegen | Konto wird erstellt, Bestätigungs- oder Login-Hinweis erscheint |
| Magic Link | Magic Link anfordern und oeffnen | Session wird erstellt und Dashboard wird geladen |
| Login | Mit E-Mail + Passwort anmelden | Redirect auf `/dashboard` |
| Registrierter Upload | Mehrere Dateien hochladen | Fortschritt sichtbar, Uploads erscheinen im Dashboard |
| Tageslimit | Mehr als 2 GB an einem Tag simulieren | Klare Fehlermeldung zum Tageslimit |
| Dashboard | Share-Link kopieren | Button zeigt kurz `Kopiert`, Link ist in der Zwischenablage |
| Dashboard | Upload manuell loeschen | Erfolgsmeldung erscheint, Liste aktualisiert sich |
| Share-Seite Bild | Gueltigen `/i/[id]` Link aufrufen | Bild wird geladen, Metadaten sind gesetzt |
| Share-Seite Datei | Gueltigen `/f/[id]` Link aufrufen | Download-Link wird angezeigt, Metadaten sind gesetzt |
| Expired/Deleted | Abgelaufenen oder geloeschten Link aufrufen | Freundliche Unavailable-Seite statt harter Fehlermeldung |
| Cleanup Function | Edge Function manuell triggern | Abgelaufene Storage-Dateien und DB-Eintraege werden bereinigt |
| Revalidation | Cleanup oder Delete ausloesen | Startseite und Dashboard zeigen aktualisierte Daten |

## Deployment-Checklist

### 1. Supabase-Datenbank und Storage vorbereiten

Fuehre die Migrationen aus dem Ordner [supabase/migrations](supabase/migrations) aus.

Buckets:

- `images`
- `files`

Die Migrationen legen an:

- Tabellen und RLS fuer `uploads`, `profiles`, `upload_limits`, `upload_usage_windows`
- Private Storage-Buckets und zugehoerige Policies
- Helper-Funktionen fuer Quoten und Cleanup-Trigger

### 2. Environment-Variablen setzen

In der Next.js-App:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPLOAD_IP_HASH_SALT`
- `NEXT_REVALIDATE_SECRET`
- `NEXT_REVALIDATE_URL`
- `CLEANUP_FUNCTION_TOKEN`

In der Supabase Edge Function:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLEANUP_FUNCTION_TOKEN`
- `NEXT_REVALIDATE_SECRET`
- `NEXT_REVALIDATE_URL`

### 3. Secrets fuer den Cron-Job anlegen

Bevorzugt ueber Supabase Vault:

- `cleanup_expired_uploads_url`
  Wert: `https://<project-ref>.supabase.co/functions/v1/cleanup-expired-uploads`
- `cleanup_expired_uploads_token`
  Wert: derselbe Wert wie `CLEANUP_FUNCTION_TOKEN`

Falls `vault` auf deinem Projekt nicht verfuegbar ist, nutze die Fallback-Migration
[supabase/migrations/20260411_000003_cleanup_cron_fallback.sql](supabase/migrations/20260411_000003_cleanup_cron_fallback.sql)
und setze die Werte per SQL ueber `app.set_runtime_secret(...)`.

### 4. Edge Function deployen

```bash
supabase functions deploy cleanup-expired-uploads
```

Optional lokal testen:

```bash
supabase functions serve cleanup-expired-uploads --env-file supabase/.env.local
```

### 5. pg_cron aktivieren und Cron-Job registrieren

Die Migration [supabase/migrations/20260411_000002_cleanup_cron.sql](supabase/migrations/20260411_000002_cleanup_cron.sql) aktiviert den bevorzugten Vault-Pfad.

Falls `vault` auf deinem Projekt nicht installiert werden kann, verwende stattdessen
[supabase/migrations/20260411_000003_cleanup_cron_fallback.sql](supabase/migrations/20260411_000003_cleanup_cron_fallback.sql).

Beide Varianten aktivieren:

- `pg_cron`
- `pg_net`

Die Vault-Variante nutzt zusaetzlich `vault`.

Der eigentliche Job laeuft alle sechs Stunden:

```sql
select cron.schedule(
  'cleanup-expired-uploads',
  '15 */6 * * *',
  'select app.invoke_cleanup_expired_uploads();'
);
```

### 6. Nach dem Deploy pruefen

- Registrierung und Login testen
- Magic Link testen
- Anonymen Upload mit 50-MB-Limit pruefen
- Registrierten Upload ueber mehrere Dateien pruefen
- Dashboard: Link kopieren und manuelles Loeschen pruefen
- Share-Links fuer Bild und Datei pruefen
- Cleanup-Function manuell aufrufen und Revalidierung testen

## Erster Deploy & Live-Test

### Vercel

1. Repository bei GitHub pushen.
2. Projekt in Vercel importieren.
3. Framework automatisch als Next.js erkennen lassen.
4. In den Vercel Project Settings alle Variablen aus `.env.example` setzen.
5. `NEXT_PUBLIC_APP_URL` auf die spaetere Produktiv-Domain setzen, z. B. `https://foxyverse.de/sharingking`.
6. Nach dem ersten Deploy die finale Domain mit Vercel verbinden.

### Supabase

1. Neues Supabase-Projekt anlegen oder bestehendes Projekt verwenden.
2. SQL-Migrationen aus [supabase/migrations](supabase/migrations) anwenden.
3. Buckets `images` und `files` pruefen.
4. Auth fuer E-Mail/Passwort und Magic Link aktivieren.
5. Redirect-URLs fuer Auth setzen:
  - `http://localhost:3000/auth/callback`
  - `https://foxyverse.de/sharingking/auth/callback`
6. Edge-Function-Variablen und Vault-Secrets setzen.
7. Function `cleanup-expired-uploads` deployen.
8. Cron-Job ueber die Migration aktivieren.

### Erster Live-Test

1. Startseite auf der Vercel-Domain aufrufen und Layout, Footer und Galerie pruefen.
2. Anonymen Upload testen.
3. Registrierten Upload testen.
4. Login, Register und Magic Link pruefen.
5. Dashboard mit Copy-Link und manuellem Loeschen pruefen.
6. Share-Links fuer Bild und Datei in einem privaten Browserfenster pruefen.
7. Cleanup-Function manuell triggern und Revalidierung pruefen.

### Platzhalter vor Launch ersetzen

- Domain-Platzhalter: `https://foxyverse.de/sharingking`
- GitHub-Repo-Platzhalter: `https://github.com/GERMANFOXY/sharingking`

### Nach dem ersten erfolgreichen Test

- Eigene Domain spaeter final mit Vercel verbinden
- Impressum- und Datenschutz-Seiten statt Platzhaltern anlegen
- Optional: Rate-Limiting und Abuse-Protection weiter verstaerken
- Optional: Analytics integrieren, z. B. Vercel Analytics oder Umami