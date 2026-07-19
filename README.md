# Jimmy's Car

Jimmy's Car is a weekly Spotify playlist and tier-ranking game built around the music played in Jimmy's car. New
participants submit seven songs; existing participants can propose weekly swaps. Jimmy ranks the active songs each week,
and the results are recorded as dated tier-list editions.

This Next.js app turns those editions into a searchable library while preserving the existing spreadsheet workflow. It
imports the historical Google Sheets into Neon Postgres, provides public song/history/score pages, lets people connect
Discord and Spotify accounts, and gives administrators tools to review song links, manage people and links, and
re-import the historical source data.

## What is available now

- **Songs** (`/songs`) shows the latest canonical edition. It supports title/artist search, sort, card or list view, and
  Spotify playback/link suggestions.
- **Current + history** (`/songs/history`) searches all imported song history with pagination.
- **Scores** (`/leaderboard`) shows the latest edition's imported score ledger and change from the prior edition.
- **Links** (`/links`) is the public home for the current spreadsheet, playlist, and administrator-configured extras.
- **Profile** (`/account`) signs in with Discord, lets a person claim their participant profile, connect Spotify, and
  save their preferred song layout.
- **Admin** (`/admin`, administrators only) reviews submitted Spotify matches, manages users and unclaimed profiles,
  manages public links, finds potential Spotify matches, and runs the historical-sheet import.

The importer is the current data-refresh workflow. It does not process swaps, change the Spotify playlist, or publish a
spreadsheet; those remain separate/manual workflows for now. The source workbooks remain the practical record to
validate against when importing.

## Requirements

- Node.js and npm (the checked-in `package-lock.json` is the dependency source of truth).
- A Neon Postgres database for any database-backed page, migration, or import.
- Spotify credentials to connect a user account, use the local Swagger helper, or let the importer reconcile
  latest-edition titles against the active playlist.
- Discord OAuth credentials for site sign-in; a Discord bot token is only needed by the Discord analysis scripts.

## Local development

Install dependencies, create local environment settings, apply migrations, and run the app:

```powershell
npm install
Copy-Item .env.example .env.local
# Fill in DATABASE_URL and the credentials needed for the features you will use.
npm run db:migrate
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Use `127.0.0.1`, rather than `localhost`, for the Spotify redirect
URLs. On this Windows setup, use plain `npm run dev`; do not append a `--hostname` argument.

If the project is linked to Vercel/Neon, pull the Development environment values before running database commands:

```powershell
npx vercel env pull .env.local
npm run db:check
```

`db:check` makes a small read-only query and prints the database and user it reached. It is a good first check before
migrations or imports.

## Environment variables

Start from [`.env.example`](.env.example). Keep `.env.local` out of version control.

| Variable                                                             | Needed for                                                                                                                    |
|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| `DATABASE_URL`                                                       | Database-backed pages, Drizzle migrations, historical import, and Discord link analysis.                                      |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` | Spotify account linking and the local Swagger helper.                                                                         |
| `SPOTIFY_REFRESH_TOKEN`                                              | Optional command-line fallback when importing the latest playlist; a linked playlist-owner/collaborator account is preferred. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` | Discord sign-in.                                                                                                              |
| `DISCORD_BOT_TOKEN`                                                  | Discord sampling and Spotify-link analysis scripts only.                                                                      |

## OAuth setup

### Spotify

1. Create a Web API app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add both redirect URIs:

   ```text
   http://127.0.0.1:3000/api/auth/spotify/callback
   http://127.0.0.1:3000/oauth2-redirect.html
   ```

3. Put the client ID, client secret, and first URI in `.env.local`.
4. Start the app and open `/account` to connect Spotify after signing in with Discord.

Linked Spotify refresh tokens are encrypted server-side, allowing the app to obtain short-lived user tokens without
asking the person to sign in again. Existing Spotify links need to be connected again to store this credential.

### Discord

Create a Discord OAuth application and set its redirect URI to:

```text
http://127.0.0.1:3000/api/auth/discord/callback
```

Add its client ID, client secret, and redirect URI to `.env.local`. A Discord bot token is separate from OAuth
credentials and is not required to browse the app or sign in.

## Database and imports

The app uses Neon Postgres with Drizzle ORM. Schema definitions are in [`src/db/schema.ts`](src/db/schema.ts); generated
migration files are in [`drizzle`](drizzle), and Drizzle configuration is in [`drizzle.config.ts`](drizzle.config.ts).

Apply checked-in migrations whenever the database is behind the app:

```powershell
npm run db:migrate
```

When changing the schema, generate a new migration and review the generated SQL before applying it:

```powershell
npm run db:generate
npm run db:migrate
```

The historical importer downloads the four configured public Google Sheet workbooks, retains each worksheet snapshot,
selects one canonical snapshot per date, rebuilds imported placements and the score ledger, and preserves confirmed
Spotify song links. It validates the newest live worksheet before replacing placements.

Run it from the terminal:

```powershell
npm run db:import-history
```

Or, as an administrator, use **Admin → Imports → Re-import sheets** to run the same import with streamed progress in the
browser. This command and the admin import write to the database; avoid using them casually against shared production
data.

For latest-playlist reconciliation, the importer can use a Spotify account linked through the app that belongs to the
playlist owner/collaborator or `SPOTIFY_REFRESH_TOKEN`. Without either, the import still completes but skips Spotify
resolution. Matching is conservative: unresolved, duplicate, or ambiguous titles are left for review.

## Scripts

| Command                         | What it does                                                                                    | Writes data?                |
|---------------------------------|-------------------------------------------------------------------------------------------------|-----------------------------|
| `npm run dev`                   | Starts the Next.js development server.                                                          | No                          |
| `npm run build`                 | Produces a production build.                                                                    | No database writes          |
| `npm run start`                 | Serves an existing production build.                                                            | No database writes          |
| `npm run lint`                  | Runs ESLint.                                                                                    | No                          |
| `npm run db:check`              | Verifies `DATABASE_URL` with a read-only query.                                                 | No                          |
| `npm run db:generate`           | Generates Drizzle SQL migrations from schema changes.                                           | Files only                  |
| `npm run db:migrate`            | Applies pending Drizzle migrations.                                                             | Yes, database schema        |
| `npm run db:import-history`     | Re-imports all configured historical Google Sheet sources.                                      | Yes, imported database data |
| `npm run discord:sample-swaps`  | Reads the configured Discord channel and prints likely swap messages containing Spotify URLs.   | No                          |
| `npm run discord:analyze-links` | Reports safe, exact title matches between Discord Spotify embeds and database songs.            | No                          |
| `npm run discord:import-links`  | Applies only safe, single-track exact-title matches for songs without an existing Spotify link. | Yes, song Spotify links     |

The Discord scripts load `.env.local`, retrieve the full configured channel while respecting Discord rate limits, and
require `DISCORD_BOT_TOKEN`. `discord:import-links` deliberately leaves ambiguous matches and existing conflicting links
untouched; run `discord:analyze-links` first and inspect its report.

## Local Spotify Swagger UI

Open [http://127.0.0.1:3000/spotify-swagger.html](http://127.0.0.1:3000/spotify-swagger.html) for a local Spotify Web
API reference. It reads the Spotify client ID and secret from `.env.local` and exchanges tokens through a same-origin
local proxy to avoid browser CORS restrictions.

This UI exposes the client secret to anyone who can open it. Use it only in local development and rotate the secret
before deployment.

## Verification

Before handing off a change, run the relevant checks:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

For interface changes, also exercise the relevant page in a browser, including its loading/error state and the
signed-out or administrator state when applicable.
