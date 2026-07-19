import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import type {
  DiscordDatabaseSong as SongRow,
  DiscordSongMatch,
  DiscordSongUpdate,
  SpotifyTrack as DiscordTrack,
} from "@/types";
import { fetchDiscordMessages } from "./discord-messages";
import { songTitleMatchKey } from "./song-title-matching";

const TRACK_URL = /https?:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/i;

async function main() {
  loadEnvConfig(process.cwd());
  const discordToken = process.env["DISCORD_BOT_TOKEN"];
  const databaseUrl = process.env["DATABASE_URL"];
  if (!discordToken || !databaseUrl)
    throw new Error("DISCORD_BOT_TOKEN and DATABASE_URL are required.");

  const sql = neon(databaseUrl);
  const [messages, rawSongRows] = await Promise.all([
    fetchDiscordMessages(discordToken, "JimmyCarDiscordAnalyzer/0.1"),
    sql`select id, title, normalized_title, spotify_track_id from songs`,
  ]);
  const songRows = rawSongRows as SongRow[];
  const tracks: DiscordTrack[] = [
    ...new Map(
      messages.flatMap((message) =>
        (message.embeds ?? []).flatMap((embed) => {
          const match = embed.url?.match(TRACK_URL);
          if (!match || embed.provider?.name !== "Spotify" || !embed.title)
            return [];
          const id = match[1];
          if (!id) return [];
          const artist =
            embed.description?.split(String.fromCharCode(183))[0]?.trim() ?? "";
          return [
            [
              id,
              { id, title: embed.title, artist } satisfies DiscordTrack,
            ] as const,
          ];
        }),
      ),
    ).values(),
  ];
  const songsByTitle = new Map<string, SongRow[]>();
  for (const song of songRows) {
    const key = songTitleMatchKey(song.normalized_title);
    const matches = songsByTitle.get(key);
    if (matches) matches.push(song);
    else songsByTitle.set(key, [song]);
  }
  const exactMatches: DiscordSongMatch[] = tracks.flatMap((track) => {
    const candidates =
      songsByTitle.get(songTitleMatchKey(track.title)) ?? [];
    const song = candidates.length === 1 ? candidates[0] : undefined;
    return song ? [{ song, track }] : [];
  });
  const unresolvedExactMatches: DiscordSongMatch[] = exactMatches.filter(
    ({ song }) => !song.spotify_track_id,
  );
  const conflictingExactMatches: DiscordSongMatch[] = exactMatches.filter(
    ({ song, track }) =>
      song.spotify_track_id && song.spotify_track_id !== track.id,
  );
  const unresolvedBySong = new Map<string, DiscordSongMatch[]>();
  for (const match of unresolvedExactMatches) {
    const matches = unresolvedBySong.get(match.song.id);
    if (matches) matches.push(match);
    else unresolvedBySong.set(match.song.id, [match]);
  }
  const singleTrackMatches: DiscordSongMatch[][] = [
    ...unresolvedBySong.values(),
  ].filter(
    (matches) => new Set(matches.map(({ track }) => track.id)).size === 1,
  );
  const multipleTrackMatches: DiscordSongMatch[][] = [
    ...unresolvedBySong.values(),
  ].filter((matches) => new Set(matches.map(({ track }) => track.id)).size > 1);
  const updates: DiscordSongUpdate[] = singleTrackMatches.flatMap((matches) => {
    const firstMatch = matches[0];
    return firstMatch
      ? [
          {
            id: firstMatch.song.id,
            spotify_track_id: firstMatch.track.id,
            artist_name: firstMatch.track.artist || null,
          },
        ]
      : [];
  });
  const apply = process.argv.includes("--apply");
  const applied = (
    apply && updates.length
      ? await sql`
      update songs as song
      set spotify_track_id = update_rows.spotify_track_id,
          artist_name = update_rows.artist_name
      from jsonb_to_recordset(${JSON.stringify(updates)}::jsonb)
        as update_rows(id text, spotify_track_id text, artist_name text)
      where song.id = update_rows.id
        and song.spotify_track_id is null
      returning song.id
    `
      : []
  ) as unknown[];

  console.log(
    JSON.stringify(
      {
        messages: messages.length,
        messagesWithTrackLinks: messages.filter((message) =>
          TRACK_URL.test(message.content),
        ).length,
        uniqueTrackIds: tracks.length,
        spreadsheetTitles: songRows.length,
        exactTitleMatches: exactMatches.length,
        unresolvedExactTitleMatches: unresolvedExactMatches.length,
        unresolvedSpreadsheetTitlesWithExactMatch: unresolvedBySong.size,
        safeSingleTrackTitleMatches: singleTrackMatches.length,
        ambiguousMultiTrackTitleMatches: multipleTrackMatches.length,
        conflictsWithExistingLink: conflictingExactMatches.length,
        applied: applied.length,
        samples: singleTrackMatches.slice(0, 12).flatMap((matches) => {
          const firstMatch = matches[0];
          return firstMatch
            ? [
                {
                  spreadsheetTitle: firstMatch.song.title,
                  trackId: firstMatch.track.id,
                  spotifyTitle: firstMatch.track.title,
                  artist: firstMatch.track.artist,
                },
              ]
            : [];
        }),
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
