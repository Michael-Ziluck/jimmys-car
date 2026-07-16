# Jimmy's Car

Jimmy's Car is a weekly Spotify playlist and tier-ranking game built around the music played in Jimmy's car. Anyone who has ridden in the car can participate: new participants submit seven songs, and existing participants may submit weekly swaps.

Each week, Jimmy listens through the playlist and ranks every active song. The results have historically been recorded in a dated Google Sheet tab. The project also has seven years of historical rankings and an annual Discord award show, The Jimmies.

## How the game works

- New participants add seven songs that are not already on the active tier list.
- Participants can swap out an active song ranked B tier or lower for a new song, usually by Thursday morning.
- A song cannot be added if it is already on the tier list.
- If multiple people try to remove the same song, the person removing their own song takes priority; other conflicts are resolved by Jimmy.
- A song that receives F tier for two consecutive weeks is removed without replacement.
- The Jimmies is an annual award show featuring a favorite song from each participant and additional superlatives.

## Project goals

The website will gradually become the source of truth for Jimmy's Car while preserving the existing weekly spreadsheet habit.

Planned work, roughly in order:

1. Import historical Google Sheet data into a database.
2. Provide searchable song, participant, ranking, and playlist history.
3. Add an admin workflow for current weekly rankings and swap review.
4. Collect structured Discord swap submissions.
5. Generate a reviewed weekly change set, then update Spotify and publish the compatibility spreadsheet.
6. Support annual Jimmies eligibility, statistics, and award workflows.

Until the database workflow is ready, the current Google Sheets remain authoritative. The long-term model is database-first, with Spotify and Google Sheets treated as synchronized outputs.

## Local development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000` in a browser. The app uses `127.0.0.1` rather than `localhost` for Spotify compatibility.

Useful checks:

```bash
npm run lint
npm run build
```

## Local Spotify setup

1. Copy `.env.example` to `.env.local`.
2. Create a Spotify app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and select **Web API**.
3. Add these Redirect URIs:

   ```text
   http://127.0.0.1:3000/api/auth/spotify/callback
   http://127.0.0.1:3000/oauth2-redirect.html
   ```

4. Copy the app's client ID and client secret into `.env.local`.
5. Start the app and open `http://127.0.0.1:3000/spotify` to test the connection.

The application OAuth test currently reads a basic Spotify profile only. It does not persist tokens or make playlist changes.

## Local Swagger UI

Open `http://127.0.0.1:3000/spotify-swagger.html` to use the local Spotify Web API reference. It prepopulates the OAuth client ID and secret from `.env.local` and routes token requests through a temporary local proxy to avoid browser CORS restrictions.

This intentionally exposes the secret to a browser visitor. Use it only for local development and rotate the secret before deployment.
